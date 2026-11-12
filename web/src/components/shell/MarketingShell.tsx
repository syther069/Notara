// The public shell: the Notara mark at the left, a glass dock of section links in the centre, and the
// theme toggle, Sign in and the app button at the right. It condenses on scroll and follows the visitor's
// theme like the rest of the site. Leaving for the app plays one continuous wipe.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";
import { SealMark } from "@/components/Layout";
import { ArrowRight, Github, Menu, Play, X } from "@/components/icons";
import { GlassDock } from "@/components/vengeance/glass-dock";
import { LineHoverLink } from "@/components/vengeance/line-hover-link";
import SocialFlipButton from "@/components/vengeance/social-flip-button";
import { scrollToSection } from "@/components/skiper/scroll";
import { replayPreloader } from "@/components/landing/Preloader";
import { Button, EASE } from "@/components/app/ui";
import { WalletModal } from "@/components/app/wallet";

const GoCtx = createContext<(to: string) => void>(() => {});
/** Leave the landing page for the app with the route transition. */
export const useGo = () => useContext(GoCtx);

/** The landing page's main sections, kept to four so the bar stays short. Account check and Cost are reached by scrolling. */
const SECTIONS = [
  { id: "get-paid", title: "Get paid" },
  { id: "send", title: "Send" },
  { id: "agents", title: "AI agents" },
  { id: "faq", title: "FAQ" },
] as const;

export function MarketingShell() {
  const w = useWallet();
  const nav = useNavigate();
  const loc = useLocation();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [connect, setConnect] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menuNav = useRef<HTMLElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [loc.pathname]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    scrollToSection(el, -76);
    history.replaceState(null, "", `#${id}`);
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!loc.hash) return;
    const t = setTimeout(() => {
      const el = document.getElementById(loc.hash.slice(1));
      if (el) scrollToSection(el, -76);
    }, 120);
    return () => clearTimeout(t);
  }, [loc.hash]);

  useEffect(() => {
    if (!menu) return;
    const t = setTimeout(() => menuNav.current?.querySelector<HTMLElement>("a, button")?.focus(), 60);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      menuBtn.current?.focus();
    };
    const away = (e: PointerEvent) => {
      if (!menuNav.current?.contains(e.target as Node) && !menuBtn.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [menu]);

  const go = useCallback(
    (to: string) => {
      if (reduce) return nav(to);
      setLeaving(to);
    },
    [nav, reduce],
  );

  const items = [...SECTIONS.map((s) => ({ title: s.title, href: `#${s.id}`, active: current === s.id, onClick: () => scrollTo(s.id) }))];
  const appLabel = w.accountId ? "Dashboard" : "Open App";
  const mobileLink = "flex min-h-12 items-center rounded-2xl px-4 text-left text-[15.5px] font-semibold hover:bg-surface-secondary";

  return (
    <GoCtx.Provider value={go}>
      <div data-theme="light" className="nt min-h-dvh bg-background font-sans text-[16px] leading-[1.6] text-foreground antialiased transition-colors duration-300">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
          Skip to content
        </a>

        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 sm:px-6">
          <div
            className={cn(
              "pointer-events-auto mx-auto flex items-center justify-between gap-2 transition-[max-width,height,margin,padding,background-color,border-color,box-shadow] duration-500 ease-enter",
              scrolled ? "mt-3 h-12 max-w-[1140px] rounded-full border border-border/80 bg-background/90 pl-3 pr-1.5 shadow-card backdrop-blur-xl sm:pl-4" : "mt-6 h-14 max-w-[1220px] rounded-full border border-border/60 bg-background/92 pl-4 pr-1.5 shadow-card backdrop-blur-xl sm:pl-5",
            )}
          >
            <Link to="/" aria-label="Notara home" className="flex min-h-11 shrink-0 items-center gap-2.5 text-[20px] font-extrabold leading-none tracking-[-0.04em]">
              <SealMark className={cn("text-highlight transition-[width,height] duration-500", scrolled ? "size-6" : "size-7")} tick="var(--background)" /> Notara
            </Link>

            <div className="hidden min-w-0 xl:block">
              <GlassDock variant="labels" compact={scrolled} label="Sections" items={items} dockClassName={cn("transition-colors duration-500", scrolled && "!border-transparent !bg-transparent !shadow-none !backdrop-blur-none")} />
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href="/docs"
                onClick={(e) => {
                  e.preventDefault();
                  go("/docs");
                }}
                className={cn("hidden rounded-full px-3.5 text-[14.5px] font-semibold text-foreground/85 transition-colors hover:bg-foreground/10 hover:text-foreground sm:inline-flex sm:items-center", scrolled ? "h-8" : "h-9")}
              >
                Docs
              </a>
              {!w.accountId && (
                <button
                  type="button"
                  onClick={() => setConnect(true)}
                  className={cn("hidden rounded-full px-3.5 text-[14.5px] font-semibold text-foreground/85 transition-colors hover:bg-foreground/10 hover:text-foreground sm:inline-flex sm:items-center", scrolled ? "h-8" : "h-9")}
                >
                  Sign in
                </button>
              )}
              <Button size="sm" onClick={() => go("/dashboard")} className={cn("max-sm:!h-11 max-sm:!px-4 max-sm:[&>svg]:hidden", scrolled && "sm:!h-8")}>
                {appLabel} <ArrowRight size={15} aria-hidden />
              </Button>
              <button
                ref={menuBtn}
                type="button"
                aria-label={menu ? "Close menu" : "Open menu"}
                aria-expanded={menu}
                aria-controls="landing-menu"
                onClick={() => setMenu((m) => !m)}
                className="inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/10 xl:hidden"
              >
                {menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menu && (
              <motion.nav
                ref={menuNav}
                id="landing-menu"
                aria-label="Sections"
                initial={{ opacity: 0, y: reduce ? 0 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="pointer-events-auto mx-auto mt-2 flex max-h-[calc(100dvh-96px)] max-w-[1140px] flex-col overflow-y-auto rounded-3xl border border-border bg-overlay p-2 shadow-pop xl:hidden"
              >
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    aria-current={current === s.id ? "location" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setMenu(false);
                      scrollTo(s.id);
                    }}
                    className={mobileLink}
                  >
                    {s.title}
                  </a>
                ))}
                <a
                  href="/docs"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenu(false);
                    go("/docs");
                  }}
                  className={mobileLink}
                >
                  Docs
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    replayPreloader();
                  }}
                  className={cn(mobileLink, "gap-2 text-muted")}
                >
                  <Play size={15} aria-hidden /> Replay intro animation
                </button>
                {!w.accountId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setConnect(true);
                    }}
                    className={cn(mobileLink, "sm:hidden")}
                  >
                    Sign in
                  </button>
                )}
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
              <div className="max-w-sm">
                <p className="flex items-center gap-2.5 text-[22px] font-extrabold leading-none tracking-[-0.04em]">
                  <SealMark className="size-7 text-highlight" tick="var(--background)" /> Notara
                </p>
                <p className="mt-3 text-[15px] text-muted">
                  Wallet-signed USDC payment links and an on-chain AI agent vault that checks 6 live signals before a payment can move. Built on NEAR.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={replayPreloader}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-muted transition-colors hover:border-highlight hover:text-foreground"
                  >
                    <Play size={12} aria-hidden /> Replay intro
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-14 gap-y-8 text-[15px] sm:grid-cols-3">
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">App</p>
                  {(
                    [
                      ["/dashboard", "Dashboard"],
                      ["/get-paid", "Get Paid"],
                      ["/send", "Send"],
                      ["/agents/vault", "Vault Console"],
                      ["/agents/check", "Check an Account"],
                    ] as const
                  ).map(([to, label]) => (
                    <LineHoverLink
                      key={to}
                      href={to}
                      onClick={(e) => {
                        e.preventDefault();
                        go(to);
                      }}
                    >
                      {label}
                    </LineHoverLink>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">Developers</p>
                  <LineHoverLink href="/docs">Documentation</LineHoverLink>
                  <LineHoverLink href="/docs/api">API reference</LineHoverLink>
                  <LineHoverLink href="/llms.txt">API notes (/llms.txt)</LineHoverLink>
                  <LineHoverLink href="https://github.com/syther069/Notara" target="_blank" rel="noreferrer">
                    Source on GitHub
                  </LineHoverLink>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-muted">Follow</p>
                  <SocialFlipButton className="!justify-start !p-0" items={[{ letter: "G", icon: <Github size={18} aria-hidden />, label: "GitHub", href: "https://github.com/syther069/Notara" }]} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-border/70 pt-6 text-[13px] text-muted">
              <span>Built on NEAR. Testnet prototype, not audited: keep real-money amounts small.</span>
            </div>
          </div>
        </footer>

        <AnimatePresence>
          {leaving && (
            <motion.div
              className="fixed inset-0 z-[150] bg-background"
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
