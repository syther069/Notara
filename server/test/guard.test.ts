import { test } from "node:test";
import assert from "node:assert/strict";
import { LOCAL_ONLY, refuseReason, runOnce } from "../guard.ts";

const local = { host: "127.0.0.1:8787", "content-type": "application/json" };

test("a page on another site can't use the owner endpoints", () => {
  const path = "/api/owner/propose";
  assert.ok(refuseReason("POST", path, { ...local, origin: "https://evil.example" }));
  assert.ok(refuseReason("POST", path, { ...local, "sec-fetch-site": "cross-site" }));
  assert.ok(refuseReason("POST", path, { host: "127.0.0.1:8787", "content-type": "text/plain" }), "simple request");
  assert.ok(refuseReason("POST", path, { ...local, host: "evil.example:8787" }), "DNS rebinding");
});

test("an image tag on another site can't start a demo run", () => {
  assert.ok(refuseReason("GET", "/api/demo/run", { host: local.host, "sec-fetch-site": "cross-site" }));
});

test("our own website, the Vite proxy and local scripts still work", () => {
  assert.equal(refuseReason("POST", "/v1/check", local), null);
  assert.equal(refuseReason("POST", "/v1/check", { ...local, origin: "http://127.0.0.1:8787", "sec-fetch-site": "same-origin" }), null);
  assert.equal(refuseReason("POST", "/v1/check", { ...local, host: "localhost:5173", origin: "http://localhost:5173" }), null);
  assert.equal(refuseReason("GET", "/api/demo/run", { host: local.host, "sec-fetch-site": "same-origin" }), null);
  assert.equal(refuseReason("GET", "/api/vault", { host: "anything" }), null);
});

test("paying the same invoice twice at once runs the payment only once", async () => {
  let payments = 0;
  const pay = async () => {
    payments++;
    await new Promise((r) => setTimeout(r, 5));
    return "paid";
  };
  const [a, b] = await Promise.all([runOnce("INV-1", pay), runOnce("INV-1", pay)]);
  assert.deepEqual([a, b], ["paid", undefined]);
  assert.equal(payments, 1);
  assert.equal(await runOnce("INV-1", pay), "paid", "free again once finished");
});

test("a public deploy accepts its own hostname and nothing else", () => {
  const hosts = new Set(["localhost", "127.0.0.1", "notara.example"]);
  const pub = { host: "notara.example", "content-type": "application/json", origin: "https://notara.example", "sec-fetch-site": "same-origin" };
  assert.equal(refuseReason("POST", "/api/invoices", pub, hosts), null);
  assert.ok(refuseReason("POST", "/api/invoices", { ...pub, host: "evil.example", origin: "https://evil.example" }, hosts));
});

test("owner and demo routes are marked local-only; customer routes are not", () => {
  for (const p of ["/api/owner/approve", "/api/owner/propose", "/api/demo/run", "/api/invoices/INV-0001/pay"]) assert.ok(LOCAL_ONLY.test(p), p);
  for (const p of ["/api/invoices/INV-0001/quote", "/api/invoices/INV-0001/near-tx", "/api/sends", "/v1/check", "/api/demo/logs"]) assert.ok(!LOCAL_ONLY.test(p), p);
});
