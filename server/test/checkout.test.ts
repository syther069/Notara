import { test } from "node:test";
import assert from "node:assert/strict";
import { overallStatus } from "../checkout.ts";

const c = (status: string) => ({ status }) as any;

test("invoice status follows its deposit addresses", () => {
  assert.equal(overallStatus([c("PENDING_DEPOSIT")]), "unpaid");
  assert.equal(overallStatus([c("INCOMPLETE_DEPOSIT")]), "unpaid");
  assert.equal(overallStatus([c("KNOWN_DEPOSIT_TX")]), "processing");
  assert.equal(overallStatus([c("PROCESSING")]), "processing");
  assert.equal(overallStatus([c("REFUNDED")]), "refunded");
  assert.equal(overallStatus([c("FAILED")]), "failed");
});

test("a success on an older address still means paid, and money in flight blocks a new attempt", () => {
  assert.equal(overallStatus([c("SUCCESS"), c("PENDING_DEPOSIT")]), "paid");
  assert.equal(overallStatus([c("PROCESSING"), c("PENDING_DEPOSIT")]), "processing");
  assert.equal(overallStatus([c("REFUNDED"), c("PENDING_DEPOSIT")]), "unpaid");
});
