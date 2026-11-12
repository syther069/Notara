// Merchant invoices and payment links (Real-World Money track). Stored in SQLite (server/db.ts).
// An invoice is paid by the customer's agent through Notara + vault, and its status is
// reconciled from the vault's on-chain payment record (memo "invoice:<id>").

import { randomBytes } from "node:crypto";
import { docs } from "./db.ts";
import { getAsset, listAssets } from "../passport/src/assets.ts";
import { notifyPaid } from "./notify.ts";
import { isOverdue, itemsTotal, lineTotal, paidWith, type LineItem } from "../web/src/lib/invoice-rules.ts";

export { isOverdue, itemsTotal, lineTotal, type LineItem };

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
  /** Send links: the wallet that signed for the link (NEP-413). */
  sentBy?: string;
  /** Paid directly from a NEAR wallet: the transaction hash that paid it. */
  nearTx?: string;
  /** The day the customer should pay by (YYYY-MM-DD). Past it and still unpaid, the link shows Overdue. */
  dueDate?: string;
  /** Optional lines; when present, amount is exactly their total. */
  items?: LineItem[];
  /** The NEAR account the payment came from, when we know it: the customer's wallet, or the agent's vault. */
  paidBy?: string;
  /** NEP-413 token: the merchant's wallet signed this exact link. */
  signedToken?: string;
  reportHash?: string;
  paidAt?: string;
  paidNotifiedAt?: string;
  /** Set while a claim is in flight, so two servers can't relay the same link at once. */
  claimingAt?: string;
}

const store = docs<Invoice>("invoices");
/** A link id: INV- and 12 hex digits for new links; older links have 4 or more digits. */
export const INV_ID = "INV-[0-9A-F]{4,16}";
export const newInvoiceId = () => `INV-${randomBytes(6).toString("hex").toUpperCase()}`;
const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export const listInvoices = (): Promise<Invoice[]> => store.all();
export const getInvoice = (id: string): Promise<Invoice | undefined> => store.get(id);
/** Atomic set-once flag on an invoice (see db.ts). True if this call set it. */
export const setInvoiceFlag = (id: string, field: keyof Invoice, value = new Date().toISOString()) => store.setOnce(id, field, value);
export const clearInvoiceFlag = (id: string, field: keyof Invoice) => store.unset(id, field);

const QTY_RE = /^\d{1,6}(\.\d{1,2})?$/;
export const MAX_ITEMS = 20;
/** Links made without a wallet signature, across the whole site, per UTC day. Signed links have no cap. */
export const MAX_UNSIGNED_LINKS_PER_DAY = 500;

/** Why an unsigned link can't be made today, or null. `today` is the UTC day, YYYY-MM-DD. */
export function unsignedLimitReason(list: Pick<Invoice, "createdAt" | "signedToken" | "kind">[], today: string): string | null {
  const n = list.filter((i) => !i.signedToken && i.kind !== "send" && i.createdAt.startsWith(today)).length;
  return n >= MAX_UNSIGNED_LINKS_PER_DAY ? "Today's limit for unsigned links is reached. Sign the link with your wallet, or try again tomorrow." : null;
}


/** Checks and tidies line items; throws a plain-language error. */
export function cleanItems(raw: unknown): LineItem[] | undefined {
  if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) return undefined;
  if (!Array.isArray(raw)) throw new Error("Line items must be a list");
  if (raw.length > MAX_ITEMS) throw new Error(`At most ${MAX_ITEMS} line items`);
  return raw.map((r: any, n) => {
    const description = String(r?.description ?? "").trim();
    const quantity = String(r?.quantity ?? "").trim();
    const unitAmount = String(r?.unitAmount ?? "");
    if (!description || description.length > 80) throw new Error(`Line ${n + 1}: a description is required (max 80 characters)`);
    if (!QTY_RE.test(quantity) || Number(quantity) <= 0) throw new Error(`Line ${n + 1}: quantity must be a number like 1, 3 or 7.5`);
    if (!/^\d+$/.test(unitAmount) || BigInt(unitAmount) <= 0n) throw new Error(`Line ${n + 1}: price must be more than zero`);
    return { description, quantity: quantity.replace(/\.0+$/, ""), unitAmount };
  });
}

/** A due date as YYYY-MM-DD, from today (UTC, a day of leeway for time zones) up to a year ahead. */
export function cleanDueDate(raw: unknown, now = new Date()): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const s = String(raw);
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error("Due date must be a real date like 2026-12-01");
  const day = 86_400_000;
  if (d.getTime() < now.getTime() - 2 * day) throw new Error("Due date can't be in the past");
  if (d.getTime() > now.getTime() + 366 * day) throw new Error("Due date must be within a year");
  return s;
}


export async function createInvoice(input: { merchant: string; description: string; amount: string; asset?: string; dueDate?: string; items?: LineItem[] }): Promise<Invoice> {
  const asset = input.asset ?? "NEAR";
  if (!getAsset(asset)) throw new Error(`Unsupported asset ${asset}. Supported: ${listAssets().map((a) => a.symbol).join(", ")}`);
  if (!ACCOUNT_RE.test(input.merchant) || input.merchant.length > 64) throw new Error("Invalid merchant account id");
  const description = String(input.description ?? "").trim();
  if (!description || description.length > 200) throw new Error("Description is required (max 200 characters)");
  if (!/^\d+$/.test(input.amount) || BigInt(input.amount) <= 0n) throw new Error("Amount must be a positive integer in the smallest unit");
  const items = cleanItems(input.items);
  if (items && itemsTotal(items).toString() !== input.amount) throw new Error("The amount must equal the total of the line items");
  const dueDate = cleanDueDate(input.dueDate);

  const now = new Date().toISOString();
  // Random ids (48 bits), so nobody can walk INV-0001, INV-0002… to read other merchants' links.
  // Older links keep their short numeric ids, which still match INV_ID.
  for (let tries = 0; tries < 5; tries++) {
    const inv: Invoice = {
      id: newInvoiceId(),
    merchant: input.merchant,
    description,
    amount: input.amount,
    asset,
      ...(dueDate && { dueDate }),
      ...(items && { items }),
      status: "unpaid",
      createdAt: now,
      updatedAt: now,
    };
    if (await store.insert(inv.id, inv.createdAt, inv)) return inv;
  }
  throw new Error("Couldn't pick an invoice id, try again");
}

/**
 * Status flow: unpaid -> processing | pending_approval -> paid | refused | failed, and paid -> refunded.
 * "paid" means money arrived, so only "paid" or "refunded" may follow it. Several readers (checkout
 * polls, vault reads, wallet reports) race on one invoice; a slow one holding an older reading must
 * not move a paid invoice back, so that patch is dropped in the same statement that would apply it.
 */
const AFTER_PAID: ReadonlySet<InvoiceStatus> = new Set(["paid", "refunded"]);

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const stamped = { ...patch, updatedAt: new Date().toISOString() };
  const guarded = patch.status !== undefined && !AFTER_PAID.has(patch.status);
  const next = guarded ? ((await store.mergeUnless(id, stamped, "status", "paid")) ?? (await store.get(id))) : await store.merge(id, stamped);
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

export interface CsvOptions {
  /** "mainnet" or "testnet" for this invoice's asset. */
  network: (asset: string) => string;
  /** Explorer base URL for that network. */
  explorer: (asset: string) => string;
  /** Token units as a decimal, e.g. "2500000" USDC -> "2.5". */
  formatAmount: (units: string, asset: string) => string;
  today?: string;
}


/**
 * The export for a bookkeeper: one row per link, plain column names, amounts as decimals in the
 * stated currency, and every payment traceable to its transaction. Each column is explained on the
 * docs page "Links, status and CSV export".
 */
export function toCsv(list: Invoice[], o: CsvOptions): string {
  const header = [
    "invoice_id", "type", "created_at", "due_date", "status", "overdue", "description", "line_items", "amount", "currency", "network",
    "payee_account", "payer_account", "paid_with", "paid_at", "payment_tx", "payment_tx_url", "refund_reason", "signed_by_payee",
    "agent_safety_check", "vault_payment_id", "token_contract",
  ];
  const today = o.today ?? new Date().toISOString().slice(0, 10);
  const rows = list.map((i) => {
    const sym = getAsset(i.asset)?.symbol ?? i.asset;
    const items = (i.items ?? []).map((l) => `${l.quantity} x ${l.description} @ ${o.formatAmount(l.unitAmount, i.asset)} = ${o.formatAmount(lineTotal(l).toString(), i.asset)}`).join("; ");
    return [
      i.id,
      i.kind === "send" ? "send link" : "payment link",
      i.createdAt,
      i.dueDate ?? "",
      i.status,
      isOverdue(i, today) ? "yes" : "no",
      i.description,
      items,
      o.formatAmount(i.amount, i.asset),
      sym,
      o.network(i.asset),
      i.merchant,
      i.paidBy ?? "",
      paidWith(i),
      i.paidAt ?? "",
      i.txHash ?? "",
      i.txUrl ?? (i.txHash ? `${o.explorer(i.asset)}/txns/${i.txHash}` : ""),
      i.checkouts?.at(-1)?.refundReason ?? "",
      i.signedToken ? "yes" : "no",
      i.decision ?? "",
      i.vaultPaymentId ?? "",
      i.asset === "NEAR" ? "" : i.asset,
    ];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
