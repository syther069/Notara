import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, type Invoice, type MyVault } from "../lib/api";
import { ftBalance, useWallet } from "../lib/wallet";
import { formatAsset, USDC_TESTNET } from "../lib/format";
import { ArrowRight, ExternalLink, Wallet } from "../components/icons";

/**
 * How we know a step is done. "seen": real data shows it (wallet, balance, your links, your vault).
 * "ticked": the visitor says so, because the site can't observe it. "unknown": we couldn't check.
 */
type Proof = "seen" | "ticked" | "todo" | "unknown";

interface Step {
  id: string;
  title: string;
  body: ReactNode;
  proof: Proof;
  /** Steps the site can't observe can be ticked by hand. */
  manual?: boolean;
  actions: ReactNode;
}

/** Hand-ticked steps are remembered per account in this browser only. */
const tickKey = (account: string, id: string) => `start-tick:${account}:${id}`;
const readTick = (account: string | null, id: string) => {
  if (!account) return false;
  try {
    return localStorage.getItem(tickKey(account, id)) === "1";
  } catch {
    return false;
  }
};

/**
 * The guided tour for judges and first-time visitors: every flow on free testnet money, in order.
 * A step counts as done only when real data shows it, or when the visitor ticks a step we can't see.
 */
export function StartPage() {
  const w = useWallet();
  const onTestnet = !!w.accountId && w.network === "testnet";
  const account = onTestnet ? w.accountId : null;
  const [links, setLinks] = useState<Invoice[] | null>(null);
  const [vault, setVault] = useState<MyVault | null>(null);
  const [usdc, setUsdc] = useState<bigint | null | undefined>(undefined); // undefined: checking, null: couldn't check
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});

  const refresh = useCallback(() => {
    setLinks(null);
    setVault(null);
    setUsdc(undefined);
    setCheckErr(null);
    if (!account) return;
    api
      .invoices(account)
      .then((r) => setLinks(r.invoices.filter((i) => i.merchant === account && i.kind !== "send")))
      .catch((e) => setCheckErr(e.message));
    api
      .myVault(account)
      .then(setVault)
      .catch((e) => setCheckErr(e.message));
    ftBalance("testnet", USDC_TESTNET, account).then(setUsdc);
  }, [account]);
  useEffect(refresh, [refresh]);
  useEffect(() => setTicks({ send: readTick(account, "send") }), [account]);

  const tick = (id: string, on: boolean) => {
    if (!account) return;
    setTicks((t) => ({ ...t, [id]: on }));
    try {
      localStorage.setItem(tickKey(account, id), on ? "1" : "0");
    } catch {}
  };

  // Before a wallet is connected (or while a lookup failed) we can't say a step isn't done.
  const known = (done: boolean | undefined): Proof => (!account || done === undefined ? "unknown" : done ? "seen" : "todo");
  const unpaid = links?.find((l) => l.status === "unpaid");
  const steps: Step[] = [
    {
      id: "wallet",
      title: "Connect a NEAR testnet wallet",
      proof: onTestnet ? "seen" : "todo",
      body: w.accountId && !onTestnet ? (
        <>
          You're connected on mainnet as <span className="mono">{w.accountId}</span>. This tour uses testnet, so switch networks.
        </>
      ) : onTestnet ? (
        <>
          Connected as <span className="mono">{w.accountId}</span>.
        </>
      ) : (
        <>No wallet yet? Intear Wallet (wallet.intear.tech) creates a free testnet account in a minute.</>
      ),
      actions: !onTestnet && (
        <>
          <button className="btn btn-primary btn-sm" onClick={() => w.connect(undefined, "testnet")} disabled={!w.ready || w.busy} aria-describedby="wallet-why">
            <Wallet size={15} aria-hidden /> {w.accountId ? "Switch to testnet" : "Connect testnet wallet"}
          </button>
          {(!w.ready || w.busy) && (
            <span className="small muted" id="wallet-why" role="status">
              {w.busy ? "Waiting for your wallet…" : "Loading the list of wallets…"}
            </span>
          )}
          {w.ready && !w.busy && w.error && (
            <span className="small err" id="wallet-why" role="alert">
              {w.error}{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => location.reload()}>
                Reload
              </button>
            </span>
          )}
        </>
      ),
    },
    {
      id: "funds",
      title: "Get free test money",
      proof: !account ? "unknown" : usdc === undefined || usdc === null ? "unknown" : usdc > 0n ? "seen" : "todo",
      body: (
        <>
          Testnet NEAR for gas comes from your wallet's faucet. Test USDC comes from Circle's faucet: pick <strong>NEAR testnet</strong> and paste your account.{" "}
          {account && usdc !== undefined && (
            <strong>{usdc === null ? "We couldn't read your test USDC balance just now." : `You have ${formatAsset(usdc.toString(), USDC_TESTNET)}.`}</strong>
          )}
        </>
      ),
      actions: (
        <a className="btn btn-secondary btn-sm" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
          Open USDC faucet <ExternalLink size={13} aria-hidden />
        </a>
      ),
    },
    {
      id: "link",
      title: "Create a payment link signed by your wallet",
      proof: known(links ? links.length > 0 : undefined),
      body: links?.length ? (
        <>
          You have {links.length} link{links.length > 1 ? "s" : ""}.
        </>
      ) : (
        <>Ask for a few test USDC. Your wallet signs who gets paid, how much and for what.</>
      ),
      actions: (
        <Link className="btn btn-secondary btn-sm" to="/invoices">
          Get paid <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      id: "pay",
      title: "Get one of your links paid",
      proof: known(links ? links.some((l) => l.status === "paid") : undefined),
      body: <>Open your link as a customer would: read the safety check, then pay. A second testnet account makes this a real test.</>,
      actions: (
        <Link className="btn btn-secondary btn-sm" to={unpaid ? `/pay/${unpaid.id}` : "/invoices"}>
          {unpaid ? "Open my unpaid link" : "Create one first"} <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      id: "send",
      title: "Send money with a link",
      manual: true,
      proof: !account ? "unknown" : ticks.send ? "ticked" : "todo",
      body: (
        <>
          Fund a send link with test USDC, then open it in another browser and claim it. Send links belong to a one-time account, not your wallet, so we
          can't see this one for you: tick it when you've done it.
        </>
      ),
      actions: (
        <Link className="btn btn-secondary btn-sm" to="/send">
          Send by link <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      id: "vault",
      title: "Create your own AI-agent vault",
      proof: known(vault ? vault.exists : undefined),
      body: vault?.exists ? (
        <>Your vault exists. Run the four scenarios: a normal bill, a prompt-injected bill, an unknown shop and a hacked agent.</>
      ) : (
        <>Create a vault you own, add 1 test NEAR, and watch the agent get stopped by a prompt injection and by the vault itself.</>
      ),
      actions: (
        <Link className="btn btn-secondary btn-sm" to="/security">
          {vault?.exists ? "Run the scenarios" : "Create my vault"} <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
  ];

  const done = steps.filter((s) => s.proof === "seen" || s.proof === "ticked").length;
  const tickedCount = steps.filter((s) => s.proof === "ticked").length;
  const unknownCount = account ? steps.filter((s) => s.proof === "unknown").length : 0;
  const PROOF_LABEL: Record<Proof, string> = { seen: "Done, seen on testnet", ticked: "Ticked by you", todo: "To do", unknown: "Not checked" };

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div className="tags">
          <span className="tag testnet">Testnet</span>
        </div>
        <h1>Every Notara flow, on testnet</h1>
        <p>
          About 10 minutes, free test money only. Paying from another chain is the one thing testnet can't do, because NEAR Intents runs only on mainnet.
        </p>
        {/* Progress is only counted once we can check it: "0 of 6" before a wallet would read as checked. */}
        {account ? (
          <>
            <p className="small" style={{ fontWeight: 700, color: "var(--text)", margin: "20px 0 0" }} aria-live="polite">
              {done} of {steps.length} done
              {tickedCount > 0 && <span className="muted" style={{ fontWeight: 500 }}> ({tickedCount} ticked by you)</span>}
              {unknownCount > 0 && <span className="muted" style={{ fontWeight: 500 }}> · {unknownCount} not checked yet</span>}
            </p>
            <div className="progress" style={{ maxWidth: 320 }} role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Tour progress">
              <span style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
          </>
        ) : (
          <p className="small" style={{ fontWeight: 700, color: "var(--text)", margin: "20px 0 0" }}>
            Progress isn't checked yet
          </p>
        )}
        <p className="small muted" style={{ marginTop: 10 }}>
          {account
            ? "Steps tick themselves when we can see them on testnet or in your links. Ticks you add are kept in this browser only."
            : "Connect a testnet wallet so we can check your progress. Until then, nothing below is marked done."}
        </p>
        {checkErr && (
          <p className="small" role="status">
            We couldn't check some steps ({checkErr}), so they show as unknown, not undone.{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
              Check again
            </button>
          </p>
        )}
      </div>
      <ol className="guide">
        {steps.map((s, i) => (
          <li key={s.id} className={s.proof === "seen" || s.proof === "ticked" ? "done" : ""}>
            <span className="mark" aria-hidden>
              {s.proof === "seen" || s.proof === "ticked" ? "✓" : i + 1}
            </span>
            <div>
              <h3>
                {s.title} <span className="sr-only">({PROOF_LABEL[s.proof]})</span>
              </h3>
              <span className={`proof proof--${s.proof}`} aria-hidden>
                {PROOF_LABEL[s.proof]}
              </span>
              <p>{s.body}</p>
              {s.proof === "ticked" && <p className="small muted">We can't confirm this one: it's kept in this browser only.</p>}
            </div>
            <div className="acts">
              {s.actions}
              {s.manual && account && (
                <button type="button" className="btn btn-ghost btn-sm" aria-pressed={!!ticks[s.id]} onClick={() => tick(s.id, !ticks[s.id])}>
                  {ticks[s.id] ? "Undo my tick" : "I've done this"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="small muted" style={{ marginTop: 20 }}>
        Want to read first? <Link to="/about">How it works and its limits</Link> · <Link to="/check">Check any NEAR account</Link> (read-only).
      </p>
    </div>
  );
}
