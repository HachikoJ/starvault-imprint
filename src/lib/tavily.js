const { fetchWithRetries, mapWithConcurrency } = require("./http-client");

const TAVILY_URL = "https://api.tavily.com/search";
const TAVILY_TIMEOUT_MS = 15_000;

function toSignal(item) {
  return {
    source: "tavily",
    title: item.title || "",
    url: item.url || "",
    score: typeof item.score === "number" ? item.score : 0,
    content: item.content || ""
  };
}

async function searchWebSignals(project, tavilyKey) {
  if (!tavilyKey) {
    return [];
  }

  const query = `"${project.fullName}" GitHub product demo docs users deployment use case`;
  const response = await fetchWithRetries(
    TAVILY_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tavilyKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
        include_raw_content: false
      })
    },
    { timeoutMs: TAVILY_TIMEOUT_MS, retries: 2 }
  );

  if (!response.ok) {
    throw new Error(`Tavily request failed with ${response.status}`);
  }

  const json = await response.json();
  return (json.results || []).map(toSignal);
}

async function searchTopicSignals(query, tavilyKey, maxResults = 6) {
  if (!tavilyKey || !query) {
    return [];
  }

  const response = await fetchWithRetries(
    TAVILY_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tavilyKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: Math.max(1, Math.min(10, Number(maxResults) || 6)),
        include_answer: false,
        include_raw_content: false
      })
    },
    { timeoutMs: TAVILY_TIMEOUT_MS, retries: 2 }
  );

  if (!response.ok) {
    throw new Error(`Tavily request failed with ${response.status}`);
  }

  const json = await response.json();
  return (json.results || []).map(toSignal);
}

async function enrichTopProjectsWithTavily(projects, tavilyKey, count = 24, onProgress = null) {
  if (!tavilyKey || !projects.length || Number(count) <= 0) {
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
        value = await searchWebSignals(project, tavilyKey);
      } catch (error) {
        value = [
          {
            source: "tavily",
            title: "Tavily enrichment failed",
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
  enrichTopProjectsWithTavily,
  searchTopicSignals,
  searchWebSignals
};
