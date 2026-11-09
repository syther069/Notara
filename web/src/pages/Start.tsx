import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, type Invoice, type MyVault } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { ArrowRight, ExternalLink, Wallet } from "../components/icons";

interface Step {
  title: string;
  body: ReactNode;
  /** true/false when we can see it from real data; undefined when we can't check it. */
  done?: boolean;
  actions: ReactNode;
}

/**
 * The guided tour for judges and first-time visitors: every flow on free testnet money, in order.
 * A step is marked done only when real data shows it (wallet connected, your links, your vault).
 */
export function StartPage() {
  const w = useWallet();
  const onTestnet = !!w.accountId && w.network === "testnet";
  const [links, setLinks] = useState<Invoice[] | null>(null);
  const [vault, setVault] = useState<MyVault | null>(null);

  useEffect(() => {
    setLinks(null);
    setVault(null);
    if (!onTestnet) return;
    api.invoices(w.accountId!).then((r) => setLinks(r.invoices.filter((i) => i.merchant === w.accountId && i.kind !== "send"))).catch(() => setLinks([]));
    api.myVault(w.accountId!).then(setVault).catch(() => {});
  }, [onTestnet, w.accountId]);

  const unpaid = links?.find((l) => l.status === "unpaid");
  const steps: Step[] = [
    {
      title: "Connect a NEAR testnet wallet",
      done: onTestnet,
      body: w.accountId && !onTestnet ? (
        <>You're connected on mainnet as <span className="mono">{w.accountId}</span>. This tour uses testnet, so switch networks.</>
      ) : onTestnet ? (
        <>Connected as <span className="mono">{w.accountId}</span>.</>
      ) : (
        <>No wallet yet? Meteor, Intear and MyNearWallet create a free testnet account in a minute.</>
      ),
      actions: !onTestnet && (
        <button className="btn btn-primary btn-sm" onClick={() => w.connect(undefined, "testnet")} disabled={!w.ready || w.busy}>
          <Wallet size={15} aria-hidden /> {w.accountId ? "Switch to testnet" : "Connect testnet wallet"}
        </button>
      ),
    },
    {
      title: "Get free test money",
      body: (
        <>
          Testnet NEAR for gas comes from your wallet's faucet. Testnet USDC comes from Circle's faucet: pick <strong>NEAR testnet</strong> and paste your account.
          We can't see your balance here, so tick this one yourself.
        </>
      ),
      actions: (
        <a className="btn btn-secondary btn-sm" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
          Open USDC faucet <ExternalLink size={13} aria-hidden />
        </a>
      ),
    },
    {
      title: "Create a payment link signed by your wallet",
      done: links ? links.length > 0 : undefined,
      body: links?.length ? <>You have {links.length} link{links.length > 1 ? "s" : ""}.</> : <>Ask for a few test USDC. Your wallet signs who gets paid, how much and for what.</>,
      actions: (
        <Link className="btn btn-secondary btn-sm" to="/invoices">
          Get paid <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      title: "Pay a link as a customer",
      done: links ? links.some((l) => l.status === "paid") : undefined,
      body: <>Open your link the way a customer would: see the safety check, then pay with your wallet. For a real test, use a second account.</>,
      actions: (
        <Link className="btn btn-secondary btn-sm" to={unpaid ? `/pay/${unpaid.id}` : "/invoices"}>
          {unpaid ? "Open my unpaid link" : "Create one first"} <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      title: "Send money with a link",
      body: <>Fund a link with test USDC, then open it in another browser and claim it, even into a brand-new name.testnet account. Gas is covered.</>,
      actions: (
        <Link className="btn btn-secondary btn-sm" to="/send">
          Send by link <ArrowRight size={14} className="arrow" aria-hidden />
        </Link>
      ),
    },
    {
      title: "Let an AI agent try to pay from your own vault",
      done: vault ? vault.exists : undefined,
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

  const [ticked, setTicked] = useState(() => {
    try {
      return localStorage.getItem("start-faucet") === "1";
    } catch {
      return false;
    }
  });
  steps[1].done = ticked;
  steps[1].actions = (
    <>
      {steps[1].actions}
      <button
        className="btn btn-ghost btn-sm"
        aria-pressed={ticked}
        onClick={() => {
          setTicked(!ticked);
          try {
            localStorage.setItem("start-faucet", ticked ? "0" : "1");
          } catch {}
        }}
      >
        {ticked ? "Undo" : "I have test money"}
      </button>
    </>
  );
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="page-head">
        <h1>Try every flow on testnet</h1>
        <p>
          About 10 minutes, free test money only. Steps tick themselves off when we can see them on-chain or in your links. Paying from another chain is the one
          thing testnet can't do, because NEAR Intents runs only on mainnet.
        </p>
        <p className="small" style={{ fontWeight: 700, color: "var(--text)" }} aria-live="polite">
          {doneCount} of {steps.length} done
        </p>
        <div className="progress" style={{ maxWidth: 320 }}>
          <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="guide">
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? "done" : ""}>
            <span className="mark" aria-hidden>
              {s.done ? "✓" : i + 1}
            </span>
            <div>
              <h3>
                {s.title}
                {s.done && <span className="sr-only"> (done)</span>}
              </h3>
              <p>{s.body}</p>
            </div>
            <div className="acts">{s.actions}</div>
          </li>
        ))}
      </ol>
      <p className="small muted" style={{ marginTop: 20 }}>
        Want to read first? <Link to="/about">How it works and its limits</Link> · <Link to="/check">Check any NEAR account</Link> (mainnet, read-only).
      </p>
    </div>
  );
}
