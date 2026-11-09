import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bot, CircleCheck, Globe, Link2, Lock, Search, Send, ShieldCheck, Wallet } from "../components/icons";
import { Badge } from "../components/ui";
import { ExpandGroup, TrustList } from "../components/landing";

const STEPS = [
  { title: "Create a link", text: "Priya, a freelance designer, asks for 50 USDC for a logo. Her NEAR wallet signs the link." },
  { title: "Share it anywhere", text: "WhatsApp, email or an invoice PDF. Neither side needs to know crypto." },
  { title: "The client checks, then pays", text: "They see it's really Priya, then pay with the wallet and chain they already use." },
  { title: "Priya gets USDC on NEAR", text: "The exact amount, seconds to a minute later, with a receipt and a CSV for her accountant." },
];

const CHAINS = ["Ethereum", "Base", "Arbitrum", "Solana", "Bitcoin", "BNB Chain", "Polygon", "NEAR"];

const TRUST = [
  {
    icon: <BadgeCheck size={28} aria-hidden />,
    title: "Signed by the merchant's wallet",
    body: "Who gets paid, how much and for what are signed with NEAR's message-signing standard (NEP-413). Change one character and the link shows a warning.",
    panel: (
      <>
        <h4>What the merchant's wallet signs</h4>
        <pre className="doc" style={{ margin: 0 }}>
          {"Notara payment link\nPay to: priya.testnet\nAmount: 50 USDC\nFor: Logo design, 2 rounds"}
        </pre>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          The customer's page checks this signature against the account's keys on NEAR before showing "Signed".
        </p>
      </>
    ),
  },
  {
    icon: <Globe size={28} aria-hidden />,
    title: "A website they can prove",
    body: "A merchant publishes their NEAR account on their own website. Customers then see the real business behind the account, not just a name.",
    panel: (
      <>
        <h4>The proof file on the merchant's site</h4>
        <div className="doc" style={{ margin: 0 }}>
          <span className="muted">https://priya-studio.example/.well-known/near.txt</span>
          {"\n\npriya.testnet"}
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Anyone can ask Notara to re-check it. The file is the proof, so nobody can claim a site they don't control.
        </p>
      </>
    ),
  },
  {
    icon: <ShieldCheck size={28} aria-hidden />,
    title: "A safety check before every payment",
    body: "Account age, activity, contract changes and shared scam reports, read live from NEAR and explained in plain words. Facts, never a promise.",
    panel: (
      <>
        <h4>What a customer sees</h4>
        <div className="card flat" style={{ borderLeft: "5px solid var(--allow)" }}>
          <Badge d="ALLOW" size="lg" />
          <p style={{ margin: "10px 0 0", fontWeight: 650 }}>No configured policy rule was broken.</p>
          <p className="small muted" style={{ margin: "4px 0 0" }}>This is not a guarantee. Every signal shows its source and when it was read.</p>
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          If a data source can't be reached, the answer is never "allow": a human has to approve.
        </p>
      </>
    ),
  },
];

const FAQ = [
  {
    title: "Does Notara ever hold my money?",
    body: (
      <p>
        No. Payments go from the customer's wallet to the merchant's account. Cross-chain payments are routed by NEAR Intents, which delivers USDC to the
        merchant on NEAR.
      </p>
    ),
  },
  {
    title: "What can I try for free?",
    body: (
      <p>
        Everything except paying from another chain: payment links, wallet payments, send links, scam reports and the AI-agent vault all run on NEAR testnet
        with free test money. NEAR Intents has no testnet, so cross-chain payments are mainnet only and marked with a mainnet badge.
      </p>
    ),
  },
  {
    title: "Does a safety check mean the merchant is honest?",
    body: (
      <p>
        No. It states facts about an account: its age, activity, code changes and verified scam reports. A verified person can still be dishonest.{" "}
        <Link to="/about">Read the honest limits.</Link>
      </p>
    ),
  },
  {
    title: "Is it audited?",
    body: <p>No. It's a hackathon prototype. Keep mainnet amounts small.</p>,
  },
];

/** Customers usually arrive from a link; this lets someone paste one they were sent. */
function OpenLink() {
  const nav = useNavigate();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function go(e: FormEvent) {
    e.preventDefault();
    const m = v.trim().match(/\/(pay|claim)\/([A-Za-z0-9-]+)(#.*)?/) ?? v.trim().match(/^()(INV-\d+)$/i);
    if (!m) return setErr("Paste the whole link, like https://…/pay/INV-0042");
    nav(`/${m[1] || "pay"}/${m[2].toUpperCase()}${m[3] ?? ""}`);
  }
  return (
    <form onSubmit={go} className="stack" style={{ gap: 6, marginTop: "auto" }} noValidate>
      <label htmlFor="open-link" className="sr-only">
        Payment or send link
      </label>
      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
        <input id="open-link" className="input" style={{ minHeight: 40 }} placeholder="Paste the link" value={v} onChange={(e) => (setV(e.target.value), setErr(null))} aria-invalid={!!err} aria-describedby={err ? "open-link-err" : undefined} />
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 40 }}>
          Open
        </button>
      </div>
      {err && (
        <span id="open-link-err" className="err">
          {err}
        </span>
      )}
    </form>
  );
}

function Roles() {
  return (
    <section aria-labelledby="roles-h" style={{ marginTop: 8 }}>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <h2 id="roles-h">What do you want to do?</h2>
      </div>
      <div className="roles">
        <Link to="/invoices" className="role">
          <span className="ic" aria-hidden>
            <Link2 size={20} />
          </span>
          <strong>Get paid</strong>
          <span className="d">For freelancers and shops. Make a link your wallet signs, share it, receive USDC.</span>
          <span className="go">
            Create a payment link <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
        <div className="role">
          <span className="ic" aria-hidden>
            <Wallet size={20} />
          </span>
          <strong>Pay a link you got</strong>
          <span className="d">Someone sent you a Notara link? Open it to see who's asking and pay from your wallet.</span>
          <OpenLink />
        </div>
        <Link to="/send" className="role">
          <span className="ic" aria-hidden>
            <Send size={20} />
          </span>
          <strong>Send money</strong>
          <span className="d">Send USDC to anyone with a link. They don't need a wallet or any NEAR to claim it.</span>
          <span className="go">
            Send by link <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
        <Link to="/security" className="role">
          <span className="ic" aria-hidden>
            <Bot size={20} />
          </span>
          <strong>Protect an AI agent</strong>
          <span className="d">For agent owners and builders. A vault that pays only after a signed check, within your limits.</span>
          <span className="go">
            See it stop an attack <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
      </div>
      <div className="judge-strip">
        <p>Judging or just curious? Try every flow in about 10 minutes, with free test money.</p>
        <div className="row">
          <Link to="/start" className="btn btn-primary btn-sm">
            Start the testnet tour <ArrowRight size={14} className="arrow" aria-hidden />
          </Link>
          <Link to="/check" className="btn btn-ghost btn-sm">
            <Search size={14} aria-hidden /> Check an account
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The real pay page, as a customer sees it, framed as an example link. */
function PayPreview() {
  return (
    <figure className="preview" style={{ margin: 0 }} aria-label="Example of a Notara payment link page">
      <div className="preview-frame">
        <div className="preview-bar" aria-hidden>
          <Lock size={13} />
          <span className="url">notara-sable.vercel.app/pay/42</span>
        </div>
        <div className="preview-sheet">
          <p className="small muted" style={{ margin: 0 }}>
            Logo design, 2 rounds
          </p>
          <div className="amount num">50 USDC</div>
          <p className="small" style={{ margin: "4px 0 0" }}>
            to <span className="mono">priya.testnet</span>
          </p>
          <div className="preview-check">
            <div>
              <CircleCheck size={16} aria-hidden /> Signed by this account's wallet
            </div>
            <div>
              <CircleCheck size={16} aria-hidden /> Website proven: priya-studio.example
            </div>
            <div>
              <Badge d="ALLOW" /> <span className="muted small">No policy rule broken</span>
            </div>
          </div>
          <div className="preview-pay" aria-hidden>
            {/* A picture of the pay page, not controls: quieter than the hero's real button, and not clickable. */}
            <span className="btn btn-tonal btn-sm preview-btn" aria-hidden>
              Pay with NEAR wallet
            </span>
            <span className="btn btn-secondary btn-sm preview-btn" aria-hidden>
              From another chain
            </span>
          </div>
        </div>
      </div>
      <figcaption className="preview-caption">
        <BadgeCheck size={16} aria-hidden /> Example link
      </figcaption>
    </figure>
  );
}

export function Home() {
  return (
    <div className="landing">
      <section className="hero">
        <div>
          <h1>Payment links people can trust.</h1>
          <p className="lede">
            Get paid in USDC from any chain, and let your customer see it's really you before they pay. Or send money to anyone with just a link, even if
            they've never used crypto.
          </p>
          <div className="hero-actions">
            <Link to="/invoices" className="btn btn-primary btn-lg">
              <Link2 size={18} aria-hidden /> Create a payment link
            </Link>
            <Link to="/send" className="btn btn-secondary btn-lg">
              <Send size={18} aria-hidden /> Send money
            </Link>
          </div>
          <p className="hero-foot">
            <CircleCheck size={16} aria-hidden />
            <span>Free to try on NEAR testnet with any NEAR wallet. Only paying from other chains needs mainnet.</span>
          </p>
        </div>
        <PayPreview />
      </section>

      <Roles />

      <section>
        <div className="section-head">
          <h2>From request to receipt in four steps</h2>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="trust-band">
        <div className="section-head">
          <h2>Why a customer can trust a Notara link</h2>
          <p>Three checks run before anyone pays. Each one shows where its answer came from.</p>
        </div>
        <TrustList items={TRUST} />
      </section>

      <section>
        <div className="paths">
          <div className="path sage">
            <h3>Pay with what you already have</h3>
            <p>
              Routed by NEAR Intents: the customer pays from their own chain, the merchant receives exact USDC on NEAR, and Notara never holds the money.
            </p>
            <div className="chain-row" aria-label="Chains a customer can pay from">
              {CHAINS.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
          <div className="path">
            <h3>Send money with a link</h3>
            <p>Fund a link, share it, and whoever opens it claims USDC on NEAR. Account setup and gas are covered, so they need no NEAR to start.</p>
            <div className="row">
              <Link to="/send" className="btn btn-tonal">
                Send by link <ArrowRight size={16} className="arrow" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
        <div className="path" style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
          <span className="card-icon" style={{ margin: 0 }}>
            <Bot size={22} aria-hidden />
          </span>
          <div style={{ flex: "1 1 320px" }}>
            <h3>Safe for AI agents that pay bills</h3>
            <p>Even a hacked agent can't move money: a NEAR vault contract pays only with a valid, signed check, within the owner's limits.</p>
          </div>
          <Link to="/security" className="btn btn-primary">
            Watch the attack demo <ArrowRight size={16} className="arrow" aria-hidden />
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 860 }}>
        <div className="section-head">
          <h2>Questions before you try it</h2>
        </div>
        <ExpandGroup items={FAQ} />
      </section>
    </div>
  );
}
