import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated data dir for each test run.
process.env.NOTARA_DATA_DIR = mkdtempSync(join(tmpdir(), "notara-inv-"));
let inv: typeof import("../invoices.ts");
before(async () => {
  inv = await import("../invoices.ts");
});

const NEAR = "1000000000000000000000000";

test("create assigns random, unguessable ids and starts unpaid", async () => {
  const a = await inv.createInvoice({ merchant: "merchant.testnet", description: "API credits", amount: NEAR });
  const b = await inv.createInvoice({ merchant: "merchant.testnet", description: "More credits", amount: NEAR });
  assert.equal(a.status, "unpaid");
  assert.notEqual(a.id, b.id);
  assert.match(a.id, /^INV-[0-9A-F]{12}$/);
});

test("create validates input", async () => {
  await assert.rejects(() => inv.createInvoice({ merchant: "Bad Account!", description: "x", amount: NEAR }), /merchant/);
  await assert.rejects(() => inv.createInvoice({ merchant: "m.testnet", description: "", amount: NEAR }), /Description/);
  await assert.rejects(() => inv.createInvoice({ merchant: "m.testnet", description: "x", amount: "0" }), /Amount/);
  await assert.rejects(() => inv.createInvoice({ merchant: "m.testnet", description: "x", amount: NEAR, asset: "usdc.testnet" }), /Unsupported asset/);
});

test("vault status maps to invoice status", () => {
  assert.equal(inv.statusFromVault("Executed"), "paid");
  assert.equal(inv.statusFromVault("PendingApproval"), "pending_approval");
  assert.equal(inv.statusFromVault("Rejected"), "refused");
  assert.equal(inv.statusFromVault("Expired"), "refused");
  assert.equal(inv.statusFromVault("Failed"), "failed");
});

test("CSV quotes cells and neutralizes formula injection", async () => {
  const i = await inv.createInvoice({ merchant: "m.testnet", description: '=HYPERLINK("x") and "quotes", commas', amount: NEAR });
  const csv = inv.toCsv([await inv.updateInvoice(i.id, { status: "paid", txHash: "ABC" })], "https://testnet.nearblocks.io", () => "1");
  const [header, row] = csv.trim().split("\r\n");
  assert.match(header, /^"invoice_id","created_at"/);
  assert.match(row, /"'=HYPERLINK\(""x""\) and ""quotes"", commas"/);
  assert.match(row, /"https:\/\/testnet.nearblocks.io\/txns\/ABC"/);
});

test("USDC invoices: created with the token contract id and exported in USDC", async () => {
  const { USDC_TESTNET, getAsset, formatUnits } = await import("../../passport/src/assets.ts");
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "API credits", amount: "2500000", asset: USDC_TESTNET });
  assert.equal(i.asset, USDC_TESTNET);
  const csv = inv.toCsv([i], "https://testnet.nearblocks.io", (u, a) => formatUnits(u, getAsset(a)!));
  const row = csv.trim().split("\r\n")[1];
  assert.match(row, /"2.5","USDC","3e2210e1/);
});

test("set-once flags: only the first caller wins, and a flag can be cleared to retry", async () => {
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "flag", amount: NEAR });
  const results = await Promise.all([1, 2, 3].map(() => inv.setInvoiceFlag(i.id, "linkFundedAt")));
  assert.deepEqual(results.filter(Boolean).length, 1);
  await inv.clearInvoiceFlag(i.id, "linkFundedAt");
  assert.equal(await inv.setInvoiceFlag(i.id, "linkFundedAt"), true);
});

test("a paid invoice never moves back to an earlier status", async () => {
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "race", amount: NEAR });
  await inv.updateInvoice(i.id, { status: "processing" });
  await inv.updateInvoice(i.id, { status: "paid", txHash: "PAID" });
  // A slow checkout poll that read the invoice before it was paid reports its older reading.
  const after = await inv.updateInvoice(i.id, { status: "unpaid", txHash: undefined, checkouts: [] });
  assert.equal(after.status, "paid");
  assert.equal(after.txHash, "PAID");
  for (const s of ["processing", "pending_approval", "failed", "refused"] as const) assert.equal((await inv.updateInvoice(i.id, { status: s })).status, "paid");
  // Moves forward still work, and unrelated fields still merge.
  assert.equal((await inv.updateInvoice(i.id, { claimedTo: "x.testnet" })).claimedTo, "x.testnet");
  assert.equal((await inv.updateInvoice(i.id, { status: "refunded" })).status, "refunded");
});

test("updates merge fields in place instead of overwriting the whole record", async () => {
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "merge", amount: NEAR });
  await inv.setInvoiceFlag(i.id, "linkFundedAt", "2026-11-09T00:00:00.000Z");
  // A writer that read the invoice before the flag was set must not erase it.
  await inv.updateInvoice(i.id, { status: "paid" });
  const got = await inv.getInvoice(i.id);
  assert.equal(got?.status, "paid");
  assert.equal(got?.linkFundedAt, "2026-11-09T00:00:00.000Z");
});
