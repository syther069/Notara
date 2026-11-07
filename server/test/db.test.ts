import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "notara-db-"));
process.env.NOTARA_DATA_DIR = dir;
// Old-format data the first start must import exactly once.
writeFileSync(join(dir, "invoices.json"), JSON.stringify([{ id: "INV-0001", merchant: "m.testnet", description: "old", amount: "1", asset: "NEAR", status: "paid", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" }]));
writeFileSync(join(dir, "merchants.json"), JSON.stringify({ "m.near": { account: "m.near", website: "m.example", websiteVerified: true, websiteCheckedAt: "2026-11-01T00:00:00.000Z" } }));

test("old JSON data is imported once, then the files are set aside", async () => {
  const { listInvoices, createInvoice, updateInvoice } = await import("../invoices.ts");
  const { getMerchant } = await import("../merchants.ts");
  assert.equal(listInvoices()[0].description, "old");
  assert.equal(getMerchant("m.near").websiteVerified, true);
  assert.ok(existsSync(join(dir, "invoices.json.imported")) && !existsSync(join(dir, "invoices.json")));

  // New ids continue after imported ones, and updates change one row.
  const n = createInvoice({ merchant: "m.testnet", description: "new", amount: "2", asset: "NEAR" });
  assert.equal(n.id, "INV-0002");
  assert.equal(updateInvoice("INV-0001", { status: "refunded" }).status, "refunded");
  assert.deepEqual(listInvoices().map((i) => i.id).sort(), ["INV-0001", "INV-0002"]);
});
