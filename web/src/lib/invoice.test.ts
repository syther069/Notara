import { test } from "node:test";
import assert from "node:assert/strict";
import { fromUnits, isOverdue, isoDay, rowsTotal, toUnits } from "./invoice.ts";
import { itemsTotal } from "../../../server/invoices.ts";
import { buildTxs, toCsv } from "./tx.ts";
import { USDC_TESTNET } from "./format.ts";

test("the form's line-item total is exactly what the server stores", () => {
  const rows = [
    { description: "Design hours", quantity: "7.5", unit: "4" },
    { description: "Stock photo", quantity: "2", unit: "0.25" },
    { description: "Rounding", quantity: "0.33", unit: "0.000001" }, // 0.33 units, rounds to 0
  ];
  const web = rowsTotal(rows, 6);
  const server = itemsTotal(rows.map((r) => ({ description: r.description, quantity: r.quantity, unitAmount: toUnits(r.unit, 6)!.toString() })));
  assert.equal(web, server);
  assert.equal(fromUnits(web!, 6), "30.5");
  assert.equal(rowsTotal([{ description: "", quantity: "1", unit: "1" }], 6), null); // incomplete rows give no total
});

test("overdue matches the server's rule", () => {
  assert.equal(isOverdue({ status: "unpaid", dueDate: "2026-11-11" }, "2026-11-12"), true);
  assert.equal(isOverdue({ status: "unpaid", dueDate: "2026-11-12" }, "2026-11-12"), false);
  assert.equal(isOverdue({ status: "paid", dueDate: "2026-11-01" }, "2026-11-12"), false);
});

test("the Transactions export keeps exact amounts and adds due date, lines and how it was paid", () => {
  const txs = buildTxs(
    [
      {
        id: "INV-1",
        merchant: "me.testnet",
        description: "Brand refresh",
        amount: "30500002",
        asset: USDC_TESTNET,
        status: "paid",
        dueDate: "2026-11-20",
        items: [{ description: "Design hours", quantity: "7.5", unitAmount: "4000000" }],
        paidBy: "client.testnet",
        nearTx: "TX1",
        txHash: "TX1",
        createdAt: "2026-11-12T10:00:00.000Z",
        updatedAt: "2026-11-12T10:00:00.000Z",
        paidAt: "2026-11-12T11:00:00.000Z",
      },
    ],
    [],
  );
  const [header, row] = toCsv(txs, "UTC").split("\n");
  assert.equal(header, "Date,Direction,Type,Counterparty,Amount,Asset,Memo,Line items,Due date,Overdue,Status,Paid with,Network,Transaction,Transaction link,Id");
  assert.match(row, /,In,Payment link,client\.testnet,30\.500002,USDC,Brand refresh,7\.5 x Design hours @ 4 = 30,2026-11-20,No,Paid,NEAR wallet,testnet,TX1,https:\/\/testnet\.nearblocks\.io\/txns\/TX1,INV-1$/);
});

test("the due-date picker's today is the viewer's own day, not UTC's", () => {
  // 23:30 on 12 Nov in the viewer's time zone is still the 12th, whatever UTC says.
  assert.equal(isoDay(new Date(2026, 10, 12, 23, 30)), "2026-11-12");
  assert.equal(isoDay(new Date(2026, 0, 5, 0, 15)), "2026-01-05");
});
