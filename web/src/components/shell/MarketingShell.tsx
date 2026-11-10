// The public shell: wordmark, a glass dock of sections, Sign in and Open App. It condenses to a 48px
// pill on scroll. Leaving for the app plays one continuous wipe, so it never feels like a hard page change.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";
import { SealMark } from "@/components/Layout";
import { ArrowRight, Menu, Search, ShieldCheck, X } from "@/components/icons";
import { GlassDock } from "@/components/vengeance/glass-dock";
import { LineHoverLink } from "@/components/vengeance/line-hover-link";
import SocialFlipButton from "@/components/vengeance/social-flip-button";
import { Github } from "@/components/icons";
import { Button, EASE } from "@/components/app/ui";
import { WalletModal } from "@/components/app/wallet";

const GoCtx = createContext<(to: string) => void>(() => {});
/** Leave the landing page for the app with the route transition. */
export const useGo = () => useContext(GoCtx);

const AGENT_CARDS = [
  { to: "/agents/vault", icon: ShieldCheck, title: "Vault Console", body: "Limits, approvals and a pause button for an agent's spending." },
  { to: "/agents/check", icon: Search, title: "Check an Account", body: "One question before any payment: is this account safe to pay?" },
];

export function MarketingShell() {
  const w = useWallet();
  const nav = useNavigate();
  const loc = useLocation();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [agents, setAgents] = useState(false);
  const [menu, setMenu] = useState(false);
  const [connect, setConnect] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!agents) return;
    const away = (e: PointerEvent) => !panel.current?.contains(e.target as Node) && setAgents(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setAgents(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [agents]);
  // An address like /#faq scrolls to that section once the page is there.
  useEffect(() => {
    if (!loc.hash) return;
    const t = setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }), 80);
    return () => clearTimeout(t);
  }, [loc.hash, reduce]);

  const go = useCallback(
    (to: string) => {
      if (reduce) return nav(to);
      setLeaving(to);
    },
    [nav, reduce],
  );
  const section = (id: string) => () => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  const items = [
    { title: "Product", onClick: section("how-it-works") },
    { title: "AI Agents", onClick: () => setAgents((a) => !a) },
    { title: "Developers", onClick: section("developers") },
    { title: "Pricing", onClick: section("pricing") },
    { title: "Docs", href: "/llms.txt" },
  ];
  const appLabel = w.accountId ? "Dashboard" : "Open App";

  return (
    <GoCtx.Provider value={go}>
      <div data-theme="dark" className="nt min-h-dvh bg-background font-sans text-[16px] leading-normal text-foreground antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
          Skip to content
        </a>
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 sm:px-6">
          <div
            className={cn(
              "pointer-events-auto mx-auto flex items-center justify-between gap-3 transition-[max-width,height,margin,padding,background-color,border-color,box-shadow] duration-500 ease-enter",
              scrolled ? "mt-3 h-12 max-w-[860px] rounded-full border border-border/80 bg-background/75 px-2 pl-4 shadow-card backdrop-blur-xl" : "mt-4 h-16 max-w-[1280px] rounded-full border border-transparent px-1 sm:px-2",
            )}
          >
            <Link to="/" aria-label="Notara home" className="flex shrink-0 items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.04em]">
              <SealMark className={cn("text-mint transition-[width,height] duration-500", scrolled ? "size-6" : "size-7")} /> Notara
            </Link>

            <div ref={panel} className="relative hidden lg:block">
              <GlassDock variant="labels" compact={scrolled} label="Sections" items={items} dockClassName={cn("transition-colors duration-500", scrolled && "!border-transparent !bg-transparent !shadow-none !backdrop-blur-none")} />
              <AnimatePresence>
                {agents && (
                  <motion.div
                    initial={{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="absolute left-1/2 top-[calc(100%+12px)] grid w-[520px] -translate-x-1/2 grid-cols-2 gap-2 rounded-3xl border border-border bg-overlay p-2 shadow-pop"
                  >
                    {AGENT_CARDS.map((c) => (
                      <button key={c.to} type="button" onClick={() => go(c.to)} className="group flex flex-col gap-3 rounded-2xl p-4 text-left transition-colors duration-200 hover:bg-surface-secondary">
                        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-mint">
                          <c.icon size={20} aria-hidden />
                        </span>
                        <span>
                          <span className="flex items-center gap-1.5 text-[15.5px] font-bold">
                            {c.title} <ArrowRight size={14} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                          <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{c.body}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {!w.accountId && (
                <button type="button" onClick={() => setConnect(true)} className="hidden h-10 rounded-full px-4 text-[14.5px] font-semibold text-foreground/85 transition-colors hover:bg-foreground/10 hover:text-foreground sm:inline-flex sm:items-center">
                  Sign in
                </button>
              )}
              <Button size="sm" variant="mint" onClick={() => go("/dashboard")} className={cn(scrolled && "!h-9")}>
                {appLabel} <ArrowRight size={15} aria-hidden />
              </Button>
              <button type="button" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/10 lg:hidden">
                {menu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {menu && (
              <motion.nav aria-label="Sections" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }} className="pointer-events-auto mx-auto mt-2 flex max-w-[860px] flex-col rounded-3xl border border-border bg-overlay p-2 shadow-pop lg:hidden">
                {[["Product", "how-it-works"], ["Developers", "developers"], ["Pricing", "pricing"], ["Questions", "faq"]].map(([t, id]) => (
                  <button key={id} type="button" onClick={section(id)} className="rounded-2xl px-4 py-3 text-left text-[16px] font-semibold hover:bg-surface-secondary">{t}</button>
                ))}
                {AGENT_CARDS.map((c) => (
                  <button key={c.to} type="button" onClick={() => go(c.to)} className="rounded-2xl px-4 py-3 text-left text-[16px] font-semibold hover:bg-surface-secondary">{c.title}</button>
                ))}
                <a href="/llms.txt" className="rounded-2xl px-4 py-3 text-[16px] font-semibold hover:bg-surface-secondary">Docs</a>
                {!w.accountId && <button type="button" onClick={() => { setMenu(false); setConnect(true); }} className="rounded-2xl px-4 py-3 text-left text-[16px] font-semibold hover:bg-surface-secondary">Sign in</button>}
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main id="main">
          <Outlet />
        </main>

        <footer className="border-t border-border/70">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-14 sm:px-6 lg:px-[72px]">
            <div className="flex flex-wrap items-start justify-between gap-10">
              <div className="max-w-xs">
                <p className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.04em]">
                  <SealMark className="size-7 text-mint" /> Notara
                </p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted">Payment links people can trust, and a safe way to let AI agents pay. Built on NEAR.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-14 gap-y-8 text-[14.5px] sm:grid-cols-3">
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">Product</p>
                  <LineHoverLink href="/get-paid" onClick={(e) => { e.preventDefault(); go("/get-paid"); }}>Get Paid</LineHoverLink>
                  <LineHoverLink href="/send" onClick={(e) => { e.preventDefault(); go("/send"); }}>Send</LineHoverLink>
                  <LineHoverLink href="/agents/vault" onClick={(e) => { e.preventDefault(); go("/agents/vault"); }}>Vault Console</LineHoverLink>
                  <LineHoverLink href="/agents/check" onClick={(e) => { e.preventDefault(); go("/agents/check"); }}>Check an Account</LineHoverLink>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">Developers</p>
                  <LineHoverLink href="/llms.txt">API notes</LineHoverLink>
                  <LineHoverLink href="https://github.com/syther069/Notara" target="_blank" rel="noreferrer">Source on GitHub</LineHoverLink>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">Follow</p>
                  <SocialFlipButton className="!justify-start !p-0" items={[{ letter: "G", icon: <Github size={18} />, label: "GitHub", href: "https://github.com/syther069/Notara" }]} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-border/70 pt-6 text-[13px] text-muted">
              <span>Built on NEAR. Testnet prototype, not audited: keep real-money amounts small.</span>
              <span>
                Interface components adapted from <LineHoverLink href="https://www.vengenceui.com" target="_blank" rel="noreferrer">Vengeance UI</LineHoverLink>, <LineHoverLink href="https://smoothui.dev" target="_blank" rel="noreferrer">SmoothUI</LineHoverLink> and <LineHoverLink href="https://heroui.com" target="_blank" rel="noreferrer">HeroUI</LineHoverLink>. Icons by <LineHoverLink href="https://iconoir.com" target="_blank" rel="noreferrer">Iconoir</LineHoverLink>.
              </span>
            </div>
          </div>
        </footer>

        {/* Landing to app: a canopy panel rises over the page (fade-up-mask), then the app fades up from it. */}
        <AnimatePresence>
          {leaving && (
            <motion.div
              className="fixed inset-0 z-[150] bg-canopy"
              initial={{ clipPath: "inset(100% 0 0 0)", opacity: 0.6 }}
              animate={{ clipPath: "inset(0% 0 0 0)", opacity: 1 }}
              transition={{ duration: 0.42, ease: EASE }}
              onAnimationComplete={() => nav(leaving)}
            />
          )}
        </AnimatePresence>
        <WalletModal open={connect} onClose={() => setConnect(false)} />
      </div>
    </GoCtx.Provider>
  );
}
