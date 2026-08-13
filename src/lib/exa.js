const { fetchWithRetries, mapWithConcurrency } = require("./http-client");

const EXA_URL = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 15_000;

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
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: 5,
        text: true
      })
    },
    { timeoutMs: EXA_TIMEOUT_MS, retries: 2 }
  );

  if (!response.ok) {
    throw new Error(`Exa request failed with ${response.status}`);
  }

  const json = await response.json();
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
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: Math.max(1, Math.min(10, Number(maxResults) || 6)),
        text: true
      })
    },
    { timeoutMs: EXA_TIMEOUT_MS, retries: 2 }
  );

  if (!response.ok) {
    throw new Error(`Exa request failed with ${response.status}`);
  }

  const json = await response.json();
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
  searchTopicSignals,
  searchExaSignals
};
