// Invoice due dates and line items on the website. The maths matches server/invoices.ts, so the total
// a merchant sees before signing is the total the server stores.
import type { Invoice, LineItem } from "./api";

/** Rows as typed in the form: prices as decimals. */
export interface ItemRow {
  description: string;
  quantity: string;
  unit: string;
}

export const QTY_RE = /^\d{1,6}(\.\d{1,2})?$/;
export const PRICE_RE = /^\d+(\.\d{1,6})?$/;

/** "12.5" with `decimals` places -> units, or null if it isn't a valid amount. */
export function toUnits(decimal: string, decimals: number): bigint | null {
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(decimal)) return null;
  const [w, f = ""] = decimal.split(".");
  return BigInt(w) * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0"));
}

/** units -> "12.5" (no trailing zeros). */
export function fromUnits(units: bigint, decimals: number): string {
  const s = units.toString().padStart(decimals + 1, "0");
  const w = s.slice(0, -decimals);
  const f = s.slice(-decimals).replace(/0+$/, "");
  return f ? `${w}.${f}` : w;
}

/** quantity x unit price, rounded to the nearest unit (quantity has at most 2 decimals). */
export function lineUnits(quantity: string, unitUnits: bigint): bigint {
  const [w, f = ""] = quantity.split(".");
  return (unitUnits * (BigInt(w) * 100n + BigInt(f.padEnd(2, "0"))) + 50n) / 100n;
}

/** The total of the typed rows, or null while any row is incomplete. */
export function rowsTotal(rows: ItemRow[], decimals: number): bigint | null {
  let sum = 0n;
  for (const r of rows) {
    const u = toUnits(r.unit.trim(), decimals);
    if (!r.description.trim() || !QTY_RE.test(r.quantity.trim()) || Number(r.quantity) <= 0 || u === null || u <= 0n) return null;
    sum += lineUnits(r.quantity.trim(), u);
  }
  return rows.length ? sum : null;
}

export const lineTotal = (i: LineItem) => lineUnits(i.quantity, BigInt(i.unitAmount));

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Still waiting for money and past its due date (paid on the due day isn't late). Same rule as the server. */
export const isOverdue = (i: Pick<Invoice, "status" | "dueDate">, today = todayIso()) => !!i.dueDate && (i.status === "unpaid" || i.status === "failed") && i.dueDate < today;

/** "2026-12-01" -> "1 Dec 2026", read as a calendar day (no time-zone shift). */
export const formatDue = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
