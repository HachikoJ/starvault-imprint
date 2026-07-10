// Shared HTTP client: timeout, retry with exponential backoff + jitter, and
// Retry-After handling. Wraps global fetch; preserves the Response API so each
// lib keeps its own response-parsing logic.

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run an async mapper over items with bounded concurrency. Preserves input order.
async function mapWithConcurrency(items, mapper, concurrency = 4) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }
  const workers = [];
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  for (let w = 0; w < n; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

function jitter() {
  return 0.5 + Math.random(); // 0.5..1.5
}

// Parse a Retry-After header (seconds or HTTP-date). Returns ms, or null if absent/invalid.
function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    return Math.max(0, date - now);
  }
  return null;
}

function defaultShouldRetry(response, error) {
  if (error) {
    // Retry network errors / timeouts. Caller-aborted requests won't reach here
    // because they reject and we don't catch AbortError specially — callers that
    // pass their own signal are responsible for not enabling retries on it.
    return true;
  }
  if (!response) return false;
  if (response.status === 408 || response.status === 429) return true;
  if (response.status >= 500 && response.status < 600) return true;
  return false;
}

function defaultRetryDelay(response, error, attempt, baseMs, maxMs) {
  const fromHeader = response ? parseRetryAfter(response.headers.get("retry-after")) : null;
  if (fromHeader != null) {
    return Math.min(maxMs, Math.max(fromHeader, baseMs));
  }
  const exp = baseMs * 2 ** attempt;
  return Math.min(maxMs, Math.round(exp * jitter()));
}

function mergeSignal(userSignal, internalSignal) {
  if (!userSignal) return internalSignal;
  const controller = new AbortController();
  const onAbort = (reason) => {
    controller.abort(typeof reason === "string" ? new Error(reason) : reason);
  };
  internalSignal.addEventListener("abort", () => onAbort(internalSignal.reason), { once: true });
  userSignal.addEventListener("abort", () => onAbort(userSignal.reason), { once: true });
  return controller.signal;
}

/**
 * fetch with timeout + retry.
 * @param {string} url
 * @param {object} init - standard fetch init
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.retries]
 * @param {number} [opts.baseDelayMs]
 * @param {number} [opts.maxDelayMs]
 * @param {(res: Response|null, err: Error|null, attempt: number) => boolean|Promise<boolean>} [opts.shouldRetry]
 * @param {(res: Response|null, err: Error|null, attempt: number) => number|Promise<number>} [opts.retryDelay]
 */
async function fetchWithRetries(url, init = {}, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    shouldRetry = defaultShouldRetry,
    retryDelay = defaultRetryDelay
  } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: mergeSignal(init.signal, controller.signal) });
      clearTimeout(timer);
      if (attempt < retries && (await shouldRetry(response, null, attempt))) {
        const delay = await retryDelay(response, null, attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      if (attempt < retries && (await shouldRetry(null, error, attempt))) {
        const delay = await retryDelay(null, error, attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}

module.exports = {
  fetchWithRetries,
  parseRetryAfter,
  defaultShouldRetry,
  defaultRetryDelay,
  mapWithConcurrency
};
