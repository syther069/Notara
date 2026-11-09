import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyPair } from "near-api-js";
import { sign } from "near-sign-verify";
import { checkSignature } from "../nep413.ts";

// A testnet implicit account: its id is the hex of its own public key, and it doesn't end in ".testnet".
const kp = KeyPair.fromRandom("ed25519");
const implicit = Buffer.from(kp.getPublicKey().data).toString("hex");
const opts = { expectedRecipient: "notara", expectedMessage: "Notara: use my vault\nOwner: " + implicit, validateNonce: () => true };
const token = () => sign(opts.expectedMessage, { signer: kp.toString(), accountId: implicit, recipient: "notara" });

test("nep413: a wallet signature over the exact text checks out, implicit account included", async () => {
  const r = checkSignature(await token(), opts);
  assert.equal(r.accountId, implicit);
  assert.equal(r.publicKey, kp.getPublicKey().toString());
});

test("nep413: changed text, wrong recipient, stale nonce or another key's signature are refused", async () => {
  const t = await token();
  assert.throws(() => checkSignature(t, { ...opts, expectedMessage: opts.expectedMessage + "!" }), /doesn't match/);
  assert.throws(() => checkSignature(t, { ...opts, expectedRecipient: "other" }), /Recipient/);
  assert.throws(() => checkSignature(t, { ...opts, validateNonce: () => false }), /too old/);
  const other = KeyPair.fromRandom("ed25519");
  const forged = await sign(opts.expectedMessage, { signer: other.toString(), accountId: implicit, recipient: "notara" });
  // The forger's key signs fine, but it isn't the account's key: verifySigned's RPC check refuses it.
  assert.equal(checkSignature(forged, opts).publicKey, other.getPublicKey().toString());
});
