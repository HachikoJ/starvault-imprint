const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

function i18nDictionaries() {
  const start = appSource.indexOf("const I18N = {");
  assert.notEqual(start, -1, "public/app.js should declare the I18N dictionaries");
  const end = appSource.indexOf("\n};", start);
  assert.notEqual(end, -1, "the I18N declaration should be terminated");
  const literal = appSource.slice(start + "const I18N = ".length, end + 2);
  return Function(`return ${literal}`)();
}

function placeholders(value) {
  return Array.from(String(value ?? "").matchAll(/\{([a-zA-Z0-9_]+)\}/g))
    .map((match) => match[1])
    .sort();
}

test("Chinese and English dictionaries expose the same translation keys", () => {
  const dictionaries = i18nDictionaries();
  const zhKeys = Object.keys(dictionaries.zh).sort();
  const enKeys = Object.keys(dictionaries.en).sort();

  assert.deepEqual(enKeys, zhKeys);
  assert.ok(zhKeys.length > 500, `expected the full dictionary, received ${zhKeys.length} keys`);
  for (const key of zhKeys) {
    assert.equal(typeof dictionaries.zh[key], "string", `zh.${key} should be a string`);
    assert.equal(typeof dictionaries.en[key], "string", `en.${key} should be a string`);
    assert.notEqual(dictionaries.zh[key].trim(), "", `zh.${key} should not be empty`);
    assert.notEqual(dictionaries.en[key].trim(), "", `en.${key} should not be empty`);
    assert.deepEqual(placeholders(dictionaries.en[key]), placeholders(dictionaries.zh[key]), `${key} placeholders`);
  }
});

test("GitHub cooldown and plan switch copy exists in both languages", () => {
  const { zh, en } = i18nDictionaries();
  const keys = [
    "scanCooldownRemaining",
    "scanCooldownMessage",
    "scanCoolingButton",
    "scanStageCooling",
    "observationPlanSwitchCooldown",
    "observationPlanSwitchScan",
    "taskNotificationCooldownTitle",
    "taskNotificationCooldownBody"
  ];

  for (const key of keys) {
    assert.equal(typeof zh[key], "string", `zh.${key}`);
    assert.equal(typeof en[key], "string", `en.${key}`);
  }
  assert.deepEqual(placeholders(zh.scanCooldownRemaining), ["time"]);
  assert.deepEqual(placeholders(en.scanCooldownRemaining), ["time"]);
  assert.deepEqual(placeholders(zh.scanCoolingButton), ["time"]);
  assert.deepEqual(placeholders(en.scanCoolingButton), ["time"]);
});
