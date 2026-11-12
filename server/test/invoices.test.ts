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
  const csv = inv.toCsv([await inv.updateInvoice(i.id, { status: "paid", txHash: "ABC" })], { network: () => "testnet", explorer: () => "https://testnet.nearblocks.io", formatAmount: () => "1" });
  const [header, row] = csv.trim().split("\r\n");
  assert.match(header, /^"invoice_id","type","created_at"/);
  assert.match(row, /"'=HYPERLINK\(""x""\) and ""quotes"", commas"/);
  assert.match(row, /"https:\/\/testnet.nearblocks.io\/txns\/ABC"/);
});

test("USDC invoices: created with the token contract id and exported in USDC", async () => {
  const { USDC_TESTNET, getAsset, formatUnits } = await import("../../passport/src/assets.ts");
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "API credits", amount: "2500000", asset: USDC_TESTNET });
  assert.equal(i.asset, USDC_TESTNET);
  const csv = inv.toCsv([i], { network: () => "testnet", explorer: () => "https://testnet.nearblocks.io", formatAmount: (u, a) => formatUnits(u, getAsset(a)!) });
  const row = csv.trim().split("\r\n")[1];
  assert.match(row, /"2.5","USDC","testnet"/);
  assert.match(row, /"3e2210e1[0-9a-f]+"$/);
});

test("line items: the amount must equal their total, and quantities can have two decimals", async () => {
  const { USDC_TESTNET } = await import("../../passport/src/assets.ts");
  const items = [
    { description: "Design hours", quantity: "7.5", unitAmount: "40000000" }, // 7.5 x 40 = 300 USDC
    { description: "Stock photo", quantity: "2", unitAmount: "12500000" }, // 2 x 12.5 = 25 USDC
  ];
  assert.equal(inv.itemsTotal(items), 325_000_000n);
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "Brand refresh", amount: "325000000", asset: USDC_TESTNET, items });
  assert.equal(i.items?.length, 2);
  await assert.rejects(() => inv.createInvoice({ merchant: "m.testnet", description: "x", amount: "1", asset: USDC_TESTNET, items }), /total of the line items/);
  assert.throws(() => inv.cleanItems([{ description: "", quantity: "1", unitAmount: "1" }]), /Line 1: a description/);
  assert.throws(() => inv.cleanItems([{ description: "x", quantity: "0", unitAmount: "1" }]), /quantity/);
  assert.throws(() => inv.cleanItems([{ description: "x", quantity: "1.234", unitAmount: "1" }]), /quantity/);
  assert.throws(() => inv.cleanItems(Array.from({ length: 21 }, () => ({ description: "x", quantity: "1", unitAmount: "1" }))), /At most 20/);
});

test("due dates: a real date from today up to a year ahead; overdue only while unpaid", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  assert.equal(inv.cleanDueDate("2026-11-30", now), "2026-11-30");
  assert.equal(inv.cleanDueDate("", now), undefined);
  assert.throws(() => inv.cleanDueDate("2026-02-30", now), /real date/);
  assert.throws(() => inv.cleanDueDate("2026-11-01", now), /past/);
  assert.throws(() => inv.cleanDueDate("2028-01-01", now), /within a year/);
  assert.equal(inv.isOverdue({ status: "unpaid", dueDate: "2026-11-11" }, "2026-11-12"), true);
  assert.equal(inv.isOverdue({ status: "unpaid", dueDate: "2026-11-12" }, "2026-11-12"), false); // due today isn't late
  assert.equal(inv.isOverdue({ status: "paid", dueDate: "2026-11-01" }, "2026-11-12"), false);
  assert.equal(inv.isOverdue({ status: "unpaid" }, "2026-11-12"), false);
});

test("the CSV reads like an accountant's ledger: due date, overdue, items, payer, how it was paid", async () => {
  const { USDC_TESTNET, getAsset, formatUnits } = await import("../../passport/src/assets.ts");
  const i = await inv.createInvoice({ merchant: "m.testnet", description: "Brand refresh", amount: "50000000", asset: USDC_TESTNET, dueDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), items: [{ description: "Logo", quantity: "2", unitAmount: "25000000" }] });
  const paid = await inv.updateInvoice(i.id, { status: "paid", nearTx: "TX1", txHash: "TX1", paidBy: "client.testnet", paidAt: "2026-11-12T10:00:00.000Z" });
  const csv = inv.toCsv([paid], { network: () => "testnet", explorer: () => "https://testnet.nearblocks.io", formatAmount: (u, a) => formatUnits(u, getAsset(a)!) });
  const [header, row] = csv.trim().split("\r\n");
  assert.equal(header, ["invoice_id", "type", "created_at", "due_date", "status", "overdue", "description", "line_items", "amount", "currency", "network", "payee_account", "payer_account", "paid_with", "paid_at", "payment_tx", "payment_tx_url", "refund_reason", "signed_by_payee", "agent_safety_check", "vault_payment_id", "token_contract"].map((h) => `"${h}"`).join(","));
  assert.match(row, /"payment link"/);
  assert.match(row, /"paid","no","Brand refresh","2 x Logo @ 25 = 50","50","USDC","testnet","m.testnet","client.testnet","NEAR wallet"/);
  assert.match(row, /"https:\/\/testnet.nearblocks.io\/txns\/TX1"/);
});

test("unsigned links have a daily cap across the site; signed links and send links don't count", () => {
  const today = "2026-11-13";
  const unsigned = Array.from({ length: inv.MAX_UNSIGNED_LINKS_PER_DAY }, () => ({ createdAt: `${today}T10:00:00.000Z` }));
  assert.match(inv.unsignedLimitReason(unsigned, today) ?? "", /limit for unsigned links/);
  assert.equal(inv.unsignedLimitReason(unsigned.slice(1), today), null);
  assert.equal(inv.unsignedLimitReason([...unsigned.slice(1), { createdAt: `${today}T11:00:00.000Z`, signedToken: "t" }, { createdAt: `${today}T11:00:00.000Z`, kind: "send" as const }], today), null);
  assert.equal(inv.unsignedLimitReason(unsigned, "2026-11-14"), null); // yesterday's links don't count today
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
