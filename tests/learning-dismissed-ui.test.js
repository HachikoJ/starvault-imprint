const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

function functionBody(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = appSource.indexOf("\nfunction ", start + 1);
  return appSource.slice(start, next === -1 ? appSource.length : next);
}

function anyFunctionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("dismissed project samples are collapsed behind an explicit toggle by default", () => {
  const renderer = functionBody("renderDismissedProjectSamples");

  assert.match(appSource, /dismissedSamplesExpanded:\s*false/);
  assert.match(renderer, /state\.dismissedSamplesExpanded/);
  assert.match(renderer, /if\s*\(!expanded\)\s*\{/);
  assert.doesNotMatch(renderer, /dismissed-summary-row/);
});

test("expanded dismissed samples show an empty placeholder when there are no hidden projects", () => {
  const renderer = functionBody("renderDismissedProjectSamples");

  assert.match(renderer, /if\s*\(!items\.length\)\s*\{/);
  assert.match(renderer, /dismissed-empty/);
  assert.match(renderer, /noDismissedProjects/);
  assert.match(renderer, /noDismissedProjectsHint/);
});

test("dismissed project panel header toggles the samples", () => {
  assert.match(indexSource, /data-dismissed-panel-toggle/);
  assert.match(indexSource, /data-action="toggle-dismissed-samples"/);
  assert.match(indexSource, /role="button"/);
  assert.match(indexSource, /dismissed-count-badge/);
  assert.match(indexSource, /dismissed-toggle-icon/);
  assert.match(appSource, /#dismissed-toggle-icon/);
  assert.match(appSource, /collapsePanelShort/);
  assert.match(appSource, /expandPanelShort/);
  assert.match(appSource, /function foldToggleIconLabel\(/);
  assert.match(appSource, /toggleIcon\.innerHTML = foldToggleIconLabel\(expanded\)/);
});

test("dismissed samples temporarily collapse the preference profile", () => {
  const layoutSync = functionBody("syncDismissedSamplesLayout");

  assert.match(indexSource, /id="preference-profile-toggle"/);
  assert.match(indexSource, /data-action="expand-preference-panel"/);
  assert.match(indexSource, /id="preference-profile-toggle"[\s\S]*hidden/);
  assert.match(appSource, /is-collapsed-for-dismissed/);
  assert.match(appSource, /is-dismissed-expanded/);
  assert.match(layoutSync, /preferenceHead\.dataset\.action = "expand-preference-panel"/);
  assert.match(layoutSync, /preferenceHead\.setAttribute\("role", "button"\)/);
  assert.match(layoutSync, /preferenceHead\.setAttribute\("tabindex", "0"\)/);
  assert.match(appSource, /collapsedPreferenceHead/);
});

test("clicking outside dismissed samples collapses the temporary sample view", () => {
  assert.match(appSource, /function collapseDismissedSamples\(/);
  assert.match(appSource, /function clickStartedInsideDismissedPanel\(/);
  assert.match(appSource, /event\.composedPath/);
  assert.match(appSource, /#learning-dismissed-projects/);
  assert.match(appSource, /collapseDismissedSamples\(\)/);
});

test("editing dismissed samples preserves the list scroll position", () => {
  const renderer = functionBody("renderDismissedProjectSamples");
  const scrollReader = functionBody("dismissedListScrollState");
  const scrollRestorer = functionBody("restoreDismissedListScroll");
  const editorRevealer = functionBody("revealDismissedEditor");

  assert.match(renderer, /const scrollState = dismissedListScrollState\(\)/);
  assert.match(renderer, /restoreDismissedListScroll\(scrollState\)/);
  assert.match(renderer, /revealDismissedEditor\(state\.editingDismissedFeedback, scrollState\)/);
  assert.match(scrollReader, /\.dismissed-sample-list/);
  assert.match(scrollReader, /scrollTop/);
  assert.match(scrollReader, /window\.scrollY/);
  assert.match(scrollRestorer, /list\.scrollTop = scrollState\.top/);
  assert.match(scrollRestorer, /window\.scrollTo\(scrollState\.pageX, scrollState\.pageY\)/);
  assert.match(editorRevealer, /dismissed-feedback-grid/);
  assert.match(editorRevealer, /getBoundingClientRect/);
  assert.match(editorRevealer, /targetRect\.bottom > visibleBottom/);
});

test("dismissed edit save and cancel use inline status feedback", () => {
  const renderer = functionBody("renderDismissedProjectSamples");
  const statusFn = functionBody("showDismissedFeedbackInlineStatus");
  const saver = functionBody("saveDismissedFeedback");
  const canceler = functionBody("cancelDismissedFeedback");

  assert.match(appSource, /dismissedFeedbackInlineStatus:\s*null/);
  assert.match(appSource, /dismissedFeedbackInlineStatusTimer:\s*null/);
  assert.match(renderer, /state\.dismissedFeedbackInlineStatus\?\.fullName === item\.fullName/);
  assert.match(renderer, /observation-plan-inline-status/);
  assert.match(statusFn, /setTimeout\(\(\) => \{/);
  assert.match(statusFn, /2000/);
  assert.match(saver, /showDismissedFeedbackInlineStatus\(fullName, "saved", t\("feedbackTagsSaved"\)\)/);
  assert.match(canceler, /showDismissedFeedbackInlineStatus\(fullName, "canceled", t\("observationPlanCanceledInline"\)\)/);
});

test("dismiss undo notice uses a spinner instead of replacing the label with busy text", () => {
  const projectNotice = functionBody("renderProjectDismissNotice");
  const leaderboardNotice = functionBody("renderLeaderboardDismissNotice");

  [projectNotice, leaderboardNotice].forEach((renderer) => {
    assert.match(renderer, /renderActionLabelContent\("refresh", t\("undoDismiss"\), undoBusy\)/);
    assert.match(renderer, /local-action-loading/);
    assert.doesNotMatch(renderer, /t\("githubActionBusy"\)/);
  });
});

test("clearing learning records uses inline confirmation and loading feedback", () => {
  const controls = functionBody("memoryClearControls");
  const clear = anyFunctionBody("clearMemoryEvents");
  const confirm = anyFunctionBody("confirmClearMemoryEvents");
  const cancel = functionBody("cancelClearMemoryEvents");
  const wire = anyFunctionBody("wireEvents");

  assert.match(appSource, /pendingMemoryClearRange:\s*""/);
  assert.match(appSource, /memoryClearBusyRange:\s*""/);
  assert.match(appSource, /memoryClearCompleteStatus:\s*""/);
  assert.match(appSource, /memoryClearCompleteTimer:\s*null/);
  assert.match(controls, /state\.pendingMemoryClearRange/);
  assert.match(controls, /state\.memoryClearCompleteStatus/);
  assert.match(controls, /memory-clear-confirm-row/);
  assert.match(controls, /memory-clear-complete-row/);
  assert.match(controls, /data-action="confirm-clear-memory-events"/);
  assert.match(controls, /data-action="cancel-clear-memory-events"/);
  assert.match(controls, /memory-clear-confirm-button/);
  assert.match(controls, /memory-clear-confirm-primary/);
  assert.match(controls, /const confirmLabel = busy \? t\("clearBehaviorClearing"\) : t\("clearBehaviorConfirmAction"\)/);
  assert.match(controls, /busy\s*\?\s*renderMiniActionBusy\(confirmLabel\)\s*:\s*iconLabel\("trash",\s*confirmLabel\)/);
  assert.doesNotMatch(controls, /renderActionLabelContent\("trash",\s*confirmLabel,\s*busy\)/);
  assert.match(appSource, /function showMemoryClearCompleteStatus\(label\)/);
  assert.match(appSource, /state\.memoryClearCompleteStatus = label/);
  assert.match(appSource, /state\.memoryClearCompleteStatus = ""/);
  assert.doesNotMatch(clear, /window\.confirm/);
  assert.match(clear, /state\.memoryClearCompleteStatus = ""/);
  assert.match(clear, /state\.pendingMemoryClearRange = range/);
  assert.match(confirm, /state\.memoryClearBusyRange = range/);
  assert.match(confirm, /showMemoryClearCompleteStatus\(completeLabel\)/);
  assert.doesNotMatch(confirm, /showLearningInlineStatus\("saved"/);
  assert.match(confirm, /finally\s*{\s*state\.memoryClearBusyRange = ""/s);
  assert.match(cancel, /state\.pendingMemoryClearRange = ""/);
  assert.match(wire, /confirmClearMemoryEvents\(target\.dataset\.clearRange \|\| "1d"\)/);
  assert.match(wire, /cancelClearMemoryEvents\(\)/);
});

test("dismissed negative labels are compact and exclude non-preference metadata", () => {
  const renderer = functionBody("renderDismissedProjectSamples");

  assert.match(renderer, /dismissed-negative-inline/);
  assert.match(renderer, /tag\.kind !== "language"/);
  assert.match(renderer, /tag\.kind !== "license"/);
});

test("single dismissed sample stays content-sized instead of stretching the panel", () => {
  const renderer = functionBody("renderDismissedProjectSamples");

  assert.match(renderer, /items\.length === 1 \? "is-single" : "is-scrollable"/);
  assert.match(appSource, /dismissed-sample-list \$\{items\.length === 1/);
});

test("dismissed reason display prefers the user's edited reason", () => {
  const renderer = functionBody("renderDismissedProjectSamples");

  assert.match(renderer, /feedback\.reason\s*\|\|\s*feedback\.note\s*\|\|\s*\(state\.language === "zh"/);
});

test("preference group headings show record counts", () => {
  const renderer = functionBody("renderPreferenceGroup");

  assert.match(renderer, /preferenceEntryCount\(values\)/);
  assert.match(renderer, /preference-group-count/);
  assert.match(renderer, /fmtNumber\(count\)/);
});

test("learning learned card targets the whole preference profile", () => {
  const renderer = functionBody("renderLearningLoop");
  const scroller = functionBody("scrollToLearningSection");

  assert.match(renderer, /"learningLoopLearned"[\s\S]*"preferenceProfile"/);
  assert.match(renderer, /target === "preferenceProfile" \? t\("preferenceProfile"\)/);
  assert.match(scroller, /if \(section === "preferenceProfile"\) \{/);
  assert.match(scroller, /expandPreferencePanel\(\)/);
  assert.match(scroller, /preferenceProfile: "#view-learning \.learning-preference-panel"/);
  assert.match(scroller, /scrollIntoView\(\{\s*block:\s*"start",\s*behavior:\s*"smooth"\s*}\)/);
  assert.match(scroller, /\? \[target, \.\.\.target\.querySelectorAll\("\.learning-subpanel"\)\]/);
});
