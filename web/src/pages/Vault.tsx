import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, ExternalLink, RefreshCw, Search, ShieldCheck, Wallet, X } from "../components/icons";
import { EVM_WALLET_ID, useWallet } from "../lib/wallet";
import { api, type Payment, type VaultSummary } from "../lib/api";
import { formatAsset, nearAmount, timeAgo, unitsToDecimal } from "../lib/format";
import { AccountLink, Badge, Banner, Skeleton } from "../components/ui";
import { LoadBar, StageList, Tip, type Stage } from "../components/Tip";
import { NotDeployed, isLocalDev, useDeployment } from "../components/Layout";

/*
  Vault console, in the order an owner needs it (UI notes: one primary region a screen):
  1. what needs you now (payments held for approval), beside who can approve them (a real setup stepper)
  2. how much the vault can still spend today, per asset, against its caps
  3. the full history, filtered by status
  How a payment gets through sits under the head as a four-step strip, with the detail in tooltips.
  Every loading cue is a real pending state; nothing is shown as done before the chain or the server says so.
*/

const STATUS_TEXT: Record<Payment["status"], string> = {
  PendingApproval: "Waiting for approval",
  Executing: "Paying…",
  Executed: "Paid",
  Failed: "Failed",
  Rejected: "Rejected by owner",
  Expired: "Expired",
};
const EXPLORER = "https://testnet.nearblocks.io";
const byNewest = (a: Payment, b: Payment) => Number(b.created_at_ms) - Number(a.created_at_ms) || Number(b.id) - Number(a.id);
/** A share of a cap as a whole percent, 0 when the cap is missing or zero (no division by zero). */
function pct(spent: string | null | undefined, cap: string | null | undefined): number {
  try {
    if (!spent || !cap || BigInt(cap) <= 0n) return 0;
    return Math.min(100, Number((BigInt(spent) * 100n) / BigInt(cap)));
  } catch {
    return 0;
  }
}

/** How approvals get signed right now: the owner's own wallet (preferred) or the local demo owner key. */
export type Signer = { kind: "wallet"; accountId: string } | { kind: "local" } | { kind: "none"; why: string };

export function useSigner(summary: VaultSummary | null): Signer {
  const w = useWallet();
  if (!summary) return { kind: "none", why: "Loading…" };
  if (w.accountId && w.accountId === summary.config.owner) return { kind: "wallet", accountId: w.accountId };
  if (summary.localOwnerKey) return { kind: "local" };
  return { kind: "none", why: `Only the owner (${summary.config.owner}) can approve. Connect that wallet.` };
}

// ---------------------------------------------------------------- one held payment

type Act =
  | { step: "idle" }
  | { step: "confirm"; kind: "approve" | "reject" }
  | { step: "signing"; kind: "approve" | "reject" }
  | { step: "sent"; kind: "approve" | "reject"; explorer: string; paid?: boolean }
  | { step: "failed"; kind: "approve" | "reject"; message: string };

export function PendingCard({ p, onDone, signer, vault }: { p: Payment; onDone: () => void; signer: Signer; vault: string }) {
  const w = useWallet();
  const [act, setAct] = useState<Act>({ step: "idle" });

  async function run(kind: "approve" | "reject") {
    setAct({ step: "signing", kind });
    try {
      if (signer.kind === "wallet") {
        const hash = await w.call(vault, kind, { payment_id: p.id });
        setAct({ step: "sent", kind, explorer: `${EXPLORER}/txns/${hash}` });
        // The payout lands a block or two after the approval: the list is read again after that.
        setTimeout(onDone, 2500);
      } else if (signer.kind === "local") {
        const r = kind === "approve" ? await api.approve(p.id) : await api.reject(p.id);
        setAct({ step: "sent", kind, explorer: r.explorer, paid: r.payment?.status === "Executed" });
        onDone();
      } else {
        throw new Error(signer.why);
      }
    } catch (e: any) {
      // The error stays on this card with a retry, not in a toast that disappears.
      setAct({ step: "failed", kind, message: e?.message ?? String(e) });
    }
  }

  const amount = formatAsset(p.amount, p.asset);
  const who = signer.kind === "wallet" ? `your wallet (${signer.accountId})` : "the local demo owner key";
  const stages: Stage[] | null =
    act.step === "signing" || act.step === "sent"
      ? [
          { text: signer.kind === "wallet" ? "Sign in your wallet" : "Sign with the local demo owner key", state: act.step === "signing" ? "now" : "done" },
          {
            text:
              act.step === "sent" ? (
                <>
                  Recorded on testnet:{" "}
                  <a href={act.explorer} target="_blank" rel="noreferrer">
                    view transaction <ExternalLink size={12} aria-hidden />
                  </a>
                </>
              ) : (
                "Recorded on testnet"
              ),
            state: act.step === "sent" ? "done" : "todo",
          },
          { text: act.kind === "approve" ? "The vault re-checks its daily cap and pays" : "The money stays in the vault", state: act.step === "sent" ? "now" : "todo" },
        ]
      : null;

  return (
    <article className="held" aria-labelledby={`held-${p.id}`}>
      <div className="held__top">
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <Badge d={p.decision} />
            <span className="small muted">
              #{p.id} · {timeAgo(p.created_at_ms)}
            </span>
          </div>
          <h3 id={`held-${p.id}`} className="held__amount num">
            {amount}
          </h3>
          <p className="held__to">
            to <AccountLink id={p.recipient} explorer={EXPLORER} />
          </p>
        </div>
        <Link className="btn btn-secondary btn-sm" to={`/check?account=${encodeURIComponent(p.recipient)}&amount=${unitsToDecimal(p.amount, p.asset)}&asset=${p.asset === "NEAR" ? "NEAR" : "USDC"}&network=testnet`}>
          <Search size={14} aria-hidden /> Re-check recipient
        </Link>
      </div>
      <dl className="held__meta">
        <div>
          <dt>Memo</dt>
          <dd>{p.memo || "none"}</dd>
        </div>
        <div>
          <dt>
            Notara report{" "}
            <Tip label="the Notara report">
              The hash of the signed check Notara gave the agent. The vault only accepts a payment that carries a valid one, so this links the payment to the exact evidence it was judged on.
            </Tip>
          </dt>
          <dd className="mono">{p.report_hash.slice(0, 16)}…</dd>
        </div>
      </dl>

      {act.step === "idle" && (
        <div className="held__acts">
          <button className="btn btn-primary" onClick={() => setAct({ step: "confirm", kind: "approve" })} disabled={signer.kind === "none"} aria-label={`Approve payment ${p.id}`}>
            <Check size={16} aria-hidden /> Approve
          </button>
          <button className="btn btn-secondary" onClick={() => setAct({ step: "confirm", kind: "reject" })} disabled={signer.kind === "none"} aria-label={`Reject payment ${p.id}`}>
            <X size={16} aria-hidden /> Reject
          </button>
          {signer.kind === "none" && <span className="small muted">{signer.why}</span>}
        </div>
      )}

      {act.step === "confirm" && (
        <div className={`held__confirm${act.kind === "reject" ? " is-reject" : ""}`} role="group" aria-label="Confirm">
          <p style={{ fontWeight: 700, margin: 0 }}>{act.kind === "approve" ? `Pay ${amount} to ${p.recipient}?` : `Reject the ${amount} payment?`}</p>
          <p className="small" style={{ margin: "4px 0 12px" }}>
            {act.kind === "approve"
              ? `Notara flagged this payment for a human. The vault re-checks its daily cap before paying. Signed by ${who}.`
              : `The money stays in the vault and the agent can't retry this payment. Signed by ${who}.`}
          </p>
          <div className="row">
            <button className={act.kind === "approve" ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"} onClick={() => run(act.kind)}>
              Yes, {act.kind}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setAct({ step: "idle" })}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stages && <StageList stages={stages} label={act.step !== "idle" && "kind" in act && act.kind === "approve" ? "Approving this payment" : "Rejecting this payment"} />}

      {act.step === "failed" && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="error" title={act.kind === "approve" ? "The approval didn't go through" : "The rejection didn't go through"}>
            <p>{act.message}. The payment is still waiting; nothing was paid.</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => run(act.kind)}>
                Try again
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAct({ step: "idle" })}>
                Back
              </button>
            </div>
          </Banner>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- the page

export function VaultPage() {
  const { dep } = useDeployment();
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  // ?vault= shows a visitor's own vault (made on the Security page) instead of the main demo vault.
  const vaultParam = new URLSearchParams(useLocation().search).get("vault") ?? undefined;
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.vault(vaultParam), api.payments(vaultParam)]);
      if (n !== seq.current) return; // a newer load answered first: keep it
      setSummary(s);
      setPayments([...p.payments].sort(byNewest));
      setError(null);
      setLoadedAt(Date.now());
    } catch (e: any) {
      if (n === seq.current) setError(e.message);
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [vaultParam]);

  // A different vault: never show the last one's figures while the new one loads.
  useEffect(() => {
    setSummary(null);
    setPayments(null);
    setLoadedAt(null);
    setFilter("all");
  }, [vaultParam]);
  useEffect(() => {
    if (dep?.deployed) load();
  }, [dep?.deployed, load]);
  // A payment being paid settles in a block or two: read again until it has.
  const settling = !!payments?.some((p) => p.status === "Executing");
  useEffect(() => {
    if (!settling || loading) return;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [settling, loading, load]);
  // "Updated 20s ago" stays true as time passes.
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const signer = useSigner(summary);
  if (!dep?.deployed) return <NotDeployedPage />;

  const pending = payments?.filter((p) => p.status === "PendingApproval") ?? [];
  const shown = payments?.filter((p) => filter === "all" || p.status === filter) ?? [];
  const counts = (payments ?? []).reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
  const filters = [["all", "All", payments?.length ?? 0], ...Object.entries(STATUS_TEXT).filter(([k]) => counts[k]).map(([k, v]) => [k, v, counts[k]])] as [string, string, number][];
  const paused = !!summary?.config.paused;

  return (
    <>
      <LoadBar on={loading} label={summary ? "Refreshing the vault" : "Loading the vault"} />
      <div className="page-head vault-head">
        <div className="tags">
          <span className="tag testnet">Testnet</span>
          {summary && (paused ? <span className="badge WARN">Paused</span> : <span className="badge ALLOW">Active</span>)}
          {vaultParam && <span className="tag">Your own vault</span>}
        </div>
        <h1>The AI-agent vault</h1>
        <p>The contract that holds the agent's money. It pays only with a valid Notara check, within its caps, and holds anything Notara flags for you to decide.</p>
        <div className="head-actions" style={{ alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading} aria-busy={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} aria-hidden /> Refresh
          </button>
          <span className="small muted" role="status">
            {loading ? (summary ? "Refreshing…" : "Loading…") : loadedAt ? `Updated ${timeAgo(loadedAt)}` : ""}
          </span>
          {summary && (
            <span className="small">
              <AccountLink id={summary.vault} explorer={EXPLORER} />
            </span>
          )}
        </div>
      </div>

      <PaymentPath held={pending.length} />

      {error && (
        <div style={{ marginTop: 24 }}>
          <Banner kind="error" title={summary ? "The vault didn't refresh" : "The vault didn't load"}>
            <p>
              {error}.{" "}
              {summary && loadedAt && `What you see is from ${new Date(loadedAt).toLocaleTimeString(undefined, { timeStyle: "short" })}. `}
              <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                Try again
              </button>
            </p>
          </Banner>
        </div>
      )}
      {paused && (
        <div style={{ marginTop: 24 }}>
          <Banner kind="warn" title="The vault is paused">
            <p>No payments or approvals go through until the owner unpauses it.</p>
          </Banner>
        </div>
      )}

      {/* 1. what needs you now, beside who can approve it */}
      <section aria-labelledby="held-h">
        <div className="tool-split">
          <div className="tool-main">
            <div className="sec-head">
              <h2 id="held-h">
                Held for your approval {pending.length > 0 && <span className="count">{pending.length}</span>}{" "}
                <Tip label="a held payment">
                When Notara's check says WARN (for example a new account, or an unusual amount), the vault doesn't pay. It holds the payment here until the owner approves or rejects it.
                  ALLOW pays at once; BLOCK is refused outright.
                </Tip>
              </h2>
            </div>
            {payments === null ? (
              <div className="held" aria-busy="true">
                <Skeleton lines={3} />
              </div>
            ) : pending.length === 0 ? (
              <div className="held held--empty">
                <span className="held__icon" aria-hidden>
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>Nothing is waiting for you</p>
                  <p className="small muted" style={{ margin: "4px 0 0" }}>
                    Payments Notara flags as WARN appear here. <Link to="/security">Run the attack demo</Link> to see one.
                  </p>
                </div>
              </div>
            ) : (
              <div className="held-list">
                {pending.map((p) => (
                  <PendingCard key={p.id} p={p} onDone={load} signer={signer} vault={summary?.vault ?? ""} />
                ))}
              </div>
            )}
          </div>
          <aside className="tool-side">{summary ? <OwnerSteps summary={summary} onChange={load} /> : <div className="card"><Skeleton lines={4} /></div>}</aside>
        </div>
      </section>

      {/* 2. what the vault can still spend today */}
      <section aria-labelledby="limits-h">
        <div className="sec-head">
          <h2 id="limits-h">Balance and spending limits</h2>
        </div>
        {!summary ? (
          <div className="limits">
            <div className="limit" aria-busy="true">
              <Skeleton lines={4} />
            </div>
            <div className="limit" aria-busy="true">
              <Skeleton lines={4} />
            </div>
          </div>
        ) : (
          <div className="limits">
            <LimitCard
              title="Test NEAR"
              balance={`${summary.balanceNear} NEAR`}
              balanceNote="includes the contract's own storage, which it can't spend"
              spent={`${summary.spentTodayNear} NEAR`}
              daily={`${nearAmount(summary.config.caps.NEAR?.daily)} NEAR`}
              perTx={`${nearAmount(summary.config.caps.NEAR?.per_tx)} NEAR`}
              pct={pct(summary.spentTodayYocto, summary.config.caps.NEAR?.daily)}
            />
            {summary.usdc.enabled ? (
              <LimitCard
                title="Testnet USDC (Circle)"
                balance={`${summary.usdc.balance} USDC`}
                spent={`${summary.usdc.spentToday} USDC`}
                daily={`${summary.usdc.daily ?? "0"} USDC`}
                perTx={`${summary.usdc.perTx ?? "0"} USDC`}
                pct={pct(summary.usdc.spentTodayUnits, summary.usdc.dailyUnits)}
                empty={
                  summary.usdc.balance === "0" ? (
                    <>
                      No USDC yet. Get testnet USDC at{" "}
                      <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
                        faucet.circle.com
                      </a>{" "}
                      (network NEAR testnet, to <span className="mono">{summary.config.owner}</span>) and send it to the vault.
                      {isLocalDev() && (
                        <>
                          {" "}
                          Locally: <code>npm run owner -- fund-usdc 15</code>.
                        </>
                      )}{" "}
                      Until then USDC payments fail safely and the vault releases the cap.
                    </>
                  ) : null
                }
              />
            ) : (
              <div className="limit limit--off">
                <h3>Testnet USDC</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {vaultParam ? "This vault pays in test NEAR only." : "USDC isn't switched on for this vault yet, so it pays in test NEAR only."}
                  {!vaultParam && isLocalDev() && (
                    <>
                      {" "}
                      Owner: run <code>npm run owner -- enable-usdc</code>.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. everything the vault has done */}
      <section aria-labelledby="hist-h">
        <div className="sec-head">
          <h2 id="hist-h">Payment history</h2>
          {payments && payments.length > 0 && (
            <div className="filters" role="group" aria-label="Show payments by status">
              {filters.map(([k, label, n]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {label} <span className="n">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {payments === null ? (
          <div className="card">
            <Skeleton lines={5} />
          </div>
        ) : shown.length === 0 ? (
          <div className="card flat empty">
            <p style={{ margin: 0 }}>{payments.length === 0 ? "No payments yet. Run the attack demo or pay an invoice to create some." : "No payments with this status."}</p>
          </div>
        ) : (
          <div className="table-wrap stack-mobile">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Notara verdict</th>
                  <th>Status</th>
                  <th>Memo</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td data-label="#" className="mono">
                      {p.id}
                    </td>
                    <td data-label="Recipient">
                      <AccountLink id={p.recipient} explorer={EXPLORER} />
                    </td>
                    <td data-label="Amount" className="num" style={{ whiteSpace: "nowrap" }}>
                      {formatAsset(p.amount, p.asset)}
                    </td>
                    <td data-label="Notara verdict">
                      <Badge d={p.decision} />
                    </td>
                    <td data-label="Status" className={p.status === "Executed" ? "status-ok" : p.status === "Failed" || p.status === "Rejected" ? "status-error" : ""}>
                      {STATUS_TEXT[p.status]}
                    </td>
                    <td data-label="Memo" className="small muted">
                      {p.memo ?? ""}
                    </td>
                    <td data-label="When" className="small muted" style={{ whiteSpace: "nowrap" }}>
                      {timeAgo(p.created_at_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ marginTop: 12 }}>
          The agent never holds the owner key. Approvals are signed by the owner's own NEAR wallet when it's connected, or by the local demo owner key before ownership is handed to a
          wallet.
        </p>
      </section>
    </>
  );
}

/** The path every payment takes, as four steps; the detail of each is in its tooltip. */
function PaymentPath({ held }: { held: number }) {
  return (
    <ol className="vpath" aria-label="How a payment gets through the vault">
      <li>
        <span className="vpath__n" aria-hidden>
          <Bot size={18} />
        </span>
        <span>
          <strong>The agent asks to pay</strong>
          <span className="vpath__d">
            an invoice it read{" "}
            <Tip label="the agent's key">
              The agent signs with a function-call key that can only ask this vault to pay. It can't move money any other way, even if it's tricked.
            </Tip>
          </span>
        </span>
      </li>
      <li>
        <span className="vpath__n" aria-hidden>
          <Search size={18} />
        </span>
        <span>
          <strong>Notara checks the recipient</strong>
          <span className="vpath__d">
            ALLOW, WARN or BLOCK{" "}
            <Tip label="Notara's check">
              Account age, activity, scam reports and the amount, read live from NEAR. The verdict is signed, so the vault can tell it wasn't forged or edited.
            </Tip>
          </span>
        </span>
      </li>
      <li>
        <span className="vpath__n" aria-hidden>
          <ShieldCheck size={18} />
        </span>
        <span>
          <strong>The vault checks its rules</strong>
          <span className="vpath__d">
            signature, caps, pause{" "}
            <Tip label="the vault's rules">
              The contract checks the verdict's signature and age, the per-payment cap, what it has spent today against the daily cap, and that it isn't paused.
            </Tip>
          </span>
        </span>
      </li>
      <li className={held > 0 ? "is-hot" : ""}>
        <span className="vpath__n" aria-hidden>
          <Wallet size={18} />
        </span>
        <span>
          <strong>Paid, or held for you</strong>
          <span className="vpath__d">{held > 0 ? `${held} held now` : "WARN waits for the owner"}</span>
        </span>
      </li>
    </ol>
  );
}

function LimitCard({ title, balance, balanceNote, spent, daily, perTx, pct, empty }: { title: string; balance: string; balanceNote?: string; spent: string; daily: string; perTx: string; pct: number; empty?: React.ReactNode }) {
  const tone = pct >= 90 ? "is-high" : pct >= 60 ? "is-mid" : "";
  return (
    <div className="limit">
      <h3>{title}</h3>
      <p className="limit__bal num">{balance}</p>
      {balanceNote && <p className="small muted" style={{ margin: 0 }}>Balance, {balanceNote}</p>}
      <div className="limit__meter">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <span className="small">
            <strong className="num">{spent}</strong> spent today
          </span>
          <span className="small muted">
            daily cap <span className="num">{daily}</span>{" "}
            <Tip label="the daily cap">The most the vault pays in one day across all payments, even ones you approve. It resets every 24 hours.</Tip>
          </span>
        </div>
        <div className={`progress ${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% of the daily cap used`}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="limit__row">
        <span className="muted">
          Per-payment cap <Tip label="the per-payment cap">No single payment can be larger than this, whatever the verdict.</Tip>
        </span>
        <strong className="num">{perTx}</strong>
      </p>
      {empty && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="warn" title="The vault has no USDC yet">
            <p>{empty}</p>
          </Banner>
        </div>
      )}
    </div>
  );
}

function NotDeployedPage() {
  return (
    <>
      <div className="page-head">
        <h1>The AI-agent vault</h1>
      </div>
      <NotDeployed />
    </>
  );
}

/** Who approves payments, as the real setup steps: connect a wallet, hand the vault over, accept it. */
export function OwnerSteps({ summary, onChange }: { summary: VaultSummary; onChange: () => void }) {
  const w = useWallet();
  const [busy, setBusy] = useState<null | "propose" | "accept">(null);
  const [done, setDone] = useState<{ text: string; link?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const owner = summary.config.owner;
  const isOwner = !!w.accountId && w.accountId === owner;
  const isPending = !!w.accountId && w.accountId === summary.pendingOwner;
  // A handover needs the current owner's key here (the local demo key); a wallet-owned vault is already set.
  const canHandOver = summary.localOwnerKey;

  async function run(kind: "propose" | "accept", fn: () => Promise<string>, text: string) {
    setBusy(kind);
    setErr(null);
    try {
      const link = await fn();
      setDone({ text, link });
      // The new owner is on chain a block or two later; read it again then. Busy holds the button until.
      setTimeout(() => {
        onChange();
        setBusy(null);
      }, 2500);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(null);
    }
  }

  const s1: Stage["state"] = w.accountId ? "done" : "now";
  const s2: Stage["state"] = isOwner || isPending ? "done" : w.accountId ? "now" : "todo";
  const s3: Stage["state"] = isOwner ? "done" : isPending ? "now" : "todo";

  return (
    <div className="card owner">
      <div className="row" style={{ gap: 12, marginBottom: 6, flexWrap: "nowrap" }}>
        <span className="card-icon" style={{ margin: 0 }}>
          <Wallet size={20} aria-hidden />
        </span>
        <h2 style={{ margin: 0 }}>Who approves</h2>
      </div>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        Owner: <AccountLink id={owner} explorer={EXPLORER} />
        {summary.pendingOwner && (
          <>
            {" "}
            · handing over to <span className="mono">{summary.pendingOwner}</span>
          </>
        )}
      </p>

      {isOwner ? (
        <div className="owner__ok">
          <ShieldCheck size={20} aria-hidden />
          <p style={{ margin: 0 }}>
            <strong>Your wallet is the owner.</strong> Approvals are signed in it; nobody else, this server included, can approve.
          </p>
        </div>
      ) : !canHandOver && w.accountId ? (
        <p className="small" style={{ margin: 0 }}>
          {w.accountId} isn't the owner. Connect <span className="mono">{owner}</span> to approve payments.
        </p>
      ) : (
        <>
          <p className="small" style={{ margin: "0 0 4px" }}>
            {summary.localOwnerKey ? "Right now the local demo owner key approves. Take it over with your own wallet:" : "Connect the owner's wallet to approve payments."}
          </p>
          <ol className="osteps">
            <li className={`is-${s1}`}>
              <span className="osteps__dot" aria-hidden>
                {s1 === "done" ? <Check size={13} /> : 1}
              </span>
              <div>
                <strong>Connect your testnet wallet</strong>
                {w.accountId ? (
                  <p className="small muted mono" style={{ margin: "2px 0 0", wordBreak: "break-all" }}>
                    {w.accountId}
                  </p>
                ) : (
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => w.connect(undefined, "testnet")} disabled={!w.ready || w.busy}>
                      <Wallet size={14} aria-hidden /> NEAR wallet
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => w.connect(EVM_WALLET_ID, "testnet")} disabled={!w.ready || w.busy}>
                      EVM wallet (MetaMask)
                    </button>
                    <Tip label="an EVM wallet">An Ethereum wallet signs NEAR transactions through evm-on-near.dev and gets a NEAR account derived from your 0x address.</Tip>
                  </div>
                )}
              </div>
            </li>
            {canHandOver && (
              <>
                <li className={`is-${s2}`}>
                  <span className="osteps__dot" aria-hidden>
                    {s2 === "done" ? <Check size={13} /> : 2}
                  </span>
                  <div>
                    <strong>Hand the vault to it</strong>{" "}
                    <Tip label="the handover">The current owner proposes the new one, then the new one accepts. Two steps, so a typo can't lock the vault.</Tip>
                    {w.accountId && !isPending && !isOwner && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={!!busy}
                          aria-busy={busy === "propose"}
                          onClick={() => run("propose", async () => (await api.proposeOwner(w.accountId!)).explorer, `Handover proposed to ${w.accountId}. Now accept it.`)}
                        >
                          {busy === "propose" ? "Proposing…" : "Propose the handover"}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
                <li className={`is-${s3}`}>
                  <span className="osteps__dot" aria-hidden>
                    3
                  </span>
                  <div>
                    <strong>Accept it in your wallet</strong>
                    {isPending && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!!busy}
                          aria-busy={busy === "accept"}
                          onClick={() => run("accept", async () => `${EXPLORER}/txns/${await w.call(summary.vault, "accept_owner", {}, 30)}`, "You are now the vault owner.")}
                        >
                          {busy === "accept" ? "Waiting for your wallet…" : "Accept ownership"}
                        </button>
                        <p className="small muted" style={{ margin: "6px 0 0" }}>
                          After this, the local demo key can no longer approve.
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              </>
            )}
          </ol>
        </>
      )}
      {done && (
        <p className="small" role="status" style={{ margin: "14px 0 0" }}>
          <Check size={14} aria-hidden style={{ color: "var(--allow)", verticalAlign: "-2px" }} /> {done.text}{" "}
          {done.link && (
            <a href={done.link} target="_blank" rel="noreferrer">
              View transaction
            </a>
          )}
        </p>
      )}
      {(err || w.error) && (
        <p className="err" role="alert" style={{ margin: "12px 0 0" }}>
          {err ?? w.error}
        </p>
      )}
    </div>
  );
}
