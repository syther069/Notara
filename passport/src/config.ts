import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Network } from "./types.ts";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const NETWORKS: Record<Network, { rpc: string; txApi: string; explorer: string }> = {
  testnet: {
    rpc: process.env.NEAR_TESTNET_RPC ?? "https://rpc.testnet.fastnear.com",
    txApi: process.env.FASTNEAR_TESTNET_TX ?? "https://tx.test.fastnear.com",
    explorer: "https://testnet.nearblocks.io",
  },
  mainnet: {
    rpc: process.env.NEAR_MAINNET_RPC ?? "https://rpc.mainnet.fastnear.com",
    txApi: process.env.FASTNEAR_MAINNET_TX ?? "https://tx.main.fastnear.com",
    explorer: "https://nearblocks.io",
  },
};

export interface Policy {
  version: string;
  /** Payments above this (in the asset's smallest unit) always need human approval. */
  warnAboveAmount: Record<string, string>;
  /** Payments above this are refused outright. The vault enforces its own cap independently. */
  blockAboveAmount: Record<string, string>;
  /** Recipients with less observed history than this get WARN. */
  minObservedAgeDays: number;
  minObservedTxCount: number;
  /** A contract redeployed within this window gets WARN. */
  recentDeployDays: number;
  /** First payment to a never-seen recipient above this amount gets WARN. */
  firstPaymentWarnAbove: Record<string, string>;
  allowlist: string[];
  denylist: { account: string; reason: string }[];
  /** Report categories that lead to BLOCK when a report is Verified. */
  blockingCategories: string[];
  verdictTtlMs: number;
}

export interface Deployment {
  network: Network;
  /** Testnet only: mainnet has just the report registry (no vault holds real funds). */
  vault: string;
  registry: string;
  owner: string;
  verifier?: string;
  /** Demo accounts created by setup, for the scripted scenarios. */
  accounts?: { merchant: string; newShop: string; attacker: string };
  allowlist?: string[];
}

export function loadPolicy(path = join(ROOT, "passport", "policy.json")): Policy {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Written by scripts/setup-testnet.ts. Missing when nothing has been deployed yet. */
export function loadDeployment(network: Network): Deployment | undefined {
  const path = join(ROOT, `deployment.${network}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

export const DISCLAIMER =
  "This verdict applies the configured policy to the evidence listed. It is not proof that a recipient is " +
  "malicious or safe. Indexer data can be incomplete, reports can be wrong, and account age can be bought.";
