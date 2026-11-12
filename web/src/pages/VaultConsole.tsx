// Vault Console: the home of an agent-managed vault. Left: live state (balance, limits, counters).
// Right: what the agent did, newest first. One big Pause button. The attack demo runs here, in place.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, type MyVault as MyVaultInfo, type Payment, type VaultSummary } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { useLocal } from "@/lib/local";
import { asSentence, formatAsset, nearAmount, timeAgo, unitsToDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NotDeployed, useDeployment, useToast } from "@/components/Layout";
import { ExternalLink, Pause, Play, RefreshCw, ShieldAlert, Sparks } from "@/components/icons";
import StatsCounter from "@/components/vengeance/stats-counter";
import { MyVault } from "@/components/MyVault";
import { PageHead } from "@/components/shell/AppShell";
import { handle } from "@/components/app/wallet";
import { Button, Card, Chip, EASE, FormField, Hint, Notice, Shimmer, TextArea, TextInput } from "@/components/app/ui";
import { VerdictChip } from "@/components/app/verdict";
import { DemoPage } from "./Demo";
import { OwnerSteps, PendingCard, useSigner } from "./Vault";

const STATUS: Record<Payment["status"], { text: string; hint: string; tone: "success" | "warning" | "danger" | "neutral" | "outline" }> = {
  PendingApproval: { text: "Waiting for you", hint: "The vault is holding this payment until the owner approves or rejects it.", tone: "warning" },
  Executing: { text: "Paying", hint: "The vault is sending this payment now.", tone: "outline" },
  Executed: { text: "Paid", hint: "The vault paid this.", tone: "success" },
  Failed: { text: "Failed", hint: "The payment failed and the money stayed in the vault.", tone: "danger" },
  Rejected: { text: "Rejected", hint: "The owner rejected this payment. The money stayed in the vault.", tone: "neutral" },
  Expired: { text: "Expired", hint: "Nobody decided in time. The money stayed in the vault.", tone: "neutral" },
};

/** "0.5" NEAR as yoctoNEAR, or null if it isn't a valid amount. */
function yocto(decimal: string): string | null {
  if (!/^\d+(\.\d{1,24})?$/.test(decimal)) return null;
  const [a, b = ""] = decimal.split(".");
  return (BigInt(a) * 10n ** 24n + BigInt(b.padEnd(24, "0"))).toString();
}

function Stat({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Hint text={hint} focusable>
        <span className="text-[12.5px] font-semibold text-muted underline decoration-dotted decoration-muted/50 underline-offset-4">{label}</span>
      </Hint>
      <span className="tnum text-[24px] font-extrabold leading-tight tracking-[-0.03em]">{children}</span>
    </div>
  );
}

function Meter({ spent, cap }: { spent: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-default" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Spent today against the daily limit">
      <motion.div className={cn("h-full rounded-full", pct > 85 ? "bg-warning" : "bg-success")} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} />
    </div>
  );
}

function LimitEditor({ summary, isOwner, onSaved }: { summary: VaultSummary; isOwner: boolean; onSaved: () => void }) {
  const w = useWallet();
  const toast = useToast();
  const cap = summary.config.caps.NEAR;
  const [perTx, setPerTx] = useState(cap ? nearAmount(cap.per_tx) : "");
  const [daily, setDaily] = useState(cap ? nearAmount(cap.daily) : "");
  const [note, setNote] = useLocal(`notara-limit-note:${summary.vault}`, "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const p = yocto(perTx);
  const d = yocto(daily);
  const bad = !p || !d ? "Enter both limits as numbers, like 0.5." : BigInt(p) > BigInt(d) ? "One payment can't be larger than the daily limit." : null;
  const changed = !!cap && (p !== cap.per_tx || d !== cap.daily);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Per payment (NEAR)">
          <TextInput value={perTx} inputMode="decimal" disabled={!isOwner} onChange={(e) => setPerTx((e.target as HTMLInputElement).value)} className="tnum" />
        </FormField>
        <FormField label="Per day (NEAR)">
          <TextInput value={daily} inputMode="decimal" disabled={!isOwner} onChange={(e) => setDaily((e.target as HTMLInputElement).value)} className="tnum" />
        </FormField>
      </div>
      <FormField label="What this limit is for" note="Describe what this limit is for — your team and future-you will thank you.">
        <TextArea value={note} maxLength={180} onChange={(e) => setNote(e.target.value)} placeholder="Covers the monthly hosting and API bills, with headroom." className="!min-h-[64px]" />
      </FormField>
      <p className="-mt-2 text-[12.5px] text-muted">The note is kept on this device. The limits themselves are enforced by the vault contract on NEAR.</p>
      {err && <Notice tone="danger" title="The limits weren't changed"><p>{asSentence(err)}</p></Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          busy={busy}
          disabled={!isOwner || !!bad || !changed}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await w.call(summary.vault, "set_cap", { asset: "NEAR", per_tx: p, daily: d }, 30);
              toast("Limits updated on the vault.");
              onSaved();
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Confirm in your wallet…" : "Save limits"}
        </Button>
        <span className="text-[13px] text-muted">{!isOwner ? "Only the vault's owner can change limits." : bad && (perTx || daily) ? bad : "Your wallet signs the change."}</span>
      </div>
    </div>
  );
}

export function VaultConsolePage() {
  const { dep } = useDeployment();
  const w = useWallet();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const [mine, setMine] = useState<MyVaultInfo | null>(null);
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [sim, setSim] = useState(false);
  const [limits, setLimits] = useState(false);
  const seq = useRef(0);

  // Which vault: the one in the address, else your own, else the shared demo vault.
  useEffect(() => {
    setMine(null);
    if (w.accountId && w.network === "testnet") api.myVault(w.accountId).then(setMine, () => {});
  }, [w.accountId, w.network]);
  const vault = params.get("vault") ?? (mine?.exists ? mine.vault : undefined);
  const isMine = !!mine?.exists && vault === mine.vault;

  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.vault(vault), api.payments(vault)]);
      if (n !== seq.current) return;
      setSummary(s);
      setPayments([...p.payments].sort((a, b) => Number(b.created_at_ms) - Number(a.created_at_ms) || Number(b.id) - Number(a.id)));
      setError(null);
    } catch (e) {
      if (n === seq.current) setError((e as Error).message);
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [vault]);
  useEffect(() => {
    setSummary(null);
    setPayments(null);
    if (dep?.deployed) load();
  }, [dep?.deployed, load]);
  // A payment being paid settles in a block or two: read again until it has.
  const settling = !!payments?.some((p) => p.status === "Executing");
  useEffect(() => {
    if (!settling || loading) return;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [settling, loading, load]);

  const signer = useSigner(summary);
  const isOwner = !!summary && w.accountId === summary.config.owner;
  const paused = !!summary?.config.paused;
  const pending = payments?.filter((p) => p.status === "PendingApproval") ?? [];
  const cap = summary?.config.caps.NEAR;

  async function setPaused(next: boolean) {
    if (!summary) return;
    setPausing(true);
    setConfirmPause(false);
    try {
      await w.call(summary.vault, "set_paused", { paused: next }, 30);
      toast(next ? "Agent paused. The vault refuses every new payment." : "Agent resumed.");
      await load();
    } catch (e) {
      toast(asSentence((e as Error).message), "error");
    } finally {
      setPausing(false);
    }
  }

  if (dep && !dep.deployed)
    return (
      <>
        <PageHead title="Vault Console" sub="A spending account for an AI agent, with limits it can't talk its way past." />
        <div className="legacy"><NotDeployed /></div>
      </>
    );

  return (
    <>
      <PageHead
        title="Vault Console"
        sub="A spending account for an AI agent. The agent can only ask; the vault pays within your limits and holds anything unusual for you."
        actions={
          <Button variant="secondary" onClick={load} busy={loading && !!summary}>
            <RefreshCw size={15} aria-hidden /> Refresh
          </Button>
        }
      />

      {error && !summary && (
        <Notice tone="danger" title="The vault didn't load" action={<Button size="sm" variant="secondary" onClick={load}>Try again</Button>}>
          <p>{asSentence(error)} Nothing was changed.</p>
        </Notice>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Left: live state */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">{isMine ? "Your vault" : params.get("vault") ? "Vault" : "Shared demo vault"}</h2>
                  {summary && (paused ? <Chip tone="warning" hint="The vault is paused: it refuses every payment and approval until the owner resumes it.">Paused</Chip> : <Chip tone="success" hint="The vault is active: it pays within its limits when Notara's check allows.">Active</Chip>)}
                  <Chip tone="outline" hint="Vaults run on NEAR testnet with free test money.">Testnet</Chip>
                </div>
                {summary ? (
                  <a href={`${summary.explorer}/address/${summary.vault}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all font-mono text-[12.5px] text-muted underline-offset-4 hover:underline">
                    {summary.vault} <ExternalLink size={11} aria-hidden />
                  </a>
                ) : (
                  <Shimmer className="mt-2 h-3.5 w-56" />
                )}
              </div>
              {mine?.exists && params.get("vault") && params.get("vault") !== mine.vault && (
                <Button size="sm" variant="secondary" onClick={() => setParams({}, { replace: true })}>Show my vault</Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <Stat label="Balance" hint="What the vault holds, read live from NEAR. It includes a little the contract needs for its own storage.">
                {summary ? <>{summary.balanceNear.replace(/(\.\d{3})\d+$/, "$1")} <span className="text-[13px] font-bold text-muted">NEAR</span></> : <Shimmer className="h-7 w-24" />}
              </Stat>
              <Stat label="Per payment" hint="The most the vault will pay in a single payment. Enforced by the contract.">
                {summary ? cap ? <>{nearAmount(cap.per_tx)} <span className="text-[13px] font-bold text-muted">NEAR</span></> : <span className="text-[15px] text-muted">Not set</span> : <Shimmer className="h-7 w-20" />}
              </Stat>
              <Stat label="Per day" hint="The most the vault will pay in one day across all payments, even ones you approve. It resets every 24 hours.">
                {summary ? cap ? <>{nearAmount(cap.daily)} <span className="text-[13px] font-bold text-muted">NEAR</span></> : <span className="text-[15px] text-muted">Not set</span> : <Shimmer className="h-7 w-20" />}
              </Stat>
            </div>

            {summary && cap && (
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-[13px] font-semibold">
                  <span>Spent today</span>
                  <span className="tnum text-muted">{summary.spentTodayNear} of {nearAmount(cap.daily)} NEAR</span>
                </div>
                <Meter spent={Number(summary.spentTodayNear)} cap={Number(nearAmount(cap.daily))} />
              </div>
            )}
            {summary?.usdc.enabled && (
              <p className="mt-4 text-[13.5px] text-muted">
                USDC: holds <strong className="tnum text-foreground">{formatAsset(summary.usdc.balance, summary.usdc.asset)}</strong>
                {summary.usdc.perTx && <>, up to {unitsToDecimal(summary.usdc.perTx, summary.usdc.asset)} per payment</>}
                {summary.usdc.dailyUnits && <>, {unitsToDecimal(summary.usdc.dailyUnits, summary.usdc.asset)} a day</>}.
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-muted">Limits apply to every payee alike; the vault has no per-payee limit yet.</p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/70 pt-5">
              {(
                [
                  ["Payments", payments?.length, "Every payment the agent has asked this vault to make."],
                  ["Held for you", pending.length, "Payments waiting for the owner's decision right now."],
                  ["Refused or rejected", payments?.filter((p) => p.status === "Rejected" || p.status === "Failed" || p.status === "Expired").length, "Payments that did not go out. The money stayed in the vault."],
                ] as const
              ).map(([label, n, hint]) => (
                <div key={label}>
                  <p className="tnum text-[28px] font-extrabold leading-none tracking-[-0.04em]">{payments ? <StatsCounter value={n ?? 0} duration={1} /> : <Shimmer className="h-7 w-10" />}</p>
                  <Hint text={hint} focusable>
                    <span className="mt-1 inline-block text-[12.5px] font-semibold text-muted underline decoration-dotted decoration-muted/50 underline-offset-4">{label}</span>
                  </Hint>
                </div>
              ))}
            </div>
          </Card>

          {/* The kill switch */}
          <Card className={cn("flex flex-wrap items-center justify-between gap-4", paused && "border-warning/40 bg-warning-soft")}>
            <div className="max-w-[38ch]">
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">{paused ? "The agent is paused" : "Stop everything"}</h2>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">
                {paused ? "No payment or approval goes through until you resume." : "Pausing makes the vault refuse every new payment at once."} {summary && !isOwner && `Only the owner (${handle(summary.config.owner)}) can do this.`}
              </p>
            </div>
            {confirmPause ? (
              <div className="flex gap-2" role="group" aria-label="Confirm pausing">
                <Button variant="secondary" onClick={() => setConfirmPause(false)}>Cancel</Button>
                <Button variant="danger" onClick={() => setPaused(true)}>Yes, pause now</Button>
              </div>
            ) : paused ? (
              <Button size="lg" variant="secondary" busy={pausing} disabled={!isOwner} onClick={() => setPaused(false)}>
                <Play size={18} aria-hidden /> {pausing ? "Confirm in your wallet…" : "Resume agent"}
              </Button>
            ) : (
              <Button size="lg" variant="danger-quiet" busy={pausing} disabled={!isOwner || !summary} onClick={() => setConfirmPause(true)}>
                <Pause size={18} aria-hidden /> {pausing ? "Confirm in your wallet…" : "Pause agent"}
              </Button>
            )}
          </Card>

          <Card>
            <button type="button" aria-expanded={limits} onClick={() => setLimits((l) => !l)} className="flex w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="block text-[17px] font-bold tracking-[-0.02em]">Limits</span>
                <span className="block text-[13.5px] text-muted">Change what the agent may spend, and note why.</span>
              </span>
              <span className="text-[13.5px] font-semibold underline underline-offset-4">{limits ? "Close" : "Edit"}</span>
            </button>
            <AnimatePresence initial={false}>
              {limits && summary && (
                <motion.div initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                  <div className="pt-5">
                    <LimitEditor key={summary.vault + (cap?.per_tx ?? "") + (cap?.daily ?? "")} summary={summary} isOwner={isOwner} onSaved={load} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Right: what the agent did */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">Approval queue</h2>
              {payments && <Chip tone={pending.length ? "warning" : "outline"} hint="Payments the vault is holding until the owner decides.">{pending.length} waiting</Chip>}
            </div>
            {!payments || !summary ? (
              <Shimmer className="h-16 w-full rounded-xl" />
            ) : pending.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-muted">Nothing is waiting. When Notara's check says “take a second look”, the vault holds the payment here for you instead of paying.</p>
            ) : (
              <div className="legacy flex flex-col gap-3">
                {pending.map((p) => (
                  <PendingCard key={p.id} p={p} signer={signer} vault={summary.vault} onDone={load} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">Recent agent events</h2>
              {payments && payments.length > 0 && <span className="tnum text-[12.5px] font-semibold text-muted">Latest {Math.min(payments.length, 50)}</span>}
            </div>
            {!payments ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <Shimmer key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-muted">No events yet. Simulate an attack below to see the agent ask and the vault answer.</p>
            ) : (
              // A fixed-height box that scrolls on its own, so a long history doesn't stretch the page.
              <div
                tabIndex={0}
                role="region"
                aria-label="Recent agent events, scrollable"
                className="-mx-2 max-h-[440px] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-background/40 px-4 py-4 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] focus-visible:outline-2"
              >
              <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                {payments.slice(0, 50).map((p) => {
                  const st = STATUS[p.status];
                  return (
                    <li key={p.id} className="relative pl-7">
                      <span aria-hidden className={cn("absolute left-0 top-1.5 size-[15px] rounded-full border-[3px] border-surface", p.decision === "BLOCK" ? "bg-danger" : p.decision === "WARN" ? "bg-warning" : "bg-success")} />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[14px] font-semibold">Asked to pay <span className="tnum">{formatAsset(p.amount, p.asset)}</span></span>
                        <VerdictChip decision={p.decision} />
                        <Chip tone={st.tone} hint={st.hint}>{st.text}</Chip>
                      </div>
                      <p className="mt-0.5 break-all font-mono text-[12.5px] text-muted">to {p.recipient}</p>
                      <p className="text-[12.5px] text-muted">#{p.id} · {timeAgo(Number(p.created_at_ms))}{p.memo ? ` · ${p.memo}` : ""}</p>
                    </li>
                  );
                })}
              </ol>
              </div>
            )}
          </Card>

          {summary && (
            <div className="legacy rounded-2xl border border-border/70 bg-surface p-5 shadow-card">
              <OwnerSteps summary={summary} onChange={load} />
            </div>
          )}
        </div>
      </div>

      {/* The attack demo, in place */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-[60ch]">
            <h2 className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em]">
              <ShieldAlert size={20} aria-hidden /> Simulate an attack
            </h2>
            <p className="mt-1 text-[14.5px] leading-relaxed text-muted">An AI agent reads four invoices and tries to pay them from a vault you own. One hides an instruction to pay an attacker. Free test money; every result links to its transaction.</p>
          </div>
          <Button variant={sim ? "secondary" : "primary"} onClick={() => setSim((s) => !s)} aria-expanded={sim}>
            <Sparks size={17} aria-hidden /> {sim ? "Hide the simulation" : "Simulate an attack"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {sim && (
            <motion.div initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
              <div className="legacy pt-6">
                <MyVault />
                {dep && !dep.public && <DemoPage embedded />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </>
  );
}
