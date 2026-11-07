// fixture-usdc-transfer.json is a real NEAR testnet transaction (owner sent 15 USDC to the vault,
// tx 8itP2NCXgJLrMMmhH2DGo7UcWEoyejcLGMiA83KmLQ2F), read from the archival RPC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { receivedInTx } from "../nearpay.ts";

const tx = JSON.parse(readFileSync(new URL("./fixture-usdc-transfer.json", import.meta.url), "utf8"));
const USDC = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
const VAULT = "spend-vault.agentspend-1104-p6zw.testnet";

test("counts USDC that really reached the receiver", () => {
  assert.equal(receivedInTx(tx, USDC, VAULT), 15_000_000n);
});

test("ignores other receivers and other tokens", () => {
  assert.equal(receivedInTx(tx, USDC, "someone-else.testnet"), 0n);
  assert.equal(receivedInTx(tx, "fake-usdc.testnet", VAULT), 0n);
});

test("a failed transaction or a failed token receipt counts as nothing", () => {
  assert.equal(receivedInTx({ ...tx, status: { Failure: {} } }, USDC, VAULT), 0n);
  const failedReceipt = structuredClone(tx);
  for (const r of failedReceipt.receipts_outcome) if (r.outcome.executor_id === USDC) r.outcome.status = { Failure: {} };
  assert.equal(receivedInTx(failedReceipt, USDC, VAULT), 0n);
});

test("a log faked by another contract doesn't count", () => {
  const forged = structuredClone(tx);
  for (const r of forged.receipts_outcome) if (r.outcome.executor_id === USDC) r.outcome.executor_id = "attacker.testnet";
  assert.equal(receivedInTx(forged, USDC, VAULT), 0n);
});
