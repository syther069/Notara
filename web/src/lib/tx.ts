// One list of payments for the dashboard and the Transactions table, built from what is real:
// the links this wallet made on Notara (from the server) and the sends made from this device.
import type { Decision, Invoice } from "./api";
import type { LocalSend } from "./local";
import { EXPLORER, linkNetwork, USDC_MAINNET, USDC_TESTNET } from "./format";
import { fromUnits, isOverdue, lineTotal } from "./invoice";
import { paidWith } from "./invoice-rules";

export type TxStatus = "Paid" | "Pending" | "Processing" | "Failed" | "Refunded" | "Sent";
export interface Tx {
  id: string;
  /** ISO time: when it was paid or sent, else when it was created. */
  at: string;
  direction: "in" | "out";
  kind: "Payment link" | "Send link" | "Direct send" | "Agent invoice";
  /** Who is on the other side, when Notara knows. */
  counterparty: string | null;
  /** Smallest units of `asset`. */
  amount: string;
  asset: string;
  memo: string;
  status: TxStatus;
  network: "mainnet" | "testnet";
  txUrl: string | null;
  txHash: string | null;
  /** The link's own page, for links. */
  href: string | null;
  check?: { decision: Decision; reason: string; coverage: string };
  agent?: { decision?: Decision; reasons?: string[]; vaultPaymentId?: string };
  signed?: boolean;
  /** Unpaid and past its due date. */
  overdue?: boolean;
  dueDate?: string;
  /** "2 x Logo @ 25 = 50; …", for the export. */
  items?: string;
  /** How the customer paid: "USDC on base (NEAR Intents)", "NEAR wallet", "AI agent vault". */
  paidWith?: string;
}


/** Token units as an exact decimal ("2500000" USDC -> "2.5"), never rounded. */
export function exactAmount(units: string, asset: string): string {
  const d = isUsdc(asset) ? 6 : asset === "NEAR" ? 24 : 0;
  return d ? fromUnits(BigInt(units), d) : units;
}

const STATUS: Record<Invoice["status"], TxStatus> = { unpaid: "Pending", pending_approval: "Processing", processing: "Processing", paid: "Paid", refused: "Failed", refunded: "Refunded", failed: "Failed" };

export const isUsdc = (asset: string) => asset === USDC_MAINNET || asset === USDC_TESTNET;

export function buildTxs(links: Invoice[], sends: LocalSend[]): Tx[] {
  const fromLinks: Tx[] = links.map((l) => {
    const net = linkNetwork(l.asset) ?? "testnet";
    return {
      id: l.id,
      at: l.paidAt ?? l.createdAt,
      direction: l.kind === "send" ? "out" : "in",
      kind: l.kind === "send" ? "Send link" : linkNetwork(l.asset) ? "Payment link" : "Agent invoice",
      counterparty: l.kind === "send" ? null : (l.paidBy ?? null),
      amount: l.amount,
      asset: l.asset,
      memo: l.description,
      status: STATUS[l.status],
      network: net,
      txUrl: l.txUrl ?? (l.txHash ? `${EXPLORER[net]}/txns/${l.txHash}` : null),
      txHash: l.txHash ?? null,
      href: l.kind === "send" ? null : linkNetwork(l.asset) ? `/pay/${l.id}` : `/invoices/${l.id}`,
      agent: l.decision || l.vaultPaymentId ? { decision: l.decision, reasons: l.reasons, vaultPaymentId: l.vaultPaymentId } : undefined,
      signed: l.signed,
      overdue: isOverdue(l),
      dueDate: l.dueDate,
      items: l.items?.map((i) => `${i.quantity} x ${i.description} @ ${exactAmount(i.unitAmount, l.asset)} = ${exactAmount(lineTotal(i).toString(), l.asset)}`).join("; "),
      paidWith: paidWith(l) || undefined,
    };
  });
  const fromSends: Tx[] = sends.map((s) => ({
    id: s.id,
    at: s.at,
    direction: "out",
    kind: "Direct send",
    counterparty: s.to,
    amount: s.amount,
    asset: s.network === "mainnet" ? USDC_MAINNET : USDC_TESTNET,
    memo: s.memo,
    status: "Sent",
    network: s.network,
    txUrl: s.txHash ? `${EXPLORER[s.network]}/txns/${s.txHash}` : null,
    txHash: s.txHash || null,
    href: null,
    check: s.check,
  }));
  return [...fromLinks, ...fromSends].sort((a, b) => b.at.localeCompare(a.at));
}

/** Money that actually moved: paid links in, sends out. */
export const settled = (t: Tx) => isUsdc(t.asset) && (t.status === "Paid" || t.status === "Sent");

const DAY = 86_400_000;
/** USDC in and out per day for the last `days` days, oldest first. */
export function dailySeries(txs: Tx[], days: number, now = Date.now()): { day: number; in: number; out: number }[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const first = start.getTime() - (days - 1) * DAY;
  const out = Array.from({ length: days }, (_, i) => ({ day: first + i * DAY, in: 0, out: 0 }));
  for (const t of txs) {
    if (!settled(t)) continue;
    const i = Math.floor((Date.parse(t.at) - first) / DAY);
    if (i < 0 || i >= days) continue;
    out[i][t.direction] += Number(t.amount) / 1e6;
  }
  return out;
}

/** Sum of settled USDC units in a calendar month (0 = this month, 1 = last month). */
export function monthTotal(txs: Tx[], direction: "in" | "out", monthsAgo: number, now = new Date()): bigint {
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1).getTime();
  const to = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1).getTime();
  let sum = 0n;
  for (const t of txs) {
    const at = Date.parse(t.at);
    if (t.direction === direction && settled(t) && at >= from && at < to) sum += BigInt(t.amount);
  }
  return sum;
}

export function toCsv(txs: Tx[], timeZone: string): string {
  // A cell starting with = + - @ (or a tab/return) would run as a formula in a spreadsheet: prefix an apostrophe.
  const esc = (raw: string) => {
    const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short", timeStyle: "medium", hour12: false });
  // Exact amounts (never rounded), the due date and lines, how it was paid, and a link to check it on chain.
  const rows = txs.map((t) => [
    fmt.format(new Date(t.at)),
    t.direction === "in" ? "In" : "Out",
    t.kind,
    t.counterparty ?? "",
    exactAmount(t.amount, t.asset),
    isUsdc(t.asset) ? "USDC" : t.asset,
    t.memo,
    t.items ?? "",
    t.dueDate ?? "",
    t.overdue ? "Yes" : "No",
    t.status,
    t.paidWith ?? "",
    t.network,
    t.txHash ?? "",
    t.txUrl ?? "",
    t.id,
  ]);
  return [["Date", "Direction", "Type", "Counterparty", "Amount", "Asset", "Memo", "Line items", "Due date", "Overdue", "Status", "Paid with", "Network", "Transaction", "Transaction link", "Id"], ...rows].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
}
