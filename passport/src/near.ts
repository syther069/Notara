// Minimal read-only access to NEAR RPC and the FastNear transaction indexer.
// Plain fetch on purpose: every call is visible, and the endpoint is recorded on each signal.

import { NETWORKS } from "./config.ts";
import type { Network } from "./types.ts";

const TIMEOUT_MS = Number(process.env.PASSPORT_HTTP_TIMEOUT_MS ?? 10_000);

async function postJson(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

export class RpcError extends Error {
  constructor(public readonly cause_name: string, message: string) {
    super(message);
  }
}

export async function rpcQuery(network: Network, params: Record<string, unknown>): Promise<any> {
  const j = await postJson(NETWORKS[network].rpc, {
    jsonrpc: "2.0",
    id: "passport",
    method: "query",
    params: { finality: "final", ...params },
  });
  if (j.error) {
    const name = j.error?.cause?.name ?? j.error?.name ?? "UNKNOWN";
    throw new RpcError(name, `${name}: ${j.error?.cause?.info ? JSON.stringify(j.error.cause.info) : j.error.message}`);
  }
  // Older nodes report contract panics inside result.error
  if (j.result?.error) throw new RpcError("CONTRACT_EXECUTION_ERROR", j.result.error);
  return j.result;
}

export interface AccountView {
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  block_height: number;
}

/** Returns undefined when the account does not exist. */
export async function viewAccount(network: Network, accountId: string): Promise<AccountView | undefined> {
  try {
    return await rpcQuery(network, { request_type: "view_account", account_id: accountId });
  } catch (e) {
    if (e instanceof RpcError && e.cause_name === "UNKNOWN_ACCOUNT") return undefined;
    throw e;
  }
}

export async function viewFunction<T>(network: Network, contractId: string, method: string, args: object = {}): Promise<T> {
  const r = await rpcQuery(network, {
    request_type: "call_function",
    account_id: contractId,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  });
  return JSON.parse(Buffer.from(r.result).toString("utf8")) as T;
}

// ---------------------------------------------------------------- FastNear tx indexer

export interface AccountTx {
  transaction_hash: string;
  tx_block_height: number;
  tx_block_timestamp: string; // ns
  is_signer: boolean;
  is_receiver: boolean;
  is_real_receiver: boolean;
  is_success: boolean;
}

export interface AccountTxPage {
  account_txs: AccountTx[];
  txs_count: number;
  resume_token?: string;
}

export async function accountTxs(
  network: Network,
  accountId: string,
  opts: { desc?: boolean; limit?: number; resume_token?: string } = {},
): Promise<AccountTxPage> {
  const body: Record<string, unknown> = { account_id: accountId, desc: opts.desc ?? true };
  if (opts.limit) body.limit = opts.limit;
  if (opts.resume_token) body.resume_token = opts.resume_token;
  const j = await postJson(`${NETWORKS[network].txApi}/v0/account`, body);
  return { account_txs: j.account_txs ?? [], txs_count: j.txs_count ?? 0, resume_token: j.resume_token };
}

export async function transactions(network: Network, hashes: string[]): Promise<any[]> {
  if (hashes.length === 0) return [];
  const out: any[] = [];
  for (let i = 0; i < hashes.length; i += 20) {
    const j = await postJson(`${NETWORKS[network].txApi}/v0/transactions`, { tx_hashes: hashes.slice(i, i + 20) });
    out.push(...(j.transactions ?? []));
  }
  return out;
}

export const nsToIso = (ns: string | number | bigint) => new Date(Number(BigInt(ns) / 1_000_000n)).toISOString();
export const daysSince = (ns: string) => (Date.now() - Number(BigInt(ns) / 1_000_000n)) / 86_400_000;
