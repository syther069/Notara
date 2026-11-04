import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated data dir for each test run.
process.env.AGENTSPEND_DATA_DIR = mkdtempSync(join(tmpdir(), "agentspend-inv-"));
let inv: typeof import("../invoices.ts");
before(async () => {
  inv = await import("../invoices.ts");
});

const NEAR = "1000000000000000000000000";

test("create assigns sequential ids and starts unpaid", () => {
  const a = inv.createInvoice({ merchant: "merchant.testnet", description: "API credits", amount: NEAR });
  const b = inv.createInvoice({ merchant: "merchant.testnet", description: "More credits", amount: NEAR });
  assert.equal(a.status, "unpaid");
  assert.notEqual(a.id, b.id);
  assert.match(a.id, /^INV-\d{4}$/);
});

test("create validates input", () => {
  assert.throws(() => inv.createInvoice({ merchant: "Bad Account!", description: "x", amount: NEAR }), /merchant/);
  assert.throws(() => inv.createInvoice({ merchant: "m.testnet", description: "", amount: NEAR }), /Description/);
  assert.throws(() => inv.createInvoice({ merchant: "m.testnet", description: "x", amount: "0" }), /Amount/);
  assert.throws(() => inv.createInvoice({ merchant: "m.testnet", description: "x", amount: NEAR, asset: "usdc.testnet" }), /Only NEAR/);
});

test("vault status maps to invoice status", () => {
  assert.equal(inv.statusFromVault("Executed"), "paid");
  assert.equal(inv.statusFromVault("PendingApproval"), "pending_approval");
  assert.equal(inv.statusFromVault("Rejected"), "refused");
  assert.equal(inv.statusFromVault("Expired"), "refused");
  assert.equal(inv.statusFromVault("Failed"), "failed");
});

test("CSV quotes cells and neutralizes formula injection", () => {
  const i = inv.createInvoice({ merchant: "m.testnet", description: '=HYPERLINK("x") and "quotes", commas', amount: NEAR });
  const csv = inv.toCsv([inv.updateInvoice(i.id, { status: "paid", txHash: "ABC" })], "https://testnet.nearblocks.io", () => "1");
  const [header, row] = csv.trim().split("\r\n");
  assert.match(header, /^"invoice_id","created_at"/);
  assert.match(row, /"'=HYPERLINK\(""x""\) and ""quotes"", commas"/);
  assert.match(row, /"https:\/\/testnet.nearblocks.io\/txns\/ABC"/);
});
