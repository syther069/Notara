import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyPair, baseDecode } from "near-api-js";
import { fromFragment, newLinkKey, toFragment } from "./linkKey.ts";

test("a send link's #part restores the same key and implicit account", () => {
  const k = newLinkKey();
  assert.match(k.account, /^[0-9a-f]{64}$/);
  const back = fromFragment(`#${toFragment(k)}`);
  assert.deepEqual(back, k);
  // The implicit account is the hex of the public key, as NEAR defines it.
  const pub = baseDecode(KeyPair.fromString(k.secret as any).getPublicKey().toString().split(":")[1]);
  assert.equal(Buffer.from(pub).toString("hex"), k.account);
});

test("a damaged #part is rejected, not turned into a different wallet", () => {
  assert.throws(() => fromFragment("#not-a-real-key"));
});
