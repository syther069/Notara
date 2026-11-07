// Signs verdicts so the vault contract can verify them on-chain with env::ed25519_verify.
// The message format MUST match Verdict::signing_message in contracts/vault/src/lib.rs.

import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KeyPair, type KeyPairString } from "near-api-js";
import { ROOT } from "./config.ts";
import type { Report, SignedVerdict } from "./types.ts";

export const DOMAIN = "agentspend-passport/v1";

export function signingMessage(v: SignedVerdict): string {
  for (const [k, val] of Object.entries(v)) {
    if (String(val).includes("\n")) throw new Error(`verdict field ${k} contains a newline`);
  }
  return [DOMAIN, v.vault, v.recipient, v.amount, v.asset, v.decision, v.nonce, v.expires_at_ms, v.report_hash].join("\n");
}

/** Stable JSON (sorted keys) so the report hash is reproducible. */
export function canonicalJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonicalJson).join(",")}]`;
  if (x && typeof x === "object") {
    return `{${Object.keys(x as object)
      .sort()
      .filter((k) => (x as any)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((x as any)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(x);
}

export const reportHash = (r: Report) => createHash("sha256").update(canonicalJson(r)).digest("hex");

/** Random u64 nonce as a decimal string. */
export const newNonce = () => BigInt("0x" + randomBytes(8).toString("hex")).toString();

const KEY_FILE = join(ROOT, "keys", "passport-signer.json");

/**
 * Notara signer key. In this prototype it is a local file; the stretch goal is to keep it
 * inside a TEE so the operator cannot sign arbitrary verdicts. Env PASSPORT_SIGNER_KEY overrides.
 */
export function loadSigner(create = false): KeyPair {
  if (process.env.PASSPORT_SIGNER_KEY) return KeyPair.fromString(process.env.PASSPORT_SIGNER_KEY as KeyPairString);
  if (existsSync(KEY_FILE)) return KeyPair.fromString(JSON.parse(readFileSync(KEY_FILE, "utf8")).secret_key);
  if (!create) throw new Error(`No Notara signer key. Run "npm run setup:testnet" or set PASSPORT_SIGNER_KEY.`);
  const kp = KeyPair.fromRandom("ed25519");
  mkdirSync(join(ROOT, "keys"), { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify({ public_key: kp.getPublicKey().toString(), secret_key: kp.toString() }, null, 2));
  return kp;
}

export function signVerdict(v: SignedVerdict, kp: KeyPair): string {
  const { signature } = kp.sign(new TextEncoder().encode(signingMessage(v)));
  return Buffer.from(signature).toString("base64");
}
