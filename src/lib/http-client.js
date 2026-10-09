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
const DEFAULT_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

function positiveNumber(value, fallback) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
}

function abortReason(signal) {
  return signal?.reason instanceof Error ? signal.reason : Object.assign(new Error("Request aborted"), { name: "AbortError", cause: signal?.reason });
}

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const finish = (error) => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); error ? reject(error) : resolve(); };
    const cancel = () => finish(abortReason(signal));
    const timer = setTimeout(() => finish(), ms);
    signal?.addEventListener("abort", cancel, { once: true });
  });
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

async function bufferResponse(response, signal, maxBytes) {
  if (!response.body?.getReader) return response;
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  const cancel = () => { reader.cancel(abortReason(signal)).catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw abortReason(signal);
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw Object.assign(new Error("Provider response is too large"), { code: "RESPONSE_TOO_LARGE" });
      }
      chunks.push(Buffer.from(value));
    }
    if (signal.aborted) throw abortReason(signal);
    const buffered = new Response(bytes ? Buffer.concat(chunks) : null, { status: response.status, statusText: response.statusText, headers: response.headers });
    Object.defineProperty(buffered, "url", { value: response.url });
    return buffered;
  } finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
}

async function boundedRequest(request, userSignal, timeoutMs, maxBytes) {
  if (userSignal?.aborted) throw abortReason(userSignal);
  const controller = new AbortController();
  const cancel = () => controller.abort(abortReason(userSignal));
  userSignal?.addEventListener("abort", cancel, { once: true });
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(abortReason(controller.signal));
  controller.signal.addEventListener("abort", onAbort, { once: true });
  const duration = positiveNumber(timeoutMs, DEFAULT_TIMEOUT_MS);
  const limit = positiveNumber(maxBytes, DEFAULT_MAX_RESPONSE_BYTES);
  const timer = setTimeout(() => controller.abort(Object.assign(new Error("Request timed out"), { code: "REQUEST_TIMEOUT" })), duration);
  try {
    return await Promise.race([aborted, (async () => {
      const response = await request(controller.signal);
      if (controller.signal.aborted) throw abortReason(controller.signal);
      return bufferResponse(response, controller.signal, limit);
    })()]);
  } catch (error) { controller.abort(error); throw error; }
  finally {
    clearTimeout(timer);
    userSignal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
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

async function requestPinnedHttps(urlValue, init = {}, policy = {}) {
  if (init.signal?.aborted) throw abortReason(init.signal);
  const resolved = await resolveSafeExternalUrl(urlValue, policy);
  if (init.signal?.aborted) throw abortReason(init.signal);
  if (!resolved.addresses.length) return fetch(urlValue, { ...init, redirect: "manual" });
  const url = resolved.url;
  const addresses = normalizePinnedAddresses(resolved.addresses);
  if (!addresses.length) {
    throw new Error("Provider hostname did not resolve to a valid IP address");
  }
  const headers = headersToObject(init.headers);
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "accept-encoding")) headers["accept-encoding"] = "identity";
  const body = init.body === undefined || init.body === null ? null : init.body;
  const maxResponseBytes = positiveNumber(policy.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES);

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
            request.destroy(Object.assign(new Error("Provider response is too large"), { code: "RESPONSE_TOO_LARGE" }));
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
    request.setTimeout(positiveNumber(policy.timeoutMs, DEFAULT_TIMEOUT_MS), () => request.destroy(new Error("Request timed out")));
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    request.once("close", () => signal?.removeEventListener?.("abort", onAbort));
    if (body !== null) request.write(typeof body === "string" || Buffer.isBuffer(body) ? body : Buffer.from(body));
    request.end();
  });
}

async function fetchPinnedHttps(urlValue, init = {}, policy = {}) {
  return boundedRequest(signal => requestPinnedHttps(urlValue, { ...init, signal }, policy), init.signal,
    policy.timeoutMs || DEFAULT_TIMEOUT_MS, policy.maxResponseBytes || DEFAULT_MAX_RESPONSE_BYTES);
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
 * @param {number} [opts.maxResponseBytes] - full decoded-body cap (default 16 MiB)
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
    if (init.signal?.aborted) throw abortReason(init.signal);
    try {
      const maxResponseBytes = opts.maxResponseBytes ?? opts.externalUrlPolicy?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
      const response = await boundedRequest(signal => {
        const requestInit = { ...init, signal };
        return opts.externalUrlPolicy
          ? requestPinnedHttps(url, requestInit, { ...opts.externalUrlPolicy, timeoutMs, maxResponseBytes })
          : fetch(url, requestInit);
      }, init.signal, timeoutMs, maxResponseBytes);
      if (attempt < retries && (await shouldRetry(response, null, attempt))) {
        const delay = await retryDelay(response, null, attempt, baseDelayMs, maxDelayMs);
        await sleep(delay, init.signal);
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      // The merged signal can preserve a caller's arbitrary abort reason (which
      // is not necessarily named AbortError), so check the original signal too.
      const callerAborted = Boolean(init.signal?.aborted);
      const safeToRepeat = ["GET", "HEAD", "OPTIONS"].includes(String(init.method || "GET").toUpperCase());
      if (!callerAborted && safeToRepeat && error?.code !== "RESPONSE_TOO_LARGE" && attempt < retries && (await shouldRetry(null, error, attempt))) {
        const delay = await retryDelay(null, error, attempt, baseDelayMs, maxDelayMs);
        await sleep(delay, init.signal);
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
