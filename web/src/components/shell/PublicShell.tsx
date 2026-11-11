// The shell around the pages a customer opens from a link (pay, claim, a merchant's page, an agent invoice).
// Deliberately quiet: the wordmark, the prototype notice, the page.
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useWallet } from "@/lib/wallet";
import { SealMark } from "@/components/Layout";
import { TriangleAlert, X } from "@/components/icons";
import { WalletChip, WalletModal } from "@/components/app/wallet";
import { SpinThemeToggle } from "@/components/app/SpinThemeToggle";

export function PublicShell() {
  const loc = useLocation();
  const w = useWallet();
  const [connect, setConnect] = useState(false);
  const [notice, setNotice] = useState(() => {
    try {
      return sessionStorage.getItem("notice") !== "hidden";
    } catch {
      return true;
    }
  });
  useEffect(() => window.scrollTo(0, 0), [loc.pathname]);
  return (
    <div className="nt app-shell min-h-dvh bg-background font-sans text-foreground antialiased">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-[72px]">
          <Link to="/" aria-label="Notara home" className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.04em]">
            <SealMark className="size-7 text-accent" /> notara
          </Link>
          <span className="flex items-center gap-1.5">
            <SpinThemeToggle />
            <WalletChip compact onConnect={() => setConnect(true)} onOpenProfile={() => {}} />
          </span>
        </div>
      </header>
      {notice && (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-[72px]">
          <div className="flex items-center gap-2.5 rounded-full border border-warning/25 bg-warning-soft py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-warning">
            <TriangleAlert size={15} aria-hidden className="shrink-0" />
            <span className="min-w-0 flex-1">Prototype, not audited. Mainnet links move real money; testnet links use free test money.</span>
            <button
              type="button"
              aria-label="Dismiss notice"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-warning/15"
              onClick={() => {
                setNotice(false);
                try {
                  sessionStorage.setItem("notice", "hidden");
                } catch {}
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      {w.error && !connect && (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-[72px]">
          <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-[14px]">
            <p>{w.error}</p>
            <button type="button" className="shrink-0 font-semibold underline underline-offset-4" onClick={w.clearError}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      <main id="main">
        <div className="container legacy">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-border/70 py-8 text-center text-[13px] text-muted">
        <Link to="/" className="font-semibold text-foreground underline underline-offset-4">
          Notara
        </Link>
        : payment links people can trust. Built on NEAR.
      </footer>
      <WalletModal open={connect} onClose={() => setConnect(false)} />
    </div>
  );
}
