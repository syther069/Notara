// Get Paid: compose a payment link on the left, watch the customer's page update on the right.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, type Invoice, type MerchantProfile } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { useAccountData } from "@/lib/data";
import { useLocal } from "@/lib/local";
import { ASSETS, asSentence, linkNetwork, timeAgo, usdcFigure, usdcFor, validAccount } from "@/lib/format";
import { useDeployment } from "@/components/Layout";
import { Book, Copy, Link2, Lock, Mail, Message, Plus, RefreshCw, Search, Telegram, X, XBrand } from "@/components/icons";
import { QrCode } from "@/components/QrCode";
import { CheckboxGroup, CheckboxGroupItem } from "@/components/smoothui/checkbox-group";
import SocialFlipButton from "@/components/vengeance/social-flip-button";
import { ShareSheet } from "@/components/vengeance/share-sheet";
import { PageHead, useShell } from "@/components/shell/AppShell";
import { handle } from "@/components/app/wallet";
import { AmountInput, DeviceStage, DrawnCheck, PagePreview, useDebounced, type PreviewCheck } from "@/components/app/preview";
import { Button, Card, CharCount, Chip, CopyChip, EASE, EmptyState, FormField, Hint, LinkButton, Notice, Segmented, Shimmer, TextArea, TextInput } from "@/components/app/ui";
import { StatusChip, useMoney } from "@/components/app/TxTable";
import { buildTxs } from "@/lib/tx";
import { formatDue, fromUnits, isoDay, lineUnits, PRICE_RE, QTY_RE, rowsTotal, todayIso, toUnits, type ItemRow } from "@/lib/invoice";

const DESC_MAX = 180;

function RecentLinks() {
  const w = useWallet();
  const { openConnect } = useShell();
  const { links, linksError, linksLoading, reloadLinks } = useAccountData();
  const money = useMoney();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ by: "created" | "amount" | "status"; dir: 1 | -1 }>({ by: "created", dir: -1 });
  const rows = useMemo(() => {
    if (!links) return null;
    const n = q.trim().toLowerCase();
    return buildTxs(links.filter((l) => l.kind !== "send"), [])
      .filter((t) => !n || [t.id, t.memo, t.status].some((s) => s.toLowerCase().includes(n)))
      .sort((a, b) => (sort.by === "amount" ? Number(a.amount) - Number(b.amount) : sort.by === "status" ? a.status.localeCompare(b.status) : a.at.localeCompare(b.at)) * sort.dir);
  }, [links, q, sort]);
  const th = (by: typeof sort.by, label: string, end?: boolean) => (
    <th scope="col" aria-sort={sort.by === by ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-3 py-2.5 text-[12.5px] font-semibold text-muted ${end ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => setSort((s) => ({ by, dir: s.by === by ? (s.dir === 1 ? -1 : 1) : -1 }))} className="inline-flex items-center gap-1 rounded hover:text-foreground">
        {label} <span aria-hidden>{sort.by === by ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );
  return (
    <Card className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">Recent payment links</h2>
        {w.accountId && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Filter links</span>
              <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter links" className="h-9 w-48 rounded-full border border-border bg-surface pl-9 pr-3 text-[13.5px] font-medium placeholder:text-muted/70 focus:border-focus" />
            </label>
            <Button variant="secondary" size="sm" onClick={reloadLinks} busy={linksLoading && !!links}>
              <RefreshCw size={14} aria-hidden /> Refresh
            </Button>
          </div>
        )}
      </div>
      {!w.accountId ? (
        <EmptyState title="Connect to see your links" body="Links are listed per wallet, so nobody else can browse yours." actions={<Button size="sm" onClick={openConnect}>Connect NEAR wallet</Button>} />
      ) : linksError && !rows ? (
        <Notice tone="danger" title="Your links didn't load" action={<Button size="sm" variant="secondary" onClick={reloadLinks}>Try again</Button>}>
          <p>{linksError}. They're safe; nothing was changed.</p>
        </Notice>
      ) : !rows ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading links">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={q ? "No link matches that" : "No links yet"} body={q ? "Try a different word." : "Make your first one above. It takes about a minute."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2.5 text-left text-[12.5px] font-semibold text-muted">Link</th>
                {th("amount", "Amount", true)}
                {th("status", "Status")}
                {th("created", "Created")}
                <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="group border-b border-border/60 transition-colors last:border-0 hover:bg-surface-secondary/60">
                  <td className="max-w-[280px] px-3 py-3">
                    <Link to={t.href ?? "#"} className="block truncate font-semibold underline-offset-4 hover:underline">{t.memo || t.id}</Link>
                    <span className="font-mono text-[12px] text-muted">{t.id}</span>
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-3 text-right font-bold">{money(t.amount, t.asset)}</td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap gap-1">
                      <StatusChip status={t.status} />
                      {t.overdue && <Chip tone="danger" hint="Unpaid and past its due date.">Overdue</Chip>}
                      {t.network === "mainnet" && <Chip tone="gold" hint="A real-money link on NEAR mainnet.">Real</Chip>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">{timeAgo(Date.parse(t.at))}</td>
                  <td className="px-3 py-3">
                    <span className="flex justify-end opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                      <CopyChip text={`${location.origin}${t.href}`} label="Copy link" className="!h-8 !px-3 !text-[12.5px]" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function GetPaidPage() {
  const w = useWallet();
  const { dep } = useDeployment();
  const { reloadLinks } = useAccountData();
  const { openGuide, openConnect } = useShell();
  const reduce = useReducedMotion();
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  // Line items: off by default; when on, the amount is their total.
  const [itemize, setItemize] = useState(false);
  const blankRow: ItemRow = { description: "", quantity: "1", unit: "" };
  const [rows, setRows] = useState<ItemRow[]>([blankRow]);
  const [net, setNet] = useState<"testnet" | "mainnet">("testnet");
  const [opts, setOpts] = useState<string[]>(["sign"]);
  const [payTo, setPayTo] = useState("");
  const [busy, setBusy] = useState<"sign" | "create" | null>(null);
  const [made, setMade] = useState<Invoice | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pulse, setPulse] = useState(0);
  const [tipHidden, setTipHidden] = useLocal("notara-tip-get-paid", false);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);

  const asset = usdcFor(net);
  const sign = opts.includes("sign");
  const walletOnNet = !!w.accountId && w.network === net;
  const receiver = walletOnNet ? w.accountId! : null;
  useEffect(() => {
    setMerchant(null);
    if (receiver) api.merchant(receiver).then(setMerchant, () => {});
  }, [receiver]);

  const shows = (f: string) => tried || !!touched[f];
  const decimals = ASSETS[asset].decimals;
  const total = itemize ? rowsTotal(rows, decimals) : null;
  // The amount the link is for: typed, or the total of the lines.
  const amountDec = itemize ? (total !== null ? fromUnits(total, decimals) : "") : amount;
  const amountErr = itemize
    ? total === null
      ? "Fill in every line: what it is, a quantity like 1 or 7.5, and a price."
      : total <= 0n
        ? "The total must be more than zero."
        : null
    : !amount
      ? "Enter an amount."
      : !/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0
        ? "Enter a number like 25 or 12.50."
        : null;
  const maxDue = isoDay(new Date(Date.now() + 365 * 86_400_000));
  const dueErr = due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < todayIso() || due > maxDue) ? "Pick a date from today up to a year ahead." : null;
  const itemsInput = itemize ? rows.map((r) => ({ description: r.description.trim(), quantity: r.quantity.trim(), unitDecimal: r.unit.trim() })) : undefined;
  const setRow = (n: number, patch: Partial<ItemRow>) => setRows((rs) => rs.map((r, i) => (i === n ? { ...r, ...patch } : r)));
  const descErr = !desc.trim() ? "Say what the payment is for. Your customer sees this." : null;
  const payToErr = !sign && !receiver && (!payTo.trim() ? `Enter the ${net} account that should receive the money.` : !validAccount(payTo.trim()) ? "That isn't a valid NEAR account. Use lowercase letters, digits, - _ and dots." : null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    const first = amountErr ? (itemize ? "gp-item-0" : "gp-amount") : descErr ? "gp-desc" : dueErr ? "gp-due" : payToErr ? "gp-payto" : null;
    if (first) return document.getElementById(first)?.focus();
    setFormErr(null);
    setBusy(sign ? "sign" : "create");
    try {
      let inv: Invoice;
      if (sign) {
        // The merchant's own wallet signs the link (a message, not a transaction), so customers can see it's really them.
        const extra = { dueDate: due || undefined, items: itemsInput };
        const { token, accountId } = await w.signLink(async (account) => (await api.linkMessage({ merchant: account, description: desc.trim(), amountDecimal: amountDec, asset, ...extra })).message, net);
        inv = await api.createInvoice({ description: desc.trim(), amountDecimal: amountDec, asset, merchant: accountId, signedToken: token, ...extra });
      } else {
        inv = await api.createInvoice({ description: desc.trim(), amountDecimal: amountDec, asset, merchant: receiver ?? payTo.trim(), dueDate: due || undefined, items: itemsInput });
      }
      setMade(inv);
      setPulse((p) => p + 1);
      setTried(false);
      setTouched({});
      reloadLinks();
    } catch (err) {
      setFormErr((err as Error).message); // stays by the button; what was typed is kept
    } finally {
      setBusy(null);
    }
  }

  const madeUrl = made ? `${location.origin}/pay/${made.id}` : "";
  const pv = useDebounced({ amount: amountDec, desc: desc.trim() }, 150);
  const shownAmount = made ? usdcFigure(made.amount) : /^\d+(\.\d+)?$/.test(pv.amount) ? Number(pv.amount).toFixed(2) : "0.00";
  const checks: PreviewCheck[] = [
    made ? (made.signed ? { state: "ok", text: "Signed by this account's wallet" } : { state: "bad", text: "Not signed: the customer can't be sure it's you" }) : sign ? { state: "wait", text: "Signed by your wallet when you create it" } : { state: "bad", text: "Not signed: the customer can't be sure it's you" },
    { state: "wait", text: "Account check runs when your customer opens it" },
    net === "mainnet" ? { state: "ok", text: "Payable from Ethereum, Base, Solana, Arbitrum and more" } : { state: "ok", text: "Test USDC: free test money, nothing of value moves" },
  ];
  const share = (channel: string) => {
    const text = encodeURIComponent(`${made?.description ?? "Payment"}: ${madeUrl}`);
    const u = encodeURIComponent(madeUrl);
    const to = { email: `mailto:?subject=${encodeURIComponent(made?.description ?? "Payment request")}&body=${text}`, x: `https://x.com/intent/post?text=${text}`, telegram: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(made?.description ?? "")}`, whatsapp: `https://wa.me/?text=${text}` }[channel];
    if (to) window.open(to, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHead title="Get Paid" sub="Make a payment link, share it, and receive USDC. Your customer sees it's really you before they pay." />

      {!tipHidden && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-accent-soft px-4 py-3">
          <Book size={18} aria-hidden className="shrink-0" />
          <p className="min-w-0 flex-1 text-[14.5px] font-semibold">First time? Here's the 30-second tour.</p>
          <Button size="sm" variant="secondary" onClick={openGuide}>Open the Guide</Button>
          <button type="button" aria-label="Dismiss this tip" onClick={() => setTipHidden(true)} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-foreground/10">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
        <Card className="!p-6 sm:!p-7">
          <AnimatePresence mode="wait" initial={false}>
            {made ? (
              <motion.section key="made" aria-labelledby="gp-ready" initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.42, ease: EASE }} className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <DrawnCheck className="shrink-0 text-success" />
                  <div>
                    <h2 id="gp-ready" tabIndex={-1} className="text-[24px] font-extrabold tracking-[-0.03em] outline-none">Your link is ready to share</h2>
                    <p className="text-[14.5px] text-muted">
                      {made.description}: <strong className="tnum text-foreground">{usdcFigure(made.amount)} USDC</strong> to <span className="font-mono text-[13px]">{handle(made.merchant)}</span>, {made.signed ? "signed by your wallet" : "not signed"}.
                    </p>
                  </div>
                </div>
                <div className="break-all rounded-xl border border-border bg-surface-secondary px-4 py-3 font-mono text-[13.5px]">{madeUrl}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyChip text={madeUrl} label="Copy link" />
                  <ShareSheet url={madeUrl} title={`Share: ${made.description}`} variant="compact" />
                  <LinkButton to={`/pay/${made.id}`} variant="ghost" size="sm">See what your customer sees</LinkButton>
                </div>
                <div className="flex flex-wrap items-start gap-5 border-t border-border/70 pt-5">
                  <QrCode text={madeUrl} label="QR code for this payment link" />
                  <div className="flex min-w-[200px] flex-1 flex-col gap-3">
                    <p className="text-[14px] leading-relaxed text-muted">Show this code in person, or put a pay button on your website.</p>
                    <CopyChip text={`<script src="${location.origin}/embed.js" data-link="${made.id}"></script>`} label="Copy website button code" />
                  </div>
                </div>
                <div>
                  <Button pulse={pulse} onClick={() => { setMade(null); setDesc(""); setAmount(""); setDue(""); setRows([blankRow]); }}>
                    <Plus size={17} aria-hidden /> Make another link
                  </Button>
                </div>
              </motion.section>
            ) : busy === "create" ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4" aria-busy="true" aria-label="Creating your link">
                <Shimmer className="h-12 w-2/3" />
                <Shimmer className="h-14 w-full rounded-xl" />
                <Shimmer className="h-10 w-1/2 rounded-full" />
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={create} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="gp-amount" className="text-[13.5px] font-semibold">Amount</label>
                    <Segmented
                      label="Kind of money"
                      value={net}
                      onChange={setNet}
                      options={[
                        { value: "testnet", label: "Test money" },
                        { value: "mainnet", label: "Real money" },
                      ]}
                    />
                  </div>
                  <AmountInput
                    id="gp-amount"
                    value={itemize ? amountDec : amount}
                    onChange={(v) => !itemize && setAmount(v)}
                    onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                    invalid={shows("amount") && !!amountErr}
                    describedBy="gp-amount-note"
                    aside={
                      <Hint text="Payment links are always in USDC, a dollar-pegged coin. It settles on NEAR in a couple of seconds.">
                        <span className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-[15px] font-bold"><Lock size={13} aria-hidden /> {ASSETS[asset].symbol}</span>
                          <span className="whitespace-nowrap text-[11.5px] font-semibold text-muted">Settled on NEAR</span>
                        </span>
                      </Hint>
                    }
                  />
                  <p id="gp-amount-note" className={shows("amount") && amountErr ? "text-[13px] font-semibold text-danger" : "text-[13px] text-muted"}>
                    {shows("amount") && amountErr ? amountErr : itemize ? "The total of the lines below. Change a line to change it." : net === "testnet" ? "Free test USDC. Use it to try Notara: nothing of value moves." : "Real USDC. Your customer can pay from Ethereum, Base, Solana and more. Prototype, not audited: keep amounts small."}
                  </p>
                </div>

                <FormField label="Receiving wallet" note={receiver ? undefined : sign ? `The money goes to the ${net} wallet that signs the link.` : undefined}>
                  {receiver ? (
                    <Hint text="This is your connected wallet. The link is signed by it, so the money can only go here. To be paid somewhere else, connect that wallet instead." className="w-full">
                      <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-default px-3.5 font-mono text-[13.5px] font-semibold" tabIndex={0} aria-label={`Receiving wallet ${receiver}, not editable`}>
                        <Lock size={14} aria-hidden className="shrink-0 text-muted" />
                        <span className="truncate">{receiver}</span>
                      </div>
                    </Hint>
                  ) : sign ? (
                    <Button variant="secondary" onClick={openConnect} className="self-start">
                      Connect a {net} wallet
                    </Button>
                  ) : (
                    <TextInput id="gp-payto" value={payTo} onChange={(e) => setPayTo((e.target as HTMLInputElement).value)} onBlur={() => setTouched((t) => ({ ...t, payto: true }))} placeholder={net === "testnet" ? "yourname.testnet" : "yourname.near"} autoComplete="off" spellCheck={false} className="font-mono" aria-invalid={(shows("payto") && !!payToErr) || undefined} />
                  )}
                  {!receiver && !sign && shows("payto") && payToErr && <p role="alert" className="text-[13px] font-semibold text-danger">{payToErr}</p>}
                </FormField>

                <FormField
                  label="What is this for?"
                  note="Describe what this payment is for. Your customer sees this on the invoice."
                  counter={<CharCount value={desc} max={DESC_MAX} />}
                  error={shows("desc") && descErr ? descErr : undefined}
                >
                  <TextArea id="gp-desc" value={desc} maxLength={DESC_MAX} placeholder="Logo design, two rounds of changes" onChange={(e) => setDesc(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, desc: true }))} aria-invalid={(shows("desc") && !!descErr) || undefined} />
                </FormField>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold">Line items <span className="font-normal text-muted">(optional)</span></span>
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-expanded={itemize}
                      onClick={() => {
                        setItemize((v) => !v);
                        setTouched((t) => ({ ...t, amount: false }));
                      }}
                    >
                      {itemize ? "Use one amount instead" : <><Plus size={15} aria-hidden /> Itemise this invoice</>}
                    </Button>
                  </div>
                  {itemize && (
                    <div className="flex flex-col gap-2.5" role="group" aria-label="Line items">
                      <div className="hidden grid-cols-[minmax(0,1fr)_76px_112px_96px_36px] gap-2 text-[12px] font-semibold text-muted sm:grid">
                        <span>What</span>
                        <span>Qty</span>
                        <span>Price ({ASSETS[asset].symbol})</span>
                        <span className="text-right">Line total</span>
                        <span />
                      </div>
                      {rows.map((r, n) => {
                        const u = toUnits(r.unit.trim(), decimals);
                        const lineOk = QTY_RE.test(r.quantity.trim()) && u !== null;
                        const bad = (f: "q" | "p") => shows("amount") && (f === "q" ? !QTY_RE.test(r.quantity.trim()) || Number(r.quantity) <= 0 : !PRICE_RE.test(r.unit.trim()) || Number(r.unit) <= 0);
                        return (
                          <div key={n} className="grid grid-cols-[76px_minmax(0,1fr)_36px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_76px_112px_96px_36px]">
                            <TextInput
                              id={`gp-item-${n}`}
                              aria-label={`Line ${n + 1}: what it is`}
                              value={r.description}
                              maxLength={80}
                              placeholder={n === 0 ? "Logo design" : "Another line"}
                              onChange={(e) => setRow(n, { description: (e.target as HTMLInputElement).value })}
                              aria-invalid={(shows("amount") && !r.description.trim()) || undefined}
                              className="col-span-3 sm:col-span-1"
                            />
                            <TextInput aria-label={`Line ${n + 1}: quantity`} value={r.quantity} inputMode="decimal" onChange={(e) => setRow(n, { quantity: (e.target as HTMLInputElement).value })} aria-invalid={bad("q") || undefined} className="tnum" />
                            <TextInput aria-label={`Line ${n + 1}: price`} value={r.unit} inputMode="decimal" placeholder="0.00" onChange={(e) => setRow(n, { unit: (e.target as HTMLInputElement).value })} aria-invalid={bad("p") || undefined} className="tnum" />
                            <span className="tnum hidden truncate text-right text-[14px] font-semibold sm:block" aria-label={`Line ${n + 1} total`}>
                              {lineOk ? fromUnits(lineUnits(r.quantity.trim(), u!), decimals) : "–"}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove line ${n + 1}`}
                              disabled={rows.length === 1}
                              onClick={() => setRows((rs) => rs.filter((_, i) => i !== n))}
                              className="inline-flex size-9 items-center justify-center justify-self-end rounded-full text-muted transition-colors hover:bg-default hover:text-foreground disabled:opacity-30"
                            >
                              <X size={15} aria-hidden />
                            </button>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button size="sm" variant="ghost" disabled={rows.length >= 20} onClick={() => setRows((rs) => [...rs, blankRow])}>
                          <Plus size={15} aria-hidden /> Add a line
                        </Button>
                        <span className="tnum text-[14px] font-bold">Total {total !== null ? fromUnits(total, decimals) : "–"} {ASSETS[asset].symbol}</span>
                      </div>
                    </div>
                  )}
                </div>

                <FormField label={<>Due date <span className="font-normal text-muted">(optional)</span></>} note={dueErr ?? "Your customer sees it, and the link shows Overdue if it's still unpaid after this day."} error={shows("due") && dueErr ? dueErr : undefined}>
                  <TextInput id="gp-due" type="date" value={due} min={todayIso()} max={maxDue} onChange={(e) => setDue((e.target as HTMLInputElement).value)} onBlur={() => setTouched((t) => ({ ...t, due: true }))} className="max-w-[220px]" aria-invalid={(shows("due") && !!dueErr) || undefined} />
                </FormField>

                <fieldset>
                  <legend className="mb-2.5 text-[13.5px] font-semibold">Options</legend>
                  <CheckboxGroup aria-label="Options" value={opts} onValueChange={setOpts}>
                    <CheckboxGroupItem value="sign">
                      <span className="text-[14.5px] font-semibold">Sign the link with my wallet</span>
                      <span className="mt-0.5 block text-[13px] font-normal leading-snug text-muted">A short message, free, no transaction. Customers see “Signed”, so they know it's you.</span>
                    </CheckboxGroupItem>
                  </CheckboxGroup>
                </fieldset>

                {formErr && (
                  <Notice tone="danger" title="The link wasn't created">
                    <p>{asSentence(formErr)} Everything you typed is still here, so you can try again.</p>
                  </Notice>
                )}
                {!dep?.deployed && dep && net === "testnet" && !dep.public && <Notice tone="warning"><p>This server has no testnet demo set up; USDC links still work.</p></Notice>}

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" size="lg" busy={busy === "sign"}>
                    <Link2 size={18} aria-hidden /> {busy === "sign" ? "Waiting for your wallet…" : "Create payment link"}
                  </Button>
                  <p className="max-w-[34ch] text-[13px] text-muted">{sign ? "Your wallet opens to sign a short message. No fee, and no money moves." : "Unsigned links show customers a “Not signed” warning."}</p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-[92px]">
          <DeviceStage label="What your customer sees">
            <PagePreview
              path={made ? `/pay/${made.id}` : "/pay/…"}
              who={made?.merchant ?? receiver ?? (payTo.trim() || "your NEAR account")}
              website={merchant?.websiteVerified ? merchant.website : null}
              forText={made ? made.description : pv.desc}
              emptyFor="What it's for appears here"
              amount={shownAmount}
              unit="USDC"
              checks={checks}
              primary={`Pay ${shownAmount} USDC`}
              due={made?.dueDate ? formatDue(made.dueDate) : due && !dueErr ? formatDue(due) : undefined}
              items={
                made?.items
                  ? made.items.map((i) => ({ label: `${i.quantity} x ${i.description}`, total: fromUnits(lineUnits(i.quantity, BigInt(i.unitAmount)), decimals) }))
                  : itemize
                    ? rows.filter((r) => r.description.trim()).map((r) => {
                        const u = toUnits(r.unit.trim(), decimals);
                        return { label: `${r.quantity || "?"} x ${r.description.trim()}`, total: u !== null && QTY_RE.test(r.quantity.trim()) ? fromUnits(lineUnits(r.quantity.trim(), u), decimals) : "–" };
                      })
                    : undefined
              }
              secondary={(made ? linkNetwork(made.asset) : net) === "mainnet" ? "Pay from another chain" : undefined}
            />
          </DeviceStage>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-2">
            <p className="text-[13.5px] font-semibold">{made ? "Share via" : "Share via (once the link exists)"}</p>
            <div className={made ? "" : "pointer-events-none opacity-40"} aria-hidden={!made} inert={!made}>
              <SocialFlipButton
                className="!p-0"
                items={[
                  { letter: "S", icon: <Mail size={18} />, label: "Email", onClick: () => share("email") },
                  { letter: "H", icon: <XBrand size={18} />, label: "X", onClick: () => share("x") },
                  { letter: "A", icon: <Telegram size={18} />, label: "Telegram", onClick: () => share("telegram") },
                  { letter: "R", icon: <Message size={18} />, label: "WhatsApp", onClick: () => share("whatsapp") },
                  { letter: "E", icon: <Copy size={18} />, label: "Copy link", onClick: () => void navigator.clipboard.writeText(madeUrl).catch(() => {}) },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <RecentLinks />
    </>
  );
}
