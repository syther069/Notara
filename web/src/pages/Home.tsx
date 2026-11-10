import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bot, CircleCheck, CircleX, Coins, Lock, Search, Send, ShieldCheck, TriangleAlert, Wallet } from "../components/icons";

/*
  design-taste-frontend plan (tasteskill 2.5.1)
  1. kind: software (fintech: payment links paid in USDC on NEAR)
  2. deal: hero centred (deal.mjs --type software --has ui) · effect grain-gradient in the hero frame
     (effects.mjs pick, quiet, UI-safe) · moments counter-rolls + liquid-type (moments.mjs pick) ·
     nav-mega · footer-columns · close-type · rhythm space · buttons tonal · mark ring (Notara keeps its
     own seal mark, as the kit prefers a client's logo). Palette: Notara's own Notary Seal tokens, kept
     by the client (not dealt): deep green and sage on cream fits a payments product that must read calm
     and trustworthy. Type: Manrope, the client's chosen face (not dealt).
  sections, 1440x900:
   hero      the pay page a customer opens: check runs, signature shown, Paid       ui      1  hero entrance; one timed loop in the window
   product   your links beside the page each customer sees                          ui      1
   signed    what the wallet signs, and the check it passes                         ui      1
   more      send by link, account check, any-chain, agent vault (2x2)              ui      2
   settle    how a cross-chain payment settles + three real figures                 diagram 1  counter-rolls on the figures row
   statement an account check before every payment, and that check's three answers type    1  liquid-type on the headline
   faq       questions, answers open; paste a link you were sent                    -       1
   close     create a payment link: row 1 of footer.closing (Layout), one screen with the links
*/

const MAIN_ACTION = "Create a payment link";

/** The hero window's own loop: the checks arrive one by one, the link turns Paid, it holds, it plays again.
 *  The kit's motion layer (motion.js) adds the loop's pause button to the window and holds it off-screen. */
function HeroWindow() {
  return (
    <div className="ls-frame" data-fx="grain-gradient" data-fx-seed="1104">
      {/* role="img" sits on the picture inside, so the kit's pause button stays reachable */}
      <div className="ls-window hero__window" data-m-loop data-ui>
        <div className="ls-bar" aria-hidden>
          <Lock size={13} aria-hidden />
          <span className="mono">notara-sable.vercel.app/pay/INV-0042</span>
        </div>
        <div className="ls-pay" role="img" aria-label="The Notara page a customer opens: 50 USDC to design-studio.near, signed by its wallet, safety check passed, then paid">
          <div className="ls-pay__head">
            <span className="ls-pay__for">Logo design, 2 rounds</span>
            <span className="ls-status">
              <span className="ls-status__unpaid">Waiting for payment</span>
              <span className="ls-status__paid">Paid</span>
            </span>
          </div>
          <div className="ls-pay__amount num">50 USDC</div>
          <div className="ls-pay__to">
            to <span className="mono">design-studio.near</span>
          </div>
          <ul className="ls-checks">
            <li className="ls-step ls-step--1">
              <CircleCheck size={16} aria-hidden /> Signed by this account's wallet
            </li>
            <li className="ls-step ls-step--2">
              <CircleCheck size={16} aria-hidden /> Website proven: design-studio.example
            </li>
            <li className="ls-step ls-step--3">
              <CircleCheck size={16} aria-hidden /> No problems found in the account check
            </li>
          </ul>
          <div className="ls-pay__actions">
            <span className="ls-fakebtn ls-fakebtn--primary">Pay 50 USDC</span>
            <span className="ls-fakebtn">From another chain</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LINKS = [
  { id: "INV-0042", what: "Logo design, 2 rounds", amount: "50 USDC", status: "Paid", tone: "ok" },
  { id: "INV-0041", what: "Website copy, 3 pages", amount: "120 USDC", status: "Waiting", tone: "wait" },
  { id: "INV-0039", what: "Monthly retainer, October", amount: "400 USDC", status: "Paid", tone: "ok" },
  { id: "INV-0036", what: "Brand guidelines PDF", amount: "75 USDC", status: "Refunded", tone: "warn" },
];

function ProductWindow() {
  return (
    <div className="ls-window ls-app" data-ui role="img" aria-label="Notara's dashboard: four payment links with their status, and the open link as its customer sees it">
      <div className="ls-bar">
        <Lock size={13} aria-hidden />
        <span className="mono">notara-sable.vercel.app/dashboard</span>
      </div>
      <div className="ls-app__body">
        <ul className="ls-app__list">
          {LINKS.map((l, i) => (
            <li key={l.id} className={i === 0 ? "is-open" : ""}>
              <span className="ls-app__what">{l.what}</span>
              <span className="mono small muted">{l.id}</span>
              <span className="ls-app__amt num">{l.amount}</span>
              <span className={`ls-pill ls-pill--${l.tone}`}>{l.status}</span>
            </li>
          ))}
        </ul>
        <div className="ls-app__open">
          <span className="small muted">What the customer saw before paying INV-0042</span>
          <div className="ls-pay__amount num">50 USDC</div>
          <ul className="ls-checks">
            <li>
              <CircleCheck size={16} aria-hidden /> Signed by design-studio.near's wallet
            </li>
            <li>
              <CircleCheck size={16} aria-hidden /> Active on NEAR since March 2025
            </li>
            <li>
              <CircleCheck size={16} aria-hidden /> No scam reports
            </li>
          </ul>
          <div className="ls-receipt">
            <span>Paid from</span>
            <strong>USDC on Base</strong>
            <span>Received</span>
            <strong>50 USDC on NEAR</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A diagram card: chains on the left, NEAR Intents in the middle, the merchant's USDC on the right; a pulse runs each line. */
function SettleDiagram() {
  const chains = ["Ethereum", "Base", "Arbitrum", "Solana", "Bitcoin"];
  return (
    <svg className="ls-diagram" viewBox="0 0 720 300" role="img" aria-label="Customers pay from Ethereum, Base, Arbitrum, Solana or Bitcoin; NEAR Intents swaps and routes it; the merchant receives USDC on NEAR">
      {chains.map((c, i) => {
        const y = 30 + i * 60;
        return (
          <g key={c}>
            <path id={`ln-${i}`} d={`M150 ${y} C 250 ${y}, 260 150, 330 150`} className="ls-diagram__line" />
            <circle r="4" className="ls-diagram__pulse" style={{ offsetPath: `path("M150 ${y} C 250 ${y}, 260 150, 330 150")`, animationDelay: `${i * 0.35}s` }} />
            <rect x="10" y={y - 18} width="140" height="36" rx="18" className="ls-diagram__node" />
            <text x="80" y={y + 5} textAnchor="middle" className="ls-diagram__label">
              {c}
            </text>
          </g>
        );
      })}
      <path d="M470 150 L 560 150" className="ls-diagram__line" />
      <circle r="4" className="ls-diagram__pulse" style={{ offsetPath: 'path("M470 150 L 560 150")', animationDelay: "1.8s" }} />
      <rect x="330" y="112" width="140" height="76" rx="16" className="ls-diagram__hub" />
      <text x="400" y="146" textAnchor="middle" className="ls-diagram__hublabel">
        NEAR Intents
      </text>
      <text x="400" y="168" textAnchor="middle" className="ls-diagram__sub">
        swaps and routes
      </text>
      <rect x="560" y="118" width="150" height="64" rx="16" className="ls-diagram__node ls-diagram__node--end" />
      <text x="635" y="146" textAnchor="middle" className="ls-diagram__label">
        Your NEAR account
      </text>
      <text x="635" y="166" textAnchor="middle" className="ls-diagram__sub">
        exact USDC
      </text>
    </svg>
  );
}

const FAQ = [
  {
    icon: <Wallet size={24} aria-hidden />,
    q: "Does Notara hold my money?",
    a: "No. Money goes from the customer's wallet to your account. Payments from other chains are routed by NEAR Intents, which delivers USDC to you on NEAR.",
  },
  {
    icon: <ShieldCheck size={24} aria-hidden />,
    q: "What does the wallet signature prove?",
    a: "That the link's amount, recipient and description were approved by the wallet that gets paid. It shows who is asking, not that they will deliver.",
  },
  {
    icon: <Coins size={24} aria-hidden />,
    q: "What can I try for free?",
    a: "Payment links, wallet payments, send links, scam reports and the AI-agent vault all run on NEAR testnet with free test money. Paying from another chain needs mainnet.",
  },
  {
    icon: <TriangleAlert size={24} aria-hidden />,
    q: "Is it audited?",
    a: "No. Notara is a hackathon prototype, so keep mainnet amounts small.",
  },
];

/** Customers usually arrive from a link; this opens one they were sent. */
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
    <form onSubmit={go} className="ls-open" noValidate>
      <label htmlFor="open-link">Open a link you were sent</label>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        <input
          id="open-link"
          className="input"
          placeholder="https://…/pay/INV-0042"
          value={v}
          onChange={(e) => (setV(e.target.value), setErr(null))}
          aria-invalid={!!err}
          aria-describedby={err ? "open-link-err" : undefined}
        />
        <button className="btn btn-secondary">Open link</button>
      </div>
      {err && (
        <span id="open-link-err" className="err">
          {err}
        </span>
      )}
    </form>
  );
}

export function Home() {
  // The hero is exactly the first screen. The header lies over the top of the landing page, so the hero
  // pads its content down by the header's height (which changes with the notice and the wallet notice).
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const head = document.querySelector<HTMLElement>(".site-header");
    if (!head || !hero.current) return;
    const set = () => hero.current?.style.setProperty("--hero-top", `${Math.round(head.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <section className="hero ls-hero" data-enter ref={hero} aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text ls-hero__in">
            <div className="hero__c">
              <p className="ls-notice">Live on NEAR mainnet since 9 November 2026</p>
              <h1 id="hero-h">USDC payment links for freelancers</h1>
              <p className="hero__lead">
                Your NEAR wallet signs the link. Your customer sees who is asking, pays from the chain they already use, and exact USDC arrives in your
                NEAR account.
              </p>
              <div className="btn-row">
                <Link to="/invoices" className="btn btn-primary">
                  {MAIN_ACTION} <ArrowRight size={18} className="arrow" aria-hidden />
                </Link>
                <Link to="/start" className="btn btn-secondary">
                  Try it on testnet
                </Link>
              </div>
            </div>
            <HeroWindow />
          </div>
        </div>
      </section>

      <section className="ls-sec" id="product" style={{ ["--h" as string]: 1 }} aria-labelledby="product-h">
        <div className="wrap">
          <h2 id="product-h">
            Your links, and what each customer saw. <span className="muted">Paid, waiting or refunded, in one list.</span>
          </h2>
          <ProductWindow />
        </div>
      </section>

      <section className="ls-sec" id="signed" style={{ ["--h" as string]: 1 }} aria-labelledby="signed-h">
        <div className="wrap ls-split">
          <div>
            <h2 id="signed-h">Wallet signatures on every payment link</h2>
            <p className="ls-lead">
              The amount, the recipient and what it's for are signed with NEAR's message standard, NEP-413. Change one character and the customer's page
              says the signature no longer checks out.
            </p>
            <Link to="/invoices" className="link">
              Sign your first link
            </Link>
          </div>
          <div className="ls-window ls-sig" data-ui role="img" aria-label="The message a merchant's wallet signs, and the page confirming the signature">
            <div className="ls-bar">
              <Lock size={13} aria-hidden />
              <span className="mono">Wallet: sign message</span>
            </div>
            <div className="ls-sig__from">
              <Wallet size={18} aria-hidden /> <span>notara-sable.vercel.app asks design-studio.near to sign</span>
            </div>
            <pre className="ls-sig__msg mono">{"Notara payment link\nPay to: design-studio.near\nAmount: 50 USDC\nFor: Logo design, 2 rounds"}</pre>
            <div className="ls-sig__ok">
              <CircleCheck size={18} aria-hidden /> Signature checks out against this account's keys on NEAR
            </div>
            <div className="ls-sig__bad">
              <CircleX size={18} aria-hidden /> Edited link: "Amount: 500 USDC" no longer matches the signature
            </div>
            <div className="ls-sig__acts">
              <span className="ls-fakebtn">Reject</span>
              <span className="ls-fakebtn ls-fakebtn--primary">Approve and sign</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ls-sec" id="more" style={{ ["--h" as string]: 1 }} aria-labelledby="more-h">
        <div className="wrap">
          <h2 id="more-h">Four more things Notara does</h2>
          <div className="ls-cards">
            <Link to="/send" className="card ls-card">
              <div className="ls-card__panel" data-ui>
                <span className="ls-frag mono">notara…/claim/INV-0051#k…</span>
                <span className="ls-frag ls-frag--ok">
                  <CircleCheck size={14} aria-hidden /> 10 USDC claimed into maya.near
                </span>
              </div>
              <h3>
                <Send size={16} aria-hidden /> Sends money with a link
              </h3>
              <p>Fund a link and share it; whoever opens it claims USDC on NEAR, with gas covered.</p>
            </Link>
            <Link to="/check" className="card ls-card ls-card--low">
              <div className="ls-card__panel" data-ui>
                <span className="ls-frag ls-frag--warn">Be careful</span>
                <span className="ls-frag">This account is new (5 days of activity)</span>
              </div>
              <h3>
                <Search size={16} aria-hidden /> Checks any NEAR account
              </h3>
              <p>Account age, activity, code changes and shared scam reports, read live and in plain words.</p>
            </Link>
            <Link to="/invoices" className="card ls-card ls-card--low">
              <div className="ls-card__panel" data-ui>
                <span className="ls-frag">Send 0.000478 ETH on Base</span>
                <span className="ls-frag ls-frag--ok">
                  <CircleCheck size={14} aria-hidden /> You receive 1.00 USDC on NEAR
                </span>
              </div>
              <h3>
                <ArrowRight size={16} aria-hidden /> Takes payment from other chains
              </h3>
              <p>A one-time address per payment; NEAR Intents swaps it and the exact amount lands with you.</p>
            </Link>
            <Link to="/security" className="card ls-card">
              <div className="ls-card__panel" data-ui>
                <span className="ls-frag ls-frag--bad">
                  <CircleX size={14} aria-hidden /> Vault refused: verdict is BLOCK
                </span>
                <span className="ls-frag">Hacked agent tried to pay attacker.near</span>
              </div>
              <h3>
                <Bot size={16} aria-hidden /> Guards an AI agent's spending
              </h3>
              <p>A vault contract pays only with a signed check, within your caps, even if the agent is hacked.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="ls-sec" id="settle" style={{ ["--h" as string]: 1 }} aria-labelledby="settle-h">
        <div className="wrap">
          <h2 id="settle-h">How a payment from another chain settles</h2>
          <p className="ls-lead">The customer sends their own token to a one-time address. NEAR Intents swaps it and delivers the exact USDC to you on NEAR.</p>
          <div className="ls-diagram-card">
            <SettleDiagram />
          </div>
          <div className="ls-figures" data-moment="counter-rolls">
            <div>
              <p className="t-stat num">55</p>
              <p className="small muted">tokens a customer can pay with, as listed by NEAR Intents on 9 November 2026</p>
            </div>
            <div>
              <p className="t-stat num">25</p>
              <p className="small muted">USDC at most in one send link</p>
            </div>
            <div>
              <p className="t-stat num">1</p>
              <p className="small muted">NEAR a day at most from an AI-agent vault</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ls-sec ls-statement" id="statement" style={{ ["--h" as string]: 1 }} aria-labelledby="statement-h">
        <div className="wrap" data-moment="liquid-type" data-moment-opts='{"strength": 0.9}'>
          <h2 id="statement-h" className="mo-lt__type">
            An account check before every payment
          </h2>
          <p className="ls-lead">Every Notara link opens on its account check: the signature, the account's age and activity, and any scam reports.</p>
          <ul className="ls-verdict" data-ui aria-label="The account check for design-studio.near">
            <li>
              <ShieldCheck size={20} aria-hidden /> <span>Signature</span> <strong>checks out</strong>
            </li>
            <li>
              <CircleCheck size={20} aria-hidden /> <span>On NEAR since</span> <strong>March 2025</strong>
            </li>
            <li>
              <CircleCheck size={20} aria-hidden /> <span>Scam reports</span> <strong>none</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className="ls-sec" id="faq" style={{ ["--h" as string]: 1 }} aria-labelledby="faq-h">
        <div className="wrap ls-split">
          <div>
            <h2 id="faq-h">Questions</h2>
            <OpenLink />
          </div>
          <dl className="ls-faq">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt>
                  {f.icon} {f.q}
                </dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
