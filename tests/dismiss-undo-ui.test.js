const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

function functionBody(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = appSource.indexOf("\nfunction ", start + 1);
  return appSource.slice(start, next === -1 ? appSource.length : next);
}

test("dismiss notice is a single latest undo slot", () => {
  const dismisser = functionBody("dismissProject");

  assert.match(appSource, /projectDismissNoticeSeq:\s*0/);
  assert.match(dismisser, /const noticeSeq = \+\+state\.projectDismissNoticeSeq/);
  assert.match(dismisser, /seq:\s*noticeSeq/);
  assert.match(dismisser, /project:\s*current \? \{ \.\.\.current \} : null/);
  assert.match(dismisser, /poolIndex:/);
  assert.match(dismisser, /if \(state\.projectDismissNotice\?\.seq === noticeSeq\)/);
});

test("undo only restores the current latest dismissed project after API success", () => {
  const undo = functionBody("undoDismissProject");
  const restorer = functionBody("restoreLocalProject");

  assert.match(undo, /if \(!notice \|\| notice\.fullName !== fullName \|\| notice\.restored\) return/);
  assert.match(undo, /state\.projectDismissNotice\?\.seq !== noticeSeq/);
  assert.match(undo, /const restoredProject = result\.project \|\| notice\.project/);
  assert.match(undo, /restoreLocalProject\(restoredProject, notice\)/);
  assert.match(restorer, /upsertProjectAt\(state\.projectPool\.items, project, notice\.poolIndex/);
  assert.match(restorer, /state\.projectPool\.total \+= 1/);
});

test("restored dismissed projects turn skip triage into an unsaved draft", () => {
  const normalizer = functionBody("projectWithRestoredNoteDraft");
  const restorer = functionBody("restoreLocalProject");
  const restoreFromLearning = functionBody("restoreDismissedProject");
  const loader = functionBody("loadProjects");
  const selector = functionBody("selectProject");

  assert.match(normalizer, /restoredNoteDraft/);
  assert.match(normalizer, /project\.triageStatus === "skip"/);
  assert.match(normalizer, /state\.pendingRestoredProjectFullName === project\.fullName/);
  assert.match(normalizer, /state\.restoredSelectedFullName === project\.fullName/);
  assert.match(normalizer, /state\.noteDrafts\[project\.fullName\]/);
  assert.match(normalizer, /state\.noteDrafts\[project\.fullName\]\s*=\s*{\s*text:\s*draftText,\s*status:\s*""\s*}/s);
  assert.match(normalizer, /triageStatus:\s*""/);
  assert.match(normalizer, /note:\s*""/);
  assert.match(restorer, /project = projectWithRestoredNoteDraft\(project\)/);
  assert.match(restoreFromLearning, /mergeLocalProject\(projectWithRestoredNoteDraft\(result\.project\)\)/);
  assert.match(loader, /items:\s*\(projects\.items \|\| \[\]\)\.map\(projectWithRestoredNoteDraft\)/s);
  assert.match(selector, /projectWithRestoredNoteDraft\(await api\(`\/api\/project\?fullName=/);
});
