// The transactions table (HeroUI Table): sort, text filter, date range, status and direction filters,
// CSV export of what is shown, and a side sheet with the full detail of a row.
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Table } from "@heroui/react";
import type { SortDescriptor } from "react-aria-components";
import { useWallet } from "@/lib/wallet";
import { useAccountData } from "@/lib/data";
import { sendsKey, useLocal, type LocalSend } from "@/lib/local";
import { buildTxs, isUsdc, toCsv, type Tx, type TxStatus } from "@/lib/tx";
import { formatAsset, shortHash, usdcFigure } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Download, ExternalLink, Link2, RefreshCw, Search, Send } from "@/components/icons";
import { CheckboxGroup, CheckboxGroupItem } from "@/components/smoothui/checkbox-group";
import { usePrefs } from "./profile";
import { Button, Chip, CopyChip, EmptyState, LinkButton, Notice, Row, Select, Sheet, Shimmer, type Tone } from "./ui";
import { VerdictChip } from "./verdict";

const TONE: Record<TxStatus, Tone> = { Paid: "gold", Sent: "success", Pending: "outline", Processing: "warning", Failed: "danger", Refunded: "neutral" };
const STATUS_HINT: Record<TxStatus, string> = {
  Paid: "The customer paid this link. The money is in your wallet.",
  Sent: "You sent this from your wallet. It settled on NEAR.",
  Pending: "Nobody has paid this link yet.",
  Processing: "A payment is on its way or waiting for approval.",
  Failed: "The payment didn't go through. No money moved.",
  Refunded: "The payer's money was returned to them.",
};

export function StatusChip({ status }: { status: TxStatus }) {
  return (
    <Chip tone={TONE[status]} hint={STATUS_HINT[status]}>
      {status}
    </Chip>
  );
}

/** "12.50 USDC" or "$12.50", following the default-currency preference. Other assets keep their own unit. */
export function useMoney() {
  const [prefs] = usePrefs();
  return (amount: string | bigint, asset?: string) => {
    if (asset !== undefined && !isUsdc(asset)) return formatAsset(amount.toString(), asset);
    return prefs.currency === "USD" ? `$${usdcFigure(amount)}` : `${usdcFigure(amount)} USDC`;
  };
}

export function useTxs(): { txs: Tx[] | null; error: string | null; loading: boolean; reload: () => void } {
  const w = useWallet();
  const { links, linksError, linksLoading, reloadLinks } = useAccountData();
  const [sends] = useLocal<LocalSend[]>(sendsKey(w.accountId ?? "-"), []);
  const txs = useMemo(() => (links ? buildTxs(links, sends) : null), [links, sends]);
  return { txs, error: linksError, loading: linksLoading, reload: reloadLinks };
}

function EmptyArt() {
  return (
    <svg viewBox="0 0 160 96" className="h-24 w-40 text-moss dark:text-mint" fill="none" aria-hidden>
      <rect x="18" y="20" width="124" height="62" rx="12" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <rect x="30" y="8" width="100" height="62" rx="12" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M44 28h34M44 40h54M44 52h22" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="108" cy="50" r="10" fill="var(--color-gold)" fillOpacity=".3" stroke="var(--gold-ink)" strokeWidth="1.5" />
      <path d="m103.5 50 3 3 6-6.5" stroke="var(--gold-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TxDetail({ tx, onClose }: { tx: Tx | null; onClose: () => void }) {
  const money = useMoney();
  const [prefs] = usePrefs();
  return (
    <Sheet open={!!tx} onClose={onClose} title={tx ? `${tx.direction === "in" ? "Payment in" : "Payment out"}` : "Payment"}>
      {tx && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="tnum text-[34px] font-extrabold tracking-[-0.04em]">
              {tx.direction === "in" ? "+" : "−"}
              {money(tx.amount, tx.asset)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusChip status={tx.status} />
              <Chip tone={tx.network === "mainnet" ? "gold" : "outline"} hint={tx.network === "mainnet" ? "NEAR mainnet: real money." : "NEAR testnet: free test money."}>
                {tx.network === "mainnet" ? "Mainnet" : "Testnet"}
              </Chip>
            </div>
          </div>
          <div>
            <Row label="Type">{tx.kind}</Row>
            <Row label="Date">{new Date(tx.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: prefs.timezone })}</Row>
            <Row label={tx.direction === "in" ? "From" : "To"}>{tx.counterparty ? <span className="break-all font-mono text-[13px]">{tx.counterparty}</span> : <span className="font-medium text-muted">{tx.kind === "Send link" ? "Whoever claims the link" : "Not recorded by Notara"}</span>}</Row>
            <Row label="Memo">{tx.memo || <span className="font-medium text-muted">None</span>}</Row>
            <Row label="Notara id">
              <span className="font-mono text-[13px]">{tx.id}</span>
            </Row>
            <Row label="NEAR transaction">
              {tx.txUrl ? (
                <a href={tx.txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[13px] underline underline-offset-4">
                  {tx.txHash ? shortHash(tx.txHash) : "View"} <ExternalLink size={12} aria-hidden />
                </a>
              ) : (
                <span className="font-medium text-muted">None yet</span>
              )}
            </Row>
            {tx.signed !== undefined && tx.kind === "Payment link" && <Row label="Signed by your wallet">{tx.signed ? "Yes" : "No"}</Row>}
          </div>
          {tx.check && (
            <div className="rounded-2xl border border-border/70 bg-surface p-4">
              <p className="mb-2 text-[13px] font-semibold text-muted">Account check shown when you sent it</p>
              <VerdictChip decision={tx.check.decision} />
              <p className="mt-2 text-[14px] leading-relaxed">{tx.check.reason}</p>
              <p className="mt-1 text-[12.5px] text-muted">{tx.check.coverage}</p>
            </div>
          )}
          {tx.agent && (
            <div className="rounded-2xl border border-border/70 bg-surface p-4">
              <p className="mb-2 text-[13px] font-semibold text-muted">Agent context</p>
              {tx.agent.decision && <VerdictChip decision={tx.agent.decision} />}
              {tx.agent.reasons?.map((r) => (
                <p key={r} className="mt-2 text-[14px] leading-relaxed">{r}</p>
              ))}
              {tx.agent.vaultPaymentId && <p className="mt-1 text-[12.5px] text-muted">Vault payment #{tx.agent.vaultPaymentId}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tx.href && (
              <>
                <CopyChip text={`${location.origin}${tx.href}`} label="Copy link" />
                <LinkButton to={tx.href} variant="secondary" size="sm">
                  Open the link's page
                </LinkButton>
              </>
            )}
            {tx.counterparty && (
              <LinkButton to={`/send?to=${encodeURIComponent(tx.counterparty)}`} variant="secondary" size="sm">
                <Send size={14} aria-hidden /> Send again
              </LinkButton>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

const STATUSES: (TxStatus | "All")[] = ["All", "Paid", "Sent", "Pending", "Processing", "Failed", "Refunded"];

export function TxTable({ limit }: { limit?: number }) {
  const { txs, error, loading, reload } = useTxs();
  const money = useMoney();
  const [prefs] = usePrefs();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [status, setStatus] = useState<TxStatus | "All">("All");
  const [dirs, setDirs] = useState<string[]>(["in", "out"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });
  const [open, setOpen] = useState<Tx | null>(null);

  const rows = useMemo(() => {
    if (!txs) return null;
    const needle = q.trim().toLowerCase();
    const f = from ? Date.parse(`${from}T00:00:00`) : -Infinity;
    const t = to ? Date.parse(`${to}T23:59:59`) : Infinity;
    const list = txs.filter((x) => {
      const at = Date.parse(x.at);
      return (
        (status === "All" || x.status === status) &&
        dirs.includes(x.direction) &&
        at >= f &&
        at <= t &&
        (!needle || [x.id, x.memo, x.counterparty ?? "", x.kind, x.status].some((s) => s.toLowerCase().includes(needle)))
      );
    });
    const sign = sort.direction === "descending" ? -1 : 1;
    const key = (x: Tx): string | number =>
      sort.column === "amount" ? Number(x.amount) / (isUsdc(x.asset) ? 1e6 : 1e24) : sort.column === "counterparty" ? (x.counterparty ?? "") : sort.column === "status" ? x.status : sort.column === "direction" ? x.direction : sort.column === "memo" ? x.memo.toLowerCase() : x.at;
    return [...list].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return (ka < kb ? -1 : ka > kb ? 1 : 0) * sign;
    });
  }, [txs, q, status, dirs, from, to, sort]);
  const shown = rows && limit ? rows.slice(0, limit) : rows;
  const filtered = !!q || status !== "All" || dirs.length < 2 || !!from || !!to;

  function exportCsv() {
    if (!rows) return;
    const url = URL.createObjectURL(new Blob([toCsv(rows, prefs.timezone)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `notara-transactions-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const dateInput = "h-10 rounded-xl border border-border bg-surface px-3 text-[13.5px] font-medium focus:border-focus";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Filter transactions</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted" style={{ left: 14 }} />
          <input
            value={q}
            onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
            placeholder="Filter by memo, account or id"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-[14px] font-medium placeholder:text-muted/70 focus:border-focus"
          />
        </label>
        <div className="w-[150px]">
          <Select label="Status" value={status} onChange={(v) => setStatus(v as TxStatus | "All")} options={STATUSES.map((s) => ({ value: s, label: s === "All" ? "All statuses" : s }))} className="!h-10" />
        </div>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={dateInput} />
        </label>
        <CheckboxGroup aria-label="Direction" value={dirs} onValueChange={setDirs} className="flex h-10 items-center gap-4">
          <CheckboxGroupItem value="in">In</CheckboxGroupItem>
          <CheckboxGroupItem value="out">Out</CheckboxGroupItem>
        </CheckboxGroup>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={reload} busy={loading && !!txs}>
            <RefreshCw size={14} aria-hidden /> Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!rows?.length}>
            <Download size={14} aria-hidden /> Export CSV
          </Button>
        </div>
      </div>

      {error && !txs ? (
        <Notice tone="danger" title="Your transactions didn't load" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          <p>{error}. Nothing was changed.</p>
        </Notice>
      ) : !shown ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading transactions">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        filtered ? (
          <EmptyState title="Nothing matches those filters" body="Try a wider date range or clear the filter." actions={<Button variant="secondary" size="sm" onClick={() => { setParams({}, { replace: true }); setStatus("All"); setDirs(["in", "out"]); setFrom(""); setTo(""); }}>Clear filters</Button>} />
        ) : (
          <EmptyState
            art={<EmptyArt />}
            title="No payments yet"
            body="When a customer pays one of your links, or you send a payment, it shows up here."
            actions={
              <>
                <LinkButton to="/get-paid" size="sm">
                  <Link2 size={15} aria-hidden /> Create your first payment link
                </LinkButton>
                <LinkButton to="/send" size="sm" variant="secondary">
                  <Send size={15} aria-hidden /> Send a payment
                </LinkButton>
              </>
            }
          />
        )
      ) : (
        <>
          {error && <p className="mb-2 text-[13px] text-muted" role="status">Couldn't refresh ({error}). Showing the list as it was.</p>}
          <Table className="nt-table">
            <Table.ScrollContainer>
              <Table.Content aria-label="Transactions" sortDescriptor={sort} onSortChange={setSort} onRowAction={(key) => setOpen(shown.find((x) => x.id === key) ?? null)} className="min-w-[760px]">
                <Table.Header>
                  <Table.Column id="date" allowsSorting isRowHeader>Date</Table.Column>
                  <Table.Column id="direction" allowsSorting>Direction</Table.Column>
                  <Table.Column id="counterparty" allowsSorting>Counterparty</Table.Column>
                  <Table.Column id="amount" allowsSorting className="text-end">Amount</Table.Column>
                  <Table.Column id="memo" allowsSorting>Memo</Table.Column>
                  <Table.Column id="status" allowsSorting>Status</Table.Column>
                  <Table.Column id="actions"><span className="sr-only">Actions</span></Table.Column>
                </Table.Header>
                <Table.Body items={shown}>
                  {(x) => (
                    <Table.Row id={x.id} className="group cursor-pointer">
                      <Table.Cell className="whitespace-nowrap">
                        {new Date(x.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: prefs.timezone })}
                        <span className="block text-[12px] text-muted">{new Date(x.at).toLocaleTimeString(undefined, { timeStyle: "short", timeZone: prefs.timezone })}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          {x.direction === "in" ? <ArrowDownLeft size={15} className="text-success" aria-hidden /> : <ArrowUpRight size={15} className="text-gold-ink" aria-hidden />}
                          {x.direction === "in" ? "In" : "Out"}
                        </span>
                        <span className="block text-[12px] text-muted">{x.kind}</span>
                      </Table.Cell>
                      <Table.Cell className="max-w-[200px] truncate font-mono text-[13px]">{x.counterparty ?? <span className="font-sans text-muted">{x.kind === "Send link" ? "Link holder" : "Not recorded"}</span>}</Table.Cell>
                      <Table.Cell className="tnum whitespace-nowrap text-end font-bold">{money(x.amount, x.asset)}</Table.Cell>
                      <Table.Cell className="max-w-[240px] truncate">{x.memo || <span className="text-muted">None</span>}</Table.Cell>
                      <Table.Cell>
                        <StatusChip status={x.status} />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="flex justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                          {x.href && <CopyChip text={`${location.origin}${x.href}`} label="Copy link" className="!h-8 !px-3 !text-[12.5px]" />}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          {limit && rows && rows.length > limit && (
            <p className="mt-3 text-[13.5px] text-muted">
              Showing {limit} of {rows.length}. <Link to="/transactions" className="font-semibold text-foreground underline underline-offset-4">See all transactions</Link>
            </p>
          )}
        </>
      )}
      <TxDetail tx={open} onClose={() => setOpen(null)} />
    </div>
  );
}
