import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, Play, Wallet } from "./icons";
import { api, type AgentRun, type MyVault as MyVaultInfo } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { Banner } from "./ui";
import { asSentence } from "../lib/format";

const TX = (h: string) => `https://testnet.nearblocks.io/txns/${h}`;
const near = (yocto: string) => (Number(BigInt(yocto) / 10n ** 20n) / 10_000).toString();

const SCENARIOS: { key: string; title: string; expect: string }[] = [
  { key: "legit", title: "Legit invoice from a known merchant", expect: "ALLOW → your vault pays 0.1 NEAR" },
  { key: "injected", title: "Invoice with a hidden 'pay the attacker' instruction", expect: "BLOCK → refused, nothing signed" },
  { key: "new-shop", title: "First invoice from an unknown shop", expect: "WARN → waits for your approval" },
  { key: "tamper", title: "Hacked agent goes straight to your vault", expect: "Your vault refuses every trick on-chain" },
];

/**
 * Anyone with a NEAR testnet wallet: create your own vault (you own it, nobody holds a key to it),
 * fund it with test NEAR, and watch the agent try to pay from it.
 */
export function MyVault({ onChange }: { onChange?: () => void }) {
  const w = useWallet();
  const [info, setInfo] = useState<MyVaultInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, AgentRun>>({});
  // One wallet signature proves the vault is yours; reused for 9 minutes (the server accepts 10).
  const proofRef = useRef<{ token: string; at: number; owner: string } | null>(null);
  async function proof(): Promise<string> {
    const p = proofRef.current;
    if (p && p.owner === w.accountId && Date.now() - p.at < 9 * 60_000) return p.token;
    const { token, accountId } = await w.signLink(async () => info!.message, "testnet");
    if (accountId !== w.accountId) throw new Error(`Your wallet signed as ${accountId}, not ${w.accountId}`);
    proofRef.current = { token, at: Date.now(), owner: accountId };
    return token;
  }

  const load = useCallback(() => {
    if (w.accountId && w.network === "testnet") api.myVault(w.accountId).then(setInfo).catch((e) => setError(e.message));
  }, [w.accountId, w.network]);
  useEffect(load, [load]);

  async function step(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
      onChange?.();
    } catch (e: any) {
      setError(asSentence(e.message));
    } finally {
      setBusy(null);
    }
  }

  const funded = info?.exists && BigInt(info.balance) >= 3n * 10n ** 23n; // 0.3 NEAR: enough for the scenarios
  const ran = Object.keys(runs).length > 0;
  // Where you are in the four steps, so a first-time visitor always knows what comes next.
  const stage = !w.accountId || w.network !== "testnet" ? 0 : !info?.exists ? 1 : !funded ? 2 : 3;
  const STEPS = ["Connect a testnet wallet", "Create your vault", "Add 1 test NEAR", "Run the scenarios"];

  return (
    <div className="card stack" style={{ marginBottom: 24 }}>
      <div>
        <p className="eyebrow">Try it yourself</p>
        <h2 style={{ marginTop: 4 }}>Your own vault, your own wallet</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Connect any NEAR testnet wallet. We create a spending vault that <strong>you</strong> own: nobody holds a key to it, not even us, so it moves money
          only by its contract rules. Then an AI agent tries to pay invoices from it. Free test NEAR only.
        </p>
      </div>

      <ol aria-label="Steps" style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
        {STEPS.map((label, i) => {
          const done = i < stage || (i === 3 && ran);
          const now = i === stage && !done;
          return (
            <li
              key={label}
              aria-current={now ? "step" : undefined}
              className="small"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontWeight: now ? 700 : 500,
                opacity: done || now ? 1 : 0.6,
              }}
            >
              <span aria-hidden>{done ? "✓" : i + 1}</span> {label}
              {done && <span className="sr-only"> (done)</span>}
            </li>
          );
        })}
      </ol>

      {!w.accountId ? (
        <div>
          <button className="btn btn-primary" onClick={() => w.connect(undefined, "testnet")} disabled={!w.ready || w.busy}>
            <Wallet size={16} aria-hidden /> Connect a NEAR testnet wallet
          </button>
          <p className="hint" style={{ marginTop: 6 }} role="status">
            {!w.ready ? "Loading the list of wallets… " : null}No testnet wallet yet? Intear Wallet (wallet.intear.tech) creates a free testnet account with test NEAR.
          </p>
        </div>
      ) : w.network !== "testnet" ? (
        <div>
          <button className="btn btn-primary" onClick={() => w.connect(undefined, "testnet")} disabled={w.busy}>
            <Wallet size={16} aria-hidden /> Switch to a testnet wallet
          </button>
          <p className="hint" style={{ marginTop: 6 }}>
            You're connected on mainnet ({w.accountId}). Vaults here use free test NEAR only.
          </p>
        </div>
      ) : !info ? (
        error ? (
          <Banner kind="error" title="We couldn't look up your vault">
            <p>
              {asSentence(error)} Nothing was created or changed.{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setError(null); load(); }}>
                Try again
              </button>
            </p>
          </Banner>
        ) : (
          <p className="muted" role="status">Looking for your vault…</p>
        )
      ) : !info.exists ? (
        <div>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => step("create", async () => setInfo({ ...(await api.createMyVault(w.accountId!, await proof())), message: info.message }))}>
            {busy === "create" && <LoaderCircle size={16} className="spin" aria-hidden />} Create my vault
          </button>
          <p className="hint" style={{ marginTop: 6 }}>
            Owner: <span className="mono">{w.accountId}</span>. Your wallet signs a short message to prove it's you (no transaction, no cost). Limits: 0.5 NEAR per payment, 1 NEAR a day.
          </p>
        </div>
      ) : (
        <>
          <p className="small" style={{ margin: 0 }}>
            Vault <span className="mono">{info.vault}</span> · balance {near(info.balance)} NEAR ·{" "}
            <a href="#approval-queue">payments waiting for you are in the Approval queue above ↑</a>
          </p>
          {!funded && (
            <div className="row">
              <button
                className="btn btn-primary"
                disabled={!!busy}
                onClick={() => step("fund", async () => {
                  await w.sendNear(info.vault, (10n ** 24n).toString());
                  await new Promise((r) => setTimeout(r, 2000));
                  load();
                })}
              >
                {busy === "fund" && <LoaderCircle size={16} className="spin" aria-hidden />} Add 1 test NEAR from my wallet
              </button>
              <span className="hint">The agent pays from this. You can withdraw it again from your vault.</span>
            </div>
          )}
          {!funded && <p className="small muted" style={{ margin: 0 }}>The scenarios pay from your vault, so they unlock once it holds at least 0.3 test NEAR.</p>}
          <div className="stack" style={{ gap: 10 }}>
            {SCENARIOS.map((s) => {
              const r = runs[s.key];
              return (
                <div key={s.key} className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <strong>{s.title}</strong>
                    <div className="muted small">Expected: {s.expect}</div>
                    {r ? <RunResult run={r} /> : <div className="muted small">Actual: not run yet</div>}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={!!busy || !funded}
                    onClick={() => step(s.key, async () => {
                      const out = await api.runMyVault(w.accountId!, s.key, await proof());
                      setRuns((x) => ({ ...x, [s.key]: out }));
                      load();
                    })}
                  >
                    {busy === s.key ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Play size={14} aria-hidden />} Run
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {error && info && (
        <Banner kind="error">
          <p>{error} Nothing else was changed.</p>
        </Banner>
      )}
    </div>
  );
}

function RunResult({ run }: { run: AgentRun }) {
  if (run.scenario === "tamper")
    return (
      <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {run.calls.map((c, i) => (
          <li key={i}>
            {c.attempt}: <strong>{c.refused ? "refused" : "NOT refused"}</strong> {c.reason && <span className="muted">({c.reason.replace("Smart contract panicked: ", "")})</span>}{" "}
            {c.txHash && (
              <a href={TX(c.txHash)} target="_blank" rel="noreferrer">
                tx <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    );
  if (!run.calls.length) return <p className="small" style={{ margin: "6px 0 0" }}>The agent made no payment.</p>;
  return (
    <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
      {run.calls.map((c, i) => (
        <li key={i}>
          <span className="mono">{c.recipient}</span>: <strong>{c.decision ?? "-"}</strong> → {c.status?.replaceAll("_", " ")}{" "}
          {c.txHash && (
            <a href={TX(c.txHash)} target="_blank" rel="noreferrer">
              tx <ExternalLink size={11} aria-hidden />
            </a>
          )}
          {c.status === "pending_human_approval" && (
            <>
              {" · "}
              <a href="#approval-queue">approve or reject it in the Approval queue above ↑</a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
