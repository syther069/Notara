import { test } from "node:test";
import assert from "node:assert/strict";
import { newLinkNotes, notesFor, type Note } from "./notes.ts";
import type { Invoice } from "./api.ts";

const base = { merchant: "me.testnet", asset: "USDC", createdAt: "2026-11-13T00:00:00.000Z", updatedAt: "2026-11-13T00:00:00.000Z" };
const link = (id: string, extra: Partial<Invoice>): Invoice => ({ ...base, id, description: `Job ${id}`, amount: "5", status: "unpaid", ...extra }) as Invoice;
const amount = (i: Invoice) => `${i.amount} USDC`;

test("the first look at a wallet records what already happened, with no notes", () => {
  const r = newLinkNotes([link("A", { status: "paid" })], null, "me.testnet", amount);
  assert.deepEqual(r.notes, []);
  assert.deepEqual(r.seen, ["paid-A"]);
});

test("a link paid since the last look becomes one note, and only once", () => {
  const list = [link("A", { status: "paid" }), link("B", { status: "paid" })];
  const r = newLinkNotes(list, ["paid-A"], "me.testnet", amount);
  assert.equal(r.notes.length, 1);
  assert.equal(r.notes[0].id, "paid-B");
  assert.equal(r.notes[0].text, "Job B was paid: 5 USDC.");
  assert.equal(r.notes[0].href, "/transactions?q=B");
  assert.equal(r.notes[0].account, "me.testnet");
  assert.deepEqual(newLinkNotes(list, r.seen, "me.testnet", amount).notes, []);
});

test("a claimed send link becomes a note; a funded but unclaimed one doesn't", () => {
  const list = [link("S1", { kind: "send", status: "paid" }), link("S2", { kind: "send", status: "paid", claimedAt: "2026-11-13T01:00:00.000Z", claimedTo: "friend.testnet" })];
  const r = newLinkNotes(list, [], "me.testnet", amount);
  assert.deepEqual(r.notes.map((n) => n.text), ["Your send link for 5 USDC was claimed by friend.testnet."]);
});

test("each wallet sees its own notes, plus the watched-account notes", () => {
  const n = (id: string, account?: string): Note => ({ id, text: id, href: "/", at: "", read: false, account });
  const all = [n("a", "alice.testnet"), n("b", "bob.testnet"), n("watch")];
  assert.deepEqual(notesFor(all, "alice.testnet").map((x) => x.id), ["a", "watch"]);
  assert.deepEqual(notesFor(all, null).map((x) => x.id), ["watch"]);
});
