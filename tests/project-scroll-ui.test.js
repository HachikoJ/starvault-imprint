const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("local action rerenders preserve the inner project list scroll container", () => {
  const helper = functionBody("projectListScrollElement");
  const renderer = functionBody("renderLocalActionSurfaces");
  const selector = functionBody("selectProject");

  assert.match(helper, /\.project-row-scroll/);
  assert.match(renderer, /projectListScrollElement\(\)\?\.scrollTop/);
  assert.match(renderer, /const projectScroll = projectListScrollElement\(\)/);
  assert.match(selector, /projectListScrollElement\(\)\?\.scrollTop/);
  assert.match(selector, /const projectScroll = projectListScrollElement\(\)/);
});

test("GitHub action rerenders preserve project, detail, leaderboard, and page scroll", () => {
  const renderer = functionBody("renderGithubActionSurfaces");
  const result = functionBody("applyGithubActionResult");
  const secondary = functionBody("loadSecondaryData");
  const star = functionBody("starGithubRepo");
  const unstar = functionBody("unstarGithubRepo");
  const fork = functionBody("forkGithubRepo");

  assert.match(renderer, /const projectTop = projectListScrollElement\(\)\?\.scrollTop \?\? 0/);
  assert.match(renderer, /const leaderboardTop = elements\.leaderboardList\?\.scrollTop \?\? 0/);
  assert.match(renderer, /const detailTop = elements\.detailPanel\?\.scrollTop \?\? 0/);
  assert.match(renderer, /const pageX = window\.scrollX \|\| 0/);
  assert.match(renderer, /const pageY = window\.scrollY \|\| 0/);
  assert.match(renderer, /const projectScroll = projectListScrollElement\(\)/);
  assert.match(renderer, /projectScroll\.scrollTop = projectTop/);
  assert.match(renderer, /elements\.leaderboardList\.scrollTop = leaderboardTop/);
  assert.match(renderer, /elements\.detailPanel\.scrollTop = detailTop/);
  assert.match(renderer, /window\.scrollTo\?\.\(\{\s*left:\s*pageX,\s*top:\s*pageY,\s*behavior:\s*"auto"\s*\}\)/s);
  assert.match(result, /renderGithubActionSurfaces\(\)/);
  assert.match(secondary, /api\("\/api\/github\/actions"\)[\s\S]*renderGithubActionSurfaces\(\)/);
  assert.match(star, /setGithubActionBusy\(fullName,\s*"star",\s*true\)/);
  assert.match(unstar, /setGithubActionBusy\(fullName,\s*"star",\s*true\)/);
  assert.match(fork, /setGithubActionBusy\(fullName,\s*"fork",\s*true\)/);
});

test("project GitHub badges do not fall through to card selection", () => {
  const wire = functionBody("wireEvents");

  assert.match(wire, /\.repo-github-row/);
  assert.match(wire, /\.leaderboard-github-row/);
  assert.match(wire, /\.github-stat-actions/);
  assert.match(wire, /\.github-stat-count/);
  assert.match(wire, /\.trend-tag/);
});
