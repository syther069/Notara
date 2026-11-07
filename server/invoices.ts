// Merchant invoices and payment links (Real-World Money track). Stored in SQLite (server/db.ts).
// An invoice is paid by the customer's agent through Notara + vault, and its status is
// reconciled from the vault's on-chain payment record (memo "invoice:<id>").

import { docs } from "./db.ts";
import { getAsset, listAssets } from "../passport/src/assets.ts";

export type InvoiceStatus = "unpaid" | "pending_approval" | "processing" | "paid" | "refused" | "refunded" | "failed";

/** One 1Click deposit address for an any-chain payment link. */
export interface Checkout {
  depositAddress: string;
  depositMemo?: string;
  originAsset: string;
  label: string;
  amountIn: string;
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
  /** "send": money sent by link to a one-time account; the receiver claims it. */
  kind?: "send";
  /** Paid directly from a NEAR wallet: the transaction hash that paid it. */
  nearTx?: string;
  /** NEP-413 token: the merchant's wallet signed this exact link. */
  signedToken?: string;
  reportHash?: string;
  paidAt?: string;
}

const store = docs<Invoice>("invoices");
const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export const listInvoices = (): Invoice[] => store.all();
export const getInvoice = (id: string): Invoice | undefined => store.get(id);

export function createInvoice(input: { merchant: string; description: string; amount: string; asset?: string }): Invoice {
  const asset = input.asset ?? "NEAR";
  if (!getAsset(asset)) throw new Error(`Unsupported asset ${asset}. Supported: ${listAssets().map((a) => a.symbol).join(", ")}`);
  if (!ACCOUNT_RE.test(input.merchant) || input.merchant.length > 64) throw new Error("Invalid merchant account id");
  const description = String(input.description ?? "").trim();
  if (!description || description.length > 200) throw new Error("Description is required (max 200 characters)");
  if (!/^\d+$/.test(input.amount) || BigInt(input.amount) <= 0n) throw new Error("Amount must be a positive integer in the smallest unit");

  const now = new Date().toISOString();
  const inv: Invoice = {
    id: `INV-${String(store.count() + 1).padStart(4, "0")}`,
    merchant: input.merchant,
    description,
    amount: input.amount,
    asset,
    status: "unpaid",
    createdAt: now,
    updatedAt: now,
  };
  store.put(inv.id, inv.createdAt, inv);
  return inv;
}

export function updateInvoice(id: string, patch: Partial<Invoice>): Invoice {
  const cur = store.get(id);
  if (!cur) throw new Error(`Unknown invoice ${id}`);
  const next = { ...cur, ...patch, id, updatedAt: new Date().toISOString() };
  store.put(id, cur.createdAt, next);
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
