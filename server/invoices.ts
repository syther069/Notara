// Merchant invoices (Real-World Money track). Stored locally in data/invoices.json.
// An invoice is paid by the customer's agent through the Passport + vault, and its status is
// reconciled from the vault's on-chain payment record (memo "invoice:<id>").

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../passport/src/config.ts";
import { getAsset, listAssets } from "../passport/src/assets.ts";

export type InvoiceStatus = "unpaid" | "pending_approval" | "paid" | "refused" | "failed";

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
  reportHash?: string;
  paidAt?: string;
}

const DIR = process.env.AGENTSPEND_DATA_DIR ?? join(ROOT, "data");
const FILE = join(DIR, "invoices.json");
const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

function load(): Invoice[] {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function save(list: Invoice[]) {
  mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2));
  renameSync(tmp, FILE); // atomic replace so a crash never leaves half a file
}

export function listInvoices(): Invoice[] {
  return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getInvoice(id: string): Invoice | undefined {
  return load().find((i) => i.id === id);
}

export function createInvoice(input: { merchant: string; description: string; amount: string; asset?: string }): Invoice {
  const asset = input.asset ?? "NEAR";
  if (!getAsset(asset)) throw new Error(`Unsupported asset ${asset}. Supported: ${listAssets().map((a) => a.symbol).join(", ")}`);
  if (!ACCOUNT_RE.test(input.merchant) || input.merchant.length > 64) throw new Error("Invalid merchant account id");
  const description = String(input.description ?? "").trim();
  if (!description || description.length > 200) throw new Error("Description is required (max 200 characters)");
  if (!/^\d+$/.test(input.amount) || BigInt(input.amount) <= 0n) throw new Error("Amount must be a positive integer in the smallest unit");

  const list = load();
  const now = new Date().toISOString();
  const inv: Invoice = {
    id: `INV-${String(list.length + 1).padStart(4, "0")}`,
    merchant: input.merchant,
    description,
    amount: input.amount,
    asset,
    status: "unpaid",
    createdAt: now,
    updatedAt: now,
  };
  list.push(inv);
  save(list);
  return inv;
}

export function updateInvoice(id: string, patch: Partial<Invoice>): Invoice {
  const list = load();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) throw new Error(`Unknown invoice ${id}`);
  list[i] = { ...list[i], ...patch, id, updatedAt: new Date().toISOString() };
  save(list);
  return list[i];
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
    i.txHash ? `${explorer}/txns/${i.txHash}` : "",
    i.paidAt ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
