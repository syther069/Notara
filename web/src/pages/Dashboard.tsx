// The signed-in home. Every figure is read live (your Notara links, your wallet, your vault) or comes
// from sends made on this device; a figure that hasn't arrived shimmers and is never shown as 0.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { api, type MyVault, type Payment } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { dailySeries, monthTotal, settled, type Tx } from "@/lib/tx";
import { nearAmount, timeAgo, usdcFigure } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Bot, Clock, Link2, Search, Send, ShieldCheck } from "@/components/icons";
import { AnimatedNumber } from "@/components/vengeance/animated-number";
import { GlassDock } from "@/components/vengeance/glass-dock";
import { ConnectPanel, PageHead } from "@/components/shell/AppShell";
import { Avatar, handle, useProfile } from "@/components/app/wallet";
import { Card, Chip, EASE, Hint, LinkButton, Segmented, Shimmer } from "@/components/app/ui";
import { FlowChart, Sparkline } from "@/components/app/charts";
import { TxTable, useMoney, useTxs } from "@/components/app/TxTable";
import { usePrefs } from "@/components/app/profile";
import { VerdictChip } from "@/components/app/verdict";

function Kpi({ label, hint, figure, prefix, suffix, foot, spark, gold, icon, i }: { label: string; hint: string; figure: string | null; prefix?: string; suffix?: string; foot: ReactNode; spark?: number[]; gold?: boolean; icon: ReactNode; i: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0, y: reduce ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}>
      <Card lift className={cn("relative flex h-full flex-col gap-3 overflow-hidden", gold && "border-gold/60 bg-gradient-to-br from-gold/20 via-surface to-surface")}>
        <div className="flex items-center justify-between gap-2">
          <Hint text={hint} focusable>
            <span className="text-[13.5px] font-semibold text-muted underline decoration-dotted decoration-muted/50 underline-offset-4">{label}</span>
          </Hint>
          <span className={cn("inline-flex size-8 items-center justify-center rounded-full", gold ? "bg-gold/30 text-gold-ink" : "bg-accent-soft")}>{icon}</span>
        </div>
        <div className="tnum flex items-baseline gap-1 text-[30px] font-extrabold leading-none tracking-[-0.04em]">
          {figure === null ? (
            <Shimmer className="h-[30px] w-32" />
          ) : (
            <>
              {prefix}
              <AnimatedNumber value={figure} />
              {suffix && <span className="text-[15px] font-bold tracking-normal text-muted">{suffix}</span>}
            </>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-h-5 text-[13px] font-semibold text-muted">{figure === null ? <Shimmer className="h-3.5 w-24" /> : foot}</div>
          {spark && figure !== null && <Sparkline values={spark} className={cn("h-9 w-24 shrink-0", gold ? "text-gold-ink" : "text-success")} />}
        </div>
      </Card>
    </motion.div>
  );
}

function Delta({ now, before }: { now: bigint; before: bigint }) {
  if (before === 0n) return <>{now === 0n ? "Nothing last month either" : "Nothing last month"}</>;
  const pct = Number(((now - before) * 1000n) / before) / 10;
  return (
    <span className={pct >= 0 ? "text-success" : "text-danger"}>
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}% vs last month
    </span>
  );
}

function AgentActivity() {
  const w = useWallet();
  const [vault, setVault] = useState<MyVault | null | "n/a">(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!w.accountId) return;
    setVault(null);
    setPayments(null);
    setError(null);
    if (w.network !== "testnet") return setVault("n/a");
    api
      .myVault(w.accountId)
      .then((v) => {
        setVault(v);
        if (v.exists) return api.payments(v.vault).then((r) => setPayments(r.payments.slice().sort((a, b) => Number(b.created_at_ms) - Number(a.created_at_ms)).slice(0, 5)));
        setPayments([]);
      })
      .catch((e) => setError(e.message));
  }, [w.accountId, w.network]);
  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-bold tracking-[-0.02em]">Agent activity</h2>
        <Link to="/agents/vault" className="text-[13px] font-semibold text-muted underline underline-offset-4 hover:text-foreground">
          Vault Console
        </Link>
      </div>
      {error ? (
        <p className="text-[14px] text-muted">Agent activity didn't load ({error}).</p>
      ) : vault === null || (vault !== "n/a" && payments === null) ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      ) : vault === "n/a" ? (
        <p className="text-[14px] leading-relaxed text-muted">Agent vaults run on testnet with free test money. Connect a testnet wallet to see one here.</p>
      ) : !vault.exists ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-[14px] leading-relaxed text-muted">No vault yet. Create one you own, then let an AI agent try to pay from it.</p>
          <LinkButton to="/agents/vault" variant="secondary" size="sm">
            <Bot size={15} aria-hidden /> Open Vault Console
          </LinkButton>
        </div>
      ) : payments!.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-muted">Your vault is ready and the agent hasn't asked to pay anyone yet.</p>
      ) : (
        <ul className="flex flex-col">
          {payments!.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-0">
              <span className="min-w-0">
                <span className="block truncate font-mono text-[13px] font-semibold">{p.recipient}</span>
                <span className="block text-[12.5px] text-muted">
                  {p.status.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()} · {timeAgo(Number(p.created_at_ms))}
                </span>
              </span>
              <VerdictChip decision={p.decision} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function People({ txs }: { txs: Tx[] | null }) {
  const money = useMoney();
  const top = useMemo(() => {
    if (!txs) return null;
    const by = new Map<string, bigint>();
    for (const t of txs) if (t.counterparty && settled(t)) by.set(t.counterparty, (by.get(t.counterparty) ?? 0n) + BigInt(t.amount));
    return [...by.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)).slice(0, 5);
  }, [txs]);
  return (
    <Card className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-[17px] font-bold tracking-[-0.02em]">People</h2>
        <p className="text-[13px] text-muted">Who you've paid most, from this device.</p>
      </div>
      {!top ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-[14px] leading-relaxed text-muted">Nobody yet. The accounts you send to will collect here, for one-click repeat payments.</p>
          <LinkButton to="/send" variant="secondary" size="sm">
            <Send size={15} aria-hidden /> Send a payment
          </LinkButton>
        </div>
      ) : (
        <ul className="flex flex-col">
          {top.map(([acct, sum]) => (
            <li key={acct} className="group flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0">
              <Avatar account={acct} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{handle(acct)}</span>
                <span className="tnum block text-[12.5px] text-muted">{money(sum)} sent</span>
              </span>
              <LinkButton to={`/send?to=${encodeURIComponent(acct)}`} size="sm" variant="secondary" className="!h-8 !px-3 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100" aria-label={`Pay ${acct}`}>
                Pay
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const w = useWallet();
  const nav = useNavigate();
  const { txs } = useTxs();
  const [profile] = useProfile(w.accountId);
  const [prefs] = usePrefs();
  const [range, setRange] = useState<"30" | "90" | "365">("30");
  const [vault, setVault] = useState<MyVault | null | "n/a" | "error">(null);
  useEffect(() => {
    if (!w.accountId) return;
    setVault(null);
    if (w.network !== "testnet") return setVault("n/a");
    api.myVault(w.accountId).then(setVault, () => setVault("error"));
  }, [w.accountId, w.network]);

  const k = useMemo(() => {
    if (!txs) return null;
    const pending = txs.filter((t) => t.status === "Pending" || t.status === "Processing");
    const series = dailySeries(txs, 30);
    return {
      inNow: monthTotal(txs, "in", 0),
      inBefore: monthTotal(txs, "in", 1),
      outNow: monthTotal(txs, "out", 0),
      outBefore: monthTotal(txs, "out", 1),
      pendingCount: pending.length,
      pendingIn: pending.filter((t) => t.direction === "in").length,
      sparkIn: series.map((d) => d.in),
      sparkOut: series.map((d) => d.out),
    };
  }, [txs]);
  const series = useMemo(() => (txs ? dailySeries(txs, Number(range)) : null), [txs, range]);

  if (!w.accountId) return <ConnectPanel title="Your Notara dashboard" body="Connect a NEAR wallet to see what you've been paid, what you've sent and what's still waiting. Notara reads it live; nothing is sent." />;

  const sign = prefs.currency === "USD" ? "$" : undefined;
  const unit = prefs.currency === "USD" ? undefined : "USDC";
  const vaultFigure = vault === null ? null : vault === "n/a" || vault === "error" || !vault.exists ? "" : nearAmount(vault.balance).replace(/(\.\d{2})\d+$/, "$1");

  return (
    <>
      <PageHead
        title={<>Welcome back, {profile.displayName.trim() || handle(w.accountId)}.</>}
        sub="Here's your money on Notara today."
        actions={
          <>
            <LinkButton to="/get-paid">
              <Link2 size={17} aria-hidden /> Create payment link
            </LinkButton>
            <LinkButton to="/send" variant="secondary">
              <Send size={17} aria-hidden /> Send
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label="Received this month" hint="USDC paid to you through your Notara payment links this calendar month. Read live from Notara's record of your links." figure={k ? usdcFigure(k.inNow) : null} prefix={sign} suffix={unit} icon={<ArrowDownLeft size={16} aria-hidden />} spark={k?.sparkIn} foot={k && <Delta now={k.inNow} before={k.inBefore} />} />
        <Kpi i={1} label="Sent this month" hint="USDC you sent this calendar month: payments made from this device, plus send links you funded." figure={k ? usdcFigure(k.outNow) : null} prefix={sign} suffix={unit} icon={<ArrowUpRight size={16} aria-hidden />} spark={k?.sparkOut} foot={k && <Delta now={k.outNow} before={k.outBefore} />} />
        <Kpi i={2} label="Pending" hint="Links nobody has paid yet, plus payments still being processed." figure={k ? String(k.pendingCount) : null} icon={<Clock size={16} aria-hidden />} foot={k && (k.pendingCount === 0 ? "Nothing is waiting" : `${k.pendingIn} awaiting payment, ${k.pendingCount - k.pendingIn} outgoing`)} />
        <Kpi
          i={3}
          gold
          label="Vault balance"
          hint="What your AI-agent vault holds, read live from the vault contract on NEAR testnet. An agent can only spend from here, within your limits."
          figure={vaultFigure}
          suffix={vaultFigure ? "NEAR" : undefined}
          icon={<ShieldCheck size={16} aria-hidden />}
          foot={
            <span className="flex items-center gap-2">
              {vault === "n/a" ? "Testnet only" : vault === "error" ? "Couldn't read your vault" : vault && !vault.exists ? "No vault yet" : "Test NEAR"}
              <Link to="/agents/vault" className="text-foreground underline underline-offset-4">
                Manage
              </Link>
            </span>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">Activity</h2>
              <p className="text-[13px] text-muted">USDC in and out, per day.</p>
            </div>
            <Segmented
              label="Period"
              value={range}
              onChange={setRange}
              options={[
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "365", label: "1 year" },
              ]}
            />
          </div>
          {series ? <FlowChart key={range} data={series} /> : <Shimmer className="h-[270px] w-full rounded-xl" />}
        </Card>
        <AgentActivity />
        <People txs={txs} />
      </div>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">Transactions</h2>
          <Chip tone="outline" hint="Payment links and send links come from Notara's server. Direct sends are remembered on this device only.">
            Live · this wallet
          </Chip>
        </div>
        <TxTable limit={8} />
      </Card>

      <GlassDock
        className="fixed bottom-5 right-5 z-20 max-sm:right-1/2 max-sm:translate-x-1/2"
        items={[
          { title: "Create link", icon: Link2, onClick: () => nav("/get-paid") },
          { title: "Send", icon: Send, onClick: () => nav("/send") },
          { title: "Check account", icon: Search, onClick: () => nav("/agents/check") },
          { title: "Open Vault", icon: ShieldCheck, onClick: () => nav("/agents/vault") },
        ]}
      />
    </>
  );
}

export function TransactionsPage() {
  const w = useWallet();
  if (!w.accountId) return <ConnectPanel title="Your transactions" body="Connect a NEAR wallet to see every payment on your Notara links and the sends you've made." />;
  return (
    <>
      <PageHead title="Transactions" sub="Every payment Notara knows about for this wallet. Click a row for its full detail." />
      <Card>
        <TxTable />
      </Card>
    </>
  );
}
