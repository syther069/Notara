// Merchant invoices and payment links (Real-World Money track). Stored in SQLite (server/db.ts).
// An invoice is paid by the customer's agent through Notara + vault, and its status is
// reconciled from the vault's on-chain payment record (memo "invoice:<id>").

import { docs } from "./db.ts";
import { getAsset, listAssets } from "../passport/src/assets.ts";
import { notifyPaid } from "./notify.ts";

export type InvoiceStatus = "unpaid" | "pending_approval" | "processing" | "paid" | "refused" | "refunded" | "failed";

/** One 1Click deposit address for an any-chain payment link. */
export interface Checkout {
  depositAddress: string;
  depositMemo?: string;
  originAsset: string;
  label: string;
  amountIn: string;
  /** amountIn in the token's base units, for wallets. */
  amountInUnits?: string;
  refundTo: string;
  deadline: string;
  status: string;
  txHash?: string;
  txUrl?: string;
  refundReason?: string;
}

export interface Invoice {
  id: string;
  merchant: string;
  description: string;
  /** smallest unit (yoctoNEAR for NEAR) */
  amount: string;
  asset: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  decision?: "ALLOW" | "WARN" | "BLOCK";
  reasons?: string[];
  vaultPaymentId?: string;
  txHash?: string;
  /** Full explorer link, when the payment isn't on testnet. */
  txUrl?: string;
  checkouts?: Checkout[];
  /** Send links: when the sponsor made the link account exist (once), and the claim. */
  linkFundedAt?: string;
  claimedAt?: string;
  claimedTo?: string;
  claimTx?: string;
  /** "send": money sent by link to a one-time account; the receiver claims it. */
  kind?: "send";
  /** Paid directly from a NEAR wallet: the transaction hash that paid it. */
  nearTx?: string;
  /** NEP-413 token: the merchant's wallet signed this exact link. */
  signedToken?: string;
  reportHash?: string;
  paidAt?: string;
  paidNotifiedAt?: string;
  /** Set while a claim is in flight, so two servers can't relay the same link at once. */
  claimingAt?: string;
}

const store = docs<Invoice>("invoices");
const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export const listInvoices = (): Promise<Invoice[]> => store.all();
export const getInvoice = (id: string): Promise<Invoice | undefined> => store.get(id);
/** Atomic set-once flag on an invoice (see db.ts). True if this call set it. */
export const setInvoiceFlag = (id: string, field: keyof Invoice, value = new Date().toISOString()) => store.setOnce(id, field, value);
export const clearInvoiceFlag = (id: string, field: keyof Invoice) => store.unset(id, field);

export async function createInvoice(input: { merchant: string; description: string; amount: string; asset?: string }): Promise<Invoice> {
  const asset = input.asset ?? "NEAR";
  if (!getAsset(asset)) throw new Error(`Unsupported asset ${asset}. Supported: ${listAssets().map((a) => a.symbol).join(", ")}`);
  if (!ACCOUNT_RE.test(input.merchant) || input.merchant.length > 64) throw new Error("Invalid merchant account id");
  const description = String(input.description ?? "").trim();
  if (!description || description.length > 200) throw new Error("Description is required (max 200 characters)");
  if (!/^\d+$/.test(input.amount) || BigInt(input.amount) <= 0n) throw new Error("Amount must be a positive integer in the smallest unit");

  const now = new Date().toISOString();
  // Sequential ids; two servers creating at once both try the same id, so the loser retries the next one.
  for (let n = (await store.count()) + 1, tries = 0; tries < 20; n++, tries++) {
    const inv: Invoice = {
      id: `INV-${String(n).padStart(4, "0")}`,
    merchant: input.merchant,
    description,
    amount: input.amount,
    asset,
      status: "unpaid",
      createdAt: now,
      updatedAt: now,
    };
    if (await store.insert(inv.id, inv.createdAt, inv)) return inv;
  }
  throw new Error("Couldn't pick an invoice id, try again");
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const next = await store.merge(id, { ...patch, updatedAt: new Date().toISOString() });
  if (!next) throw new Error(`Unknown invoice ${id}`);
  // Alert once, even if several servers see the payment at the same moment.
  if (next.status === "paid" && (await store.setOnce(id, "paidNotifiedAt", new Date().toISOString()))) notifyPaid(next);
  return next;
}

/** Map a vault payment status onto an invoice status. */
export function statusFromVault(vaultStatus: string): InvoiceStatus {
  switch (vaultStatus) {
    case "Executed":
      return "paid";
    case "PendingApproval":
    case "Executing":
      return "pending_approval";
    case "Rejected":
    case "Expired":
      return "refused";
    default:
      return "failed";
  }
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  // Quote everything that could break a row; neutralize spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(list: Invoice[], explorer: string, formatAmount: (units: string, asset: string) => string): string {
  const header = ["invoice_id", "created_at", "description", "amount", "currency", "asset_contract", "merchant", "status", "decision", "vault_payment_id", "tx_hash", "explorer_url", "paid_at"];
  const rows = list.map((i) => [
    i.id,
    i.createdAt,
    i.description,
    formatAmount(i.amount, i.asset),
    getAsset(i.asset)?.symbol ?? i.asset,
    i.asset === "NEAR" ? "" : i.asset,
    i.merchant,
    i.status,
    i.decision ?? "",
    i.vaultPaymentId ?? "",
    i.txHash ?? "",
    i.txUrl ?? (i.txHash ? `${explorer}/txns/${i.txHash}` : ""),
    i.paidAt ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
