// What every shell shares: the server's deployment answer, toasts, the theme, and the wallet's balances.
// The shells themselves live in components/shell (marketing, app, public pay pages).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ThemeProvider, useTheme as useNextTheme } from "next-themes";
import { LoaderCircle, TriangleAlert } from "./icons";
import { ftBalance, nearBalance, useWallet } from "../lib/wallet";
import { api, type Deployment } from "../lib/api";
import { usdcFor } from "../lib/format";

// ---------------------------------------------------------------- deployment

const DeploymentCtx = createContext<{ dep: Deployment | null; error: string | null; reload: () => void }>({ dep: null, error: null, reload: () => {} });
export const useDeployment = () => useContext(DeploymentCtx);

// ---------------------------------------------------------------- toasts

type Toast = { id: number; text: ReactNode; kind: "ok" | "error" };
const ToastCtx = createContext<(text: ReactNode, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- theme

export type ThemeChoice = "light" | "dark" | "system";

/**
 * The site's one theme state (next-themes): the visitor's choice, kept in localStorage under "theme",
 * defaulting to their system setting, written to <html data-theme>. Every toggle and the Preferences
 * panel read and write it here.
 */
export function useTheme(): { choice: ThemeChoice; resolved: "light" | "dark"; setChoice: (c: ThemeChoice) => void } {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  return {
    choice: theme === "light" || theme === "dark" ? theme : "system",
    resolved: resolvedTheme === "dark" ? "dark" : "light",
    setChoice: setTheme,
  };
}

// ---------------------------------------------------------------- balances

type Balances = {
  /** USDC in its smallest unit. undefined: still loading. null: couldn't be read. */
  usdc: bigint | null | undefined;
  /** NEAR in yoctoNEAR. Same meaning for undefined and null. */
  near: bigint | null | undefined;
  refresh: () => void;
};
const BalanceCtx = createContext<Balances>({ usdc: undefined, near: undefined, refresh: () => {} });
/** The connected wallet's balances, read live from NEAR. */
export const useBalances = () => useContext(BalanceCtx);

/**
 * Notara's mark: two mirrored brackets drawn as one line, their diagonals meeting at a gold centre: two
 * parties, one signed agreement between them. The outline takes the text colour, so it reads on cream
 * and on canopy; the centre is always gold.
 */
export function NotaraMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 13 10.5 7.5H6.2A2.2 2.2 0 0 0 4 9.7v12.6a2.2 2.2 0 0 0 2.2 2.2h4.3L16 19l5.5 5.5h4.3a2.2 2.2 0 0 0 2.2-2.2V9.7a2.2 2.2 0 0 0-2.2-2.2h-4.3z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 13v6" stroke="var(--color-gold, #c8a96a)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [dep, setDep] = useState<Deployment | null>(null);
  const [depErr, setDepErr] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const w = useWallet();

  const reload = useCallback(() => {
    setDepErr(null); // a retry shows "checking" again rather than the old error
    api
      .deployment()
      .then((d) => {
        setDep(d);
        setDepErr(null);
      })
      .catch((e) => setDepErr(e.message));
  }, []);
  useEffect(reload, [reload]);

  const toast = useCallback((text: ReactNode, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  // Balances: read when the wallet connects or changes network, and again on demand (after a send).
  const [bal, setBal] = useState<{ usdc: bigint | null | undefined; near: bigint | null | undefined }>({ usdc: undefined, near: undefined });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!w.accountId) return setBal({ usdc: undefined, near: undefined });
    let live = true;
    setBal({ usdc: undefined, near: undefined });
    const acct = w.accountId;
    const net = w.network;
    Promise.all([ftBalance(net, usdcFor(net), acct), nearBalance(net, acct)]).then(([usdc, near]) => live && setBal({ usdc, near }));
    return () => {
      live = false;
    };
  }, [w.accountId, w.network, tick]);
  const balances = useMemo(() => ({ ...bal, refresh: () => setTick((t) => t + 1) }), [bal]);

  const deployment = useMemo(() => ({ dep, error: depErr, reload }), [dep, depErr, reload]);

  return (
    <DeploymentCtx.Provider value={deployment}>
      <ThemeProvider attribute="data-theme" storageKey="theme" defaultTheme="system" enableSystem themes={["light", "dark"]} scriptProps={{ type: "application/json" }}>
        <BalanceCtx.Provider value={balances}>
          <ToastCtx.Provider value={toast}>
            {children}
            <div className="nt pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-[14px] font-semibold shadow-pop ${t.kind === "error" ? "bg-danger text-danger-foreground" : "bg-canopy text-cream"}`}
                  >
                    {t.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ToastCtx.Provider>
        </BalanceCtx.Provider>
      </ThemeProvider>
    </DeploymentCtx.Provider>
  );
}

/** Someone running Notara on their own machine: the only audience for terminal commands. */
export const isLocalDev = () => typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

/**
 * Shown where a page needs the testnet demo setup. Three different situations, never merged:
 * still checking, server unreachable (retryable), and a server that has no testnet demo set up.
 */
export function NotDeployed() {
  const { dep, error, reload } = useDeployment();
  if (!dep && !error)
    return (
      <p className="muted" role="status">
        <LoaderCircle size={16} className="spin" aria-hidden /> Checking what this site can run…
      </p>
    );
  if (error)
    return (
      <div className="banner error" role="alert">
        <TriangleAlert size={18} aria-hidden />
        <div>
          <p style={{ fontWeight: 700 }}>Notara's server didn't answer</p>
          <p>
            We couldn't check what this site can run, so this part can't start right now. Nothing was sent or changed.{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>
              Try again
            </button>
          </p>
          {isLocalDev() && (
            <details>
              <summary className="small">For developers</summary>
              <p className="small">
                Start the backend in the project folder with <code>npm run serve</code>, then try again.
              </p>
            </details>
          )}
        </div>
      </div>
    );
  return (
    <div className="banner warn">
      <TriangleAlert size={18} aria-hidden />
      <div>
        <p style={{ fontWeight: 700 }}>This copy of Notara has no testnet demo</p>
        <p>
          The demo vault and AI agent need testnet accounts that haven't been set up here. You can still <Link to="/agents/check">check any NEAR account</Link>.
        </p>
        {isLocalDev() && (
          <details>
            <summary className="small">For developers</summary>
            <p className="small">
              Run <code>npm run setup:testnet -- --create-owner yourname.testnet</code> in the project folder, then reload.
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
