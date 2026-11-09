// NEP-413 signed-message verification, checked on the network the signature is for.
//
// Why not near-sign-verify's verify(): it picks the key index from the account name alone
// (".testnet" -> testnet, anything else -> mainnet), so a testnet implicit account (64 hex chars)
// is looked up on mainnet and always fails. Here the caller names the network, and key ownership
// is read from NEAR RPC (view_access_key), the authoritative source, for named and implicit accounts.
// The token format stays near-sign-verify's, so wallets and stored tokens keep working.

import { createPublicKey, createHash, verify as edVerify } from "node:crypto";
import { serialize } from "borsh";
import { baseDecode } from "near-api-js";
import { parseAuthToken } from "near-sign-verify";
import { rpcQuery, RpcError } from "../passport/src/near.ts";
import type { Network } from "../passport/src/types.ts";

/** NEP-413 prefix tag: 2^31 + 413. */
const TAG = 2147484061;
const PAYLOAD = { struct: { message: "string", nonce: { array: { type: "u8", len: 32 } }, recipient: "string", callbackUrl: { option: "string" } } } as const;
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

export interface VerifyOptions {
  expectedRecipient: string;
  expectedMessage: string;
  validateNonce: (nonce: Uint8Array) => boolean;
}

/** Checks everything that needs no network: format, recipient, message, nonce and the ed25519 signature. */
export function checkSignature(token: string, o: VerifyOptions): { accountId: string; publicKey: string } {
  const t = parseAuthToken(token);
  if (t.recipient !== o.expectedRecipient) throw new Error(`Recipient mismatch: expected '${o.expectedRecipient}'`);
  if (t.message !== o.expectedMessage) throw new Error("The signed text doesn't match");
  const nonce = new Uint8Array(t.nonce);
  if (!o.validateNonce(nonce)) throw new Error("The signature is too old, or the signing time is wrong");
  if (!t.publicKey.startsWith("ed25519:")) throw new Error("Only ed25519 keys are supported");

  const body = serialize(PAYLOAD, { message: t.message, nonce: Array.from(nonce), recipient: t.recipient, callbackUrl: t.callbackUrl ?? null });
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(TAG);
  const hash = createHash("sha256").update(tag).update(body).digest();
  const key = createPublicKey({ key: Buffer.concat([SPKI_ED25519, Buffer.from(baseDecode(t.publicKey.slice(8)))]), format: "der", type: "spki" });
  if (!edVerify(null, hash, key, Buffer.from(t.signature, "base64"))) throw new Error("The signature doesn't check out");
  return { accountId: t.accountId, publicKey: t.publicKey };
}

/** Full check: the signature, and that the key is a full-access key of the account on `network` right now. */
export async function verifySigned(token: string, o: VerifyOptions, network: Network): Promise<{ accountId: string; publicKey: string }> {
  const r = checkSignature(token, o);
  let permission: unknown;
  try {
    permission = (await rpcQuery(network, { request_type: "view_access_key", account_id: r.accountId, public_key: r.publicKey })).permission;
  } catch (e) {
    // NEAR RPC reports a missing key as result.error "access key … does not exist" (RpcError CONTRACT_EXECUTION_ERROR).
    if (e instanceof RpcError && (/UNKNOWN_ACCESS_KEY|UNKNOWN_ACCOUNT/.test(e.cause_name) || /does not exist/.test(e.message)))
      throw new Error(`This key doesn't belong to ${r.accountId} on NEAR ${network}`);
    throw new Error(`Couldn't reach NEAR ${network} to check your key. Try again.`);
  }
  if (permission !== "FullAccess") throw new Error("Sign with a full-access key of your account");
  return r;
}
