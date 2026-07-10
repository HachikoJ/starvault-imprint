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

test("saving a triage note uses inline status and keeps the note section open", () => {
  const saver = functionBody("saveNote");
  const statusFn = functionBody("showNoteInlineStatus");
  const renderer = functionBody("renderDetail");

  assert.match(appSource, /noteInlineStatus:\s*null/);
  assert.match(appSource, /noteInlineStatusTimer:\s*null/);
  assert.match(appSource, /openNoteSectionFullName:\s*""/);
  assert.doesNotMatch(saver, /toast\(t\("noteSaved"\)\)/);
  assert.match(saver, /state\.openNoteSectionFullName\s*=\s*fullName/);
  assert.match(saver, /showNoteInlineStatus\("saved",\s*noteSavedInlineLabel\(noteStatus,\s*sideEffect\)\)/);
  assert.match(renderer, /observation-plan-inline-status/);
  assert.match(statusFn, /renderDetailPreservingScroll\(state\.selected\)/);
  assert.match(statusFn, /setTimeout\(\(\) => \{/);
  assert.match(statusFn, /2000/);
});

test("triage note placeholder uses learning-oriented wording", () => {
  assert.match(appSource, /notePlaceholder:\s*"记录你对这个项目的理解：值得学习的地方、需要留意的边界，以及后续想继续观察的问题\.\.\."/);
  assert.doesNotMatch(appSource, /notePlaceholder:\s*"[^"]*(避坑点|替代实现方式|下一次要验证|practical inspiration|alternative approaches)[^"]*"/i);
});

test("triage note refreshes only the selected project while preserving detail scroll", () => {
  const refresher = functionBody("refreshSelectedProjectAfterNoteChange");
  const saver = functionBody("saveNote");
  const remover = functionBody("deleteNote");
  const renderer = functionBody("renderDetailPreservingScroll");

  assert.match(renderer, /const detailTop = elements\.detailPanel\?\.scrollTop \?\? 0/);
  assert.match(renderer, /renderDetail\(project\)/);
  assert.match(renderer, /elements\.detailPanel\.scrollTop = detailTop/);
  assert.match(refresher, /api\(`\/api\/project\?fullName=\$\{encodeURIComponent\(fullName\)\}`\)/);
  assert.match(refresher, /mergeLocalProject\(project\)/);
  assert.match(refresher, /renderProjectPoolPage\(\)/);
  assert.match(refresher, /renderDetailPreservingScroll\(state\.selected\)/);
  assert.match(saver, /await refreshSelectedProjectAfterNoteChange\(fullName\)/);
  assert.match(remover, /await refreshSelectedProjectAfterNoteChange\(fullName\)/);
  assert.doesNotMatch(saver, /await loadProjects\(\)/);
  assert.doesNotMatch(saver, /await selectProject\(fullName\)/);
  assert.doesNotMatch(remover, /await loadProjects\(\)/);
  assert.doesNotMatch(remover, /await selectProject\(fullName\)/);
});

test("triage note actions keep feedback to the right of save and delete buttons", () => {
  const renderer = functionBody("renderDetail");
  const actionRowIndex = renderer.indexOf('<div class="note-action-row">');
  const saveIndex = renderer.indexOf('data-action="save-note"', actionRowIndex);
  const deleteIndex = renderer.indexOf('data-action="delete-note"', actionRowIndex);
  const statusIndex = renderer.indexOf("${noteInlineStatus}", actionRowIndex);

  assert.ok(actionRowIndex > -1, "note action row should render");
  assert.ok(saveIndex > actionRowIndex, "save button should render in action row");
  assert.ok(deleteIndex > saveIndex, "delete button should render after save");
  assert.ok(statusIndex > deleteIndex, "inline status should render to the right of note actions");
});

test("triage note action labels stay compact", () => {
  assert.match(appSource, /saveTriage:\s*"保存"/);
  assert.match(appSource, /deleteNote:\s*"删除"/);
  assert.match(appSource, /saveTriage:\s*"Save"/);
  assert.match(appSource, /deleteNote:\s*"Delete"/);
  assert.match(appSource, /statusDeep:\s*"优先验证"/);
  assert.match(appSource, /statusSkip:\s*"暂不合适"/);
});

test("triage status selection stays scoped and preserves scroll", () => {
  const selector = functionBody("setNoteStatus");
  const pointerGuard = functionBody("captureNoteStatusPointerScroll");
  const wire = functionBody("wireEvents");

  assert.match(pointerGuard, /data-action='set-note-status'/);
  assert.match(pointerGuard, /captureScrollPosition\(\)/);
  assert.match(pointerGuard, /event\.preventDefault\(\)/);
  assert.match(wire, /document\.addEventListener\("pointerdown",\s*captureNoteStatusPointerScroll\)/);
  assert.match(selector, /target\.closest\("\.note-section"\)/);
  assert.match(selector, /state\.noteStatusPointerScroll \|\| captureScrollPosition\(\)/);
  assert.match(selector, /section\?\.querySelectorAll\("\.note-status-chip"\)/);
  assert.doesNotMatch(selector, /document\.querySelectorAll\("\.note-status-chip"\)/);
  assert.match(selector, /state\.noteDrafts\[state\.selected\.fullName\]/);
  assert.match(selector, /restoreScrollPosition\(scrollPosition\)/);
  assert.match(selector, /requestAnimationFrame\(\(\) => restoreScrollPosition\(scrollPosition\)\)/);
});

test("triage note save requires a selected status before confirming", () => {
  const saver = functionBody("saveNote");
  const missingStatusIndex = saver.indexOf("if (!noteStatus) {");
  const draftIndex = saver.indexOf("state.noteDrafts[fullName] = { text: noteText, status: noteStatus };", missingStatusIndex);
  const warningIndex = saver.indexOf('showNoteInlineStatus("failed", t("noteStatusRequired"))', missingStatusIndex);

  assert.match(appSource, /noteStatusRequired:\s*"请选择研判状态"/);
  assert.match(saver, /if\s*\(!noteStatus\)\s*{/);
  assert.ok(draftIndex > missingStatusIndex, "missing status branch should preserve the typed note as a draft");
  assert.ok(warningIndex > draftIndex, "warning should render after preserving the draft");
  assert.match(saver, /showNoteInlineStatus\("failed",\s*t\("noteStatusRequired"\)\)/);
  assert.match(saver, /return/);
});

test("triage note save uses an inline confirm and cancel step", () => {
  const renderer = functionBody("renderDetail");
  const saver = functionBody("saveNote");
  const confirmer = functionBody("confirmPendingNoteSave");
  const canceler = functionBody("cancelPendingNoteSave");
  const revealer = functionBody("revealNoteSaveConfirmation");

  assert.match(appSource, /pendingNoteSaveConfirmation:\s*null/);
  assert.match(renderer, /noteSaveConfirmation/);
  assert.match(renderer, /data-action="confirm-save-note"/);
  assert.match(renderer, /data-action="cancel-save-note"/);
  assert.match(saver, /options = {}/);
  assert.match(saver, /if\s*\(!options\.confirmed\)\s*{/);
  assert.match(saver, /state\.pendingNoteSaveConfirmation\s*=/);
  assert.match(saver, /revealNoteSaveConfirmation\(fullName\)/);
  assert.match(confirmer, /saveNote\(fullName,\s*{\s*confirmed:\s*true\s*}\)/);
  assert.match(canceler, /state\.pendingNoteSaveConfirmation = null/);
  assert.match(canceler, /showNoteInlineStatus\("canceled",\s*t\("observationPlanCanceledInline"\)\)/);
  assert.match(revealer, /requestAnimationFrame/);
  assert.match(revealer, /\.note-confirm-row/);
  assert.match(revealer, /scrollIntoView\(\{\s*block:\s*"nearest",\s*behavior:\s*"smooth"\s*}\)/);
});

test("detail folded sections reuse the observation plan picker toggle", () => {
  const renderer = functionBody("renderDetail");
  const toggle = functionBody("detailFoldToggleMarkup");
  const pickerToggle = functionBody("observationPlanToggleIconMarkup");
  const picker = functionBody("renderObservationPlanPicker");
  const toggleCalls = renderer.match(/detailFoldToggleMarkup\(/g) || [];

  assert.match(pickerToggle, /observation-plan-toggle-icon/);
  assert.match(pickerToggle, /observation-plan-toggle-closed/);
  assert.match(pickerToggle, /observation-plan-toggle-open/);
  assert.match(picker, /observationPlanToggleIconMarkup\(\)/);
  assert.match(toggle, /observationPlanToggleIconMarkup\("detail-fold-toggle"\)/);
  assert.ok(toggleCalls.length >= 2, "more data and triage record should both render the same fold toggle");
});

test("triage note confirmations and save feedback disclose favorite and hide side effects", () => {
  const message = functionBody("noteSaveConfirmationMessage");
  const savedLabel = functionBody("noteSavedInlineLabel");
  const saver = functionBody("saveNote");

  assert.match(appSource, /noteSaveConfirmDeepDive:\s*"保存为「优先验证」并加入收藏？"/);
  assert.match(appSource, /noteSaveConfirmWatchUnfavorite:\s*"保存为「继续观察」并取消收藏？"/);
  assert.match(appSource, /noteSaveConfirmSkip:\s*"保存为「暂不合适」并隐藏该项目？"/);
  assert.match(appSource, /noteSavedFavoriteInline:\s*"已保存并收藏"/);
  assert.match(appSource, /noteSavedUnfavoritedInline:\s*"已保存并取消收藏"/);
  assert.match(appSource, /noteSavedHiddenInline:\s*"已保存并隐藏"/);
  assert.match(message, /status === "deep-dive"/);
  assert.match(message, /noteSaveConfirmDeepDive/);
  assert.match(message, /status === "watch" && previousStatus === "deep-dive"/);
  assert.match(message, /noteSaveConfirmWatchUnfavorite/);
  assert.match(message, /status === "skip"/);
  assert.match(message, /noteSaveConfirmSkip/);
  assert.match(savedLabel, /sideEffect\?\.favoriteRemoved/);
  assert.match(savedLabel, /noteSavedUnfavoritedInline/);
  assert.match(savedLabel, /status === "deep-dive"/);
  assert.match(savedLabel, /noteSavedFavoriteInline/);
  assert.match(savedLabel, /status === "skip"/);
  assert.match(savedLabel, /noteSavedHiddenInline/);
  assert.match(saver, /previousNoteStatus/);
  assert.match(saver, /previousStatus:\s*previousNoteStatus/);
  assert.match(saver, /const sideEffect = await applyNoteStatusSideEffect\(fullName,\s*noteStatus,\s*previousNoteStatus\)/);
  assert.match(saver, /showNoteInlineStatus\("saved",\s*noteSavedInlineLabel\(noteStatus,\s*sideEffect\)\)/);
});

test("confirmed triage status applies the right learning side effects", () => {
  const sideEffect = functionBody("applyNoteStatusSideEffect");
  const favorite = functionBody("ensureProjectFavorite");
  const unfavorite = functionBody("removeProjectFavorite");
  const toggler = functionBody("toggleFavorite");

  assert.match(sideEffect, /if \(noteStatus === "deep-dive"\)/);
  assert.match(sideEffect, /ensureProjectFavorite\(fullName\)/);
  assert.match(sideEffect, /if \(noteStatus === "watch" && previousStatus === "deep-dive"\)/);
  assert.match(sideEffect, /removeProjectFavorite\(fullName\)/);
  assert.match(sideEffect, /if \(noteStatus === "skip"\)/);
  assert.match(sideEffect, /dismissProject\(fullName,\s*{\s*source:\s*"triage"\s*}\)/);
  assert.match(favorite, /if \(current\?\.watched\) return/);
  assert.match(favorite, /toggleFavorite\(fullName,\s*{\s*silent:\s*true\s*}\)/);
  assert.match(unfavorite, /if \(!current\?\.watched\) return false/);
  assert.match(unfavorite, /toggleFavorite\(fullName,\s*{\s*silent:\s*true\s*}\)/);
  assert.match(toggler, /options = {}/);
  assert.doesNotMatch(toggler, /toast\(t\(watched \? "favoriteSaved" : "favoriteRemoved"\)\)/);
});

test("deleting a triage note uses an inline confirm and cancel step", () => {
  const renderer = functionBody("renderDetail");
  const remover = functionBody("deleteNote");
  const confirmer = functionBody("confirmPendingNoteDelete");
  const canceler = functionBody("cancelPendingNoteDelete");
  const statusFn = functionBody("showNoteInlineStatus");

  assert.match(appSource, /pendingNoteDeleteConfirmation:\s*null/);
  assert.doesNotMatch(remover, /toast\(t\("noteDeleted"\)\)/);
  assert.doesNotMatch(remover, /window\.confirm/);
  assert.match(renderer, /noteDeleteConfirmation/);
  assert.match(renderer, /data-action="confirm-delete-note"/);
  assert.match(renderer, /data-action="cancel-delete-note"/);
  assert.match(remover, /options = {}/);
  assert.match(remover, /if\s*\(!options\.confirmed\)\s*{/);
  assert.match(remover, /state\.pendingNoteDeleteConfirmation\s*=/);
  assert.match(remover, /state\.openNoteSectionFullName\s*=\s*fullName/);
  assert.match(confirmer, /deleteNote\(fullName,\s*{\s*confirmed:\s*true\s*}\)/);
  assert.match(canceler, /state\.pendingNoteDeleteConfirmation = null/);
  assert.match(canceler, /showNoteInlineStatus\("canceled",\s*t\("observationPlanCanceledInline"\)\)/);
  assert.match(statusFn, /kind === "deleted" \? "trash"/);
});

test("deleting a priority validation triage note also removes the favorite", () => {
  const remover = functionBody("deleteNote");
  const deletedLabel = functionBody("noteDeletedInlineLabel");
  const renderer = functionBody("renderDetail");

  assert.match(appSource, /noteDeleteConfirmWatch:\s*"删除这条研判记录？"/);
  assert.match(appSource, /noteDeleteConfirmDeepDive:\s*"删除「优先验证」研判并取消收藏？"/);
  assert.match(appSource, /noteDeletedUnfavoritedInline:\s*"已删除并取消收藏"/);
  assert.match(renderer, /noteDeleteConfirmationMessage\(pendingNoteDelete\.status\)/);
  assert.match(remover, /const savedNoteStatus =/);
  assert.match(remover, /if \(savedNoteStatus === "deep-dive"\)/);
  assert.match(remover, /favoriteRemoved\s*=\s*await removeProjectFavorite\(fullName\)/);
  assert.match(remover, /showNoteInlineStatus\("deleted",\s*noteDeletedInlineLabel\(sideEffect\)\)/);
  assert.match(deletedLabel, /sideEffect\?\.favoriteRemoved/);
  assert.match(deletedLabel, /noteDeletedUnfavoritedInline/);
});

test("triage note summary shows a collapsed note preview", () => {
  const renderer = functionBody("renderDetail");

  assert.match(renderer, /noteSummaryPreview/);
  assert.match(renderer, /noteOpen/);
  assert.match(renderer, /state\.openNoteSectionFullName === project\.fullName/);
  assert.match(renderer, /<details class="detail-section note-section" \$\{noteOpen \? "open" : ""\}>/);
  assert.match(renderer, /class="note-summary-preview"/);
  assert.match(renderer, /escapeHtml\(noteSummaryPreview\)/);
});

test("triage summary status pill shows the saved status instead of the current draft", () => {
  const renderer = functionBody("renderDetail");

  assert.match(renderer, /const savedNoteStatus = project\.triageStatus \|\| ""/);
  assert.match(renderer, /const savedNoteStatusPill = savedNoteStatus/);
  assert.match(renderer, /const noteStatus = pendingNoteSave\?\.status \|\| noteDraft\.status \|\| savedNoteStatus/);
  assert.match(renderer, /const active = value === noteStatus/);
  assert.match(renderer, /<strong>\$\{escapeHtml\(noteStatusLabel\(savedNoteStatus\)\)\}/);
  assert.match(renderer, /<span class="status-pill">\$\{escapeHtml\(noteStatusLabel\(savedNoteStatus\)\)\}<\/span>`\s*:\s*""/s);
  assert.match(renderer, /\$\{savedNoteStatusPill\}/);
});

test("manual triage note expand and collapse are remembered for the selected project", () => {
  assert.match(appSource, /document\.addEventListener\(\s*"toggle"/);
  assert.match(appSource, /#view-projects \.note-section/);
  assert.match(appSource, /state\.openNoteSectionFullName = noteSection\.open \? state\.selected\.fullName : ""/);
});

test("expanding more data and triage record scrolls the detail panel to bottom", () => {
  const scroller = functionBody("scrollDetailPanelToBottomOnExpand");
  const wire = functionBody("wireEvents");

  assert.match(scroller, /requestAnimationFrame/);
  assert.match(scroller, /elements\.detailPanel\.scrollHeight/);
  assert.match(scroller, /scrollTo\?\.\(\{\s*top:\s*elements\.detailPanel\.scrollHeight/s);
  assert.match(scroller, /elements\.detailPanel\.scrollTop = elements\.detailPanel\.scrollHeight/);
  assert.match(wire, /#view-projects \.detail-more-section,\s*#view-projects \.note-section/);
  assert.match(wire, /scrollDetailPanelToBottomOnExpand\(detailFoldSection\)/);
});
