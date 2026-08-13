const { buildConfig } = require("../src/lib/config");
const { getAuthenticatedUser, searchCandidateRepositories } = require("../src/lib/github");
const { enrichRepository } = require("../src/lib/scoring");
const { createStorage } = require("../src/lib/storage");
const { enrichTopProjectsWithTavily } = require("../src/lib/tavily");

async function main() {
  const config = buildConfig();
  if (!config.githubToken) {
    throw new Error("GitHub Token is required. Please configure a valid token before scanning projects.");
  }
  try {
    await getAuthenticatedUser(config.githubToken);
  } catch (error) {
    const message = String(error?.message || "");
    if (/401|bad credentials|requires authentication/i.test(message)) {
      throw new Error("GitHub Token is invalid or expired. Please replace it before scanning projects.");
    }
    throw error;
  }

  const storage = createStorage(config.storePath);
  const store = storage.load();
  const previous = new Map(Object.values(store.projects).map((project) => [project.fullName, project]));

  const result = await searchCandidateRepositories({
    token: config.githubToken,
    maxRepos: config.scanMaxRepos,
    pagesPerProfile: config.githubSearchPages
  });

  const preScoredRepositories = result.repositories.map((repo) => enrichRepository(repo, previous.get(repo.fullName), []));
  const externalSignals = await enrichTopProjectsWithTavily(preScoredRepositories, config.tavilyKey, 24);
  const enriched = result.repositories.map((repo) =>
    enrichRepository(repo, previous.get(repo.fullName), externalSignals.get(repo.fullName) || [])
  );

  storage.upsertProjects(enriched, {
    status: result.errors.length ? "completed-with-errors" : "completed",
    mode: "cli",
    profiles: result.profiles,
    received: result.repositories.length,
    errors: result.errors
  });

  console.log(
    JSON.stringify(
      {
        insertedOrUpdated: enriched.length,
        profiles: result.profiles.length,
        errors: result.errors.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
