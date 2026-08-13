const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

test("detail triage status chips keep spacing above the note editor", () => {
  const statusSpacing = "margin-bottom: 8px !important";

  assert.match(css, /#view-projects\s+\.note-status-row\s*{[^}]*margin-bottom:\s*8px !important/s);
  assert.match(css, /#view-projects\s+\.note-status-row\s*\+\s*#note-text\s*{[^}]*margin-top:\s*0 !important/s);
  assert.ok(css.lastIndexOf(statusSpacing) > css.lastIndexOf("#view-projects .note-status-row {\n  gap: 5px;"));
});

test("collapsed triage note summary clamps the saved note preview", () => {
  assert.match(css, /#view-projects\s+\.note-summary-preview\s*{[^}]*display:\s*-webkit-box/s);
  assert.match(css, /#view-projects\s+\.note-summary-preview\s*{[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(css, /#view-projects\s+\.note-summary-preview\s*{[^}]*-webkit-box-orient:\s*vertical/s);
  assert.match(css, /#view-projects\s+\.note-summary-preview\s*{[^}]*overflow:\s*hidden/s);
  assert.match(css, /#view-projects\s+\.note-section\[open\]\s+\.note-summary-preview\s*{[^}]*display:\s*none/s);
});

test("triage save confirmation places confirm actions on their own row", () => {
  assert.match(css, /#view-projects\s+\.note-confirm-row\s*{[^}]*display:\s*grid/s);
  assert.match(css, /#view-projects\s+\.note-confirm-row\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /#view-projects\s+\.note-confirm-row\s*>\s*span\s*{[^}]*justify-content:\s*center/s);
  assert.match(css, /#view-projects\s+\.note-confirm-row\s*>\s*span\s*{[^}]*text-align:\s*center/s);
  assert.match(css, /#view-projects\s+\.note-confirm-actions\s*{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(css, /#view-projects\s+\.note-confirm-actions\s*{[^}]*justify-content:\s*center/s);
});

test("detail more data and triage record use the learning style fold toggle", () => {
  assert.match(css, /#view-projects\s+\.detail-fold-summary::after\s*{[^}]*display:\s*none/s);
  assert.match(css, /\.observation-plan-toggle-icon\s*{[^}]*border-radius:\s*999px/s);
  assert.match(css, /\.observation-plan-toggle-icon\s*{[^}]*color:\s*var\(--apple-green\)/s);
  assert.match(css, /#view-projects\s+\.detail-fold-toggle\s*{[^}]*margin-left:\s*auto/s);
  assert.match(css, /#view-projects\s+\.detail-fold-toggle\s*{[^}]*grid-column:\s*-2 \/ -1/s);
  assert.match(css, /#view-projects\s+\.detail-fold-toggle\s*{[^}]*justify-self:\s*end/s);
  assert.match(css, /#view-projects\s+\.detail-fold-summary\s*>\s*div\s*>\s*span:not\(\.status-pill\)\s*{/);
  assert.doesNotMatch(css, /#view-projects\s+\.detail-fold-summary\s+span:not\(\.status-pill\)\s*{/);
  assert.match(css, /#view-projects\s+\.detail-fold-summary\s+\.detail-fold-toggle\s+\.observation-plan-toggle-open\s*{[^}]*display:\s*none/s);
  assert.match(css, /#view-projects\s+details\[open\]\s*>\s*\.detail-fold-summary\s+\.observation-plan-toggle-closed\s*{[^}]*display:\s*none/s);
  assert.match(css, /#view-projects\s+details\[open\]\s*>\s*\.detail-fold-summary\s+\.observation-plan-toggle-open\s*{[^}]*display:\s*inline-flex/s);
  assert.doesNotMatch(css, /panel-toggle-icon/);
});
