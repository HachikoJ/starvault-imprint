const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

test("detail GitHub counts reserve only a compact four-digit width", () => {
  const compactGrid = "grid-template-columns: minmax(64px, 1fr) minmax(5.6ch, max-content)";
  const compactWidth = "width: 5.6ch";
  const compactPadding = "padding: 0 4px";

  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-action\s*{[^}]*grid-template-columns:\s*minmax\(64px,\s*1fr\) minmax\(5\.6ch,\s*max-content\)/s);
  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-count\s*{[^}]*width:\s*5\.6ch/s);
  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-count\s*{[^}]*padding:\s*0 4px/s);
  assert.ok(css.lastIndexOf(compactGrid) > css.lastIndexOf("grid-template-columns: minmax(58px, 0.9fr) minmax(58px, 1fr)"));
  assert.ok(css.lastIndexOf(compactGrid) > css.lastIndexOf("grid-template-columns: minmax(44px, 0.8fr) minmax(48px, 0.8fr)"));
  assert.ok(css.lastIndexOf(compactWidth) > css.lastIndexOf("padding-inline: 6px"));
  assert.ok(css.lastIndexOf(compactPadding) > css.lastIndexOf("padding-inline: 6px"));
});

test("detail action buttons match project list compact button height", () => {
  const detailHeight = "height: 30px !important";
  const detailMaxHeight = "max-height: 30px !important";

  assert.match(css, /#view-projects\s+\.detail-action-buttons\s*>\s*\*,\s*#view-projects\s+\.detail-action-buttons\s+\.mini-action-button,\s*#view-projects\s+\.detail-action-buttons\s+\.detail-icon-button\s*{[^}]*height:\s*30px !important/s);
  assert.match(css, /#view-projects\s+\.detail-action-buttons\s*>\s*\*,\s*#view-projects\s+\.detail-action-buttons\s+\.mini-action-button,\s*#view-projects\s+\.detail-action-buttons\s+\.detail-icon-button\s*{[^}]*max-height:\s*30px !important/s);
  assert.ok(css.lastIndexOf(detailHeight) > css.lastIndexOf("min-height: 32px"));
  assert.ok(css.lastIndexOf(detailMaxHeight) > css.lastIndexOf("min-height: 28px"));
});

test("detail Star and Fork buttons share the compact action height", () => {
  const detailGithubHeight = "#view-projects .detail-github-inline .github-stat-button";

  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-button,\s*#view-projects\s+\.detail-github-inline\s+\.github-stat-count\s*{[^}]*height:\s*30px !important/s);
  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-button,\s*#view-projects\s+\.detail-github-inline\s+\.github-stat-count\s*{[^}]*min-height:\s*30px !important/s);
  assert.match(css, /#view-projects\s+\.detail-github-inline\s+\.github-stat-button,\s*#view-projects\s+\.detail-github-inline\s+\.github-stat-count\s*{[^}]*max-height:\s*30px !important/s);
  assert.ok(css.lastIndexOf(detailGithubHeight) > css.indexOf(".github-stat-button,\n.github-stat-count"));
  assert.ok(css.lastIndexOf(detailGithubHeight) > css.lastIndexOf("min-height: var(--control-height) !important"));
});
