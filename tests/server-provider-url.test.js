const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-provider-url-"));
process.chdir(fixture);
Object.assign(process.env, {STORE_PATH: path.join(fixture, "fixture.db"), HOST: "127.0.0.1", RUN_SCAN_ON_BOOT: "false",
  GITHUB_TOKEN: "", TAVILY_API_KEY: "", EXA_API_KEY: "", AUTH_TOKEN: "", ACCESS_TOKEN: "", PUBLIC_ORIGIN: "", TRUST_PROXY: "0", ALLOW_PRIVATE_PROVIDER_URLS: "true"});
const {createStorage} = require(path.join(ROOT, "src/lib/storage"));
const storage = createStorage(process.env.STORE_PATH);
const {server, initializeRuntime} = require(path.join(ROOT, "src/server"));
const {analyzeWithProvider, generateObservationPlanWithProvider, tuneMemoryWithProvider} = require(path.join(ROOT, "src/lib/llm"));

test("T-19 Node settings/import and every model operation use the parsed API base", async t => {
  t.diagnostic(`Retained isolated SQLite: ${fixture}`);
  const nativeFetch = global.fetch, calls = [];
  const keywords = ["LoRaWAN", "LoRa", "ChirpStack", "The Things Stack", "MQTT telemetry", "LoRa gateway", "LoRaWAN device", "LoRaWAN network server", "Semtech packet forwarder", "Class A device", "OTAA", "ABP"];
  const cores = ["LoRaWAN gateway", "LoRaWAN network server", "ChirpStack LoRaWAN", '"The Things Stack" LoRaWAN', "LoRaWAN MQTT telemetry", "LoRaWAN device management", "LoRaWAN packet forwarder", "LoRaWAN FUOTA"];
  const strategy = {baseMode: "only", keywords, excludeTerms: [], customQueries: cores.map((core, i) => ({label: "LoRaWAN " + i, query: `${core} in:name,description,readme archived:false mirror:false`, stars: 0})), preferredLanguages: [], preferredCategories: [], preferredShapes: [], minStars: 0};
  const content = {summary: "A local fixture workflow.", recommendation: "watch", riskLevel: "medium", risks: [], boundaries: [], inspirations: [], validations: [],
    name: "LoRaWAN 现场遥测", nameEn: "LoRaWAN field telemetry", description: "持续发现 LoRaWAN 现场遥测工具。", requirements: [{text: "关注网关、网络服务器、设备管理和遥测工作流"}], searchLogic: strategy, strategy};
  global.fetch = async url => {
    const value = String(url); assert.ok(value.startsWith("https://127.0.0.1:41992/") || value.startsWith("https://api.deepseek.com/"), "unknown upstream denied"); calls.push(value);
    return new Response(JSON.stringify(new URL(value).pathname.endsWith("/models") ? {data: [{id: "fixture"}]} : {
      choices: [{message: {content: JSON.stringify(content)}}], content: [{text: JSON.stringify(content)}],
      candidates: [{content: {parts: [{text: JSON.stringify(content)}]}}]
    }), {status: 200});
  };
  t.after(async () => {global.fetch = nativeFetch; server.closeAllConnections(); if (server.listening) await new Promise(resolve => server.close(resolve));});
  storage.updateSettings({providerCatalog: {updatedAt: new Date().toISOString(), endpoints: [{providerId: "deepseek", baseUrl: "https://127.0.0.1:41992"}]}});
  storage.upsertProjects([{fullName: "fixture/url", description: "Fixture", scores: {risk: 0}}], {observationPlanId: "default"});
  initializeRuntime(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, body) => {const res = await nativeFetch(origin + route, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}); return {status: res.status, body: await res.json()};};
  for (const [baseUrl, apiBase] of [
    ["https://127.0.0.1:41992", "https://127.0.0.1:41992"],
    ["https://127.0.0.1:41992/v1/", "https://127.0.0.1:41992/v1"],
    ["https://127.0.0.1:41992/gateway/v2///", "https://127.0.0.1:41992/gateway/v2"],
    ["https://127.0.0.1:41992/v1/chat/completions/", "https://127.0.0.1:41992/v1"],
    ["https://api.deepseek.com", "https://api.deepseek.com"]
  ]) {
    calls.length = 0;
    const saved = await post("/api/settings", {llmProviders: [{id: "deepseek", baseUrl, enabled: true, model: "fixture", apiKey: "fixture-url-key"}]});
    assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.keyValidation.provider.valid, true);
    assert.deepEqual(calls, [apiBase + "/models"]);
    const imported = await post("/api/portable-data/import", {schema: "starvault-portable-config/v1", settings: {llmProviders: [{id: "deepseek", baseUrl, model: "fixture", enabled: true}]}});
    assert.equal(imported.status, 200, JSON.stringify(imported.body));
    const started = await post("/api/analyze", {fullName: "fixture/url", userNeed: baseUrl}); assert.equal(started.status, 202);
    const deadline = Date.now() + 5000; let task;
    do {task = storage.getTask(started.body.task.id); if (!["queued", "running"].includes(task.status)) break; await new Promise(resolve => setTimeout(resolve, 10));} while (Date.now() < deadline);
    assert.equal(task.status, "completed", task.error);
    const provider = storage.getSettings(true).llmProviders.find(p => p.id === "deepseek");
    await generateObservationPlanWithProvider({provider, payload: {name: "LoRaWAN 现场遥测", coreKeyword: "LoRaWAN", detailedNeed: "关注 LoRaWAN 网关、网络服务器、设备管理和遥测工作流"}, language: "zh"});
    await tuneMemoryWithProvider({provider, payload: {}, language: "zh"});
    assert.equal(calls.length, 4, JSON.stringify(calls));
    assert.ok(calls.slice(1).every(url => url === apiBase + "/chat/completions"), JSON.stringify(calls));
  }
  for (const [protocol, baseUrl, expected] of [
    ["anthropic", "https://127.0.0.1:41992/v1/messages/", "https://127.0.0.1:41992/v1/messages"],
    ["gemini", "https://127.0.0.1:41992/v1beta/models/fixture:generateContent/", "https://127.0.0.1:41992/v1beta/models/fixture:generateContent"]
  ]) {
    calls.length = 0;
    const result = await analyzeWithProvider({provider: {protocol, baseUrl, apiKey: "fixture-key", model: "fixture"}, project: {fullName: "fixture/url", scores: {risk: 0}}, language: "en"});
    assert.equal(result.result.summary, content.summary); assert.deepEqual(calls, [expected]);
  }
  const before = JSON.stringify(storage.load());
  for (const baseUrl of ["", "https://127.0.0.1:41992/v1?key=fixture", "https://127.0.0.1:41992/v1#fragment", "https://user:pass@127.0.0.1:41992/v1", "http://127.0.0.1:41992/v1"]) {
    for (const route of ["/api/settings", "/api/portable-data/import", "/api/observation-plans/import"]) {
      const settings = {validateProvider: false, language: "en", llmProviders: [{id: "deepseek", baseUrl, apiKey: "fixture-replacement-key"}]};
      const rejected = await post(route, route.endsWith("/import") ? {schema: "starvault-portable-config/v1", settings} : settings);
      assert.equal(rejected.status, 400, JSON.stringify(rejected.body));
      assert.match(JSON.stringify(rejected.body), /URL|HTTPS|query|fragment|credentials/i);
      assert.equal(JSON.stringify(storage.load()), before, "invalid base/key never partially saves or imports");
    }
  }
});
