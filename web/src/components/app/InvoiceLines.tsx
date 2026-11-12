// The due date and line items of an invoice, as the customer and the merchant see them.
import type { Invoice } from "@/lib/api";
import { formatAsset } from "@/lib/format";
import { formatDue, isOverdue, lineTotal } from "@/lib/invoice";

export function InvoiceLines({ inv }: { inv: Invoice }) {
  if (!inv.dueDate && !inv.items?.length) return null;
  const late = isOverdue(inv);
  return (
    <div className="mt-4 flex flex-col gap-3">
      {inv.dueDate && (
        <p className="m-0 flex flex-wrap items-center gap-2 text-[14.5px]">
          <span className="text-muted">Due</span>
          <strong>{formatDue(inv.dueDate)}</strong>
          {late && <span className="badge BLOCK">Overdue</span>}
        </p>
      )}
      {inv.items && inv.items.length > 0 && (
        <table className="w-full border-collapse text-[14px]">
          <caption className="sr-only">Line items</caption>
          <thead>
            <tr className="border-b border-border text-left text-[12.5px] text-muted">
              <th scope="col" className="py-1.5 pr-3 font-semibold">What</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Qty</th>
              <th scope="col" className="hidden py-1.5 pr-3 text-right font-semibold sm:table-cell">Price</th>
              <th scope="col" className="py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((i, n) => (
              <tr key={n} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3 [overflow-wrap:anywhere]">{i.description}</td>
                <td className="tnum py-2 pr-3 text-right">{i.quantity}</td>
                <td className="tnum hidden whitespace-nowrap py-2 pr-3 text-right sm:table-cell">{formatAsset(i.unitAmount, inv.asset)}</td>
                <td className="tnum whitespace-nowrap py-2 text-right font-semibold">{formatAsset(lineTotal(i).toString(), inv.asset)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="pt-2 text-left font-bold sm:hidden">Total</th>
              <th scope="row" colSpan={3} className="hidden pt-2 text-left font-bold sm:table-cell">Total</th>
              <td className="tnum whitespace-nowrap pt-2 text-right font-bold">{formatAsset(inv.amount, inv.asset)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
