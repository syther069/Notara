import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, RefreshCw, Wallet, X } from "lucide-react";
import { EVM_WALLET_ID, useWallet } from "../lib/wallet";
import { api, type Payment, type VaultSummary } from "../lib/api";
import { formatAsset, nearAmount, timeAgo, unitsToDecimal } from "../lib/format";
import { AccountLink, Badge, Banner, Skeleton } from "../components/ui";
import { NotDeployed, useDeployment, useToast } from "../components/Layout";

const STATUS_TEXT: Record<Payment["status"], string> = {
  PendingApproval: "Waiting for approval",
  Executing: "Paying…",
  Executed: "Paid",
  Failed: "Failed",
  Rejected: "Rejected by owner",
  Expired: "Expired",
};

/** How approvals get signed right now: the owner's own wallet (preferred) or the local demo owner key. */
type Signer = { kind: "wallet"; accountId: string } | { kind: "local" } | { kind: "none"; why: string };

function useSigner(summary: VaultSummary | null): Signer {
  const w = useWallet();
  if (!summary) return { kind: "none", why: "Loading…" };
  if (w.accountId && w.accountId === summary.config.owner) return { kind: "wallet", accountId: w.accountId };
  if (summary.localOwnerKey) return { kind: "local" };
  return { kind: "none", why: `Only the owner (${summary.config.owner}) can approve. Connect that wallet.` };
}

function PendingCard({ p, onDone, signer, vault }: { p: Payment; onDone: () => void; signer: Signer; vault: string }) {
  const toast = useToast();
  const w = useWallet();
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(kind: "approve" | "reject") {
    setBusy(true);
    try {
      let explorer: string;
      let status: string | undefined;
      if (signer.kind === "wallet") {
        const hash = await w.call(vault, kind, { payment_id: p.id });
        explorer = `https://testnet.nearblocks.io/txns/${hash}`;
      } else if (signer.kind === "local") {
        const r = kind === "approve" ? await api.approve(p.id) : await api.reject(p.id);
        explorer = r.explorer;
        status = r.payment?.status;
      } else {
        throw new Error(signer.why);
      }
      toast(
        <span>
          Payment #{p.id} {status === "Executed" ? "approved and paid" : kind === "approve" ? "approved" : "rejected"}
          {signer.kind === "wallet" ? " with your wallet" : ""}.{" "}
          <a href={explorer} target="_blank" rel="noreferrer">
            View transaction
          </a>
        </span>,
      );
      // The payout lands a block or two after the approval.
      setTimeout(onDone, signer.kind === "wallet" ? 2500 : 0);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="card scenario running" style={{ borderLeftColor: "var(--warn)" }}>
      <div className="scenario-head">
        <div>
          <Badge d={p.decision} />
          <h3 style={{ marginTop: 10 }}>
            #{p.id} · {formatAsset(p.amount, p.asset)}
          </h3>
          <AccountLink id={p.recipient} />
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            {timeAgo(p.created_at_ms)} · memo: {p.memo ?? "none"} · Notara report <span className="mono">{p.report_hash.slice(0, 12)}…</span>
          </p>
        </div>
      </div>
      {confirm ? (
        <div className="banner warn" style={{ marginTop: 14 }}>
          <div>
            <p style={{ fontWeight: 700 }}>
              {confirm === "approve" ? `Pay ${formatAsset(p.amount, p.asset)} to this account?` : "Reject this payment?"}
            </p>
            <p className="small">
              {confirm === "approve"
                ? "Notara flagged this payment for a human. The vault will re-check its daily cap before paying."
                : "The money stays in the vault. The agent can't retry this payment."}{" "}
              {signer.kind === "wallet" ? `Your wallet (${signer.accountId}) will ask you to sign.` : signer.kind === "local" ? "Signed by the local demo owner key." : ""}
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className={confirm === "approve" ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"} onClick={() => act(confirm)} disabled={busy}>
                {busy && <LoaderCircle size={14} className="spin" aria-hidden />} Yes, {confirm}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setConfirm("approve")} aria-label={`Approve payment ${p.id}`}>
            <Check size={14} aria-hidden /> Approve
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm("reject")} aria-label={`Reject payment ${p.id}`}>
            <X size={14} aria-hidden /> Reject
          </button>
          <a className="btn btn-secondary btn-sm" href={`/check?account=${encodeURIComponent(p.recipient)}&amount=${unitsToDecimal(p.amount, p.asset)}&asset=${p.asset === "NEAR" ? "NEAR" : "USDC"}&network=testnet`}>
            Re-check recipient
          </a>
        </div>
      )}
    </div>
  );
}

export function VaultPage() {
  const { dep } = useDeployment();
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  // ?vault= shows a visitor's own vault (made on the Security page) instead of the main demo vault.
  const vaultParam = new URLSearchParams(useLocation().search).get("vault") ?? undefined;
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.vault(vaultParam), api.payments(vaultParam)]);
      setSummary(s);
      setPayments(p.payments);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vaultParam]);

  useEffect(() => {
    if (dep?.deployed) load();
  }, [dep?.deployed, load]);

  const signer = useSigner(summary);
  if (!dep?.deployed) return <NotDeployedPage />;

  const cap = summary?.config.caps.NEAR;
  const spentPct = cap ? Math.min(100, Number((BigInt(summary!.spentTodayYocto) * 100n) / BigInt(cap.daily))) : 0;
  const usdcPct =
    summary?.usdc.dailyUnits && BigInt(summary.usdc.dailyUnits) > 0n
      ? Math.min(100, Number((BigInt(summary.usdc.spentTodayUnits) * 100n) / BigInt(summary.usdc.dailyUnits)))
      : 0;
  const pending = payments?.filter((p) => p.status === "PendingApproval") ?? [];
  const shown = payments?.filter((p) => filter === "all" || p.status === filter) ?? [];

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1>Vault</h1>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} aria-hidden /> Refresh
          </button>
        </div>
        <p>
          The smart contract that holds the agent's money. It pays only with a valid Notara verdict, within these limits, and holds WARN payments for you.
        </p>
        {summary && <AccountLink id={summary.vault} />}
      </div>

      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}

      {!summary ? (
        <Skeleton lines={4} />
      ) : (
        <div className="grid-4">
          <div className="card stat">
            <div className="label">Balance</div>
            <div className="value">{summary.balanceNear} NEAR</div>
            <div className="muted small">includes contract storage</div>
          </div>
          <div className="card stat">
            <div className="label">Per-payment cap</div>
            <div className="value">{nearAmount(cap?.per_tx)} NEAR</div>
          </div>
          <div className="card stat">
            <div className="label">Daily cap</div>
            <div className="value">{nearAmount(cap?.daily)} NEAR</div>
          </div>
          <div className="card stat">
            <div className="label">Spent today</div>
            <div className="value">{summary.spentTodayNear} NEAR</div>
            <div className="progress" aria-label={`${spentPct}% of daily cap used`}>
              <span style={{ width: `${spentPct}%` }} />
            </div>
          </div>
        </div>
      )}
      {summary &&
        (summary.usdc.enabled ? (
          <div className="grid-4" style={{ marginTop: 16 }}>
            <div className="card stat">
              <div className="label">USDC balance</div>
              <div className="value">{summary.usdc.balance} USDC</div>
              <div className="muted small">Circle testnet USDC</div>
            </div>
            <div className="card stat">
              <div className="label">USDC per-payment cap</div>
              <div className="value">{summary.usdc.perTx} USDC</div>
            </div>
            <div className="card stat">
              <div className="label">USDC daily cap</div>
              <div className="value">{summary.usdc.daily} USDC</div>
            </div>
            <div className="card stat">
              <div className="label">USDC spent today</div>
              <div className="value">{summary.usdc.spentToday} USDC</div>
              <div className="progress" aria-label={`${usdcPct}% of USDC daily cap used`}>
                <span style={{ width: `${usdcPct}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <p className="muted small" style={{ marginTop: 12 }}>
            {vaultParam ? "This vault pays in test NEAR." : <>USDC isn't enabled on this vault yet. Run <code>npm run owner -- enable-usdc</code>.</>}
          </p>
        ))}
      {summary?.usdc.enabled && summary.usdc.balance === "0" && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="warn" title="The vault has no USDC yet">
            <p>
              Get testnet USDC at{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
                faucet.circle.com
              </a>{" "}
              (network: NEAR testnet, address: <span className="mono">{summary.config.owner}</span>), then run{" "}
              <code>npm run owner -- fund-usdc 15</code>. Until then, USDC payments fail safely and the vault releases the cap.
            </p>
          </Banner>
        </div>
      )}
      {summary?.config.paused && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="warn" title="Vault is paused">
            <p>No payments or approvals until the owner unpauses it.</p>
          </Banner>
        </div>
      )}

      {summary && <OwnerPanel summary={summary} onChange={load} />}

      <section>
        <h2>Waiting for your approval</h2>
        {payments === null ? (
          <Skeleton />
        ) : pending.length === 0 ? (
          <p className="muted">Nothing is waiting. WARN payments from the agent show up here.</p>
        ) : (
          <div className="stack">
            {pending.map((p) => (
              <PendingCard key={p.id} p={p} onDone={load} signer={signer} vault={summary?.vault ?? ""} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>All payments</h2>
          <select className="input" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_TEXT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {payments === null ? (
          <Skeleton />
        ) : shown.length === 0 ? (
          <p className="muted">No payments yet. Run the attack demo or pay an invoice to create some.</p>
        ) : (
          <div className="table-wrap stack-mobile">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Verdict</th>
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
                      <AccountLink id={p.recipient} />
                    </td>
                    <td data-label="Amount">
                      {formatAsset(p.amount, p.asset)}
                    </td>
                    <td data-label="Verdict">
                      <Badge d={p.decision} />
                    </td>
                    <td data-label="Status" className={p.status === "Executed" ? "status-ok" : p.status === "Failed" || p.status === "Rejected" ? "status-error" : ""}>
                      {STATUS_TEXT[p.status]}
                    </td>
                    <td data-label="Memo" className="small muted">
                      {p.memo ?? ""}
                    </td>
                    <td data-label="When" className="small muted">
                      {timeAgo(p.created_at_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ marginTop: 12 }}>
          The agent never holds the owner key. Approvals are signed by the owner's own NEAR wallet when it's connected, or by the local demo owner key
          before ownership has been handed to a wallet.
        </p>
      </section>
    </>
  );
}

function NotDeployedPage() {
  return (
    <>
      <div className="page-head">
        <h1>Vault</h1>
      </div>
      <NotDeployed />
    </>
  );
}

/** Who owns the vault, and the two-step handover to the human's own wallet. */
function OwnerPanel({ summary, onChange }: { summary: VaultSummary; onChange: () => void }) {
  const w = useWallet();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const owner = summary.config.owner;
  const isOwner = !!w.accountId && w.accountId === owner;
  const isPending = !!w.accountId && w.accountId === summary.pendingOwner;

  async function run(fn: () => Promise<string>, done: string) {
    setBusy(true);
    try {
      const link = await fn();
      toast(
        <span>
          {done}{" "}
          {link && (
            <a href={link} target="_blank" rel="noreferrer">
              View transaction
            </a>
          )}
        </span>,
      );
      setTimeout(onChange, 2500);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Who approves payments</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Owner: <AccountLink id={owner} />
              {summary.pendingOwner && (
                <>
                  {" "}
                  · handover pending to <span className="mono">{summary.pendingOwner}</span>
                </>
              )}
            </p>
          </div>
          {isOwner ? (
            <span className="badge ALLOW">
              <Wallet size={14} aria-hidden /> Your wallet is the owner
            </span>
          ) : summary.localOwnerKey ? (
            <span className="badge NEUTRAL">Local demo owner key</span>
          ) : null}
        </div>

        <div style={{ marginTop: 14 }}>
          {!w.accountId ? (
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => w.connect(undefined, "testnet")} disabled={!w.ready || w.busy}>
                <Wallet size={14} aria-hidden /> Connect NEAR wallet
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => w.connect(EVM_WALLET_ID, "testnet")} disabled={!w.ready || w.busy}>
                <Wallet size={14} aria-hidden /> Connect EVM wallet (MetaMask)
              </button>
              <span className="muted small">
                NEAR testnet wallets (Meteor, Intear…) or an Ethereum wallet. EVM wallets sign NEAR transactions through evm-on-near.dev and get a NEAR
                account derived from your 0x address.
              </span>
            </div>
          ) : isOwner ? (
            <p className="small" style={{ margin: 0 }}>
              Approvals and rejections below are signed in your wallet. Nobody else, including this server, can approve.
            </p>
          ) : isPending ? (
            <div className="row">
              <button
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() =>
                  run(async () => `https://testnet.nearblocks.io/txns/${await w.call(summary.vault, "accept_owner", {}, 30)}`, "You are now the vault owner.")
                }
              >
                {busy && <LoaderCircle size={14} className="spin" aria-hidden />} Accept ownership (step 2 of 2)
              </button>
              <span className="muted small">Signed in your wallet. After this, the local demo key can no longer approve.</span>
            </div>
          ) : summary.localOwnerKey ? (
            <div className="row">
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => run(async () => (await api.proposeOwner(w.accountId!)).explorer, `Handover proposed to ${w.accountId}. Now accept it.`)}
              >
                {busy && <LoaderCircle size={14} className="spin" aria-hidden />} Hand the vault to {w.accountId} (step 1 of 2)
              </button>
              <span className="muted small">The current owner proposes; your wallet then accepts. A typo can't lock the vault.</span>
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              {w.accountId} is not the owner. Connect {owner} to approve payments.
            </p>
          )}
        </div>
        {w.error && (
          <p className="err small" style={{ marginTop: 8 }}>
            {w.error}
          </p>
        )}
      </div>
    </section>
  );
}
