// Our own record of contract code hashes seen at check time. RPC only exposes the
// current code hash, so this is how we notice "the code changed since we last checked",
// even when the indexer misses the deploy.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../config.ts";
import type { Network } from "../types.ts";

const DIR = join(ROOT, "passport", "data");
const FILE = join(DIR, "code-hashes.json");

type Store = Record<string, { codeHash: string; seenAt: string }>;

function load(): Store {
  try {
    return existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
  } catch {
    return {};
  }
}

/** Records the hash and returns the previously recorded one (if any). */
export function recordCodeHash(network: Network, account: string, codeHash: string): string | undefined {
  if (process.env.PASSPORT_NO_CACHE === "1") return undefined;
  const store = load();
  const key = `${network}:${account}`;
  const prev = store[key]?.codeHash;
  if (prev !== codeHash) {
    store[key] = { codeHash, seenAt: new Date().toISOString() };
    mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(store, null, 2));
  }
  return prev;
}
