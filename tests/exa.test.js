const assert = require("node:assert/strict");
const test = require("node:test");

const {
  exaErrorFromResponse,
  exaSearchBody,
  searchTopicSignals
} = require("../src/lib/exa");

test("exaSearchBody uses the current nested contents schema", () => {
  assert.deepEqual(exaSearchBody("CAD assistant", 6), {
    query: "CAD assistant",
    type: "auto",
    numResults: 6,
    contents: { text: true }
  });
  assert.equal(exaSearchBody("CAD assistant", 1).text, undefined);
  assert.equal(exaSearchBody("CAD assistant", 1, { includeContents: false }).contents, undefined);
});

test("exaErrorFromResponse preserves actionable Exa error reasons", async () => {
  const authError = await exaErrorFromResponse(
    new Response(JSON.stringify({ requestId: "req", error: "Invalid API key", tag: "INVALID_API_KEY" }), { status: 401 })
  );
  assert.match(authError.message, /Key 无效|已过期/);
  assert.equal(authError.status, 401);
  assert.equal(authError.exaAuthFailure, true);

  const creditError = await exaErrorFromResponse(
    new Response(JSON.stringify({ requestId: "req", error: "No credits", tag: "NO_MORE_CREDITS" }), { status: 402 })
  );
  assert.match(creditError.message, /额度不足|预算/);
  assert.equal(creditError.exaPaymentRequired, true);

  const rateLimitError = await exaErrorFromResponse(
    new Response(JSON.stringify({ requestId: "req", error: "Too many requests", tag: "RATE_LIMIT_EXCEEDED" }), { status: 429 })
  );
  assert.match(rateLimitError.message, /限流/);
  assert.equal(rateLimitError.exaRateLimited, true);

  const requestError = await exaErrorFromResponse(
    new Response(JSON.stringify({ requestId: "req", error: "Invalid request body", tag: "INVALID_REQUEST_BODY" }), { status: 400 })
  );
  assert.match(requestError.message, /请求参数错误/);

  const serviceError = await exaErrorFromResponse(
    new Response(JSON.stringify({ requestId: "req", error: "Unavailable", tag: "INTERNAL_ERROR" }), { status: 503 })
  );
  assert.match(serviceError.message, /暂时不可用/);
});

test("searchTopicSignals sends the current Exa request shape and keeps text signals", async () => {
  const originalFetch = global.fetch;
  let captured = null;
  global.fetch = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(
      JSON.stringify({
        results: [{ title: "CAD assistant", url: "https://example.com/cad", text: "Searchable content" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  try {
    const signals = await searchTopicSignals("CAD assistant", "test-key", 3);
    assert.equal(captured.url, "https://api.exa.ai/search");
    assert.equal(captured.init.headers["x-api-key"], "test-key");
    const body = JSON.parse(captured.init.body);
    assert.deepEqual(body.contents, { text: true });
    assert.equal(body.text, undefined);
    assert.equal(body.numResults, 3);
    assert.deepEqual(signals, [
      {
        source: "exa",
        title: "CAD assistant",
        url: "https://example.com/cad",
        score: 0,
        content: "Searchable content",
        publishedDate: ""
      }
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("searchTopicSignals surfaces the classified Exa error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ requestId: "req", error: "Invalid API key", tag: "INVALID_API_KEY" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  try {
    await assert.rejects(() => searchTopicSignals("CAD assistant", "test-key", 3), /Key 无效|已过期/);
  } finally {
    global.fetch = originalFetch;
  }
});
