import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bot, Globe, Link2, Send, ShieldCheck } from "lucide-react";

const STEPS = [
  { n: 1, title: "Create a link", text: "Priya, a freelance designer, asks for 50 USDC for a logo. Her NEAR wallet signs the link." },
  { n: 2, title: "Share it anywhere", text: "She sends it on WhatsApp, email or an invoice. No crypto knowledge needed on either side." },
  { n: 3, title: "Client checks, then pays", text: "Her client sees it's really Priya, then pays with the wallet and chain they already use." },
  { n: 4, title: "Priya gets USDC on NEAR", text: "Exact amount, a few seconds to a minute later, with a receipt and a CSV for her accountant." },
];

const TRUST = [
  { icon: <BadgeCheck size={20} />, title: "Signed by the merchant's wallet", text: "Who gets paid, how much and for what are signed with NEAR's message-signing standard. A changed link shows a warning." },
  { icon: <Globe size={20} />, title: "Proven website", text: "Merchants can prove they own their website, so customers see the real business behind an account." },
  { icon: <ShieldCheck size={20} />, title: "A safety check before every payment", text: "Account age, activity, code changes and shared scam reports, read live from NEAR and explained in plain words." },
];

const CHAINS = ["Ethereum", "Base", "Arbitrum", "Solana", "Bitcoin", "BNB Chain", "Polygon", "NEAR", "+ more"];

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <ShieldCheck size={16} aria-hidden /> Payments on NEAR
        </div>
        <h1>Payment links people can trust.</h1>
        <p className="lede">
          Get paid in USDC from any chain, and let your customer see it's really you before they pay. Or send money to anyone with just a link, even if
          they've never used crypto.
        </p>
        <div className="row" style={{ marginTop: 24 }}>
          <Link to="/invoices" className="btn btn-primary">
            <Link2 size={16} aria-hidden /> Create a payment link
          </Link>
          <Link to="/send" className="btn btn-secondary">
            <Send size={16} aria-hidden /> Send money
          </Link>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Try every flow free on NEAR testnet: links, wallet payments, send links, scam reports and the AI agent. Only paying from other chains needs
          mainnet, because NEAR Intents has no testnet.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <div className="grid-4">
          {STEPS.map((s) => (
            <div className="card" key={s.n}>
              <div className="card-icon mono">{s.n}</div>
              <h3>{s.title}</h3>
              <p className="muted small">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Why customers can trust a Notara link</h2>
        <div className="grid-3">
          {TRUST.map((t) => (
            <div className="card" key={t.title}>
              <div className="card-icon">{t.icon}</div>
              <h3>{t.title}</h3>
              <p className="muted small">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Pay with what you already have</h2>
        <p className="muted">Routed by NEAR Intents: the customer pays from their own chain, the merchant receives exact USDC on NEAR, and we never hold the money.</p>
        <div className="chips">
          {CHAINS.map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="grid-2">
          <div className="card">
            <div className="card-icon">
              <Send size={20} aria-hidden />
            </div>
            <h3>Send money with a link</h3>
            <p className="muted">
              Pay from any chain, share the link, and the person who opens it gets USDC on NEAR. Setup and gas are covered, so they need no NEAR to start.
            </p>
            <Link to="/send">
              Send money <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="card">
            <div className="card-icon">
              <Bot size={20} aria-hidden />
            </div>
            <h3>Safe for AI agents too</h3>
            <p className="muted">
              The same check protects AI agents that pay bills. Even a hacked agent can't move money: a NEAR vault contract only pays with a valid, signed
              check.
            </p>
            <Link to="/security">
              See the attack demo <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="banner">
          <div>
            <p style={{ fontWeight: 700 }}>Honest limits</p>
            <p className="muted">
              A prototype, not audited: keep amounts small. A safety check states facts, not intentions: a verified person can still be dishonest.{" "}
              <Link to="/about">Read how it works and its limits.</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
