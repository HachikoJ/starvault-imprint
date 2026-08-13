const assert = require("node:assert/strict");
const test = require("node:test");

const {
  extractJsonObject,
  providerContentType,
  providerMessageContent,
  readProviderResponse
} = require("../src/lib/provider-response");

test("extractJsonObject accepts provider JSON variations without accepting unrelated text", () => {
  assert.deepEqual(extractJsonObject('{"name":"CAD",}'), { name: "CAD" });
  assert.deepEqual(extractJsonObject('```json\n{"name":"CAD"}\n```'), { name: "CAD" });
  assert.deepEqual(extractJsonObject('analysis before {"nested":{"brace":"}"}} analysis after'), { nested: { brace: "}" } });
  assert.deepEqual(extractJsonObject('"{\\"name\\":\\"CAD\\"}"'), { name: "CAD" });
  assert.equal(extractJsonObject("not a JSON response"), null);
});

test("providerMessageContent retains supported string, array, and object response shapes", () => {
  assert.equal(providerMessageContent('{"name":"CAD"}'), '{"name":"CAD"}');
  assert.equal(providerMessageContent([{ text: "first" }, { content: "second" }, "third"]), "first\nsecond\nthird");
  assert.equal(providerMessageContent({ text: "result" }), "result");
  assert.equal(providerMessageContent({ answer: "result" }), '{"answer":"result"}');
  assert.equal(providerContentType([]), "array");
  assert.equal(providerContentType({}), "object");
  assert.equal(providerContentType("text"), "string");
});

test("readProviderResponse preserves provider error flags used by fallback logic", async () => {
  await assert.rejects(
    () => readProviderResponse(new Response(JSON.stringify({ error: { message: "response_format json_object is unsupported" } }), { status: 400 })),
    (error) => error.status === 400 && error.providerResponseFormatUnsupported === true && error.providerAuthFailure === false
  );
  await assert.rejects(
    () => readProviderResponse(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 })),
    (error) => error.status === 401 && error.providerAuthFailure === true
  );
  await assert.rejects(
    () => readProviderResponse(new Response("<html>bad gateway</html>", { status: 502 })),
    /Provider request failed with 502: <html>bad gateway<\/html>/
  );
});

test("readProviderResponse rejects successful non-JSON provider bodies", async () => {
  await assert.rejects(
    () => readProviderResponse(new Response("not json", { status: 200 })),
    /Provider returned a non-JSON response/
  );
});
