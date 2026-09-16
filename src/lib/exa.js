const { fetchWithRetries, mapWithConcurrency } = require("./http-client");

const EXA_URL = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 15_000;
const EXA_TEXT_CONTENTS = Object.freeze({ text: true });

function exaSearchBody(query, numResults, options = {}) {
  const body = {
    query,
    type: "auto",
    numResults: Math.max(1, Math.min(10, Number(numResults) || 5))
  };
  if (options.includeContents !== false) {
    body.contents = { ...EXA_TEXT_CONTENTS };
  }
  return body;
}

function exaErrorDetail(payload, fallbackText = "") {
  const value = payload?.error || payload?.message || payload?.detail || fallbackText;
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function exaErrorFromResponse(response) {
  let text = "";
  let payload = null;
  try {
    text = await response.text();
  } catch {
    /* use the status-only message below */
  }
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  const status = Number(response.status || 0);
  const tag = String(payload?.tag || "").toUpperCase();
  const detail = exaErrorDetail(payload, text);
  const paymentTags = ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"];
  const permissionTags = ["TEAM_BLOCKED", "INSUFFICIENT_SCOPE", "FEATURE_DISABLED"];
  let message = "";

  if (status === 401 || tag === "INVALID_API_KEY") {
    message = "Exa Key 无效或已过期，请重新获取。";
  } else if (status === 402 || paymentTags.includes(tag)) {
    message = "Exa 额度不足或已超出预算，请前往 Exa 控制台检查余额和用量。";
  } else if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") {
    message = "Exa 请求过于频繁，已触发限流，请稍后重试。";
  } else if (status === 403 || permissionTags.includes(tag)) {
    message = "Exa Key 权限不足或团队不可用，请检查 Key 权限和团队状态。";
  } else if (status === 400 || status === 422 || tag.startsWith("INVALID_") || tag === "NUM_RESULTS_EXCEEDED") {
    message = `Exa 请求参数错误${detail ? `：${detail}` : ""}`;
  } else if (status >= 500) {
    message = `Exa 服务暂时不可用（HTTP ${status}），请稍后重试。`;
  } else {
    message = `Exa 请求失败（HTTP ${status || "未知"}）${detail ? `：${detail}` : ""}`;
  }

  const error = new Error(message);
  error.status = status;
  error.tag = tag;
  error.exaResponseFailure = true;
  error.exaAuthFailure = status === 401 || tag === "INVALID_API_KEY";
  error.exaPaymentRequired = status === 402 || paymentTags.includes(tag);
  error.exaRateLimited = status === 429 || tag === "RATE_LIMIT_EXCEEDED";
  return error;
}

async function readExaJson(response) {
  if (!response.ok) {
    throw await exaErrorFromResponse(response);
  }
  try {
    return await response.json();
  } catch {
    throw new Error("Exa 返回了无法解析的响应");
  }
}

function maxHighlightScore(scores) {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  let max = 0;
  for (const value of scores) {
    const n = Number(Array.isArray(value) ? maxHighlightScore(value) : value);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function toSignal(item) {
  return {
    source: "exa",
    title: item.title || "",
    url: item.url || "",
    score: maxHighlightScore(item.highlightScores),
    content: Array.isArray(item.highlights) && item.highlights.length ? item.highlights.join(" ") : item.text || "",
    publishedDate: item.publishedDate || ""
  };
}

async function searchExaSignals(project, exaKey) {
  if (!exaKey) {
    return [];
  }

  const query = [
    project.fullName,
    project.description,
    "GitHub repository product demo documentation users deployment use case"
  ]
    .filter(Boolean)
    .join(" ");

  const response = await fetchWithRetries(
    EXA_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaKey
      },
      body: JSON.stringify(exaSearchBody(query, 5))
    },
    { timeoutMs: EXA_TIMEOUT_MS, retries: 2 }
  );

  const json = await readExaJson(response);
  return (json.results || []).map(toSignal);
}

async function searchTopicSignals(query, exaKey, maxResults = 6) {
  if (!exaKey || !query) {
    return [];
  }

  const response = await fetchWithRetries(
    EXA_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaKey
      },
      body: JSON.stringify(exaSearchBody(query, maxResults))
    },
    { timeoutMs: EXA_TIMEOUT_MS, retries: 2 }
  );

  const json = await readExaJson(response);
  return (json.results || []).map(toSignal);
}

async function enrichTopProjectsWithExa(projects, exaKey, count = 24, onProgress = null) {
  if (!exaKey || !projects.length || Number(count) <= 0) {
    return new Map();
  }

  const shortlist = projects
    .slice()
    .sort(
      (a, b) =>
        (b.scores?.productization || b.scores?.opportunity || 0) - (a.scores?.productization || a.scores?.opportunity || 0) ||
        (b.stars || 0) - (a.stars || 0)
    )
    .slice(0, count);

  let completed = 0;
  const pairs = await mapWithConcurrency(
    shortlist,
    async (project) => {
      let value;
      try {
        value = await searchExaSignals(project, exaKey);
      } catch (error) {
        value = [
          {
            source: "exa",
            title: "Exa enrichment failed",
            url: "",
            score: 0,
            content: error.message
          }
        ];
      } finally {
        completed += 1;
        if (typeof onProgress === "function") {
          onProgress({
            project: project.fullName,
            completed,
            total: shortlist.length
          });
        }
      }
      return [project.fullName, value];
    },
    4
  );

  return new Map(pairs);
}

module.exports = {
  enrichTopProjectsWithExa,
  exaErrorFromResponse,
  exaSearchBody,
  EXA_TEXT_CONTENTS,
  readExaJson,
  searchTopicSignals,
  searchExaSignals
};
