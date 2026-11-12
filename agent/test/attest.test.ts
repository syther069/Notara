import { test } from "node:test";
import assert from "node:assert/strict";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { formatAttestation, recoverSigner } from "../src/attest.ts";

/** An EIP-191 signature the way NEAR AI Cloud's TEE makes one: r || s || v (27 or 28). */
function personalSign(text: string, priv: Uint8Array): string {
  const msg = Buffer.from(text, "utf8");
  const digest = keccak_256(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${msg.length}`), msg]));
  const sig = secp256k1.sign(digest, priv, { prehash: false, format: "recovered" });
  // noble's "recovered" format puts the recovery byte first.
  return "0x" + Buffer.concat([Buffer.from(sig.subarray(1)), Buffer.from([sig[0] + 27])]).toString("hex");
}
const addressOf = (priv: Uint8Array) => "0x" + Buffer.from(keccak_256(secp256k1.getPublicKey(priv, false).subarray(1)).subarray(12)).toString("hex");

test("a reply signature recovers to the TEE address that made it, and to no other", () => {
  const tee = secp256k1.utils.randomSecretKey();
  const text = "Qwen/Qwen3.8-27B:aaaa:bbbb";
  const sig = personalSign(text, tee);
  assert.equal(recoverSigner(text, sig), addressOf(tee));
  // Change one character of the signed text and the signer is someone else.
  assert.notEqual(recoverSigner("Qwen/Qwen3.8-27B:aaaa:bbbc", sig), addressOf(tee));
  assert.throws(() => recoverSigner(text, "0x1234"), /65 bytes/);
});

test("the log says plainly when a model isn't TEE-hosted, and lists what wasn't checked", () => {
  assert.match(formatAttestation({ model: "provider/relayed-model", verified: false, notTee: true, signingAddresses: [], checks: [], notChecked: [] })[0], /isn't TEE-hosted/);
  const lines = formatAttestation({ model: "m", verified: true, signingAddresses: ["0x1"], checks: [{ name: "GPU", pass: true }], notChecked: ["Intel TDX quote"] });
  assert.deepEqual(lines, ["[tee] m: VERIFIED", "[tee]   ok   GPU", "[tee]   not checked: Intel TDX quote"]);
});
