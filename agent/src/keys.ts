// Local key files (gitignored, in ./keys). Testnet only.
//
// Separation that matters for the demo:
//   keys/agent-fc.json  - the ONLY key the agent process loads. Function-call key on the vault
//                         account, restricted to `request_payment`. It cannot transfer NEAR,
//                         cannot attach deposits, cannot call owner methods.
//   keys/owner.json     - the human owner. Approves WARN payments. Never loaded by the agent.
//   keys/vault-admin.json - full-access key of the vault account, used only by setup to deploy.
//                         `npm run owner -- lock-vault` deletes it from chain.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Account, type KeyPairString } from "near-api-js";
import { NETWORKS, ROOT } from "../../passport/src/config.ts";
import type { Network } from "../../passport/src/types.ts";

export interface KeyFile {
  account_id: string;
  public_key: string;
  secret_key: string;
  note?: string;
}

const KEY_DIR = join(ROOT, "keys");

export function keyPath(name: string) {
  return join(KEY_DIR, `${name}.json`);
}

export function readKey(name: string): KeyFile {
  const p = keyPath(name);
  if (!existsSync(p)) throw new Error(`Missing ${p}. Run "npm run setup:testnet" first.`);
  return JSON.parse(readFileSync(p, "utf8"));
}

export function hasKey(name: string) {
  return existsSync(keyPath(name));
}

export function writeKey(name: string, k: KeyFile) {
  mkdirSync(KEY_DIR, { recursive: true });
  writeFileSync(keyPath(name), JSON.stringify(k, null, 2));
}

export function accountFromKey(network: Network, name: string): Account {
  const k = readKey(name);
  return new Account(k.account_id, NETWORKS[network].rpc, k.secret_key as KeyPairString);
}
