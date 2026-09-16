const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const htmlSource = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("generated and edited observation plans reveal the editable logic from the start", () => {
  const generator = functionBody("generateObservationPlan");
  const collector = functionBody("collectObservationPlanDraft");
  const editor = functionBody("editObservationPlan");
  const revealer = functionBody("revealObservationPlanEditorStart");

  assert.match(generator, /showObservationPlanInlineStatus\("saved",\s*t\("observationPlanGenerated"\),\s*\{\s*preserveInputs:\s*true\s*\}\)/);
  assert.match(generator, /revealObservationPlanEditorStart\(\)/);
  assert.match(generator, /state\.observationPlanDraft = \{[\s\S]*\.\.\.\(result\.plan \|\| \{\}\)[\s\S]*name:\s*nameInput[\s\S]*nameEn:\s*nameInput/s);
  assert.match(collector, /name:\s*nameInput \|\| name/);
  assert.match(collector, /nameEn:\s*nameInput \|\|/);
  assert.match(editor, /renderObservationPlans\(\)/);
  assert.match(editor, /revealObservationPlanEditorStart\(\)/);
  assert.match(revealer, /requestAnimationFrame/);
  assert.match(revealer, /elements\.observationPlanLogic/);
  assert.match(revealer, /closest\("\.observation-plan-logic"\)/);
  assert.match(revealer, /scrollTop = 0/);
  assert.match(revealer, /scrollIntoView\(\{\s*block:\s*"start",\s*behavior:\s*"smooth"\s*}\)/);
});

test("generating an observation plan shows inline button loading state", () => {
  const generator = functionBody("generateObservationPlan");
  const renderer = functionBody("renderObservationPlans");
  const updater = functionBody("updateObservationPlanGenerateButton");

  assert.match(appSource, /observationPlanGenerating:\s*false/);
  assert.match(generator, /if\s*\(state\.observationPlanGenerating\)\s*return/);
  assert.match(generator, /state\.observationPlanGenerating = true/);
  assert.match(generator, /finally\s*{\s*state\.observationPlanGenerating = false/s);
  assert.match(renderer, /updateObservationPlanGenerateButton\(\)/);
  assert.match(updater, /\[data-action='generate-observation-plan'\]/);
  assert.match(updater, /button\.disabled = busy/);
  assert.match(updater, /local-action-loading/);
  assert.match(updater, /renderActionLabelContent\("sparkle",\s*t\("generateObservationPlan"\),\s*busy\)/);
});

test("generating an observation plan requires a name and detailed need", () => {
  const generator = functionBody("generateObservationPlan");
  const toolbar = functionBody("renderObservationPlanToolbar");
  const status = functionBody("showObservationPlanInlineStatus");

  assert.match(appSource, /observationPlanGenerateRequired/);
  assert.match(generator, /const nameInput = elements\.observationPlanName\?\.value\.trim\(\) \|\| ""/);
  assert.match(generator, /const ideaInput = elements\.observationPlanIdea\?\.value\.trim\(\) \|\| ""/);
  assert.match(generator, /if\s*\(!nameInput \|\| !ideaInput\)\s*{[\s\S]*showObservationPlanInlineStatus\("failed",\s*t\("observationPlanGenerateRequired"\),\s*\{\s*preserveInputs:\s*true\s*\}\)[\s\S]*return;\s*}/);
  assert.equal(generator.indexOf('showObservationPlanInlineStatus("failed"') < generator.indexOf("state.observationPlanGenerating = true"), true);
  assert.doesNotMatch(generator, /elements\.observationPlanIdea\?\.value\.trim\(\) \|\| elements\.observationPlanName\?\.value\.trim\(\)/);
  assert.match(toolbar, /kind === "failed" \? "x"/);
  assert.match(appSource, /function captureObservationPlanFormValues\(\)/);
  assert.match(appSource, /function restoreObservationPlanFormValues\(values\)/);
  assert.match(status, /const preservedInputs = options\.preserveInputs \? captureObservationPlanFormValues\(\) : null/);
  assert.match(status, /restoreObservationPlanFormValues\(preservedInputs\)/);
});

test("observation plan generation failures use inline status and preserve inputs", () => {
  const generator = functionBody("generateObservationPlan");

  assert.match(appSource, /observationPlanGenerateFailed/);
  assert.match(generator, /catch \(error\) \{[\s\S]*showObservationPlanInlineStatus\("failed",\s*error\?\.message \|\| t\("observationPlanGenerateFailed"\),\s*\{\s*preserveInputs:\s*true\s*\}\)/);
});

test("observation plan recorded needs are read-only and only deletable in edit mode", () => {
  const renderer = functionBody("renderObservationPlans");
  const requirements = functionBody("renderObservationPlanRequirements");

  assert.match(requirements, /function renderObservationPlanRequirements\(plan = \{\}, options = \{\}\)/);
  assert.match(requirements, /const canDelete = Boolean\(options\.canDelete\)/);
  assert.match(requirements, /<span class="observation-requirement-text">\$\{escapeHtml\(typeof item === "string" \? item : item\.text \|\| ""\)\}<\/span>/);
  assert.match(requirements, /canDelete\s*\?\s*`[\s\S]*data-action="delete-observation-requirement"[\s\S]*`\s*:\s*""/);
  assert.match(renderer, /renderObservationPlanRequirements\(editable,\s*\{\s*canDelete:\s*state\.observationPlanEditMode === "edit" && !editable\?\.builtIn\s*\}\)/);
  assert.match(appSource, /deleteObservationRequirement\(Number\(target\.dataset\.requirementIndex\)\)/);
  assert.doesNotMatch(requirements, /<input/);
  assert.doesNotMatch(requirements, /edit-observation-requirement/);
  assert.doesNotMatch(appSource, /elements\.observationPlanRequirements\?\.addEventListener\("change"/);
  assert.doesNotMatch(appSource, /closest\?\.\("\[data-action='edit-observation-requirement'\]"\)/);
});

test("default observation plan can only be viewed from settings", () => {
  const toolbar = functionBody("renderObservationPlanToolbar");
  const picker = functionBody("renderObservationPlanPicker");
  const renderer = functionBody("renderObservationPlans");
  const editor = functionBody("editObservationPlan");

  assert.match(toolbar, /editable\?\.builtIn\s*\?\s*""\s*:\s*`<button[\s\S]*data-action="edit-observation-plan"/);
  assert.match(picker, /const editButton = plan\.builtIn\s*\?\s*""\s*:\s*`<button[\s\S]*data-action="edit-observation-plan"/);
  assert.match(picker, /\$\{editButton\}[\s\S]*\$\{deleteButton\}/);
  assert.match(renderer, /renderObservationPlanRequirements\(editable,\s*\{\s*canDelete:\s*state\.observationPlanEditMode === "edit" && !editable\?\.builtIn\s*\}\)/);
  assert.match(editor, /if\s*\(selected\?\.builtIn\)\s*{[\s\S]*state\.observationPlanDraft = null;[\s\S]*state\.observationPlanEditMode = "";[\s\S]*renderObservationPlans\(\);[\s\S]*return;[\s\S]*}/);
  assert.doesNotMatch(editor, /selected\?\.builtIn \? copyName/);
});

test("observation plan draft actions preserve inputs until save", () => {
  const renderer = functionBody("renderObservationPlans");
  const generator = functionBody("generateObservationPlan");
  const outsideClick = functionBody("collapseObservationPlanEditOnOutsideClick");
  const previewer = functionBody("previewObservationPlan");
  const currentPreview = functionBody("currentObservationPlanPreview");
  const switcher = functionBody("switchObservationPlan");
  const editor = functionBody("editObservationPlan");
  const collector = functionBody("collectObservationPlanDraft");
  const canceler = functionBody("cancelObservationPlanDraft");
  const saver = functionBody("saveObservationPlan");
  const status = functionBody("showObservationPlanInlineStatus");

  assert.match(appSource, /function observationPlanTitleMatches\(planName = "", plan = \{\}\)/);
  assert.match(appSource, /function observationPlanRequirementsText\(plan = \{\}\)/);
  assert.match(appSource, /function observationPlanRequirementDraftsFromText\(text = ""\)/);
  assert.match(appSource, /function collapseObservationPlanEditOnOutsideClick\(event\)/);
  assert.match(appSource, /observationPlanPreviewId:\s*""/);
  assert.match(renderer, /const storedActive = state\.observationPlans\?\.active \|\| null/);
  assert.match(renderer, /const active = plans\.find\(\(plan\) => plan\.id === storedActive\?\.id\) \|\| plans\.find\(\(plan\) => plan\.active\) \|\| plans\[0\] \|\| storedActive \|\| null/);
  assert.match(renderer, /const selectedId = state\.observationPlanPreviewId \|\| elements\.observationPlanSelect\.value \|\| active\?\.id \|\| ""/);
  assert.match(renderer, /elements\.observationPlanRequirements\.innerHTML = renderObservationPlanRequirements\(editable,\s*\{\s*canDelete:\s*state\.observationPlanEditMode === "edit" && !editable\?\.builtIn\s*\}\)/);
  assert.match(previewer, /state\.observationPlanPreviewId = id/);
  assert.match(currentPreview, /const storedActive = state\.observationPlans\?\.active \|\| null/);
  assert.match(currentPreview, /plans\.find\(\(plan\) => plan\.id === selectedId\) \|\| active \|\| \{\}/);
  assert.match(switcher, /state\.observationPlanPreviewId = id/);
  assert.match(renderer, /if\s*\(draft\)\s*{\s*elements\.observationPlanName\.value = observationPlanLabel\(draft\);?\s*}/);
  assert.doesNotMatch(renderer, /editable\?\.builtIn \? "" : observationPlanLabel\(editable\)/);
  assert.match(editor, /restoreObservationPlanFormValues\(\{\s*name:\s*observationPlanLabel\(state\.observationPlanDraft\),\s*idea:\s*observationPlanRequirementsText\(selected\)\s*}\)/);
  assert.match(generator, /showObservationPlanInlineStatus\("saved",\s*t\("observationPlanGenerated"\),\s*\{\s*preserveInputs:\s*true\s*\}\)/);
  assert.match(generator, /const isEditingObservationPlan = state\.observationPlanEditMode === "edit" && Boolean\(state\.observationPlanDraft\)/);
  assert.match(generator, /const editingPlanId = isEditingObservationPlan \? state\.observationPlanDraft\?\.id \|\| currentPlan\?\.id \|\| "" : ""/);
  assert.match(generator, /body:\s*JSON\.stringify\(\{\s*name:\s*nameInput,\s*idea\s*}\)/s);
  assert.doesNotMatch(generator, /requirements:\s*requestRequirements/);
  assert.doesNotMatch(generator, /requirementsMode:/);
  assert.doesNotMatch(generator, /currentSearchLogic:/);
  assert.doesNotMatch(generator, /recordLatestRequirement/);
  assert.match(generator, /const resultRequirements = Array\.isArray\(result\.plan\?\.requirements\) \? result\.plan\.requirements : \[\]/);
  assert.match(generator, /const draftRequirements = resultRequirements\.length \? resultRequirements : \[\]/);
  assert.match(generator, /id:\s*editingPlanId,/);
  assert.doesNotMatch(generator, /id:\s*editingPlanId \|\| result\.plan\?\.id/);
  assert.match(generator, /requirements:\s*draftRequirements/);
  assert.doesNotMatch(generator, /requirements:\s*refreshedPlan\.requirements \|\| currentPlan\?\.requirements \|\| \[\]/);
  assert.match(collector, /const ideaRequirements = state\.observationPlanEditMode === "edit" \? observationPlanRequirementDraftsFromText\(idea\) : \[\]/);
  assert.match(collector, /requirements:\s*ideaRequirements\.length \? ideaRequirements : Array\.isArray\(draft\.requirements\)/);
  assert.match(canceler, /const shouldClearPrefilledInputs = state\.observationPlanEditMode === "edit"/);
  assert.match(canceler, /showObservationPlanInlineStatus\("canceled",\s*t\("observationPlanCanceledInline"\),\s*shouldClearPrefilledInputs \? \{\s*clearInputs:\s*true\s*\} : \{\s*preserveInputs:\s*true\s*\}\)/);
  assert.match(outsideClick, /state\.observationPlanEditMode !== "edit"/);
  assert.match(outsideClick, /#observation-plan-name,\s*#observation-plan-idea,\s*#observation-plan-logic/);
  assert.match(outsideClick, /\[data-action='cancel-observation-plan-draft'\],\s*\[data-action='save-observation-plan'\],\s*\[data-action='generate-observation-plan'\]/);
  assert.match(outsideClick, /state\.observationPlanDraft = null/);
  assert.match(outsideClick, /clearObservationPlanFormValues\(\)/);
  assert.match(outsideClick, /renderObservationPlans\(\)/);
  assert.match(appSource, /collapseObservationPlanEditOnOutsideClick\(event\)/);
  assert.match(
    saver,
    /showObservationPlanInlineStatus\(\s*"saved",\s*adoptedSameNamePlan\s*\?\s*t\("observationPlanMergedIntoSameName"\)\.replace\("\{name\}",\s*result\.plan\.name \|\| ""\)\s*:\s*t\("observationPlanSavedInline"\),\s*\{\s*clearInputs:\s*true\s*\}\s*\)/
  );
  assert.match(saver, /const previousActive = state\.observationPlans\?\.active \|\| null/);
  assert.match(saver, /active:\s*previousActive \|\| state\.observationPlans\?\.active/);
  assert.match(saver, /state\.observationPlanPreviewId = result\.plan\.id/);
  assert.match(saver, /elements\.observationPlanSelect\.value = result\.plan\.id/);
  assert.doesNotMatch(saver, /switchObservationPlan\(result\.plan\.id,\s*\{\s*silent:\s*true\s*\}\)/);
  assert.doesNotMatch(saver, /window\.confirm/);
  assert.match(saver, /queueObservationPlanSwitchConfirm\(result\.plan\.id\)/);
  assert.match(switcher, /queueObservationPlanSwitchConfirm\(id\)/);
  assert.match(appSource, /observationPlanPendingConfirm:\s*null/);
  assert.match(appSource, /function confirmObservationPlanPendingAction\(\)/);
  assert.match(appSource, /data-action="confirm-observation-plan-action"/);
  assert.match(appSource, /data-action="export-observation-plan-delete-backup"/);
  assert.doesNotMatch(appSource, /window\.confirm/);
  assert.match(appSource, /state\.observationPlanPreviewId = elements\.observationPlanSelect\?\.value \|\| ""/);
  assert.match(appSource, /function clearObservationPlanFormValues\(\)/);
  assert.match(status, /if\s*\(options\.clearInputs\)\s*{\s*clearObservationPlanFormValues\(\);/);
});

test("switching an observation plan requires a prominent blocking confirmation", () => {
  const renderer = functionBody("renderObservationPlanPendingConfirm");
  const queue = functionBody("queueObservationPlanSwitchConfirm");
  const confirmer = functionBody("confirmObservationPlanPendingAction");
  const switcher = functionBody("switchObservationPlan");
  const revealer = functionBody("revealObservationPlanConfirmStart");

  assert.match(renderer, /class="observation-plan-confirm-layer"/);
  assert.match(renderer, /role="alertdialog" aria-modal="true"/);
  assert.match(renderer, /observationPlanSwitchConfirmKicker/);
  assert.match(renderer, /observationPlanSwitchConfirmTitle/);
  assert.match(renderer, /data-action="cancel-observation-plan-confirm"/);
  assert.match(renderer, /data-action="confirm-observation-plan-action"/);
  assert.match(queue, /state\.observationPlanPendingConfirm = \{[\s\S]*type:\s*"switch"[\s\S]*message:\s*t\("observationPlanSwitchConfirm"\)/);
  assert.doesNotMatch(queue, /api\(/);
  assert.match(confirmer, /switchObservationPlan\(pending\.planId,\s*\{\s*confirmed:\s*true\s*\}\)/);
  assert.match(switcher, /if\s*\(!options\.silent && !options\.confirmed\)\s*\{\s*queueObservationPlanSwitchConfirm\(id\);\s*return;\s*\}/);
  assert.match(revealer, /confirmButton\?\.focus\?\.\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(appSource, /observationPlanSwitchConfirm:\s*"当前仅选中了「\{name\}」，方案尚未切换/);
  assert.match(cssSource, /\.observation-plan-confirm-layer\s*{[^}]*position:\s*fixed[^}]*z-index:\s*1100/s);
  assert.match(cssSource, /\.observation-plan-confirm-message\s*{[^}]*font-weight:\s*800/s);
  assert.match(cssSource, /\.observation-plan-confirm-actions\s+\.observation-plan-confirm-button\s*{[^}]*min-block-size:\s*42px/s);
});

test("observation plan form is grouped into selection generation and transfer modules", () => {
  assert.match(htmlSource, /class="observation-plan-side"[\s\S]*class="observation-plan-module observation-plan-select-module"[\s\S]*class="observation-plan-module observation-plan-transfer-module"/);
  assert.match(htmlSource, /class="observation-plan-module observation-plan-select-module"/);
  assert.match(htmlSource, /class="observation-plan-module observation-plan-generate-module"/);
  assert.match(htmlSource, /class="observation-plan-module observation-plan-transfer-module"/);
  assert.match(htmlSource, /observation-plan-select-module[\s\S]*data-action="switch-observation-plan"/);
  assert.match(htmlSource, /observation-plan-generate-module[\s\S]*data-action="generate-observation-plan"/);
  assert.match(htmlSource, /observation-plan-transfer-module[\s\S]*data-action="export-portable-data"[\s\S]*data-action="import-portable-data"/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-grid\s*{[\s\S]*grid-template-areas:\s*"side generate"[\s\S]*"logic logic"/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-grid\s*{[^}]*gap:\s*8px 12px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-grid\s*{[^}]*align-items:\s*stretch !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-side\s*{[^}]*grid-area:\s*side/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-side\s*{[^}]*grid-template-rows:\s*auto auto !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-side\s*{[^}]*gap:\s*6px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-side\s*{[^}]*align-self:\s*start !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-select-module\s*{[\s\S]*grid-area:\s*auto/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*grid-area:\s*generate/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*min-height:\s*0 !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*align-content:\s*stretch/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*contain:\s*layout size !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-module\s*{[^}]*overflow:\s*hidden !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-transfer-module\s*{[\s\S]*grid-area:\s*auto/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-transfer-module\s*{[^}]*align-self:\s*start/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-logic\s*{[\s\S]*grid-area:\s*logic/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*grid-template-areas:\s*"name requirements"[^}]*"idea requirements"[^}]*"generateButton requirements"/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*grid-template-rows:\s*auto minmax\(58px,\s*1fr\) auto !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-idea textarea\s*{[^}]*min-height:\s*58px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*min-height:\s*0 !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*height:\s*100%/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*max-height:\s*100% !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*align-self:\s*stretch/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s*{[^}]*overflow:\s*hidden !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-generate-grid\s+\[data-action="generate-observation-plan"\]\s*{[\s\S]*grid-area:\s*generateButton/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-requirements\s*{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-requirements\s*{[^}]*height:\s*100% !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-requirements\s*{[^}]*max-height:\s*100% !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-requirements\s*{[^}]*align-self:\s*stretch !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-requirements\s*{[^}]*overflow:\s*hidden !important/);
  assert.doesNotMatch(cssSource, /--observation-requirement-visible-rows/);
  assert.doesNotMatch(cssSource, /--observation-requirement-row-height/);
  assert.doesNotMatch(cssSource, /max-height:\s*calc\(var\(--observation-requirement-row-height\)/);
  assert.match(cssSource, /#view-settings\s+\.observation-requirements-list\s*{[^}]*display:\s*grid !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-requirements-list\s*{[^}]*height:\s*100% !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-requirements-list\s*{[^}]*max-height:\s*100% !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-requirements-list\s*{[^}]*grid-auto-rows:\s*max-content !important/);
  assert.doesNotMatch(cssSource, /#view-settings\s+\.observation-requirement-item\s*{[^}]*flex:\s*0 0 calc\(\(100% - 12px\) \/ 3\) !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-requirements-list\s*{[\s\S]*overflow:\s*auto/);
  assert.match(cssSource, /@media\s*\(max-width:\s*1180px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-grid\s*{[\s\S]*grid-template-areas:\s*"side"[\s\S]*"generate"[\s\S]*"logic"/);
  assert.match(cssSource, /@media\s*\(max-width:\s*1180px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-side\s*{[\s\S]*grid-template-rows:\s*auto !important/);
  assert.match(cssSource, /@media\s*\(max-width:\s*1180px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-generate-module\s*{[\s\S]*contain:\s*none !important/);
  assert.match(cssSource, /@media\s*\(max-width:\s*760px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-grid\s*{[\s\S]*grid-template-areas:\s*"side"[\s\S]*"generate"[\s\S]*"logic"/);
  assert.match(cssSource, /@media\s*\(max-width:\s*760px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-requirements\s*{[\s\S]*height:\s*164px !important[\s\S]*max-height:\s*164px !important/);
  assert.match(cssSource, /@media\s*\(max-width:\s*760px\)\s*{[\s\S]*#view-settings\s+\.observation-plan-transfer-module\s*{[\s\S]*align-self:\s*start !important/);
});

test("observation plan switch keeps the logic area vertically stable", () => {
  assert.match(cssSource, /#view-settings\s+\.observation-plan-select-row\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 128px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toolbar\s*{[^}]*height:\s*auto !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toolbar\s*{[^}]*min-height:\s*40px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toolbar\s*{[^}]*max-height:\s*none !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toolbar\s*{[^}]*flex-wrap:\s*nowrap !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toolbar-actions\s*{[^}]*flex-wrap:\s*nowrap !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-inline-status\s*{[^}]*text-overflow:\s*ellipsis !important|#view-settings\s+\.observation-plan-inline-status \.ui-icon-label span:last-child\s*{[^}]*text-overflow:\s*ellipsis !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-status\s*{[^}]*height:\s*34px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-status\s*{[^}]*max-height:\s*34px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-status\s*{[^}]*-webkit-line-clamp:\s*2 !important/);
});

test("single default observation plan keeps logic preview and selector layout stable", () => {
  const renderer = functionBody("renderObservationPlans");
  const currentPreview = functionBody("currentObservationPlanPreview");

  assert.match(renderer, /plans\.find\(\(plan\) => plan\.id === storedActive\?\.id\) \|\| plans\.find\(\(plan\) => plan\.active\) \|\| plans\[0\] \|\| storedActive \|\| null/);
  assert.match(currentPreview, /plans\.find\(\(plan\) => plan\.id === storedActive\?\.id\) \|\| plans\.find\(\(plan\) => plan\.active\) \|\| plans\[0\] \|\| storedActive \|\| \{\}/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-toggle-icon\s*{[^}]*width:\s*74px !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-readable\s*{[^}]*align-content:\s*stretch !important/);
  assert.match(cssSource, /#view-settings\s+\.observation-plan-view,\s*#view-settings\s+\.observation-plan-logic textarea\s*{[^}]*box-sizing:\s*border-box !important/);
});
