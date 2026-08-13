const assert = require("node:assert/strict");
const test = require("node:test");

const domainCore = require("../public/domain-core");

test("shared license policy keeps permissive, distribution copyleft, and network copyleft distinct", () => {
  assert.equal(domainCore.classifyLicensePolicy({ spdx_id: "MIT", name: "MIT License" }).bucket, "permissive-commercial");
  assert.equal(domainCore.classifyLicensePolicy({ spdx_id: "GPL-3.0", name: "GNU GPLv3" }).bucket, "distribution-copyleft");
  assert.equal(domainCore.classifyLicensePolicy({ spdx_id: "AGPL-3.0", name: "GNU AGPLv3" }).bucket, "network-copyleft");
  assert.equal(domainCore.classifyLicensePolicy(null).bucket, "unknown-no-license");
});

test("profile identities survive query edits and remain unique", () => {
  const first = domainCore.assignProfileIds("cad", [
    { label: "STEP format", query: "STEP CAD in:name,description,readme" },
    { label: "DXF format", query: "DXF CAD in:name,description,readme" }
  ]);
  const edited = domainCore.assignProfileIds(
    "cad",
    [
      { label: "STEP format", query: "STEP parser CAD in:name,description,readme" },
      { label: "DXF format", query: "DXF viewer CAD in:name,description,readme" }
    ],
    first
  );

  assert.equal(edited[0].profileId, first[0].profileId);
  assert.equal(edited[1].profileId, first[1].profileId);
  assert.notEqual(edited[0].profileId, edited[1].profileId);
});

test("multiple discovery profiles are retained as evidence for one repository", () => {
  const matches = domainCore.mergeProfileMatches(
    [{ key: "profile-cad-step", label: "STEP", query: "STEP CAD" }],
    [{ profileId: "profile-cad-dxf", labelZh: "DXF", q: "DXF CAD" }],
    [{ key: "profile-cad-step", label: "STEP updated", query: "STEP CAD" }]
  );

  assert.deepEqual(
    matches.map((item) => item.key),
    ["profile-cad-step", "profile-cad-dxf"]
  );
  assert.equal(matches[0].label, "STEP updated");
});

test("explicit negative memory outweighs passive preference without removing the exploration score floor", () => {
  const project = {
    fullName: "acme/cad-viewer",
    category: { key: "engineering-design" },
    useCase: { key: "cad-viewer" },
    language: "TypeScript",
    licensePolicy: { bucket: "permissive-commercial" },
    scores: { risk: 5 }
  };
  const positive = domainCore.memoryScore(project, {
    preferences: { categories: { "engineering-design": 6 }, useCases: { "cad-viewer": 8 } },
    negativePreferences: {},
    antiBubble: { explorationRatio: 0.25 }
  });
  const negative = domainCore.memoryScore(project, {
    preferences: { categories: { "engineering-design": 6 }, useCases: { "cad-viewer": 8 } },
    negativePreferences: { repositories: { "acme/cad-viewer": 20 }, useCases: { "cad-viewer": 8 } },
    antiBubble: { explorationRatio: 0.25 }
  });

  assert.ok(positive > 0);
  assert.ok(negative < 0);
  assert.ok(negative >= -28);
});
