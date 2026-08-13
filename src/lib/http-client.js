// Shared HTTP client: timeout, retry with exponential backoff + jitter, and
// Retry-After handling. Provider calls can opt into a pinned HTTPS transport so
// DNS validation and the actual socket connection use the same public address.

const https = require("node:https");
const net = require("node:net");
const { resolveSafeExternalUrl } = require("./security");

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

function isAbortError(error) {
  const name = String(error?.name || "");
  const code = String(error?.code || "");
  return name === "AbortError" || code === "ABORT_ERR" || code === "ERR_ABORTED";
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
    // A caller cancelling a request is an explicit control-flow decision, not a
    // transient network failure. Internal timeout errors remain retryable.
    return !isAbortError(error);
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

function headersToObject(headers) {
  if (!headers) return {};
  if (typeof headers[Symbol.iterator] === "function") return Object.fromEntries(headers);
  return { ...headers };
}

function normalizePinnedAddresses(addresses) {
  if (!Array.isArray(addresses)) return [];
  return addresses
    .map((entry) => {
      const address = typeof entry === "string" ? entry : entry?.address;
      const family = Number(typeof entry === "string" ? net.isIP(entry) : entry?.family || net.isIP(address || ""));
      return { address: String(address || ""), family };
    })
    .filter((entry) => entry.address && [4, 6].includes(entry.family) && net.isIP(entry.address) === entry.family);
}

function pinnedLookupResult(addresses, lookupOptions = {}) {
  const compatible = addresses.filter((entry) => !lookupOptions?.family || entry.family === lookupOptions.family);
  if (!compatible.length) return null;
  return lookupOptions?.all ? compatible.map((entry) => ({ ...entry })) : compatible[0];
}

async function fetchPinnedHttps(urlValue, init = {}, policy = {}) {
  const resolved = await resolveSafeExternalUrl(urlValue, policy);
  if (!resolved.addresses.length) return fetch(urlValue, { ...init, redirect: "manual" });
  const url = resolved.url;
  const addresses = normalizePinnedAddresses(resolved.addresses);
  if (!addresses.length) {
    throw new Error("Provider hostname did not resolve to a valid IP address");
  }
  const headers = headersToObject(init.headers);
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "accept-encoding")) headers["accept-encoding"] = "identity";
  const body = init.body === undefined || init.body === null ? null : init.body;
  const maxResponseBytes = Math.max(64 * 1024, Number(policy.maxResponseBytes || 16 * 1024 * 1024));

  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(response);
    };
    const signal = init.signal;
    const onAbort = () => {
      const reason = signal?.reason instanceof Error ? signal.reason : new Error("Request aborted");
      request?.destroy(reason);
      finish(reason);
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }

    const hostname = String(url.hostname || "").replace(/^\[|\]$/g, "");
    const requestedHost = url.host;
    request = https.request(
      {
        protocol: "https:",
        hostname,
        port: url.port || 443,
        path: `${url.pathname || "/"}${url.search || ""}`,
        method: String(init.method || "GET").toUpperCase(),
        headers: { ...headers, Host: headers.Host || headers.host || requestedHost },
        servername: hostname,
        rejectUnauthorized: true,
        lookup: (_host, lookupOptions, callback) => {
          const result = pinnedLookupResult(addresses, lookupOptions);
          if (!result) {
            callback(new Error("Provider hostname did not resolve to a compatible IP address"));
            return;
          }
          if (lookupOptions?.all) {
            callback(null, result);
            return;
          }
          callback(null, result.address, result.family);
        }
      },
      (response) => {
        const chunks = [];
        let bytesRead = 0;
        response.on("data", (chunk) => {
          bytesRead += chunk.length;
          if (bytesRead > maxResponseBytes) {
            request.destroy(new Error("Provider response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const payload = Buffer.concat(chunks);
          const bodyValue = payload.length ? payload : null;
          finish(null, new Response(bodyValue, {
            status: response.statusCode || 502,
            statusText: response.statusMessage || "",
            headers: response.headers
          }));
        });
        response.on("error", finish);
      }
    );
    request.once("error", finish);
    request.setTimeout(Number(policy.timeoutMs || DEFAULT_TIMEOUT_MS), () => request.destroy(new Error("Request timed out")));
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    request.once("close", () => signal?.removeEventListener?.("abort", onAbort));
    if (body !== null) request.write(typeof body === "string" || Buffer.isBuffer(body) ? body : Buffer.from(body));
    request.end();
  });
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
      const requestInit = { ...init, signal: mergeSignal(init.signal, controller.signal) };
      const response = opts.externalUrlPolicy
        ? await fetchPinnedHttps(url, requestInit, { ...opts.externalUrlPolicy, timeoutMs })
        : await fetch(url, requestInit);
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
      // The merged signal can preserve a caller's arbitrary abort reason (which
      // is not necessarily named AbortError), so check the original signal too.
      const callerAborted = Boolean(init.signal?.aborted);
      if (!callerAborted && attempt < retries && (await shouldRetry(null, error, attempt))) {
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
  isAbortError,
  defaultShouldRetry,
  defaultRetryDelay,
  mapWithConcurrency,
  fetchPinnedHttps,
  normalizePinnedAddresses,
  pinnedLookupResult
};
