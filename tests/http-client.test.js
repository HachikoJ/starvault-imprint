const assert = require("node:assert/strict");
const test = require("node:test");

const {
  defaultShouldRetry,
  isAbortError,
  normalizePinnedAddresses,
  pinnedLookupResult
} = require("../src/lib/http-client");

test("abort errors are never classified as transient retries", () => {
  assert.equal(isAbortError(new DOMException("The operation was aborted", "AbortError")), true);
  assert.equal(isAbortError(Object.assign(new Error("aborted"), { code: "ABORT_ERR" })), true);
  assert.equal(defaultShouldRetry(null, new DOMException("cancelled", "AbortError")), false);
  assert.equal(defaultShouldRetry(null, Object.assign(new Error("cancelled"), { code: "ABORT_ERR" })), false);
  assert.equal(defaultShouldRetry(null, new Error("Request timed out")), true);
});

test("pinned HTTPS addresses reject missing and malformed DNS results", () => {
  assert.deepEqual(
    normalizePinnedAddresses([
      undefined,
      { address: undefined, family: 4 },
      { address: "not-an-ip", family: 4 },
      { address: "192.0.2.10", family: 4 },
      { address: "2001:db8::10", family: 6 },
      "198.51.100.20"
    ]),
    [
      { address: "192.0.2.10", family: 4 },
      { address: "2001:db8::10", family: 6 },
      { address: "198.51.100.20", family: 4 }
    ]
  );
  assert.deepEqual(normalizePinnedAddresses([undefined, { address: "", family: 0 }]), []);
});

test("pinned HTTPS lookup returns an address array when Node requests all results", () => {
  const addresses = normalizePinnedAddresses([
    { address: "192.0.2.10", family: 4 },
    { address: "2001:db8::10", family: 6 }
  ]);
  assert.deepEqual(pinnedLookupResult(addresses, { all: true }), addresses);
  assert.deepEqual(pinnedLookupResult(addresses, { all: true, family: 4 }), [{ address: "192.0.2.10", family: 4 }]);
  assert.deepEqual(pinnedLookupResult(addresses, { family: 6 }), { address: "2001:db8::10", family: 6 });
  assert.deepEqual(pinnedLookupResult(addresses, { family: 0 }), { address: "192.0.2.10", family: 4 });
  assert.equal(pinnedLookupResult(addresses, { family: 5 }), null);
});
