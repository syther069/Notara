// Table tests for the policy engine. These use synthetic signals (clearly test data), no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/policy.ts";
import { loadPolicy } from "../src/config.ts";
import { USDC_TESTNET, formatUnits, getAsset, toUnits } from "../src/assets.ts";
import type { PaymentRequest, SignalResult } from "../src/types.ts";

const policy = loadPolicy();
const USDC = USDC_TESTNET;
const NEAR = (n: number) => (BigInt(Math.round(n * 1000)) * 10n ** 21n).toString();
const req = (amount = NEAR(0.1), recipient = "shop.testnet"): PaymentRequest => ({
  network: "testnet",
  payer: "vault.testnet",
  recipient,
  amount,
  asset: "NEAR",
});

const src = { kind: "live-rpc" as const, network: "testnet" as const, endpoint: "test" };
const sig = (name: string, data: unknown, status: SignalResult["status"] = "ok"): SignalResult => ({
  name,
  status,
  source: src,
  fetchedAt: "t",
  data,
  error: status === "error" ? "simulated outage" : undefined,
  caveats: [],
});

/** A healthy, established, previously-paid recipient with no reports. */
function healthy(overrides: Record<string, SignalResult> = {}): SignalResult[] {
  const base: Record<string, SignalResult> = {
    account_state: sig("account_state", { exists: true, implicit: false, isContract: false }),
    activity_history: sig("activity_history", { txCount: 200, observedAgeDays: 400, firstObservedAt: "x", lastObservedAt: "y" }),
    contract_deployments: { ...sig("contract_deployments", undefined), status: "skipped" },
    prior_interactions: sig("prior_interactions", {
      vaultPayments: { executed: 3, failed: 0, pending: 0, rejected: 0 },
      sharedIndexedTxs: 3,
      sharedTxSample: [],
      scannedComplete: true,
    }),
    shared_reports: sig("shared_reports", { registry: "registry.testnet", reports: [] }),
    policy_lists: sig("policy_lists", { allowlisted: false, denylisted: false }),
  };
  return Object.values({ ...base, ...overrides });
}

const report = (status: string, category = "Scam", is_fixture = false) =>
  sig("shared_reports", {
    registry: "registry.testnet",
    reports: [
      {
        id: "0",
        subject: "shop.testnet",
        reporter: "r.testnet",
        category,
        description: "d",
        evidence_uri: "https://e",
        status,
        status_by: "v.testnet",
        is_fixture,
        disputes: [],
      },
    ],
  });

const codes = (r: ReturnType<typeof evaluate>) => r.reasons.map((x) => x.code);

const cases: [string, PaymentRequest, SignalResult[], "ALLOW" | "WARN" | "BLOCK", string?][] = [
  ["healthy known recipient", req(), healthy(), "ALLOW", "NO_POLICY_VIOLATION"],
  ["verified scam report", req(), healthy({ shared_reports: report("Verified") }), "BLOCK", "VERIFIED_REPORT"],
  ["verified fixture report still blocks, labeled", req(), healthy({ shared_reports: report("Verified", "Scam", true) }), "BLOCK", "VERIFIED_REPORT"],
  ["unverified report only warns", req(), healthy({ shared_reports: report("Unverified") }), "WARN", "UNVERIFIED_REPORT"],
  ["disputed report only warns", req(), healthy({ shared_reports: report("Disputed") }), "WARN", "DISPUTED_REPORT"],
  ["rejected report is info", req(), healthy({ shared_reports: report("Rejected") }), "ALLOW", "REJECTED_REPORT"],
  ["verified report in non-blocking category warns", req(), healthy({ shared_reports: report("Verified", "Other") }), "WARN", "UNVERIFIED_REPORT"],
  ["registry unreachable -> WARN, never ALLOW", req(), healthy({ shared_reports: sig("shared_reports", undefined, "error") }), "WARN", "SIGNAL_UNAVAILABLE"],
  ["indexer down -> WARN", req(), healthy({ activity_history: sig("activity_history", undefined, "error") }), "WARN", "SIGNAL_UNAVAILABLE"],
  ["rpc down -> WARN", req(), healthy({ account_state: sig("account_state", undefined, "error") }), "WARN", "SIGNAL_UNAVAILABLE"],
  ["nonexistent named account", req(), healthy({ account_state: sig("account_state", { exists: false, implicit: false, isContract: false }) }), "BLOCK", "ACCOUNT_NOT_FOUND"],
  ["unused implicit account warns", req(), healthy({ account_state: sig("account_state", { exists: false, implicit: true, isContract: false }) }), "WARN", "IMPLICIT_ACCOUNT_UNUSED"],
  ["new account", req(), healthy({ activity_history: sig("activity_history", { txCount: 2, observedAgeDays: 1 }) }), "WARN", "NEW_ACCOUNT"],
  ["over warn amount", req(NEAR(3)), healthy(), "WARN", "AMOUNT_OVER_WARN_LIMIT"],
  ["over block amount", req(NEAR(50)), healthy(), "BLOCK", "AMOUNT_OVER_BLOCK_LIMIT"],
  [
    "first payment above threshold",
    req(NEAR(1)),
    healthy({ prior_interactions: sig("prior_interactions", { vaultPayments: { executed: 0, failed: 0, pending: 0, rejected: 0 }, sharedIndexedTxs: 0, sharedTxSample: [], scannedComplete: true }) }),
    "WARN",
    "FIRST_PAYMENT_TO_RECIPIENT",
  ],
  [
    "first small payment is fine",
    req(NEAR(0.1)),
    healthy({ prior_interactions: sig("prior_interactions", { vaultPayments: { executed: 0, failed: 0, pending: 0, rejected: 0 }, sharedIndexedTxs: 0, sharedTxSample: [], scannedComplete: true }) }),
    "ALLOW",
  ],
  [
    "contract redeployed recently",
    req(),
    healthy({
      account_state: sig("account_state", { exists: true, implicit: false, isContract: true, codeHash: "h" }),
      contract_deployments: sig("contract_deployments", { scannedTxs: 10, deploys: [{ tx: "T", at: "x", signer: "s" }], lastDeployAgeDays: 1 }),
    }),
    "WARN",
    "RECENT_CODE_DEPLOY",
  ],
  [
    "code hash changed since last check",
    req(),
    healthy({ account_state: sig("account_state", { exists: true, implicit: false, isContract: true, codeHash: "new", previousCodeHash: "old", codeHashChangedSinceLastCheck: true }) }),
    "WARN",
    "CODE_CHANGED_SINCE_LAST_CHECK",
  ],
  ["denylisted", req(), healthy({ policy_lists: sig("policy_lists", { allowlisted: false, denylisted: true, denyReason: "known drainer" }) }), "BLOCK", "DENYLISTED"],
  [
    "allowlist relaxes age but not reports",
    req(),
    healthy({
      policy_lists: sig("policy_lists", { allowlisted: true, denylisted: false }),
      activity_history: sig("activity_history", { txCount: 1, observedAgeDays: 0 }),
      shared_reports: report("Verified"),
    }),
    "BLOCK",
    "VERIFIED_REPORT",
  ],
  [
    "allowlist relaxes age",
    req(),
    healthy({ policy_lists: sig("policy_lists", { allowlisted: true, denylisted: false }), activity_history: sig("activity_history", { txCount: 1, observedAgeDays: 0 }) }),
    "ALLOW",
  ],
  ["unknown asset warns", { ...req("100"), asset: "usdc.fakes.testnet" }, healthy(), "WARN", "NO_ASSET_POLICY"],
  ["small USDC payment to known recipient is fine", { ...req("2000000"), asset: USDC }, healthy({ token_registration: sig("token_registration", { token: USDC, registered: true }) }), "ALLOW"],
  ["USDC above 25 needs a human", { ...req("30000000"), asset: USDC }, healthy({ token_registration: sig("token_registration", { token: USDC, registered: true }) }), "WARN", "AMOUNT_OVER_WARN_LIMIT"],
  ["USDC above 200 is blocked", { ...req("250000000"), asset: USDC }, healthy({ token_registration: sig("token_registration", { token: USDC, registered: true }) }), "BLOCK", "AMOUNT_OVER_BLOCK_LIMIT"],
  ["recipient not registered for USDC warns", { ...req("2000000"), asset: USDC }, healthy({ token_registration: sig("token_registration", { token: USDC, registered: false }) }), "WARN", "RECIPIENT_NOT_REGISTERED_FOR_TOKEN"],
  ["USDC registration lookup down -> WARN", { ...req("2000000"), asset: USDC }, healthy({ token_registration: sig("token_registration", undefined, "error") }), "WARN", "SIGNAL_UNAVAILABLE"],
];

for (const [name, r, s, expected, code] of cases) {
  test(`policy: ${name} -> ${expected}`, () => {
    const out = evaluate(r, s, policy);
    assert.equal(out.decision, expected, JSON.stringify(out.reasons, null, 1));
    if (code) assert.ok(codes(out).includes(code), `expected reason ${code}, got ${codes(out)}`);
  });
}

test("policy: fixture reports are labeled in the message", () => {
  const out = evaluate(req(), healthy({ shared_reports: report("Verified", "Scam", true) }), policy);
  assert.match(out.reasons.find((x) => x.code === "VERIFIED_REPORT")!.message, /\[DEMO FIXTURE\]/);
});

test("policy: no signal error ever yields ALLOW (fail closed)", () => {
  for (const name of ["account_state", "activity_history", "prior_interactions", "shared_reports"]) {
    const out = evaluate(req(), healthy({ [name]: sig(name, undefined, "error") }), policy);
    assert.notEqual(out.decision, "ALLOW", name);
  }
});

test("policy: reasons are sorted block, warn, info", () => {
  const out = evaluate(req(NEAR(3)), healthy({ shared_reports: report("Verified") }), policy);
  const sev = out.reasons.map((r) => r.severity);
  assert.deepEqual(sev, [...sev].sort((a, b) => ["block", "warn", "info"].indexOf(a) - ["block", "warn", "info"].indexOf(b)));
});

test("assets: USDC units round-trip", () => {
  const usdc = getAsset(USDC)!;
  assert.equal(toUnits("12.5", usdc), "12500000");
  assert.equal(formatUnits("12500000", usdc), "12.5");
  assert.equal(formatUnits("1", usdc), "0.000001");
  assert.throws(() => toUnits("0.0000001", usdc), /at most 6 decimals/);
  assert.throws(() => toUnits("0", usdc), /greater than 0/);
});

test("policy: USDC amounts are shown in USDC, not raw units", () => {
  const out = evaluate({ ...req("30000000"), asset: USDC }, healthy(), policy);
  assert.match(out.reasons.find((r) => r.code === "AMOUNT_OVER_WARN_LIMIT")!.message, /30 USDC.*25 USDC/);
});
