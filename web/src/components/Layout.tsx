import { MainnetBadge } from "./ui";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, Bot, ChevronDown, FileCode as Code, Link2, ShieldCheck, LoaderCircle, LogOut, Menu, Moon, Search, Send, Sun, TriangleAlert, Wallet, X } from "./icons";
import { useWallet } from "../lib/wallet";
import { api, type Deployment } from "../lib/api";

// ---------------------------------------------------------------- deployment context

const DeploymentCtx = createContext<{ dep: Deployment | null; error: string | null; reload: () => void }>({ dep: null, error: null, reload: () => {} });
export const useDeployment = () => useContext(DeploymentCtx);

// ---------------------------------------------------------------- toasts

type Toast = { id: number; text: ReactNode; kind: "ok" | "error" };
const ToastCtx = createContext<(text: ReactNode, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- theme

function storedTheme(): "light" | "dark" | null {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

/** Notara's mark: a notary seal, a notched ring around a check. */
export function SealMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 2.5l2.6 1.9 3.2-.3 1.3 2.9 2.9 1.3-.3 3.2 1.9 2.6-1.9 2.6.3 3.2-2.9 1.3-1.3 2.9-3.2-.3L16 26.5l-2.6-1.9-3.2.3-1.3-2.9-2.9-1.3.3-3.2L4.4 15l1.9-2.6-.3-3.2 2.9-1.3 1.3-2.9 3.2.3z"
        fill="currentColor"
      />
      <path d="M11 15.2l3.3 3.3 6.6-6.8" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 26.5l-1.8 4 3.1-.9 1.6 2.4.9-4M20.5 26.5l1.8 4-3.1-.9-1.6 2.4-.9-4" fill="currentColor" opacity=".55" />
    </svg>
  );
}

const PRODUCT = [
  { to: "/invoices", label: "Get paid", desc: "Signed payment links. USDC from any chain.", icon: <Link2 size={18} /> },
  { to: "/send", label: "Send by link", desc: "Send USDC to anyone, no wallet needed yet.", icon: <Send size={18} /> },
  { to: "/check", label: "Check an account", desc: "Look up a NEAR account before you pay it.", icon: <Search size={18} /> },
  { to: "/security", label: "AI-agent vault", desc: "Watch a hacked agent fail to move money.", icon: <Bot size={18} /> },
] as const;

/** The AI-agent side of the product, for agent owners and developers. */
const AGENTS = [
  { to: "/security", label: "Attack demo and your vault", desc: "Run an AI agent against a vault you own, on testnet.", icon: <Bot size={18} /> },
  { to: "/check", label: "Check an account", desc: "What Notara answers before an agent pays someone.", icon: <Search size={18} /> },
  { to: "/vault", label: "Vault console", desc: "Limits, payments, and approvals waiting for you.", icon: <ShieldCheck size={18} /> },
  { to: "/agents", label: "For developers", desc: "Call the same check from your own agent.", icon: <Code size={18} /> },
] as const;

const LINKS = [
  ["/invoices", "Get paid"],
  ["/send", "Send"],
  ["/security", "AI agents"],
  ["/about", "How it works"],
  ["/start", "Try it on testnet"],
] as const;

/** AI-agents panel: opens on click, hover (with a short close delay) or keyboard; Escape closes and returns focus. */
function ProductMenu() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const btn = useRef<HTMLButtonElement>(null);
  // Opened by a click (or keyboard): stays open until clicked again, Escape, focus leaving or navigation.
  const pinned = useRef(false);
  const loc = useLocation();
  const close = () => {
    pinned.current = false;
    setOpen(false);
  };
  useEffect(close, [loc.pathname]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close();
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const enter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 80);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || pinned.current) return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 320);
  };
  return (
    <div
      ref={root}
      className="nav-menu"
      onPointerEnter={enter}
      onPointerLeave={leave}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          close();
          btn.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) close();
      }}
    >
      <button ref={btn} className="nav-trigger" aria-expanded={open} aria-controls="product-menu" onClick={() => {
          clearTimeout(timer.current);
          pinned.current = !pinned.current || !open;
          setOpen(pinned.current);
        }}>
        AI agents <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="mega" id="product-menu">
          {AGENTS.map((p) => (
            <Link key={p.label} to={p.to} className="mega-link">
              <span className="ic" aria-hidden>
                {p.icon}
              </span>
              <span>
                <strong>{p.label}</strong>
                <span className="d">{p.desc}</span>
              </span>
            </Link>
          ))}
          <Link to="/security" className="mega-feature" style={{ gridColumn: 3, gridRow: "1 / span 2" }}>
            <div>
              <h4>Try your own vault on testnet</h4>
              <p>Connect any NEAR testnet wallet. An AI agent tries to pay four invoices from a vault you own. Free test NEAR only.</p>
            </div>
            <span className="go">
              Open the demo <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const [dep, setDep] = useState<Deployment | null>(null);
  const [depErr, setDepErr] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(storedTheme());
  const [notice, setNotice] = useState(() => {
    try {
      return sessionStorage.getItem("notice") !== "hidden";
    } catch {
      return true;
    }
  });
  const loc = useLocation();
  const w = useWallet();

  const reload = useCallback(() => {
    api
      .deployment()
      .then((d) => {
        setDep(d);
        setDepErr(null);
      })
      .catch((e) => setDepErr(e.message));
  }, []);
  useEffect(reload, [reload]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  // Escape closes the mobile menu and puts focus back on the button that opened it.
  const menuBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      menuBtn.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  const toast = useCallback((text: ReactNode, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const isDark = theme ? theme === "dark" : !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };
  const moneyPage = /^\/(pay|m|send|claim)(\/|$)/.test(loc.pathname);
  const links: (readonly [string, string])[] = w.accountId ? [["/dashboard", "Dashboard"], ...LINKS] : [...LINKS];

  return (
    <DeploymentCtx.Provider value={{ dep, error: depErr, reload }}>
      <ToastCtx.Provider value={toast}>
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        {notice && (
          <div className="notice">
            <div className="container">
              <TriangleAlert size={15} aria-hidden />
              <span>
                {moneyPage
                  ? "Prototype, not audited. Mainnet links move real money; testnet links use free test money."
                  : "Testnet prototype, not audited. Every flow here runs on free test money."}
              </span>
              <button
                aria-label="Dismiss notice"
                onClick={() => {
                  setNotice(false);
                  try {
                    sessionStorage.setItem("notice", "hidden");
                  } catch {}
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        <header className="site-header">
          <div className="container">
            <NavLink to="/" className="brand" aria-label="Notara home">
              <SealMark /> Notara
            </NavLink>
            <nav className="nav" aria-label="Main">
              {w.accountId && <NavLink to="/dashboard">Dashboard</NavLink>}
              <NavLink to="/invoices">Get paid</NavLink>
              <NavLink to="/send">Send</NavLink>
              <ProductMenu />
              <NavLink to="/about">How it works</NavLink>
            </nav>
            <div className="header-tools">
              <Link to="/start" className="btn btn-tonal btn-sm try-btn">
                Try it free
              </Link>
              <WalletButton />
              <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button ref={menuBtn} className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-nav" aria-label="Menu">
                {menu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          <nav id="mobile-nav" className={`mobile-nav ${menu ? "open" : ""}`} aria-label="Mobile">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to}>
                {label} <ArrowRight size={16} aria-hidden />
              </NavLink>
            ))}
            <button type="button" className="mobile-theme" onClick={toggleTheme}>
              {isDark ? "Light theme" : "Dark theme"} {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
          </nav>
        </header>
        <main id="main">
          <div className="container">
            <Outlet />
          </div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <div className="footer-brand">
                  <SealMark /> Notara
                </div>
                <p style={{ marginTop: 12, maxWidth: "34ch", color: "color-mix(in srgb, var(--band-ink) 78%, transparent)" }}>
                  Payment links people can trust, on NEAR. Built for the NEAR Hackathon.
                </p>
              </div>
              <div>
                <h4>Product</h4>
                <ul>
                  {PRODUCT.map((p) => (
                    <li key={p.to}>
                      <Link className="ulink" to={p.to}>
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Learn</h4>
                <ul>
                  <li>
                    <Link className="ulink" to="/about">
                      How it works and limits
                    </Link>
                  </li>
                  <li>
                    <Link className="ulink" to="/agents">
                      For AI agents
                    </Link>
                  </li>
                  <li>
                    <a className="ulink" href="/llms.txt">
                      llms.txt
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Data</h4>
                <ul>
                  <li>NEAR RPC and FastNear, read live</li>
                  <li>Contracts on NEAR testnet</li>
                  <li>Cross-chain by NEAR Intents</li>
                </ul>
              </div>
            </div>
            <div className="footer-fine">
              <span>Prototype, not audited. Tracks: AI Security & Defense, Real-World Money.</span>
              <span>
                Some interface ideas adapted from{" "}
                <a className="ulink always" href="https://skiper-ui.com" target="_blank" rel="noreferrer">
                  Skiper UI
                </a>
                . Icons by{" "}
                <a className="ulink always" href="https://iconoir.com" target="_blank" rel="noreferrer">
                  Iconoir
                </a>
                .
              </span>
            </div>
          </div>
        </footer>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              {t.text}
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </DeploymentCtx.Provider>
  );
}

export function NotDeployed() {
  const { error } = useDeployment();
  if (error)
    return (
      <div className="banner error" role="alert">
        <TriangleAlert size={18} aria-hidden />
        <div>
          <p style={{ fontWeight: 700 }}>The backend isn't running</p>
          <p>
            Start it in the project folder with <code>npm run serve</code>, then reload this page.
          </p>
        </div>
      </div>
    );
  return (
    <div className="banner warn">
      <TriangleAlert size={18} aria-hidden />
      <div>
        <p style={{ fontWeight: 700 }}>Testnet is not set up yet</p>
        <p>
          Run <code>npm run setup:testnet -- --create-owner yourname.testnet</code> in the project folder. The Check page works without it.
        </p>
      </div>
    </div>
  );
}

function WalletButton() {
  const w = useWallet();
  if (w.accountId)
    return (
      <span className="wallet-chip" title={`Connected: ${w.accountId}`}>
        <Wallet size={15} aria-hidden />
        <Link to="/dashboard" className="mono wallet-id" style={{ color: "inherit", textDecoration: "none" }}>
          {w.accountId}
        </Link>
        {w.network === "mainnet" ? <MainnetBadge /> : <span className="tag testnet">testnet</span>}
        <button onClick={w.disconnect} aria-label="Disconnect wallet" title="Disconnect wallet">
          <LogOut size={15} />
        </button>
      </span>
    );
  // Pick the network first: the wallet list depends on it (HOT, NEAR Mobile, MyNearWallet are mainnet-only).
  return (
    <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
      <select
        className="net-select"
        aria-label="Network to connect on"
        value={w.network}
        onChange={(e) => w.connect(undefined, e.target.value as "mainnet" | "testnet")}
        disabled={!w.ready || w.busy}
      >
        <option value="testnet">Testnet</option>
        <option value="mainnet">Mainnet</option>
      </select>
      <button
        className="btn btn-primary btn-sm wallet-btn"
        onClick={() => w.connect()}
        disabled={!w.ready || w.busy}
        aria-busy={w.busy || !w.ready}
        title={w.error ?? `Connect a NEAR ${w.network} wallet`}
      >
        {w.busy || !w.ready ? <LoaderCircle size={14} /> : <Wallet size={15} aria-hidden />}
        <span className="label">Connect wallet</span>
      </button>
    </span>
  );
}


