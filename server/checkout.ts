// Any-chain checkout through the NEAR Intents 1Click API. The customer sends any supported token
// to a one-time deposit address; the merchant receives an exact USDC amount on NEAR mainnet.
// We never hold the money. There is no Intents testnet, so this always moves real funds.

import { USDC_MAINNET } from "../passport/src/assets.ts";
import type { Checkout, InvoiceStatus } from "./invoices.ts";

const API = "https://1click.chaindefuser.com/v0";
const SYMBOLS = new Set(["USDC", "USDT", "ETH", "BTC", "SOL", "NEAR", "BNB", "AVAX", "POL", "ZEC"]);
const QUOTE_MINUTES = 30;

async function oneClick(path: string, init?: RequestInit): Promise<any> {
  const jwt = process.env.ONECLICK_JWT;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `1Click returned HTTP ${res.status}`);
  return body;
}

export interface PayToken {
  assetId: string;
  label: string;
  /** Set for EVM chains, so the website can offer one-click pay from a browser wallet. */
  chainId?: number;
  /** ERC-20 address; missing for the chain's native coin. */
  contract?: string;
}

const EVM_CHAIN_IDS: Record<string, number> = { eth: 1, base: 8453, arb: 42161, op: 10, pol: 137, bsc: 56, avax: 43114, gnosis: 100 };

let cache: { at: number; tokens: PayToken[] } | undefined;

/** Common tokens a customer can pay with, cached for 5 minutes. */
export async function payTokens(): Promise<PayToken[]> {
  if (cache && Date.now() - cache.at < 300_000) return cache.tokens;
  const all: any[] = await oneClick("/tokens");
  const tokens = all
    .filter((t) => SYMBOLS.has(t.symbol) && t.assetId !== `nep141:${USDC_MAINNET}`)
    .map((t) => ({ assetId: t.assetId, label: `${t.symbol} on ${t.blockchain}`, chainId: EVM_CHAIN_IDS[t.blockchain], contract: EVM_CHAIN_IDS[t.blockchain] ? t.contractAddress : undefined }))
    .sort((a, b) => a.label.localeCompare(b.label));
  // Some chains list two tokens with the same symbol (e.g. bridged and native USDC): tell them apart.
  const seen = new Map<string, number>();
  for (const t of tokens) seen.set(t.label, (seen.get(t.label) ?? 0) + 1);
  for (const t of tokens) if (seen.get(t.label)! > 1) t.label += ` (${t.assetId.split(":").pop()!.slice(0, 12)}…)`;
  cache = { at: Date.now(), tokens };
  return tokens;
}

export async function createCheckout(i: { merchant: string; amount: string; originAsset: string; refundTo: string; label: string }): Promise<Checkout> {
  const deadline = new Date(Date.now() + QUOTE_MINUTES * 60_000).toISOString();
  const { quote } = await oneClick("/quote", {
    method: "POST",
    body: JSON.stringify({
      dry: false,
      swapType: "EXACT_OUTPUT",
      slippageTolerance: 100,
      originAsset: i.originAsset,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: `nep141:${USDC_MAINNET}`,
      amount: i.amount,
      refundTo: i.refundTo,
      refundType: "ORIGIN_CHAIN",
      recipient: i.merchant,
      recipientType: "DESTINATION_CHAIN",
      deadline,
    }),
  });
  return {
    depositAddress: quote.depositAddress,
    depositMemo: quote.depositMemo,
    originAsset: i.originAsset,
    label: i.label,
    amountIn: quote.amountInFormatted,
    amountInUnits: quote.amountIn,
    refundTo: i.refundTo,
    deadline: quote.deadline ?? deadline,
    status: "PENDING_DEPOSIT",
  };
}

/** Latest state of one deposit address. */
export async function readCheckout(c: Checkout): Promise<Checkout> {
  const s = await oneClick(`/status?depositAddress=${encodeURIComponent(c.depositAddress)}`);
  const dest = s.swapDetails?.destinationChainTxHashes?.[0];
  return {
    ...c,
    status: s.status,
    txHash: dest?.hash,
    txUrl: dest?.explorerUrl,
    refundReason: s.swapDetails?.refundReason,
  };
}

const DONE = new Set(["SUCCESS", "REFUNDED", "FAILED"]);
export const isDone = (c: Checkout) => DONE.has(c.status);

/** An invoice can have several deposit addresses (the customer changed token). Any success means paid. */
export function overallStatus(list: Checkout[]): InvoiceStatus {
  if (list.some((c) => c.status === "SUCCESS")) return "paid";
  if (list.some((c) => c.status === "PROCESSING" || c.status === "KNOWN_DEPOSIT_TX")) return "processing";
  const last = list.at(-1)?.status;
  if (last === "REFUNDED") return "refunded";
  if (last === "FAILED") return "failed";
  return "unpaid";
}
