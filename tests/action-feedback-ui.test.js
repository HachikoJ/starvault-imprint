const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

function analysisRenderer(language = "zh") {
  return Function(`
    const state = { language: ${JSON.stringify(language)}, analysis: {} };
    const I18N = {
      zh: {
        aiAnalysisEmpty: "暂无 AI 分析结果",
        aiAnalysisSaved: "上次分析",
        aiRiskLevel: "风险等级",
        aiRisks: "风险",
        aiBoundaries: "边界",
        aiReuseIdeas: "实践启发",
        aiNextActions: "下一步验证",
        aiRecommendationValidate: "AI 建议验证",
        aiRecommendationWatch: "AI 谨慎观察",
        aiRecommendationPause: "AI 暂缓跟进",
        aiContextSaved: "分析需求"
      },
      en: {}
    };
    function t(key) { return I18N[state.language]?.[key] || key; }
    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
    function clampChars(value, limit = 120) {
      const chars = Array.from(String(value || ""));
      return chars.length > limit ? chars.slice(0, limit - 1).join("") + "…" : chars.join("");
    }
    function formatNoteTime() { return "6月27日 09:53"; }
    ${functionBody("analysisTextValue")}
    ${functionBody("decodeEscapedUnicode")}
    ${functionBody("plainAnalysisText")}
    ${functionBody("escapeRegExp")}
    ${functionBody("analysisStructureKeys")}
    ${functionBody("analysisSectionAliases")}
    ${functionBody("extractAnalysisStructuredSegment")}
    ${functionBody("stripAnalysisStructuredResidue")}
    ${functionBody("analysisDisplayText")}
    ${functionBody("usefulAnalysisDisplayItem")}
    ${functionBody("analysisHighlightMarkup")}
    ${functionBody("normalizeAnalysisRecord")}
    ${functionBody("normalizedAiRecommendation")}
    ${functionBody("aiAnalysisRecommendation")}
    ${functionBody("aiAnalysisRecommendationLabel")}
    ${functionBody("analysisRiskLabel")}
    ${functionBody("analysisList")}
    ${functionBody("renderAnalysisSection")}
    ${functionBody("renderAnalysisResult")}
    return { renderAnalysisResult };
  `)();
}

test("favorite and GitHub project actions rely on button state instead of toast", () => {
  const favorite = functionBody("toggleFavorite");
  const githubResult = functionBody("applyGithubActionResult");
  const star = functionBody("starGithubRepo");
  const unstar = functionBody("unstarGithubRepo");
  const fork = functionBody("forkGithubRepo");

  assert.doesNotMatch(favorite, /toast\(t\(watched \? "favoriteSaved" : "favoriteRemoved"\)\)/);
  assert.doesNotMatch(githubResult, /toast\(/);
  assert.doesNotMatch(star, /starred/);
  assert.doesNotMatch(unstar, /unstarred/);
  assert.doesNotMatch(fork, /forkStarted/);
});

test("manual unfavorite of the last visible favorite clears filters", () => {
  const guard = functionBody("shouldResetFiltersAfterManualUnfavorite");
  const favorite = functionBody("toggleFavorite");

  assert.match(guard, /options\.silent/);
  assert.match(guard, /state\.filters\.watchlist/);
  assert.match(guard, /state\.projectPool\.total <= 1/);
  assert.match(favorite, /const shouldResetFilters = shouldResetFiltersAfterManualUnfavorite\(fullName,\s*current,\s*watched,\s*options\)/);
  assert.match(favorite, /if \(shouldResetFilters\) \{\s*resetAllFilters\(\);\s*applyProjectPoolSnapshot\(state\.defaultProjectPoolSnapshot\);\s*loadProjects\(\{\s*resetPosition:\s*true,\s*refreshSummary:\s*false\s*\}\)\.catch/s);
});

test("a first-run empty project pool uses scan guidance instead of filter recovery copy", () => {
  assert.match(appSource, /const poolEmptyWithoutFilters =\s*!hasActiveFilters\(\) && Number\(state\.projectPool\.total \|\| 0\) === 0/);
  assert.match(appSource, /const isNewProjectPool =\s*\n?\s*poolEmptyWithoutFilters &&\s*\n?\s*!state\.summary\?\.lastScan/);
  assert.match(appSource, /noProjectsYetHint: "配置 GitHub Token 后点击扫描/);
  assert.match(appSource, /noProjectsYetHint: "Configure a GitHub Token and scan/);
});

test("a plan that never scanned its own pool gets plan-specific empty copy", () => {
  assert.match(appSource, /const planNeverScanned = poolEmptyWithoutFilters && Boolean\(state\.summary\) && state\.summary\.hasScan === false/);
  assert.match(appSource, /planNeverScanned\s*\?\s*\{ title: "noPlanScanYet", hint: "noPlanScanYetHint" \}/);
  assert.match(appSource, /noPlanScanYet: "该方案尚未扫描"/);
  assert.match(appSource, /noPlanScanYet: "This plan has not been scanned"/);
});

test("saving a draft under an existing plan name reports the merge instead of a plain save", () => {
  const save = functionBody("saveObservationPlan");

  assert.match(save, /const previousPlans = Array\.isArray\(state\.observationPlans\?\.plans\) \? state\.observationPlans\.plans : \[\]/);
  assert.match(
    save,
    /const adoptedSameNamePlan =\s*!plan\.id && Boolean\(result\.plan\?\.id\) && previousPlans\.some\(\(item\) => item\?\.id === result\.plan\.id\)/
  );
  assert.match(save, /t\("observationPlanMergedIntoSameName"\)\.replace\("\{name\}", result\.plan\.name \|\| ""\)/);
  assert.match(appSource, /observationPlanMergedIntoSameName: "已并入同名方案/);
  assert.match(appSource, /observationPlanMergedIntoSameName: "Merged into the existing plan/);
});

test("favorite and filter actions render local previews before network refresh", () => {
  const favorite = functionBody("toggleFavorite");
  const watchPreview = functionBody("previewCurrentPageFavorites");
  const loadProjects = functionBody("loadProjects");
  const wire = functionBody("wireEvents");

  assert.match(favorite, /setLocalActionBusy\(fullName,\s*"favorite",\s*true,\s*\{\s*render:\s*false\s*\}\)/);
  assert.match(favorite, /applyLocalWatched\(fullName,\s*watched,\s*\{\s*render:\s*false\s*\}\)/);
  assert.match(favorite, /renderLocalActionSurfaces\(\{\s*dismissed:\s*false\s*\}\)/);
  assert.match(watchPreview, /favoriteItems = snapshot\.items\.filter\(\(project\) => project\.watched\)/);
  assert.match(wire, /if \(state\.filters\.watchlist\) \{\s*previewCurrentPageFavorites\(\);/s);
  assert.match(wire, /previewDefaultProjectPool\(\);\s*loadProjects\(\{\s*resetPosition:\s*true\s*\}\)/s);
  assert.match(loadProjects, /rememberDefaultProjectPoolSnapshot\(\)/);
});

test("copy URL uses a temporary inline success icon instead of toast", () => {
  const renderer = functionBody("renderDetail");
  const statusFn = functionBody("showCopyUrlInlineStatus");
  const wire = functionBody("wireEvents");

  assert.match(appSource, /copiedUrlFullName:\s*""/);
  assert.match(appSource, /copyUrlStatusTimer:\s*null/);
  assert.match(renderer, /const copyUrlDone = state\.copiedUrlFullName === project\.fullName/);
  assert.match(renderer, /copy-action-done/);
  assert.match(renderer, /iconOnly\(copyUrlDone \? "check" : "copy"/);
  assert.match(statusFn, /state\.copiedUrlFullName = fullName/);
  assert.match(statusFn, /renderDetailPreservingScroll\(state\.selected\)/);
  assert.match(statusFn, /setTimeout\(\(\) => \{/);
  assert.match(statusFn, /1600/);
  assert.match(wire, /showCopyUrlInlineStatus\(fullName\)/);
  assert.doesNotMatch(wire, /toast\(t\("copied"\)\)/);
  assert.match(css, /#view-projects\s+\.copy-action-done\s*{[^}]*color:\s*#15803d/s);
});

test("AI analysis completion uses button state instead of toast", () => {
  const renderer = functionBody("renderDetail");
  const analyzer = functionBody("analyzeProject");
  const statusFn = functionBody("showAnalysisCompleteStatus");

  assert.match(appSource, /analysisCompleteFullName:\s*""/);
  assert.match(appSource, /analysisCompleteTimer:\s*null/);
  assert.match(appSource, /analysisInFlight:\s*\{\}/);
  assert.match(renderer, /const analysisComplete = state\.analysisCompleteFullName === project\.fullName/);
  assert.match(renderer, /const analysisBusy = Boolean\(state\.analysisInFlight\?\.\[project\.fullName\]\)/);
  assert.match(renderer, /analysis-action-done/);
  assert.match(renderer, /analysisBusy \? t\("analyzing"\) : analysisComplete \? t\("aiAnalysisDone"\)/);
  assert.match(renderer, /analysisBusy \? renderActionLabelContent\("refresh",\s*t\("analyzing"\),\s*true\)/);
  assert.match(renderer, /analysisBusy \? renderAnalysisLoading\(\) : renderAnalysisResult\(analysis\)/);
  assert.match(analyzer, /if\s*\(state\.analysisInFlight\?\.\[fullName\]\)\s*return/);
  assert.match(analyzer, /state\.analysisInFlight = \{\s*\.\.\.\(state\.analysisInFlight \|\| \{\}\),\s*\[fullName\]: true\s*\}/s);
  assert.match(analyzer, /delete state\.analysisInFlight\[fullName\]/);
  assert.match(analyzer, /showAnalysisCompleteStatus\(fullName\)/);
  assert.doesNotMatch(analyzer, /toast\(t\("aiAnalysisDone"\)\)/);
  assert.match(statusFn, /state\.analysisCompleteFullName = fullName/);
  assert.match(statusFn, /setTimeout\(\(\) => \{/);
  assert.match(statusFn, /1600/);
  assert.match(css, /#view-projects\s+\.analysis-action-done\s*{[^}]*color:\s*#15803d/s);
});

test("long running tasks guard browser refresh without resetting tab state", () => {
  const labels = functionBody("activeLongTaskLabels");
  const detector = functionBody("hasBlockingLongTask");
  const unload = functionBody("handleLongTaskBeforeUnload");
  const wire = functionBody("wireEvents");
  const switcher = functionBody("switchView");

  assert.match(appSource, /longTaskBeforeUnload:/);
  assert.match(labels, /state\.observationPlanGenerating/);
  assert.match(labels, /state\.analysisInFlight/);
  assert.match(labels, /isPlanTransitionActive\(\)/);
  assert.match(labels, /state\.scanProgress/);
  assert.match(detector, /activeLongTaskLabels\(\)\.length > 0/);
  assert.match(unload, /if\s*\(!hasBlockingLongTask\(\)\)\s*return/);
  assert.match(unload, /event\.preventDefault\(\)/);
  assert.match(unload, /event\.returnValue = message/);
  assert.match(wire, /window\.addEventListener\("beforeunload",\s*handleLongTaskBeforeUnload\)/);
  assert.doesNotMatch(switcher, /observationPlanGenerating\s*=\s*false/);
  assert.doesNotMatch(switcher, /analysisInFlight\s*=\s*\{\}/);
});

test("AI analysis success refreshes title badges in project and leaderboard lists", () => {
  const hints = functionBody("renderProjectRecordHints");
  const analyzer = functionBody("analyzeProject");

  assert.match(hints, /hasAiAnalysisRecord\(project\)\s*\?\s*\["ai",\s*aiAnalysisRecommendationLabel\(project\)\]/);
  assert.doesNotMatch(hints, /aiAnalysisBadge/);
  assert.match(analyzer, /const analyzedProject = result\.project/);
  assert.match(analyzer, /mergeLocalProject\(analyzedProject\)/);
  assert.match(analyzer, /renderGithubActionSurfaces\(\)/);
  assert.match(analyzer, /showAnalysisCompleteStatus\(fullName\)/);
});

test("AI analysis badges use stable recommendation labels", () => {
  const recommendation = functionBody("aiAnalysisRecommendation");
  const label = functionBody("aiAnalysisRecommendationLabel");
  const resultRenderer = functionBody("renderAnalysisResult");

  assert.match(appSource, /aiRecommendationValidate:\s*"AI 建议验证"/);
  assert.match(appSource, /aiRecommendationWatch:\s*"AI 谨慎观察"/);
  assert.match(appSource, /aiRecommendationPause:\s*"AI 暂缓跟进"/);
  assert.match(recommendation, /result\.recommendation/);
  assert.match(recommendation, /riskLevel/);
  assert.match(label, /aiRecommendationValidate/);
  assert.match(label, /aiRecommendationWatch/);
  assert.match(label, /aiRecommendationPause/);
  assert.match(resultRenderer, /aiAnalysisRecommendationLabel\(normalized\)/);
});

test("AI analysis header keeps recommendation risk and time in one row without duplicate verdict", () => {
  const resultRenderer = functionBody("renderAnalysisResult");

  assert.match(resultRenderer, /analysis-recommendation/);
  assert.match(resultRenderer, /analysis-risk/);
  assert.match(resultRenderer, /aiAnalysisSaved/);
  assert.match(resultRenderer, /\$\{summary \? `<p>\$\{analysisHighlightMarkup\(summary\)\}<\/p>` : ""\}/);
  assert.doesNotMatch(resultRenderer, /const verdict =/);
  assert.doesNotMatch(resultRenderer, /analysis-verdict-text/);
  assert.match(css, /#view-projects\s+\.analysis-verdict\s*{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap/s);
  assert.match(css, /#view-projects\s+\.analysis-verdict\s+small\s*{[^}]*white-space:\s*nowrap/s);
  assert.doesNotMatch(css, /#view-projects\s+\.analysis-verdict\s*{[^}]*display:\s*grid/s);
  assert.doesNotMatch(css, /#view-projects\s+\.analysis-verdict\s+small\s*{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.doesNotMatch(css, /analysis-verdict-text/);
});

test("AI analysis result cleans structured residue and highlights key text", () => {
  const { renderAnalysisResult } = analysisRenderer();
  const html = renderAnalysisResult({
    updatedAt: "2026-06-27T09:53:00.000Z",
    result: {
      recommendation: "validate",
      riskLevel: "low",
      summary: "verdict: 继续跟进, summary: AI求职工具，热度极高，许可证宽松，需验证API依赖与实际效果",
      risks: [
        "verdict: 继续跟进, summary: AI求职工具，热度极高，许可证宽松，需验证API依赖与实际效果",
        "riskLevel: low, sections: risks: 依赖 API 稳定性和真实效果"
      ],
      boundaries: ["sections: boundaries: 保留版权声明和许可文本"],
      inspirations: ["sections: inspirations: 可做成招聘流程中的候选人筛选助手"],
      validations: ["verdict: 继续跟进, summary: 先验证 API 依赖、许可证边界与实际效果"]
    }
  });
  const text = html.replace(/<[^>]+>/g, "");

  assert.doesNotMatch(html, /\b(verdict|summary|sections|riskLevel)\s*:/i);
  assert.match(text, /AI求职工具/);
  assert.match(text, /依赖 API 稳定性和真实效果/);
  assert.match(html, /class="analysis-highlight"/);
  assert.match(css, /\.analysis-highlight\s*{[^}]*color:/s);
});

test("AI analysis success scrolls the detail panel to the analysis module top", () => {
  const analyzer = functionBody("analyzeProject");
  const scroller = functionBody("scrollAnalysisSectionToTop");

  assert.match(analyzer, /showAnalysisCompleteStatus\(fullName\)/);
  assert.match(analyzer, /scrollAnalysisSectionToTop\(\)/);
  assert.match(scroller, /querySelector\("\.analysis-section"\)/);
  assert.match(scroller, /elements\.detailPanel/);
  assert.match(scroller, /ANALYSIS_SCROLL_TOP_GAP/);
  assert.match(scroller, /- ANALYSIS_SCROLL_TOP_GAP/);
  assert.match(scroller, /scrollTo\?\.\(\{\s*top\b/s);
  assert.match(scroller, /scrollTop = top/);
});

test("AI analysis uses only the custom need field without manual method chips", () => {
  const renderer = functionBody("renderDetail");
  const analyzer = functionBody("analyzeProject");
  const resultRenderer = functionBody("renderAnalysisResult");
  const wire = functionBody("wireEvents");

  assert.doesNotMatch(renderer, /analysis-method-row/);
  assert.doesNotMatch(renderer, /analysis-method-chip/);
  assert.match(renderer, /<textarea id="analysis-need"/);
  assert.match(analyzer, /const method = "balanced"/);
  assert.match(analyzer, /body: JSON\.stringify\(\{\s*fullName,\s*method,\s*userNeed\s*}\)/s);
  assert.doesNotMatch(analyzer, /methodLabel/);
  assert.doesNotMatch(resultRenderer, /analysisMethodLabel/);
  assert.match(resultRenderer, /const contextText = plainAnalysisText\(context\.userNeed\)/);
  assert.doesNotMatch(wire, /set-analysis-method/);
  assert.doesNotMatch(css, /analysis-method-(row|chip)/);
});

test("routine success messages avoid toast and use local UI state", () => {
  const routineToastKeys = [
    "overviewFilterApplied",
    "scanAlreadyRunning",
    "scanDoneRefreshed",
    "observationPlanPreviewOnly",
    "observationPlanSwitched",
    "observationPlanSwitchScan",
    "observationPlanGenerated",
    "portableDataExported",
    "portableDataImported",
    "modelsLoaded",
    "providerReady",
    "feedbackSaved",
    "memoryUpdated",
    "harnessUpdated",
    "memoryTuned",
    "contextCompressed",
    "noContextToCompress",
    "behaviorCleared",
    "memorySettingsSaved",
    "keyClearMarked"
  ];
  for (const key of routineToastKeys) {
    assert.doesNotMatch(appSource, new RegExp(`toast\\([^;\\n]*${key}`), `${key} should not use toast`);
  }
});

test("learning policy save uses button-local loading and completion feedback", () => {
  const renderer = functionBody("renderLearning");
  const saver = functionBody("saveLearningPolicy");
  const completer = functionBody("showLearningPolicySaveCompleteStatus");

  assert.match(appSource, /learningPolicySaveStatus:\s*""/);
  assert.match(appSource, /learningPolicySaveTimer:\s*null/);
  assert.match(renderer, /state\.learningPolicySaveStatus/);
  assert.match(renderer, /data-action="save-learning-policy"/);
  assert.match(renderer, /local-action-loading/);
  assert.match(renderer, /local-action-done/);
  assert.match(renderer, /renderActionLabelContent\("save",\s*policySaveLabel,\s*true\)/);
  assert.match(renderer, /iconLabel\(policySaveIcon,\s*policySaveLabel\)/);
  assert.match(saver, /state\.learningPolicySaveStatus = "saving"/);
  assert.match(saver, /showLearningPolicySaveCompleteStatus\(\)/);
  assert.doesNotMatch(saver, /showLearningInlineStatus\("saved",\s*t\("memorySettingsSaved"\)\)/);
  assert.match(completer, /state\.learningPolicySaveStatus = "saved"/);
  assert.match(completer, /state\.learningPolicySaveStatus = ""/);
  assert.match(completer, /setTimeout/);
  assert.match(css, /#view-learning\s+\.learning-policy-save-button\.local-action-loading,\s*#view-learning\s+\.learning-context-compact-button\.local-action-loading\s*{[^}]*opacity:\s*1/s);
  assert.match(css, /#view-learning\s+\.learning-policy-save-button\.local-action-done,\s*#view-learning\s+\.learning-context-compact-button\.local-action-done\s*{[^}]*color:\s*var\(--moss-ink\)/s);
});

test("compact memory uses button-local loading and completion feedback", () => {
  const renderer = functionBody("renderLearning");
  const compactor = functionBody("compactMemory");
  const completer = functionBody("showLearningContextCompactCompleteStatus");

  assert.match(appSource, /learningContextCompactStatus:\s*""/);
  assert.match(appSource, /learningContextCompactTimer:\s*null/);
  assert.match(renderer, /state\.learningContextCompactStatus/);
  assert.match(renderer, /data-action="compact-memory"/);
  assert.match(renderer, /learning-context-compact-button/);
  assert.match(renderer, /renderActionLabelContent\("archive",\s*contextCompactLabel,\s*true\)/);
  assert.match(renderer, /iconLabel\(contextCompactIcon,\s*contextCompactLabel\)/);
  assert.match(compactor, /state\.learningContextCompactStatus = "saving"/);
  assert.match(compactor, /showLearningContextCompactCompleteStatus\(\)/);
  assert.doesNotMatch(compactor, /showLearningInlineStatus\("saved"/);
  assert.match(completer, /state\.learningContextCompactStatus = "saved"/);
  assert.match(completer, /state\.learningContextCompactStatus = ""/);
  assert.match(completer, /setTimeout/);
  assert.match(css, /#view-learning\s+\.learning-policy-save-button\.local-action-loading,\s*#view-learning\s+\.learning-context-compact-button\.local-action-loading\s*{[^}]*opacity:\s*1/s);
  assert.match(css, /#view-learning\s+\.learning-policy-save-button\.local-action-done,\s*#view-learning\s+\.learning-context-compact-button\.local-action-done\s*{[^}]*color:\s*var\(--moss-ink\)/s);
});

test("scan button uses local loading and completion feedback", () => {
  const renderer = functionBody("renderScanButtonState");
  const statusRenderer = functionBody("renderScanStatus");

  assert.match(statusRenderer, /renderScanButtonState\(normalized\)/);
  assert.match(renderer, /elements\.scanButton\.classList\.toggle\("local-action-loading",\s*isRunning\)/);
  assert.match(renderer, /elements\.scanButton\.classList\.toggle\("local-action-done",\s*isCompleted\)/);
  assert.match(renderer, /const label = isRunning \? t\("scanRunning"\)/);
  assert.match(renderer, /renderActionLabelContent\("scan",\s*label,\s*true\)/);
  assert.match(renderer, /iconLabel\("check",\s*label\)/);
  assert.match(renderer, /iconLabel\("scan",\s*label\)/);
  assert.match(css, /\.primary-button\.local-action-loading,\s*\.primary-button\.local-action-loading:disabled\s*{[^}]*cursor:\s*wait/s);
});

test("scan cooldown surfaces a live countdown instead of a failure retry", () => {
  const statusRenderer = functionBody("renderScanStatus");
  const buttonRenderer = functionBody("renderScanButtonState");
  const notificationView = functionBody("taskNotificationView");
  const card = functionBody("renderTaskNotificationCard");
  const startTicker = functionBody("ensureCooldownTicker");
  const countdownUpdater = functionBody("updateCooldownCountdownNodes");
  const tick = functionBody("tickCooldownSurfaces");

  assert.match(statusRenderer, /elements\.scanStatus\.classList\.add\("is-cooling"\)/);
  assert.match(statusRenderer, /elements\.scanStatus\.dataset\.cooldownUntil = normalized\.cooldown\.until/);
  assert.match(statusRenderer, /delete elements\.scanStatus\.dataset\.cooldownUntil/);
  assert.match(statusRenderer, /cooldownCountdownLabel\(normalized\.cooldown \|\| \{\}\)/);
  assert.match(statusRenderer, /ensureCooldownTicker\(\)/);

  assert.match(buttonRenderer, /elements\.scanButton\.classList\.toggle\("local-action-cooling",\s*isCooling\)/);
  assert.match(buttonRenderer, /elements\.scanButton\.disabled = isRunning \|\| isCooling/);
  assert.match(buttonRenderer, /t\("scanCoolingButton"\)/);

  // A cooling account keeps the durable notice and its countdown, and it must
  // not offer the ordinary failure retry while GitHub has asked us to pause.
  assert.match(notificationView, /t\("taskNotificationCooldownTitle"\)/);
  assert.match(notificationView, /cooldown,\s*actions:\s*\[\]/);
  assert.match(notificationView, /actions:\s*\["retry"\]/);
  assert.match(card, /task-notification-cooldown/);
  assert.match(card, /data-cooldown-until/);
  assert.match(css, /#view-projects\s+#scan-status\.is-cooling\s*{/);

  assert.match(startTicker, /setInterval\(tickCooldownSurfaces,\s*COOLDOWN_TICK_MS\)/);
  assert.match(tick, /updateCooldownCountdownNodes\(\)/);
  assert.match(countdownUpdater, /node\.textContent = cooldownCountdownLabel\(cooldown\)/);
});

test("runScan never reports a cooling account as a fresh running scan", () => {
  const runScan = functionBody("runScan");
  const switcher = functionBody("switchObservationPlan");

  assert.match(runScan, /const knownCooldown = activeCooldown\(state\.scanProgress\)/);
  assert.match(runScan, /return \{ status: "cooling", cooldown: knownCooldown \}/);
  assert.ok(
    runScan.indexOf("knownCooldown") < runScan.indexOf('status: "running"'),
    "the cooldown gate has to run before the optimistic running state"
  );
  assert.match(switcher, /scanResult = await runScan\(\{ source: "plan-switch" \}\)/);
  assert.match(switcher, /scanResult\?\.status === "cooling"/);
  assert.match(switcher, /showObservationPlanInlineStatus\("saved", t\("observationPlanSwitchCooldown"\)\)/);
});

test("scan loading animations keep spinner DOM stable during progress polling", () => {
  const button = functionBody("renderScanButtonState");
  const status = functionBody("renderScanStatus");
  const poolTransition = functionBody("renderProjectPoolTransitionState");
  const leaderboardTransition = functionBody("renderLeaderboardTransitionState");
  const transitionUpdater = functionBody("updatePlanTransitionState");

  assert.match(button, /dataset\.scanRenderMode === mode/);
  assert.match(button, /dataset\.scanRenderLabel === label/);
  assert.match(status, /activeScanStatusMarkup\(\)/);
  assert.match(status, /const copy = scanCopyForProgress\(normalized\)/);
  assert.match(status, /const statusCopy = isRunning/);
  assert.match(status, /updateScanStatusContent\(statusCopy,\s*statusPercent,\s*statusDetail,\s*statusEta\)/);
  assert.match(status, /dataset\.scanRenderMode !== mode/);
  assert.match(poolTransition, /updatePlanTransitionState\(elements\.projectRows,\s*"projects"\)/);
  assert.match(leaderboardTransition, /updatePlanTransitionState\(elements\.leaderboardList,\s*"leaderboard"\)/);
  assert.match(transitionUpdater, /existing\.dataset\.transitionMode !== mode/);
  assert.doesNotMatch(poolTransition, /projectRows\.innerHTML\s*=\s*renderPlanTransitionState/);
  assert.doesNotMatch(leaderboardTransition, /leaderboardList\.innerHTML\s*=\s*renderPlanTransitionState/);
});

test("scan waiting copy uses stage pools without rebuilding transition shells", () => {
  const copy = functionBody("scanCopyForProgress");
  const planCopy = functionBody("planTransitionCopy");
  const renderer = functionBody("renderPlanTransitionState");
  const updater = functionBody("updatePlanTransitionState");

  assert.match(appSource, /const SCAN_COPY_POOLS = \{/);
  assert.match(appSource, /牛马开工，先检查装备/);
  assert.match(appSource, /Long run today\. A few more steps/);
  assert.match(copy, /elapsed >= 90/);
  assert.match(copy, /pools\.long/);
  assert.match(planCopy, /scanCopyForProgress\(state\.scanProgress \|\| \{\}\)/);
  assert.match(renderer, /const copy = planTransitionCopy\(\)/);
  assert.match(updater, /const copy = planTransitionCopy\(\)/);
});

test("scan hierarchy keeps rich copy in the list state and compact text in headers", () => {
  const status = functionBody("renderScanStatus");
  const heading = functionBody("transitionHeadingText");
  const poolTransition = functionBody("renderProjectPoolTransitionState");
  const leaderboardTransition = functionBody("renderLeaderboardTransitionState");

  assert.match(appSource, /function scanActualDurationLabel/);
  assert.match(status, /const statusPercent = isRunning \? percent : null/);
  assert.match(status, /const statusEta = isCompleted \? scanActualDurationLabel\(normalized\) : eta/);
  assert.match(heading, /scanActualDurationLabel\(progress\)/);
  assert.match(poolTransition, /elements\.projectCount\.innerHTML = renderProjectPoolHeading\(transitionHeadingText\(\)\)/);
  assert.match(leaderboardTransition, /leaderboardMeta\.textContent = `\$\{transitionHeadingText\(\)\} ·/);
  assert.match(css, /#view-projects\s+\.project-pool-metrics:has\(#scan-status\.is-completed\)\s+#scan-status\s*{[^}]*min-width:\s*108px/s);
  assert.match(css, /\.plan-transition-state\s+\.plan-transition-label\s*{[^}]*font-size:\s*20px\s*!important/s);
  assert.match(css, /\.plan-transition-state h3\s*{[^}]*font-size:\s*15\.5px/s);
});

test("project pool heading exposes the active observation plan and opens plan selection", () => {
  const heading = functionBody("renderProjectPoolHeading");
  const renderer = functionBody("renderProjects");
  const poolTransition = functionBody("renderProjectPoolTransitionState");
  const opener = functionBody("openObservationPlanSettings");
  const wire = functionBody("wireEvents");

  assert.match(heading, /activeObservationPlanLabel\(\)/);
  assert.match(heading, /data-action="open-observation-plans"/);
  assert.match(heading, /project-count-summary/);
  assert.match(renderer, /elements\.projectCount\.innerHTML = renderProjectPoolHeading\(\[/);
  assert.match(renderer, /project-match-count/);
  assert.match(renderer, /project-preview-count/);
  assert.match(poolTransition, /elements\.projectCount\.innerHTML = renderProjectPoolHeading\(transitionHeadingText\(\)\)/);
  assert.match(opener, /switchView\("settings"\)/);
  assert.match(opener, /observation-plan-select-module/);
  assert.match(opener, /picker\?\.setAttribute\("open", ""\)/);
  assert.match(wire, /action === "open-observation-plans"/);
  assert.match(css, /#view-projects\s+\.project-plan-chip\s*{/);
  assert.match(css, /#view-settings\s+\.observation-plan-select-module\.is-focus-pulse\s*{/);
});

test("scan completion always opens the project pool home", () => {
  const runner = functionBody("runScan");

  assert.doesNotMatch(runner, /shouldOpenProjectHome/);
  assert.match(runner, /state\.projectPool\.page = 1;[\s\S]*state\.selected = null;[\s\S]*switchView\("projects"\);/);
  assert.match(runner, /await loadAll\(\{ preserveScanStatus: true, resetProjectPool: true \}\)/);
});

test("scan transition leaves the detail panel on the unselected placeholder", () => {
  const renderer = functionBody("renderDetail");
  const empty = functionBody("renderEmptyDetailPlaceholder");

  assert.match(empty, /chooseProject/);
  assert.match(renderer, /if\s*\(!project\)\s*{[\s\S]*renderEmptyDetailPlaceholder\(\)/);
  assert.equal(renderer.indexOf("if (!project)") < renderer.indexOf("if (isPlanTransitionActive())"), true);
  assert.doesNotMatch(renderer.slice(renderer.indexOf("if (!project)"), renderer.indexOf("if (isPlanTransitionActive())")), /renderPlanTransitionState/);
});

test("observation plan switch uses button-local scan loading feedback", () => {
  const switcher = functionBody("switchObservationPlan");
  const renderer = functionBody("renderObservationPlans");
  const updater = functionBody("updateObservationPlanSwitchButton");

  assert.match(appSource, /observationPlanSwitching:\s*false/);
  assert.match(renderer, /updateObservationPlanSwitchButton\(\)/);
  assert.match(updater, /const busy = Boolean\(state\.observationPlanSwitching\)/);
  assert.match(updater, /button\.classList\.toggle\("local-action-loading",\s*busy\)/);
  assert.match(updater, /button\.setAttribute\("aria-busy",\s*busy \? "true" : "false"\)/);
  assert.match(updater, /button\.innerHTML = busy \? renderActionLabelContent\("scan",\s*t\("scanning"\),\s*true\) : escapeHtml\(t\("switchObservationPlan"\)\)/);
  assert.match(switcher, /state\.observationPlanSwitching = true/);
  assert.match(switcher, /updateObservationPlanSwitchButton\(\)/);
  assert.match(switcher, /finally\s*{[\s\S]*state\.observationPlanSwitching = false;[\s\S]*updateObservationPlanSwitchButton\(\)/);
});

test("provider setup actions use button-local loading and completion feedback", () => {
  const renderer = functionBody("renderSettings");
  const content = functionBody("providerActionButtonContent");
  const feedback = functionBody("withProviderActionFeedback");
  const refresh = functionBody("refreshProviderCatalog");
  const models = functionBody("fetchProviderModels");
  const tester = functionBody("testProvider");

  assert.match(appSource, /providerActionStatus:\s*\{\}/);
  assert.match(appSource, /providerActionTimers:\s*\{\}/);
  assert.match(renderer, /providerActionButtonClass\(provider\.id,\s*"refresh-provider-catalog"\)/);
  assert.match(renderer, /providerActionButtonContent\(provider\.id,\s*"refresh-provider-catalog",\s*"refresh",\s*"refreshProviderCatalog",\s*"actionCompleted"\)/);
  assert.match(renderer, /providerActionButtonContent\(provider\.id,\s*"fetch-provider-models",\s*"download",\s*"fetchProviderModels",\s*"modelsLoaded"\)/);
  assert.match(renderer, /providerActionButtonContent\(provider\.id,\s*"test-provider",\s*"plug",\s*"testProvider",\s*"providerReady"\)/);
  assert.match(content, /renderActionLabelContent\(iconName,\s*t\(labelKey\),\s*true\)/);
  assert.match(content, /iconLabel\("check",\s*t\(doneKey\)\)/);
  assert.match(feedback, /setProviderActionStatus\(providerId,\s*action,\s*"loading"\)/);
  assert.match(feedback, /showProviderActionCompleteStatus\(providerId,\s*action\)/);
  assert.match(refresh, /withProviderActionFeedback\(providerId,\s*"refresh-provider-catalog",\s*"actionCompleted"/);
  assert.match(models, /withProviderActionFeedback\(providerId,\s*"fetch-provider-models",\s*"modelsLoaded"/);
  assert.match(tester, /withProviderActionFeedback\(providerId,\s*"test-provider",\s*"providerReady"/);
  for (const action of [refresh, models, tester]) {
    const saveIndex = action.indexOf("await saveSettings({ silent: true });");
    const feedbackIndex = action.indexOf("return withProviderActionFeedback(");
    assert.equal(saveIndex !== -1 && saveIndex < feedbackIndex, true);
  }
  assert.doesNotMatch(refresh, /showSettingsInlineStatus\("saved",\s*t\("saved"\)\)/);
  assert.doesNotMatch(models, /showSettingsInlineStatus\("saved",\s*t\("modelsLoaded"\)\)/);
  assert.doesNotMatch(tester, /showSettingsInlineStatus\("saved",\s*t\("providerReady"\)\)/);
  assert.match(css, /#view-settings\s+\.provider-actions\s+\.ghost-button\.local-action-done,\s*#view-settings\s+\.provider-actions\s+\.primary-button\.local-action-done\s*{[^}]*color:\s*var\(--moss-ink\)/s);
});

test("save settings uses button-local loading and completion feedback", () => {
  const renderer = functionBody("renderSettings");
  const updater = functionBody("updateSaveSettingsButton");
  const saver = functionBody("saveSettings");
  const completer = functionBody("showSaveSettingsCompleteStatus");

  assert.match(appSource, /savingSettings:\s*"保存中"/);
  assert.match(appSource, /settingsSaved:\s*"保存完成"/);
  assert.match(appSource, /settingsSaveStatus:\s*""/);
  assert.match(appSource, /settingsSaveTimer:\s*null/);
  assert.match(renderer, /updateSaveSettingsButton\(\)/);
  assert.match(updater, /const saving = state\.settingsSaveStatus === "saving"/);
  assert.match(updater, /button\.classList\.toggle\("local-action-loading",\s*saving\)/);
  assert.match(updater, /button\.classList\.toggle\("local-action-done",\s*saved\)/);
  assert.match(updater, /button\.innerHTML = saving \? renderActionLabelContent\("save",\s*t\("savingSettings"\),\s*true\)/);
  assert.match(saver, /if\s*\(!options\.silent\)\s*{[\s\S]*state\.settingsSaveStatus = "saving"[\s\S]*updateSaveSettingsButton\(\)/);
  assert.match(saver, /showSaveSettingsCompleteStatus\(\)/);
  assert.doesNotMatch(saver, /showSettingsInlineStatus\("saved",\s*t\("saved"\)\)/);
  assert.match(completer, /state\.settingsSaveStatus = "saved"/);
  assert.match(completer, /state\.settingsSaveStatus = ""/);
  assert.match(completer, /setTimeout/);
});

test("explicit settings save requires a key for an enabled AI provider", () => {
  const validator = functionBody("enabledProviderMissingKey");
  const saver = functionBody("saveSettings");

  assert.match(appSource, /providerKeyRequired:\s*"\{provider\} 已启用，请先输入 API Key 再保存。"/);
  assert.match(validator, /provider\.enabled === false/);
  assert.match(validator, /provider\.apiKeySet/);
  assert.match(validator, /provider\.clearApiKey/);
  assert.match(saver, /if \(!options\.silent && state\.settingsSaveStatus === "saving"\) return/);
  assert.match(saver, /const missingProvider = enabledProviderMissingKey\(next\)/);
  assert.match(saver, /showSettingsInlineStatus\(\s*"failed",\s*t\("providerKeyRequired"\)/s);
  assert.match(saver, /data-provider-field="apiKey"/);
});
