// Normalizes the response variations returned by OpenAI-compatible providers.
// Keep this module free of provider configuration so every LLM workflow can
// share the exact same response and JSON parsing behavior.

async function readProviderResponse(response) {
  if (response.ok) {
    try {
      return await response.json();
    } catch {
      throw new Error("Provider returned a non-JSON response");
    }
  }
  let message = `Provider request failed with ${response.status}`;
  try {
    const text = await response.text();
    if (text) {
      try {
        const errBody = JSON.parse(text);
        if (errBody?.error?.message) {
          message = String(errBody.error.message).slice(0, 500);
        } else {
          message += `: ${text.slice(0, 180)}`;
        }
      } catch {
        message += `: ${text.slice(0, 180)}`;
      }
    }
  } catch {
    /* ignore */
  }
  const error = new Error(message);
  error.status = Number(response.status || 0);
  error.providerAuthFailure =
    error.status === 401 ||
    /invalid[_\s-]*api[_\s-]*key|api key.*(?:invalid|expired)|unauthori[sz]ed|authentication|permission denied|bad credentials/i.test(message);
  error.providerResponseFormatUnsupported =
    error.status === 400 &&
    /response[_\s-]*format|json[_\s-]*object|json mode|structured output|unsupported.*(?:format|parameter)|unknown parameter/i.test(message);
  throw error;
}

function parseJsonCandidate(candidate = "", depth = 0) {
  const source = String(candidate || "").trim();
  if (!source) return null;
  const candidates = [source, source.replace(/,\s*([}\]])/g, "$1")];
  for (const item of candidates) {
    try {
      const parsed = JSON.parse(item);
      if (typeof parsed === "string" && depth < 2) return parseJsonCandidate(parsed, depth + 1);
      return parsed;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function balancedJsonObjectCandidates(text = "") {
  const source = String(text || "");
  const candidates = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return candidates;
}

function extractJsonObject(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  const direct = parseJsonCandidate(trimmed);
  if (direct !== null) return direct;
  const candidates = [];
  const fences = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1].trim());
  candidates.push(...fences);
  candidates.push(...balancedJsonObjectCandidates(trimmed));
  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

function providerMessageContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (typeof content.content === "string") return content.content;
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }
  return content == null ? "" : String(content);
}

function providerContentType(content) {
  if (Array.isArray(content)) return "array";
  if (content && typeof content === "object") return "object";
  return typeof content;
}

module.exports = {
  balancedJsonObjectCandidates,
  extractJsonObject,
  parseJsonCandidate,
  providerContentType,
  providerMessageContent,
  readProviderResponse
};
