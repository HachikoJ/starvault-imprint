const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns").promises;
const test = require("node:test");

const { buildConfig } = require("../src/lib/config");
const {
  clientIp,
  extractRequestToken,
  hostAllowed,
  originAllowed,
  privateIpAddress,
  resolveSafeExternalUrl,
  securityHeaders,
  validateExternalUrl
} = require("../src/lib/security");

function request(headers = {}, remoteAddress = "127.0.0.1") {
  return { headers, socket: { remoteAddress, encrypted: false } };
}

test("authentication ignores query-string tokens that can leak through URLs", () => {
  const req = request({ authorization: "Bearer header-secret" });
  const url = new URL("http://localhost/?token=query-secret");
  assert.equal(extractRequestToken(req, url), "header-secret");
  assert.equal(extractRequestToken(request({}), url), "");
  assert.equal(extractRequestToken(request({ cookie: "sv_token=cookie-secret" }), url), "cookie-secret");
});

test("origin checks compare scheme, host and port exactly", () => {
  assert.equal(originAllowed(request({ host: "example.com:4173", origin: "http://example.com:4173" })), true);
  assert.equal(originAllowed(request({ host: "example.com:4173", origin: "https://example.com:4173" })), false);
  assert.equal(originAllowed(request({ host: "example.com:4173", origin: "http://example.com:9999" })), false);
  assert.equal(
    originAllowed(request({ host: "internal:4173", origin: "https://app.example.com" }), { publicOrigin: "https://app.example.com" }),
    true
  );
});

test("host checks keep IPv6 loopback scoped instead of treating it as a wildcard", () => {
  assert.equal(hostAllowed(request({ host: "[::1]:4173" }), "::1"), true);
  assert.equal(hostAllowed(request({ host: "localhost:4173" }), "::1"), true);
  assert.equal(hostAllowed(request({ host: "attacker.example:4173" }), "::1"), false);
});

test("forwarded client addresses are trusted only when explicitly configured", () => {
  const req = request({ "x-forwarded-for": "203.0.113.8, 10.0.0.2" }, "127.0.0.1");
  assert.equal(clientIp(req, false), "127.0.0.1");
  assert.equal(clientIp(req, true), "203.0.113.8");
});

test("provider targets require public HTTPS endpoints by default", () => {
  assert.equal(validateExternalUrl("https://api.deepseek.com").hostname, "api.deepseek.com");
  assert.throws(() => validateExternalUrl("http://api.example.com"), /must use HTTPS/);
  assert.throws(() => validateExternalUrl("https://user:pass@example.com"), /must not contain credentials/);
  assert.throws(() => validateExternalUrl("https://127.0.0.1:8080"), /private network/);
  assert.throws(() => validateExternalUrl("https://192.168.1.12"), /private network/);
  assert.equal(validateExternalUrl("https://127.0.0.1:8080", { allowPrivate: true }).hostname, "127.0.0.1");
  assert.equal(privateIpAddress("10.1.2.3"), true);
  assert.equal(privateIpAddress("8.8.8.8"), false);
});

test("provider target checks cover encoded IPv4 and IPv6 private ranges", () => {
  for (const address of [
    "2130706433",
    "0177.0.0.1",
    "0x7f000001",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "0:0:0:0:0:ffff:7f00:1",
    "::7f00:1",
    "ff00::1",
    "fe80::1",
    "fd12:3456::1",
    "::"
  ]) {
    assert.equal(privateIpAddress(address), true, address);
  }
  assert.equal(privateIpAddress("2001:4860:4860::8888"), false);
});

test("safe DNS resolution caches the same host and port and returns copies", async () => {
  const originalLookup = dns.lookup;
  let calls = 0;
  dns.lookup = async () => {
    calls += 1;
    return [{ address: "8.8.8.8", family: 4 }];
  };
  try {
    const first = await resolveSafeExternalUrl("https://cache-key-regression.example:9443");
    first.addresses[0].address = "127.0.0.1";
    const second = await resolveSafeExternalUrl("https://cache-key-regression.example:9443");
    assert.equal(calls, 1);
    assert.equal(second.addresses[0].address, "8.8.8.8");
    await resolveSafeExternalUrl("https://cache-key-regression.example:9444");
    assert.equal(calls, 2);
  } finally {
    dns.lookup = originalLookup;
  }
});

test("non-loopback Node binding fails closed without an access token", () => {
  const previous = {
    HOST: process.env.HOST,
    AUTH_TOKEN: process.env.AUTH_TOKEN,
    ACCESS_TOKEN: process.env.ACCESS_TOKEN
  };
  process.env.HOST = "0.0.0.0";
  process.env.AUTH_TOKEN = "";
  process.env.ACCESS_TOKEN = "";
  try {
    assert.throws(() => buildConfig(), /AUTH_TOKEN is required/);
    process.env.AUTH_TOKEN = "strong-test-secret";
    assert.equal(buildConfig().authToken, "strong-test-secret");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Node service redirects explicit legacy JSON paths to a sibling SQLite database", () => {
  const previous = {
    STORE_PATH: process.env.STORE_PATH,
    ALLOW_LEGACY_JSON_STORE: process.env.ALLOW_LEGACY_JSON_STORE,
    HOST: process.env.HOST,
    AUTH_TOKEN: process.env.AUTH_TOKEN
  };
  process.env.HOST = "127.0.0.1";
  process.env.AUTH_TOKEN = "";
  process.env.STORE_PATH = "/tmp/starvault-custom-store.json";
  delete process.env.ALLOW_LEGACY_JSON_STORE;
  try {
    assert.equal(buildConfig().storePath, "/tmp/starvault-custom-store.db");
    process.env.ALLOW_LEGACY_JSON_STORE = "1";
    assert.equal(buildConfig().storePath, "/tmp/starvault-custom-store.json");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("browser links use an allow-list and CSP forbids evaluated scripts", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  const headers = securityHeaders();
  assert.match(appSource, /function safeExternalUrl/);
  assert.match(appSource, /hosts: \["github\.com"\]/);
  assert.doesNotMatch(headers["Content-Security-Policy"], /unsafe-eval/);
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
});

test("background work has a bounded process-level concurrency gate", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  assert.match(source, /MAX_DURABLE_TASK_CONCURRENCY = 2/);
  assert.match(source, /pumpDurableTaskQueue/);
});
