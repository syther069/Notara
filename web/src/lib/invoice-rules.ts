// Invoice rules shared by the server (server/invoices.ts) and the website (lib/invoice.ts, lib/tx.ts),
// so a total, an Overdue label or a "paid with" line can never differ between them.
// No imports on purpose: both sides load this file as it is.

/** One invoice line. quantity: a decimal with up to 2 places (hours can be 7.5); unitAmount: token units. */
export interface LineItem {
  description: string;
  quantity: string;
  unitAmount: string;
}

/** quantity x unit price, in token units, rounded to the nearest unit. */
export function lineUnits(quantity: string, unitUnits: bigint): bigint {
  const [w, f = ""] = quantity.split(".");
  return (unitUnits * (BigInt(w) * 100n + BigInt(f.padEnd(2, "0"))) + 50n) / 100n;
}
export const lineTotal = (i: LineItem) => lineUnits(i.quantity, BigInt(i.unitAmount));
export const itemsTotal = (items: LineItem[]) => items.reduce((sum, i) => sum + lineTotal(i), 0n);

/**
 * Still waiting for money and past its due date; paid on the due day isn't late. `today` is
 * YYYY-MM-DD: the server passes the UTC day, the website the viewer's own day.
 */
export const isOverdue = (i: { status: string; dueDate?: string }, today: string) => !!i.dueDate && (i.status === "unpaid" || i.status === "failed") && i.dueDate < today;

/** How a paid link was paid, in words an accountant can read. */
export function paidWith(i: { status: string; checkouts?: { status: string; label: string }[]; nearTx?: string; vaultPaymentId?: string }): string {
  if (i.status !== "paid") return "";
  const c = i.checkouts?.find((x) => x.status === "SUCCESS");
  if (c) return `${c.label} (NEAR Intents)`;
  if (i.nearTx) return "NEAR wallet";
  if (i.vaultPaymentId !== undefined) return "AI agent vault";
  return "";
}
