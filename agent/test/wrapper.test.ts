// The wrapper must never reach the signing path on BLOCK or when Notara is unreachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GuardedPayments } from "../src/wrapper.ts";
import type { CheckResponse, Decision } from "../../passport/src/types.ts";

function fakeAccount() {
  const calls: any[] = [];
  return {
    calls,
    account: {
      callFunctionRaw: async (p: any) => {
        calls.push(p);
        return { transaction: { hash: "TXHASH" }, status: { SuccessValue: Buffer.from(JSON.stringify("7")).toString("base64") } };
      },
    } as any,
  };
}

const response = (decision: Decision): CheckResponse => ({
  report: {
    version: "notara/report/v1",
    request: { network: "testnet", recipient: "x.testnet", amount: "1", asset: "NEAR" },
    decision,
    reasons: [{ code: "TEST", severity: decision === "BLOCK" ? "block" : decision === "WARN" ? "warn" : "info", message: "test", signals: [] }],
    coverage: { ok: 1, total: 1, failed: [] },
    signals: [],
    policyVersion: "test",
    generatedAt: "t",
    disclaimer: "",
  },
  verdict: { vault: "v.testnet", recipient: "x.testnet", amount: "1", asset: "NEAR", decision, nonce: "1", expires_at_ms: "1", report_hash: "h" },
  signature: "sig",
});

const wallet = (account: any, checker: any, notes: string[] = []) =>
  new GuardedPayments({ network: "testnet", agentAccount: account, vaultId: "v.testnet", checker, log: () => {}, notifyHuman: (m) => void notes.push(m) });

test("BLOCK: refuses and never calls the signing path", async () => {
  const f = fakeAccount();
  const notes: string[] = [];
  const out = await wallet(f.account, async () => response("BLOCK"), notes).pay("x.testnet", "1");
  assert.equal(out.status, "refused");
  assert.equal(f.calls.length, 0);
  assert.equal(notes.length, 1, "human is notified");
});

test("Notara unreachable: payment not attempted", async () => {
  const f = fakeAccount();
  const out = await wallet(f.account, async () => {
    throw new Error("ECONNREFUSED");
  }).pay("x.testnet", "1");
  assert.equal(out.status, "error");
  assert.equal(f.calls.length, 0);
});

test("WARN: submits to the vault (which parks it) and notifies the human", async () => {
  const f = fakeAccount();
  const notes: string[] = [];
  const out = await wallet(f.account, async () => response("WARN"), notes).pay("x.testnet", "1");
  assert.equal(out.status, "pending_human_approval");
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].methodName, "request_payment");
  assert.equal(f.calls[0].deposit, 0n, "function-call key path attaches no deposit");
  assert.match(notes[0], /needs your approval/);
});

test("the signed verdict is passed through unmodified", async () => {
  const f = fakeAccount();
  const r = response("WARN");
  await wallet(f.account, async () => r).pay("x.testnet", "1");
  assert.deepEqual(f.calls[0].args.verdict, r.verdict);
  assert.equal(f.calls[0].args.signature, r.signature);
});
