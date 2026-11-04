import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { KeyPair, baseEncode, type KeyPairString } from "near-api-js";
import { canonicalJson, signingMessage, signVerdict } from "../src/verdict.ts";
import type { SignedVerdict } from "../src/types.ts";

/** Same deterministic key as the Rust vault tests: seed = [7u8; 32]. */
export function seed7KeyPair(): KeyPair {
  const seed = Buffer.alloc(32, 7);
  const priv = createPrivateKey({
    key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]),
    format: "der",
    type: "pkcs8",
  });
  const pub = Buffer.from(createPublicKey(priv).export({ format: "jwk" }).x!, "base64url");
  return KeyPair.fromString(`ed25519:${baseEncode(Buffer.concat([seed, pub]))}` as KeyPairString);
}

const vector: SignedVerdict = {
  vault: "vault.testnet",
  recipient: "merchant.testnet",
  amount: "1000000000000000000000000",
  asset: "NEAR",
  decision: "ALLOW",
  nonce: "42",
  expires_at_ms: "1800000060000",
  report_hash: "ab".repeat(32),
};

test("signing message matches the Rust vault byte-for-byte", () => {
  // Same string as `signing_message_is_stable` in contracts/vault/src/tests.rs
  assert.equal(
    signingMessage(vector),
    `agentspend-passport/v1\nvault.testnet\nmerchant.testnet\n1000000000000000000000000\nNEAR\nALLOW\n42\n1800000060000\n${"ab".repeat(32)}`,
  );
});

test("signature over the vector is the one the Rust test verifies on-chain", () => {
  // contracts/vault/src/tests.rs `typescript_signature_verifies_on_chain` uses this exact value.
  assert.equal(signVerdict(vector, seed7KeyPair()), TS_SIGNATURE);
});

test("newlines in fields are refused (would break the canonical message)", () => {
  assert.throws(() => signingMessage({ ...vector, recipient: "a\nb" }));
});

test("canonical JSON sorts keys and drops undefined", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: undefined, c: [2, "x"] } }), `{"a":{"c":[2,"x"]},"b":1}`);
});

export const TS_SIGNATURE =
  "IZ0D7vHRyEazW0PpLB2SEMUNQNPqet9t92NLfCyb0FV729FYg6KRc5nHIohDH/Awa2gCbwS1fo32XZGzdd4ACw==";
