// Customers who already hold USDC on NEAR pay with their own wallet (1Click doesn't route
// NEAR USDC -> NEAR USDC). The wallet sends the transaction; we only verify it on-chain.

import { NETWORKS } from "../passport/src/config.ts";
import type { Network } from "../passport/src/types.ts";

/**
 * Total `token` units that reached `receiver` in a finished transaction, counted from the
 * token contract's own NEP-141 `ft_transfer` events in receipts that succeeded.
 */
export function receivedInTx(tx: any, token: string, receiver: string): bigint {
  if (!tx?.status || "Failure" in tx.status) return 0n;
  let total = 0n;
  for (const r of tx.receipts_outcome ?? []) {
    const o = r.outcome;
    if (o?.executor_id !== token || !o.status || "Failure" in o.status) continue; // only the token's own, successful logs count
    for (const log of o.logs ?? []) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      let ev: any;
      try {
        ev = JSON.parse(log.slice("EVENT_JSON:".length));
      } catch {
        continue;
      }
      if (ev.standard !== "nep141" || ev.event !== "ft_transfer") continue;
      for (const d of ev.data ?? []) if (d.new_owner_id === receiver && /^\d+$/.test(String(d.amount))) total += BigInt(d.amount);
    }
  }
  return total;
}

async function rpc(url: string, method: string, params: object) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(10_000) });
  const j: any = await res.json();
  if (j.error) throw new Error(j.error.cause?.name ?? j.error.message ?? "RPC error");
  return j.result;
}

/** Fetches a finished transaction; falls back to the archival RPC for older ones. */
export async function fetchTx(network: Network, txHash: string, signerId: string): Promise<any> {
  const params = { tx_hash: txHash, sender_account_id: signerId, wait_until: "FINAL" };
  try {
    return await rpc(NETWORKS[network].rpc, "tx", params);
  } catch {
    return rpc(NETWORKS[network].rpc.replace("://rpc.", "://archival-rpc."), "tx", params);
  }
}
