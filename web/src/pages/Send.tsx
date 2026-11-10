// Send: compose on the left; on the right, review with a live account check, then confirm in your wallet.
// A second mode makes a send link for someone who has no NEAR account yet.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Modal } from "@heroui/react";
import { api, type CheckResponse, type Invoice } from "@/lib/api";
import { nearBalance, useWallet, WalletTimeoutError } from "@/lib/wallet";
import { sendsKey, useLocal, type LocalSend } from "@/lib/local";
import { recordCheck } from "@/lib/data";
import { buildTxs, type Tx } from "@/lib/tx";
import { newLinkKey, SEND_LINK_DAYS, toFragment } from "@/lib/linkKey";
import { asSentence, EXPLORER, timeAgo, usdcFigure, usdcFor, usdcUnits, validAccount } from "@/lib/format";
import { useBalances, useDeployment } from "@/components/Layout";
import { ArrowRight, ChevronDown, ExternalLink, Link2, RefreshCw, Send as SendIcon, User } from "@/components/icons";
import { QrCode } from "@/components/QrCode";
import { CheckboxGroup, CheckboxGroupItem } from "@/components/smoothui/checkbox-group";
import { PageHead, useShell } from "@/components/shell/AppShell";
import { Avatar, handle } from "@/components/app/wallet";
import { AmountInput, DeviceStage, DrawnCheck, PagePreview } from "@/components/app/preview";
import { Button, Card, CharCount, Chip, CopyChip, EASE, EmptyState, FormField, Hint, LinkButton, Notice, Segmented, Select, Shimmer, TextArea, TextInput } from "@/components/app/ui";
import { TxDetail, useMoney } from "@/components/app/TxTable";
import { SignalsPanel, VERDICT, VerdictChip, VerdictIcon, coverageLine, topReason } from "@/components/app/verdict";
import { cn } from "@/lib/utils";

const MEMO_MAX = 180;
type Net = "mainnet" | "testnet";

/** Does this account exist on that network? null: couldn't find out. */
async function accountExists(net: Net, id: string): Promise<boolean | null> {
  if (/^[0-9a-f]{64}$/.test(id)) return true; // an implicit account exists as soon as it's paid
  const b = await nearBalance(net, id);
  if (b !== null) return true;
  // nearBalance is null both for "no such account" and "couldn't reach NEAR": ask once more to tell them apart.
  try {
    const r = await fetch(`https://rpc.${net}.fastnear.com`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "optimistic", account_id: id } }) }).then((x) => x.json());
    return r.error ? (/UNKNOWN_ACCOUNT|does not exist/i.test(JSON.stringify(r.error)) ? false : null) : true;
  } catch {
    return null;
  }
}

/** Red verdict and the sender still wants to pay: they must type the account's name. Cancel is just as prominent. */
function BlockGuard({ open, recipient, reason, onCancel, onProceed }: { open: boolean; recipient: string; reason: string; onCancel: () => void; onProceed: () => void }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const match = typed.trim() === recipient;
  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={(o) => !o && onCancel()} className="nt" variant="blur" isDismissable={false}>
        <Modal.Container size="md">
          <Modal.Dialog role="alertdialog" aria-label="This account has a red verdict" className="nt rounded-3xl border-2 border-danger/50 bg-background p-6 text-foreground shadow-pop">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-danger">
                <VerdictIcon decision="BLOCK" size={28} />
                <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">Notara says don't pay this account</h2>
              </div>
              <p className="text-[15px] leading-relaxed">{reason}</p>
              <p className="text-[14.5px] leading-relaxed text-muted">A payment on NEAR can't be reversed. If you're sure, type the account's name to unlock sending.</p>
              <FormField label={<>Type <span className="font-mono">{recipient}</span> to continue</>}>
                <TextInput value={typed} onChange={(e) => setTyped((e.target as HTMLInputElement).value)} autoComplete="off" spellCheck={false} className="font-mono" autoFocus />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
                <Button variant="danger" size="lg" disabled={!match} onClick={onProceed}>Send anyway</Button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function SendLinkMode() {
  const { dep } = useDeployment();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [net, setNet] = useState<Net>("testnet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [made, setMade] = useState<{ inv: Invoice; url: string; path: string } | null>(null);
  const mainnetOff = net === "mainnet" && dep?.mainnetSend === false;
  const units = usdcUnits(amount);
  const amountErr = !amount ? "Enter an amount." : units === null ? "Enter a number like 5 or 2.50." : units < 1_000_000n || units > 25_000_000n ? "Send links hold between 1 and 25 USDC in this prototype." : null;

  async function create(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (amountErr) return document.getElementById("sl-amount")?.focus();
    setBusy(true);
    setError(null);
    try {
      // The key is made here, in your browser. The server only learns which account it controls.
      const key = newLinkKey();
      const inv = await api.createSend({ amountDecimal: amount, implicitAccount: key.account, note: note.trim(), network: net });
      const fragment = toFragment(key);
      try {
        sessionStorage.setItem(`send-key-${inv.id}`, fragment);
      } catch {}
      const path = `/claim/${inv.id}#${fragment}`;
      setMade({ inv, path, url: `${location.origin}${path}` });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const shown = made ? usdcFigure(made.inv.amount) : units !== null ? usdcFigure(units) : "0.00";
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
      <Card className="!p-6 sm:!p-7">
        {made ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <DrawnCheck className="shrink-0 text-success" />
              <div>
                <h2 className="text-[24px] font-extrabold tracking-[-0.03em]">Link created. Now put the money in.</h2>
                <p className="text-[14.5px] text-muted">Fund it first, then share it. Until it's funded, the person you send it to sees an empty link.</p>
              </div>
            </div>
            <div>
              <LinkButton to={made.path} size="lg">
                Fund it now <ArrowRight size={17} aria-hidden />
              </LinkButton>
            </div>
            <FormField label="Your send link" note="Save it: it's the only key to the money.">
              <div className="break-all rounded-xl border border-border bg-surface-secondary px-4 py-3 font-mono text-[13px]">{made.url}</div>
            </FormField>
            <div className="flex flex-wrap items-start gap-5">
              <QrCode text={made.url} label="QR code of the send link" />
              <CopyChip text={made.url} label="Copy link" />
            </div>
            <Notice tone="warning" title="This link works like cash">
              <p>
                Anyone who has it can take the money. Only send it to the person it's for. If they haven't claimed it within {SEND_LINK_DAYS} days ({new Date(Date.now() + SEND_LINK_DAYS * 86_400_000).toLocaleDateString(undefined, { dateStyle: "medium" })}), open the link yourself to take the money back. We can't recover a lost link: the key exists only in it.
              </p>
            </Notice>
            <div>
              <Button variant="secondary" onClick={() => { setMade(null); setAmount(""); setNote(""); setTouched(false); }}>Make another send link</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={create} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="sl-amount" className="text-[13.5px] font-semibold">Amount</label>
                <Segmented label="Kind of money" value={net} onChange={setNet} options={[{ value: "testnet", label: "Test money" }, { value: "mainnet", label: "Real money" }]} />
              </div>
              <AmountInput id="sl-amount" value={amount} onChange={setAmount} onBlur={() => setTouched(true)} invalid={touched && !!amountErr} describedBy="sl-note" aside={<span className="text-[15px] font-bold">USDC</span>} />
              <p id="sl-note" className={touched && amountErr ? "text-[13px] font-semibold text-danger" : "text-[13px] text-muted"}>
                {touched && amountErr ? amountErr : net === "testnet" ? "Between 1 and 25 USDC. You fund it from a testnet wallet with free USDC from faucet.circle.com." : "Between 1 and 25 USDC. You fund it from any chain through NEAR Intents."}
              </p>
            </div>
            {mainnetOff && (
              <Notice tone="warning" title="Real-money send links aren't switched on yet">
                <p>They need a sponsor account that pays the network fee for the person who claims the money, and this site doesn't have one yet. Use test money to try the full flow for free.</p>
              </Notice>
            )}
            <FormField label="Note (optional)" note="The person who opens the link sees this." counter={<CharCount value={note} max={120} />}>
              <TextArea value={note} maxLength={120} placeholder="Happy birthday!" onChange={(e) => setNote(e.target.value)} className="!min-h-[72px]" />
            </FormField>
            {error && (
              <Notice tone="danger" title="The link wasn't created">
                <p>{asSentence(error)} Nothing was sent.</p>
              </Notice>
            )}
            <div>
              <Button type="submit" size="lg" busy={busy} disabled={mainnetOff}>
                <Link2 size={18} aria-hidden /> {busy ? "Creating…" : "Create send link"}
              </Button>
            </div>
          </form>
        )}
      </Card>
      <DeviceStage label="What the person you send it to sees">
        <PagePreview
          path={made ? `/claim/${made.inv.id}` : "/claim/…"}
          who="whoever opens this link"
          forText={made ? made.inv.description : note.trim()}
          emptyFor="Your note appears here"
          amount={shown}
          unit="USDC"
          checks={[
            made ? { state: "wait", text: "Waiting for you to fund it" } : { state: "wait", text: "You fund it next, from any chain" },
            { state: "ok", text: "No NEAR needed to claim: the fee and USDC setup are covered" },
            { state: "ok", text: `Not claimed in ${SEND_LINK_DAYS} days? You can take it back` },
          ]}
          primary="Claim"
          secondary="Get your own NEAR name"
        />
      </DeviceStage>
    </div>
  );
}

function History({ sends, onResend, justSent }: { sends: LocalSend[]; onResend: (to: string, amount: string) => void; justSent: string | null }) {
  const money = useMoney();
  const [open, setOpen] = useState<Tx | null>(null);
  const txs = useMemo(() => buildTxs([], sends), [sends]);
  return (
    <Card className="mt-6">
      <div className="mb-3">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">Recent sends</h2>
        <p className="text-[13px] text-muted">Payments you made from this device. Click one for its details and the account check you saw.</p>
      </div>
      {txs.length === 0 ? (
        <EmptyState title="No sends yet" body="Your payments will list here, with a one-click way to repeat them." />
      ) : (
        <ul className="flex flex-col">
          {txs.slice(0, 8).map((t) => (
            <li key={t.id} className="group flex items-center gap-3 border-b border-border/70 py-1 last:border-0">
              <button type="button" onClick={() => setOpen(t)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-secondary/70">
                <Avatar account={t.counterparty!} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{handle(t.counterparty!)}</span>
                  <span className="block truncate text-[12.5px] text-muted">{timeAgo(Date.parse(t.at))}{t.memo ? ` · ${t.memo}` : ""}</span>
                </span>
                {t.check && <span className="max-sm:hidden"><VerdictChip decision={t.check.decision} /></span>}
                <Chip tone="success" hint="Settled on NEAR.">Sent</Chip>
                <motion.span layoutId={justSent === t.id ? "send-amount" : undefined} transition={{ duration: 0.7, ease: EASE }} className="tnum whitespace-nowrap text-[15px] font-bold">
                  {money(t.amount)}
                </motion.span>
              </button>
              <Hint text={`Send ${money(t.amount)} to ${t.counterparty} again`}>
                <button type="button" aria-label={`Send to ${t.counterparty} again`} onClick={() => onResend(t.counterparty!, (Number(t.amount) / 1e6).toString())} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 hover:bg-default focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                  <RefreshCw size={15} />
                </button>
              </Hint>
            </li>
          ))}
        </ul>
      )}
      <TxDetail tx={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

function DirectMode() {
  const w = useWallet();
  const { usdc, refresh } = useBalances();
  const { openConnect } = useShell();
  const money = useMoney();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const [to, setTo] = useState(params.get("to") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [memo, setMemo] = useState("");
  const [opts, setOpts] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [exists, setExists] = useState<boolean | null | "checking">(null);
  const [review, setReview] = useState(false);
  const [check, setCheck] = useState<CheckResponse | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [fee, setFee] = useState(false);
  const [guard, setGuard] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ text: string; txUrl?: string | null } | null>(null);
  const [done, setDone] = useState<LocalSend | null>(null);
  const [sends, setSends] = useLocal<LocalSend[]>(sendsKey(w.accountId ?? "-"), []);

  const net: Net = w.accountId ? w.network : "testnet";
  const recipient = to.trim();
  const units = usdcUnits(amount);
  const toErr = !recipient ? "Enter who you're paying." : !validAccount(recipient) ? "That isn't a valid NEAR account. Use lowercase letters, digits, - _ and dots, like alice.near." : recipient === w.accountId ? "That's your own account." : exists === false ? `We couldn't find ${recipient} on NEAR ${net}. Check the spelling.` : null;
  const amountErr = !amount ? "Enter an amount." : units === null || units === 0n ? "Enter a number like 25 or 12.50." : usdc !== null && usdc !== undefined && units > usdc ? `You have ${usdcFigure(usdc)} USDC.` : null;
  const shows = (f: string) => tried || !!touched[f];

  // Live validation: does the account exist on the wallet's network?
  useEffect(() => {
    setReview(false);
    setCheck(null);
    setDone(null);
    if (!validAccount(recipient) || recipient === w.accountId) return setExists(null);
    setExists("checking");
    let live = true;
    const t = setTimeout(() => accountExists(net, recipient).then((e) => live && setExists(e)), 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [recipient, net, w.accountId]);
  useEffect(() => {
    setReview(false);
    setCheck(null);
  }, [amount]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    return sends.filter((s) => s.network === net && !seen.has(s.to) && seen.add(s.to)).slice(0, 8).map((s) => ({ value: s.to, label: handle(s.to), description: `Last paid ${timeAgo(Date.parse(s.at))}` }));
  }, [sends, net]);

  function runCheck() {
    setCheck(null);
    setCheckErr(null);
    api
      .check({ network: net, recipient, amountDecimal: amount, asset: usdcFor(net) })
      .then((r) => {
        setCheck(r);
        recordCheck({ account: recipient, network: net, decision: r.report.decision, reason: topReason(r), at: new Date().toISOString() });
      })
      .catch((e) => setCheckErr(e.message));
  }

  function toReview(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!w.accountId) return openConnect();
    const first = toErr || exists === "checking" ? "sd-to" : amountErr ? "sd-amount" : null;
    if (first) return document.getElementById(first)?.focus();
    setError(null);
    setDone(null);
    setReview(true);
    runCheck();
  }

  async function send() {
    if (!w.accountId || units === null) return;
    setGuard(false);
    setSending(true);
    setError(null);
    try {
      const { txHash, signerId } = await w.payUsdc(usdcFor(net), recipient, units.toString(), memo.trim(), net);
      const rec: LocalSend = {
        id: `S-${Date.now().toString(36)}`,
        from: signerId,
        to: recipient,
        amount: units.toString(),
        memo: memo.trim(),
        network: net,
        txHash,
        at: new Date().toISOString(),
        check: check ? { decision: check.report.decision, reason: topReason(check), coverage: coverageLine(check) } : undefined,
        expense: opts.includes("expense"),
      };
      setSends((s) => [rec, ...s].slice(0, 100));
      setDone(rec);
      setReview(false);
      setTried(false);
      setTouched({});
      setTo("");
      setAmount("");
      setMemo("");
      setTimeout(refresh, 2500);
    } catch (err) {
      const e2 = err as Error & { txUrl?: string | null };
      if (/reject|cancel|closed/i.test(e2.message) && !(err instanceof WalletTimeoutError)) setError({ text: "You cancelled in your wallet. Nothing was sent." });
      else setError({ text: asSentence(e2.message), txUrl: e2.txUrl });
    } finally {
      setSending(false);
    }
  }

  const decision = check?.report.decision;
  const v = decision ? VERDICT[decision] : null;
  return (
    <LayoutGroup>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
        <Card className="!p-6 sm:!p-7">
          <form onSubmit={toReview} noValidate className="flex flex-col gap-6">
            <FormField
              label="To"
              note="A NEAR account like alice.near, or someone you've paid before."
              error={shows("to") && toErr ? toErr : undefined}
            >
              <Select
                id="sd-to"
                label="Recipient"
                searchable
                value={to}
                onChange={(v2) => { setTo(v2); setTouched((t) => ({ ...t, to: true })); }}
                options={recents}
                placeholder={net === "testnet" ? "alice.testnet" : "alice.near"}
                searchPlaceholder="Type an account"
                emptyText={recents.length ? "No saved recipient matches. Type the full account." : "Type the full account, like alice.near."}
                allowCustom={(q) => (validAccount(q) ? `Pay ${q}` : null)}
                className="font-mono"
              />
              {recipient && !toErr && (
                <p className="flex items-center gap-1.5 text-[13px] font-semibold" role="status">
                  {exists === "checking" ? <span className="text-muted">Looking up {handle(recipient)}…</span> : exists === true ? <span className="text-success">{handle(recipient)} exists on NEAR {net}.</span> : exists === null && validAccount(recipient) ? <span className="text-warning">We couldn't reach NEAR to confirm this account exists.</span> : null}
                </p>
              )}
            </FormField>

            <div className="flex flex-col gap-2">
              <label htmlFor="sd-amount" className="text-[13.5px] font-semibold">Amount</label>
              <AmountInput
                id="sd-amount"
                value={amount}
                onChange={setAmount}
                onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                invalid={shows("amount") && !!amountErr}
                describedBy="sd-amount-note"
                aside={
                  <span className="flex items-center gap-2">
                    {usdc !== null && usdc !== undefined && usdc > 0n && (
                      <Hint text={`Use your whole balance: ${usdcFigure(usdc)} USDC`}>
                        <button type="button" onClick={() => setAmount((Number(usdc) / 1e6).toString())} className="h-8 rounded-full bg-accent-soft px-3 text-[12.5px] font-bold transition-transform hover:scale-[1.03] active:scale-[0.97]">Max</button>
                      </Hint>
                    )}
                    <span className="text-[15px] font-bold">USDC</span>
                  </span>
                }
              />
              <p id="sd-amount-note" className={shows("amount") && amountErr ? "text-[13px] font-semibold text-danger" : "text-[13px] text-muted"}>
                {shows("amount") && amountErr ? amountErr : !w.accountId ? "Connect a wallet to see your balance." : usdc === undefined ? "Reading your balance…" : usdc === null ? "Your balance couldn't be read; your wallet will still check it." : `You have ${usdcFigure(usdc)} USDC on NEAR ${net}.`}
              </p>
            </div>

            <FormField label="Note" note="Add a memo for the recipient and your own records. Memos are stored on-chain." counter={<CharCount value={memo} max={MEMO_MAX} />}>
              <TextArea value={memo} maxLength={MEMO_MAX} placeholder="March retainer" onChange={(e) => setMemo(e.target.value)} className="!min-h-[72px]" />
            </FormField>

            <FormField label="Send from" note="Agent vaults pay only through their own rules, so they aren't listed here.">
              {w.accountId ? (
                <Select label="Send from" value={w.accountId} onChange={() => {}} options={[{ value: w.accountId, label: handle(w.accountId), description: `Connected wallet · NEAR ${net}` }]} className="font-mono" />
              ) : (
                <Button variant="secondary" onClick={openConnect} className="self-start">Connect NEAR wallet</Button>
              )}
            </FormField>

            <fieldset>
              <legend className="mb-2.5 text-[13.5px] font-semibold">Options</legend>
              <CheckboxGroup aria-label="Options" value={opts} onValueChange={setOpts}>
                <CheckboxGroupItem value="expense">
                  <span className="text-[14.5px] font-semibold">Mark as expense</span>
                  <span className="mt-0.5 block text-[13px] font-normal text-muted">Tags it in your records on this device.</span>
                </CheckboxGroupItem>
              </CheckboxGroup>
            </fieldset>

            <div>
              <Button type="submit" size="lg" disabled={sending}>
                {w.accountId ? "Review" : "Connect wallet to continue"} <ArrowRight size={18} aria-hidden />
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-[92px]">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.42, ease: EASE }}>
                <Card className="relative overflow-hidden !p-7">
                  {/* The one flourish: a gold ribbon sweeps across the card once. */}
                  <motion.span aria-hidden className="absolute inset-x-0 top-0 h-1.5 origin-left bg-gradient-to-r from-gold/0 via-gold to-gold/0" initial={reduce ? { opacity: 0 } : { scaleX: 0 }} animate={reduce ? { opacity: 1 } : { scaleX: 1 }} transition={{ duration: 0.9, ease: EASE }} />
                  <div className="flex items-center gap-4">
                    <DrawnCheck className="shrink-0 text-gold-ink" />
                    <div>
                      <h2 className="text-[22px] font-extrabold tracking-[-0.03em]" role="status">Sent</h2>
                      <p className="text-[14.5px] text-muted">to <span className="font-mono text-[13px] text-foreground">{handle(done.to)}</span></p>
                    </div>
                  </div>
                  <motion.p layoutId="send-amount" transition={{ duration: 0.7, ease: EASE }} className="tnum mt-5 text-[40px] font-extrabold leading-none tracking-[-0.04em]">
                    {money(done.amount)}
                  </motion.p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {done.txHash && (
                      <a href={`${EXPLORER[done.network]}/txns/${done.txHash}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13.5px] font-semibold hover:bg-surface-secondary">
                        View on NEAR <ExternalLink size={13} aria-hidden />
                      </a>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setDone(null)}>Done</Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
                <div data-theme="dark" className="rounded-3xl bg-canopy p-6 text-cream shadow-card sm:p-7">
                  <p className="text-[13.5px] font-semibold text-mint">{review ? "Review and confirm" : "Your payment"}</p>
                  <p className="mt-3 text-[15px] text-cream/75">You are sending</p>
                  <p className="tnum mt-1 text-[44px] font-extrabold leading-none tracking-[-0.04em]">
                    ${units !== null ? usdcFigure(units) : "0.00"} <span className="text-[16px] font-bold tracking-normal text-mint">USDC</span>
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-[15px] text-cream/75">
                    to
                    {recipient && validAccount(recipient) ? (
                      <span className="inline-flex min-w-0 items-center gap-2 font-mono text-[13.5px] font-semibold text-cream">
                        <Avatar account={recipient} size={22} /> <span className="truncate">{handle(recipient)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-cream/50"><User size={15} aria-hidden /> who you choose</span>
                    )}
                  </p>
                  {memo.trim() && <p className="mt-3 rounded-xl bg-cream/10 px-3 py-2 text-[13.5px] [overflow-wrap:anywhere]">“{memo.trim()}”</p>}
                  <div className="mt-5 flex flex-col gap-2 border-t border-cream/15 pt-4 text-[13.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-cream/70">Network</span>
                      <Chip tone={net === "mainnet" ? "gold" : "outline"} className={net === "mainnet" ? "" : "!border-cream/30 !text-cream"} hint={net === "mainnet" ? "Your wallet is on NEAR mainnet: this is real money." : "Your wallet is on NEAR testnet: free test money."}>
                        NEAR {net}
                      </Chip>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream/70">Network fee</span>
                      <button type="button" aria-expanded={fee} onClick={() => setFee((f) => !f)} className="inline-flex items-center gap-1 font-semibold">
                        ≈ under 1¢ <ChevronDown size={13} aria-hidden className={cn("transition-transform duration-300", fee && "rotate-180")} />
                      </button>
                    </div>
                    {fee && (
                      <p className="rounded-xl bg-cream/10 px-3 py-2 text-[12.5px] leading-relaxed text-cream/80">
                        NEAR charges a small fee for the transaction, paid in NEAR from your wallet (usually a fraction of a cent). If the recipient has never held USDC, 0.00125 NEAR also registers them for it; it's returned if they already are. Notara adds no fee.
                      </p>
                    )}
                  </div>
                </div>

                {review && (
                  <>
                    <div className={cn("rounded-2xl border-2 p-4", v ? `${v.ring} ${v.soft}` : "border-border bg-surface")} aria-live="polite">
                      <p className="mb-2 text-[13px] font-semibold text-muted">Account check</p>
                      {checkErr ? (
                        <Notice tone="warning" title="The account check didn't run" action={<Button size="sm" variant="secondary" onClick={runCheck}>Try again</Button>}>
                          <p>{asSentence(checkErr)} You can still send, without Notara's opinion of this account.</p>
                        </Notice>
                      ) : !check ? (
                        <div className="flex flex-col gap-2" aria-busy="true">
                          <p className="text-[14px] font-semibold">Checking {handle(recipient)} against live NEAR data…</p>
                          <Shimmer className="h-4 w-3/4" />
                        </div>
                      ) : (
                        <>
                          <div className={cn("flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.02em]", v!.ink)}>
                            <VerdictIcon decision={decision!} size={20} /> {v!.word}
                          </div>
                          <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed">{topReason(check)}</p>
                          <Hint text={`${coverageLine(check)}. ${VERDICT[decision!].hint} Open Signals below for the raw facts.`} focusable>
                            <span className="mt-1 inline-block text-[13px] font-semibold underline decoration-dotted underline-offset-4">Explain</span>
                          </Hint>
                        </>
                      )}
                    </div>
                    {check && <SignalsPanel res={check} />}
                    {error && (
                      <Notice tone="danger" title="The payment didn't go through">
                        <p>{error.text}</p>
                        {error.txUrl && <a className="font-semibold underline underline-offset-4" href={error.txUrl} target="_blank" rel="noreferrer">See the failed transaction</a>}
                      </Notice>
                    )}
                    <div className="grid grid-cols-[auto_1fr] gap-3">
                      <Button variant="secondary" size="lg" onClick={() => setReview(false)} disabled={sending}>Back</Button>
                      <Button size="lg" busy={sending} disabled={!check && !checkErr} onClick={() => (decision === "BLOCK" ? setGuard(true) : send())}>
                        <SendIcon size={18} aria-hidden /> {sending ? "Confirm in your wallet…" : "Confirm & send"}
                      </Button>
                    </div>
                    <p className="text-[12.5px] text-muted">Your wallet opens to approve. Notara never holds your money or your keys.</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {w.accountId && <History sends={sends} justSent={done?.id ?? null} onResend={(t, a) => { setTo(t); setAmount(a); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }} />}
      <BlockGuard open={guard} recipient={recipient} reason={check ? topReason(check) : ""} onCancel={() => setGuard(false)} onProceed={send} />
    </LayoutGroup>
  );
}

export function SendPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "link" ? "link" : "account";
  return (
    <>
      <PageHead
        title="Send"
        sub={mode === "account" ? "Pay a NEAR account in USDC. Notara checks who you're paying before your wallet opens." : "No account on the other side? Send a link they can claim, no wallet needed to start."}
        actions={
          <Segmented
            label="How to send"
            value={mode}
            onChange={(m) => setParams(m === "link" ? { mode: "link" } : {}, { replace: true })}
            options={[
              { value: "account", label: "To an account" },
              { value: "link", label: "As a link" },
            ]}
          />
        }
      />
      {mode === "account" ? <DirectMode /> : <SendLinkMode />}
      {mode === "link" && (
        <p className="mt-4 text-[13.5px] text-muted">
          Send links you've made are listed under <Link to="/transactions" className="font-semibold text-foreground underline underline-offset-4">Transactions</Link>.
        </p>
      )}
    </>
  );
}
