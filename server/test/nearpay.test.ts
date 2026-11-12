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

test("with a memo, only a transfer carrying that memo counts", () => {
  assert.equal(receivedInTx(tx, USDC, VAULT, "fund AgentSpend vault"), 15_000_000n);
  assert.equal(receivedInTx(tx, USDC, VAULT, "INV-0042"), 0n); // a real transfer, but not a payment for this link
});

test("a transfer refunded in the same transaction counts as nothing (ft_transfer_call to a plain account)", () => {
  // ft_transfer_call logs the transfer in; the receiver can't take it, so ft_resolve_transfer sends it back.
  const ev = (data: object) => `EVENT_JSON:${JSON.stringify({ standard: "nep141", version: "1.0.0", event: "ft_transfer", data: [data] })}`;
  const receipt = (log: string) => ({ outcome: { executor_id: USDC, status: { SuccessValue: "" }, logs: [log] } });
  const refunded = {
    status: { SuccessValue: "IjAi" },
    receipts_outcome: [
      receipt(ev({ old_owner_id: "payer.testnet", new_owner_id: VAULT, amount: "2000000", memo: "INV-0042" })),
      { outcome: { executor_id: VAULT, status: { Failure: {} }, logs: [] } }, // ft_on_transfer: no such method
      receipt(ev({ old_owner_id: VAULT, new_owner_id: "payer.testnet", amount: "2000000", memo: "refund" })),
    ],
  };
  assert.equal(receivedInTx(refunded, USDC, VAULT, "INV-0042"), 0n);
  // A partial refund leaves only what stayed.
  refunded.receipts_outcome[2] = receipt(ev({ old_owner_id: VAULT, new_owner_id: "payer.testnet", amount: "500000", memo: "refund" }));
  assert.equal(receivedInTx(refunded, USDC, VAULT, "INV-0042"), 1_500_000n);
});
