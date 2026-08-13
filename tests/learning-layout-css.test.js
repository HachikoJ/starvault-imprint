const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

test("learning hub places dismissed samples beside the strategy column", () => {
  assert.equal(/"dismissed side"/.test(css), true);
  assert.equal(/#view-learning\s+\.learning-dismissed-panel\s*{[^}]*grid-area:\s*dismissed/s.test(css), true);
});

test("expanded dismissed panel aligns with strategy while its list stays content-sized", () => {
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s*{[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s*{[^}]*align-content:\s*stretch/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s+\.learning-dismissed-panel\s*{[^}]*align-self:\s*stretch/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s+#learning-dismissed\s*{[^}]*align-self:\s*stretch/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s+\.dismissed-sample-list\.is-scrollable\s*{[^}]*height:\s*calc\(100% - 8px\)/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s+#learning-dismissed:has\(\.dismissed-sample-list\.is-single\)\s*{[^}]*align-self:\s*start/s);
  assert.match(css, /#view-learning\s+\.learning-shell\.is-dismissed-expanded\s+#learning-dismissed\s*>\s*\.dismissed-empty\s*{[^}]*height:\s*calc\(100% - 8px\)/s);
});

test("dismiss undo loading buttons keep an active visible state", () => {
  assert.match(css, /#view-projects\s+\.project-dismiss-notice\s+button\.local-action-loading,\s*#view-leaderboard\s+\.leaderboard-dismiss-notice\s+button\.local-action-loading\s*{[^}]*opacity:\s*1 !important/s);
  assert.match(css, /#view-projects\s+\.project-dismiss-notice\s+button\.local-action-loading,\s*#view-leaderboard\s+\.leaderboard-dismiss-notice\s+button\.local-action-loading\s*{[^}]*cursor:\s*wait !important/s);
});

test("learning clear confirmation buttons use compact consistent action styling", () => {
  assert.match(css, /#view-learning\s+\.memory-clear-confirm-button\s*{[^}]*min-height:\s*34px/s);
  assert.match(css, /#view-learning\s+\.memory-clear-confirm-button\s*{[^}]*min-width:\s*104px/s);
  assert.match(css, /#view-learning\s+\.memory-clear-confirm-button\s+\.ui-icon-label\s*{[^}]*gap:\s*7px/s);
  assert.match(css, /#view-learning\s+\.memory-clear-confirm-primary\.local-action-loading\s*{[^}]*justify-content:\s*center/s);
  assert.match(css, /#view-learning\s+\.memory-clear-confirm-primary\.local-action-loading\s+\.action-loading-only\s*{[^}]*justify-content:\s*center/s);
  assert.match(css, /#view-learning\s+\.memory-clear-complete-row\s*{[^}]*min-height:\s*38px/s);
  assert.match(css, /#view-learning\s+\.memory-clear-complete-row\s*{[^}]*justify-content:\s*center/s);
  assert.match(css, /#view-learning\s+\.memory-clear-complete-row\s+\.ui-icon-label\s*{[^}]*display:\s*inline-flex/s);
});

test("learning policy controls share one width while the slider stays primary", () => {
  assert.match(css, /#view-learning\s+#learning-policy\s*{[^}]*display:\s*grid/s);
  assert.match(css, /#view-learning\s+#learning-policy\s+\.learning-slider,\s*#view-learning\s+#learning-policy\s+\.full-width\s*{[^}]*width:\s*100%/s);
  assert.match(css, /#view-learning\s+#learning-policy\s+\.learning-slider,\s*#view-learning\s+#learning-policy\s+\.full-width\s*{[^}]*margin-left:\s*0/s);
  assert.match(css, /#view-learning\s+#learning-policy\s+\.learning-slider\s*{[^}]*grid-template-columns:\s*minmax\(76px,\s*0\.42fr\)\s+minmax\(132px,\s*1fr\)\s+44px/s);
  assert.match(css, /#view-learning\s+#learning-policy\s+\.learning-slider-help\s*{[^}]*grid-column:\s*2\s*\/\s*4/s);
});

test("preference profile focus highlights the full panel and both subpanels", () => {
  assert.match(css, /#view-learning\s+\.learning-preference-panel\.is-focus-pulse\s*{[^}]*border-color:\s*rgba\(47,\s*110,\s*74,\s*0\.24\)/s);
  assert.match(css, /#view-learning\s+\.learning-preference-panel\.is-focus-pulse\s*{[^}]*border-radius:\s*12px/s);
  assert.match(css, /#view-learning\s+\.learning-preference-panel\.is-focus-pulse\s*{[^}]*box-shadow:\s*0 0 0 3px rgba\(47,\s*110,\s*74,\s*0\.08\)/s);
  assert.match(css, /#view-learning\s+\.learning-subpanel\.is-focus-pulse\s*{[^}]*background:\s*rgba\(239,\s*247,\s*239,\s*0\.42\)/s);
  assert.match(css, /#view-learning\s+\.learning-subpanel\.is-focus-pulse\s*{[^}]*border-radius:\s*12px/s);
  assert.match(css, /#view-learning\s+\.learning-subpanel\.is-focus-pulse\s*{[^}]*box-shadow:\s*inset 0 0 0 1px rgba\(47,\s*110,\s*74,\s*0\.12\)/s);
});

test("learning loop side targets use the same green focus style", () => {
  assert.match(css, /#view-learning\s+\.learning-side-section\.is-focus-pulse\s*{[^}]*background:\s*rgba\(239,\s*247,\s*239,\s*0\.42\)/s);
  assert.match(css, /#view-learning\s+\.learning-side-section\.is-focus-pulse\s*{[^}]*border-radius:\s*12px/s);
  assert.match(css, /#view-learning\s+\.learning-side-section\.is-focus-pulse\s*{[^}]*box-shadow:\s*inset 0 0 0 1px rgba\(47,\s*110,\s*74,\s*0\.12\), 0 0 0 3px rgba\(47,\s*110,\s*74,\s*0\.08\)/s);
  assert.match(css, /#view-learning\s+\.learning-pref-group\.is-focus-pulse\s*{[^}]*border-color:\s*rgba\(47,\s*110,\s*74,\s*0\.24\)/s);
});
