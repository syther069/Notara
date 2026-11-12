import { test } from "node:test";
import assert from "node:assert/strict";
import { SAFE_500, clientError } from "../errors.ts";

test("the public deploy never shows the raw text of an unexpected error", () => {
  const internal = "connect ECONNREFUSED ep-cool-db.neon.tech:5432";
  assert.equal(clientError(500, internal, true), SAFE_500);
  assert.equal(clientError(502, internal, true), SAFE_500);
  // Errors we raise on purpose keep their plain message, and local runs keep the detail for debugging.
  assert.equal(clientError(400, "Due date can't be in the past", true), "Due date can't be in the past");
  assert.equal(clientError(500, internal, false), internal);
});
