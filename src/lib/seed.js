const { enrichRepository } = require("./scoring");

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function demoRepositories() {
  const repos = [
    {
      fullName: "signal-lab/agent-workbench",
      name: "agent-workbench",
      owner: "signal-lab",
      url: "https://github.com/signal-lab/agent-workbench",
      description: "Open agent workflow console with tool orchestration, memory traces, and eval dashboards.",
      homepage: "https://example.com/agent-workbench",
      language: "TypeScript",
      topics: ["ai-agent", "llm", "workflow", "mcp", "dashboard"],
      stars: 3820,
      forks: 294,
      watchers: 28,
      openIssues: 72,
      createdAt: daysAgo(112),
      updatedAt: daysAgo(1),
      pushedAt: daysAgo(1),
      license: { key: "apache-2.0", name: "Apache License 2.0", spdxId: "Apache-2.0" }
    },
    {
      fullName: "craftkit/saas-foundry",
      name: "saas-foundry",
      owner: "craftkit",
      url: "https://github.com/craftkit/saas-foundry",
      description: "Multi-tenant SaaS starter with auth, billing, admin, feature flags, and audit logs.",
      homepage: "https://example.com/saas-foundry",
      language: "TypeScript",
      topics: ["saas", "starter", "stripe", "auth", "admin"],
      stars: 2180,
      forks: 361,
      watchers: 16,
      openIssues: 38,
      createdAt: daysAgo(240),
      updatedAt: daysAgo(4),
      pushedAt: daysAgo(4),
      license: { key: "mit", name: "MIT License", spdxId: "MIT" }
    },
    {
      fullName: "datapulse/pipeglass",
      name: "pipeglass",
      owner: "datapulse",
      url: "https://github.com/datapulse/pipeglass",
      description: "Visual ETL pipeline monitor for warehouse jobs, retries, lineage, and cost drift.",
      homepage: "",
      language: "Go",
      topics: ["etl", "pipeline", "analytics", "observability"],
      stars: 940,
      forks: 48,
      watchers: 8,
      openIssues: 14,
      createdAt: daysAgo(80),
      updatedAt: daysAgo(2),
      pushedAt: daysAgo(2),
      license: { key: "mpl-2.0", name: "Mozilla Public License 2.0", spdxId: "MPL-2.0" }
    },
    {
      fullName: "quietdesk/browser-notes",
      name: "browser-notes",
      owner: "quietdesk",
      url: "https://github.com/quietdesk/browser-notes",
      description: "Local-first browser notes extension with clipping, PDF annotation, and offline search.",
      homepage: "https://example.com/browser-notes",
      language: "Svelte",
      topics: ["productivity", "notes", "browser-extension", "local-first"],
      stars: 720,
      forks: 22,
      watchers: 9,
      openIssues: 19,
      createdAt: daysAgo(36),
      updatedAt: daysAgo(3),
      pushedAt: daysAgo(3),
      license: null
    },
    {
      fullName: "redteam-ops/secret-sieve",
      name: "secret-sieve",
      owner: "redteam-ops",
      url: "https://github.com/redteam-ops/secret-sieve",
      description: "Fast secret scanner for monorepos with policy packs, SARIF output, and CI diff mode.",
      homepage: "",
      language: "Rust",
      topics: ["security", "scanner", "secret", "sast", "ci"],
      stars: 1360,
      forks: 57,
      watchers: 13,
      openIssues: 11,
      createdAt: daysAgo(165),
      updatedAt: daysAgo(8),
      pushedAt: daysAgo(8),
      license: { key: "gpl-3.0", name: "GNU General Public License v3.0", spdxId: "GPL-3.0" }
    },
    {
      fullName: "modelscope-lite/vector-eval",
      name: "vector-eval",
      owner: "modelscope-lite",
      url: "https://github.com/modelscope-lite/vector-eval",
      description: "Evaluation harness for vector search relevance, embedding drift, and RAG regression tests.",
      homepage: "https://example.com/vector-eval",
      language: "Python",
      topics: ["vector", "embedding", "eval", "rag", "ai-infra"],
      stars: 1685,
      forks: 144,
      watchers: 19,
      openIssues: 26,
      createdAt: daysAgo(190),
      updatedAt: daysAgo(1),
      pushedAt: daysAgo(1),
      license: { key: "apache-2.0", name: "Apache License 2.0", spdxId: "Apache-2.0" }
    }
  ];

  return repos.map((repo) =>
    enrichRepository(
      {
        ...repo,
        source: "demo",
        archived: false,
        disabled: false,
        fork: false,
        profileKey: "demo",
        profileLabel: "Demo"
      },
      null,
      []
    )
  );
}

module.exports = {
  demoRepositories
};
