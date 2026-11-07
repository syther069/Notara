import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LoaderCircle, LogOut, Menu, Moon, ShieldCheck, Sun, TriangleAlert, Wallet, X } from "lucide-react";
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

const LINKS = [
  ["/", "Home"],
  ["/invoices", "Get paid"],
  ["/send", "Send"],
  ["/check", "Check"],
  ["/security", "Security"],
  ["/about", "About"],
] as const;

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
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  const toast = useCallback((text: ReactNode, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const isDark = theme ? theme === "dark" : !window.matchMedia?.("(prefers-color-scheme: light)").matches;
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <DeploymentCtx.Provider value={{ dep, error: depErr, reload }}>
      <ToastCtx.Provider value={toast}>
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container">
            <NavLink to="/" className="brand" aria-label="Notara home">
              <ShieldCheck size={22} aria-hidden /> Notara
            </NavLink>
            <nav className="nav" aria-label="Main">
              {LINKS.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === "/"}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="header-tools">
              <span className="net-pill" title={dep?.deployed ? `Vault ${dep.vault}` : "No testnet deployment found"}>
                <span className={`dot ${dep?.deployed ? "on" : ""}`} />
                <span className="label">{depErr ? "backend offline" : dep?.deployed ? "testnet connected" : "testnet not set up"}</span>
              </span>
              <WalletButton />
              <button className="icon-btn" onClick={toggleTheme} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">
                {menu ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          <nav className={`mobile-nav ${menu ? "open" : ""}`} aria-label="Mobile">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        {notice && (
          <div className="notice">
            <div className="container">
              <TriangleAlert size={14} aria-hidden /> {/^\/(pay|m|send|claim)(\/|$)/.test(loc.pathname) ? "This page uses real money on NEAR mainnet · prototype · not audited" : "Testnet prototype · not audited · no real funds"}
              <button
                aria-label="Dismiss notice"
                onClick={() => {
                  setNotice(false);
                  try {
                    sessionStorage.setItem("notice", "hidden");
                  } catch {}
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <main id="main">
          <div className="container">
            <Outlet />
          </div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <span>Built for the NEAR Hackathon · AI Security & Defense · Real-World Money</span>
            <span>
              <Link to="/agents">For AI agents</Link> · <a href="/llms.txt">llms.txt</a>
            </span>
            <span>Data: NEAR RPC and FastNear (live) · Contracts on NEAR testnet</span>
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
        <Wallet size={14} aria-hidden />
        <span className="mono wallet-id">{w.accountId}</span>
        <span className="small muted">{w.network}</span>
        <button onClick={w.disconnect} aria-label="Disconnect wallet">
          <LogOut size={14} />
        </button>
      </span>
    );
  return (
    <button className="btn btn-secondary btn-sm wallet-btn" onClick={() => w.connect()} disabled={!w.ready || w.busy} title={w.error ?? "Connect a NEAR testnet wallet"}>
      {w.busy || !w.ready ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Wallet size={14} aria-hidden />}
      <span className="label">Connect wallet</span>
    </button>
  );
}
