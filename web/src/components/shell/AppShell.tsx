// The signed-in shell: a left rail (icons, labels on hover), a top bar (where you are, search,
// notifications, Guide, wallet), and the page. Distinct from the marketing shell on purpose.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";
import { AccountDataProvider, useAccountData } from "@/lib/data";
import { GUIDES } from "@/lib/guide";
import { useLocal } from "@/lib/local";
import { formatAsset, timeAgo, validAccount } from "@/lib/format";
import { SealMark } from "@/components/Layout";
import Combobox, { type ComboboxOption } from "@/components/smoothui/combobox";
import { Bell, Book, Bot, ChevronDown, ChevronRight, Dashboard, Link2, LogOut, Menu, Page, Search, Send, Settings2, ShieldCheck, TriangleAlert, User, Wallet, X } from "@/components/icons";
import { Button, EASE, Hint, IconButton, Sheet } from "@/components/app/ui";
import { WalletChip, WalletModal } from "@/components/app/wallet";
import { SpinThemeToggle } from "@/components/app/SpinThemeToggle";
import { ProfileEditor } from "@/components/app/profile";

type Item = { to: string; label: string; icon: typeof Bell; children?: { to: string; label: string; icon: typeof Bell }[] };
const NAV: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: Dashboard },
  { to: "/get-paid", label: "Get Paid", icon: Link2 },
  { to: "/send", label: "Send", icon: Send },
  {
    to: "/agents",
    label: "Agents",
    icon: Bot,
    children: [
      { to: "/agents/vault", label: "Vault Console", icon: ShieldCheck },
      { to: "/agents/check", label: "Check an Account", icon: Search },
    ],
  },
  { to: "/transactions", label: "Transactions", icon: Page },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

/** Where you are, for the breadcrumb and the Guide. */
function place(path: string): { crumbs: string[]; guide: keyof typeof GUIDES } {
  if (path.startsWith("/get-paid")) return { crumbs: ["Get Paid", "New payment link"], guide: "get-paid" };
  if (path.startsWith("/send")) return { crumbs: ["Send", "New payment"], guide: "send" };
  if (path.startsWith("/agents/check")) return { crumbs: ["Agents", "Check an Account"], guide: "check" };
  if (path.startsWith("/agents")) return { crumbs: ["Agents", "Vault Console"], guide: "vault" };
  if (path.startsWith("/transactions")) return { crumbs: ["Transactions"], guide: "transactions" };
  if (path.startsWith("/profile")) return { crumbs: ["Profile"], guide: "profile" };
  if (path.startsWith("/settings")) return { crumbs: ["Settings"], guide: "settings" };
  return { crumbs: ["Dashboard"], guide: "dashboard" };
}

const ShellCtxDefault = { openGuide: () => {}, openConnect: () => {}, openProfile: () => {} };
import { createContext, useContext } from "react";
const ShellCtx = createContext(ShellCtxDefault);
/** Lets a page open the Guide, the wallet picker or the profile sheet. */
export const useShell = () => useContext(ShellCtx);

function Rail({ onNavigate, pinned }: { onNavigate?: () => void; pinned?: boolean }) {
  const loc = useLocation();
  const inAgents = loc.pathname.startsWith("/agents");
  const [agentsOpen, setAgentsOpen] = useState(inAgents);
  useEffect(() => {
    if (inAgents) setAgentsOpen(true);
  }, [inAgents]);
  const reduce = useReducedMotion();
  const label = cn("whitespace-nowrap text-[14.5px] font-semibold transition-opacity duration-200", !pinned && "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100");
  const row = "relative flex h-11 items-center gap-3.5 rounded-xl px-[13px] text-foreground/75 transition-colors duration-200 hover:bg-default hover:text-foreground";
  const active = "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground";
  return (
    <nav aria-label="App" className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-3">
      {NAV.map((item) =>
        item.children ? (
          <div key={item.to}>
            <button type="button" aria-expanded={agentsOpen} aria-controls="rail-agents" onClick={() => setAgentsOpen((o) => !o)} className={cn(row, "w-full", inAgents && !agentsOpen && active)}>
              <item.icon size={20} className="shrink-0" aria-hidden />
              <span className={cn(label, "flex-1 text-left")}>{item.label}</span>
              <ChevronDown size={15} aria-hidden className={cn("shrink-0 transition-transform duration-300", agentsOpen && "rotate-180", !pinned && "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100")} />
            </button>
            <AnimatePresence initial={false}>
              {agentsOpen && (
                <motion.div id="rail-agents" initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                  <div className="mt-1 flex flex-col gap-1">
                    {item.children.map((c) => (
                      <NavLink key={c.to} to={c.to} onClick={onNavigate} className={({ isActive }) => cn(row, "h-10", isActive && active)}>
                        <c.icon size={17} className="ml-[1.5px] shrink-0" aria-hidden />
                        <span className={cn(label, "text-[14px]")}>{c.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => cn(row, isActive && active)}>
            <item.icon size={20} className="shrink-0" aria-hidden />
            <span className={label}>{item.label}</span>
          </NavLink>
        ),
      )}
      {/* Pinned to the bottom of the rail: the docs, in the same row style as the pages above. */}
      <div className="mt-auto border-t border-border/70 pt-2">
        <NavLink to="/docs" onClick={onNavigate} className={row} aria-label="Docs">
          <Book size={20} className="shrink-0" aria-hidden />
          <span className={label}>Docs</span>
        </NavLink>
      </div>
    </nav>
  );
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const nav = useNavigate();
  const { links } = useAccountData();
  const options = useMemo<ComboboxOption[]>(() => {
    const pages: ComboboxOption[] = [
      { value: "/dashboard", label: "Dashboard", description: "Your totals and activity" },
      { value: "/get-paid", label: "Create a payment link", description: "Get Paid" },
      { value: "/send", label: "Send a payment", description: "Send" },
      { value: "/agents/vault", label: "Vault Console", description: "Agents" },
      { value: "/agents/check", label: "Check an Account", description: "Agents" },
      { value: "/transactions", label: "Transactions", description: "Every payment, with filters and export" },
      { value: "/profile", label: "Profile", description: "Name, picture, links, funds" },
      { value: "/settings", label: "Settings", description: "Theme, notifications, timezone" },
    ];
    const mine = (links ?? []).slice(0, 40).map((l) => ({ value: `/transactions?q=${encodeURIComponent(l.id)}`, label: l.description || l.id, description: `${l.id} · ${formatAsset(l.amount, l.asset)}` }));
    return [...pages, ...mine];
  }, [links]);
  const root = useRef<HTMLDivElement>(null);
  // "/" (outside a field) focuses search from anywhere.
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>("[role=combobox]")?.click();
  }, [open]);
  return (
    <div ref={root} className="w-full max-w-[340px]" onBlur={() => setOpen(false)}>
      <Combobox
        aria-label="Search Notara"
        options={options}
        value=""
        placeholder="Search or jump to…"
        searchPlaceholder="A page, a link, or an account to check"
        emptyText="Nothing matches. Type an account like alice.near to check it."
        allowCustom={(q) => (validAccount(q) && q.includes(".") ? `Check the account ${q}` : null)}
        onValueChange={(v) => {
          if (!v) return;
          nav(v.startsWith("/") ? v : `/agents/check?account=${encodeURIComponent(v)}&network=${v.endsWith(".testnet") ? "testnet" : "mainnet"}`);
        }}
        className="!h-10 !rounded-full !bg-surface-secondary/70 !pl-4"
        contentClassName="!w-[min(92vw,420px)]"
      />
    </div>
  );
}

function Notifications() {
  const { notes, markNotesRead, clearNotes } = useAccountData();
  const unread = notes.filter((n) => !n.read).length;
  return (
    <Popover.Root onOpenChange={(o) => !o && markNotesRead()}>
      <Hint text={unread ? `${unread} new notification${unread === 1 ? "" : "s"}` : "Notifications"}>
        <Popover.Trigger asChild>
          <button type="button" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative inline-flex size-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-default">
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-background bg-gold" />}
          </button>
        </Popover.Trigger>
      </Hint>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="nt z-[60] w-[min(92vw,360px)] rounded-2xl border border-border bg-overlay p-2 text-foreground shadow-pop outline-none">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[15px] font-bold">Notifications</p>
            {notes.length > 0 && (
              <button type="button" onClick={clearNotes} className="text-[12.5px] font-semibold text-muted underline underline-offset-4 hover:text-foreground">
                Clear all
              </button>
            )}
          </div>
          {notes.length === 0 ? (
            <p className="px-3 pb-4 pt-1 text-[14px] leading-relaxed text-muted">Nothing yet. You'll hear here when a link is paid or a watched account's check changes.</p>
          ) : (
            <ul className="flex max-h-[50vh] flex-col overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id}>
                  <Link to={n.href} className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-default">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-border" : "bg-gold")} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-snug">{n.text}</span>
                      <span className="block text-[12.5px] text-muted">{timeAgo(Date.parse(n.at))}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function GuideSheet({ open, onClose, page }: { open: boolean; onClose: () => void; page: keyof typeof GUIDES }) {
  const guide = GUIDES[page];
  const [last, setLast] = useLocal<Record<string, number>>("notara-guide", {});
  const openAt = last[page] ?? 0;
  const reduce = useReducedMotion();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Guide: ${guide.name}`}
      footer={
        <Link to="/docs" onClick={onClose} className="inline-flex items-center gap-1.5 text-[14px] font-semibold underline underline-offset-4">
          <Book size={15} aria-hidden /> Read the full documentation
        </Link>
      }
    >
      <ol className="flex flex-col gap-2">
        {guide.entries.map((e, i) => {
          const on = openAt === i;
          return (
            <li key={e.title} className="rounded-2xl border border-border/70 bg-surface">
              <button type="button" aria-expanded={on} onClick={() => setLast((l) => ({ ...l, [page]: on ? -1 : i }))} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left">
                <span className="tnum inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold">{i + 1}</span>
                <span className="flex-1 text-[15px] font-bold">{e.title}</span>
                <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-muted transition-transform duration-300", on && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                    <ul className="flex flex-col gap-2 px-4 pb-4 pl-[60px] text-[14.5px] leading-relaxed text-muted">
                      {e.body.map((line) => (
                        <li key={line}>{line.includes("/llms.txt") ? <>The API notes are at <a className="font-semibold text-foreground underline underline-offset-4" href="/llms.txt">/llms.txt</a>, written for people and for AI agents.</> : line}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}

/** Shown in place of a page that only makes sense with a wallet connected. */
export function ConnectPanel({ title, body }: { title: string; body: string }) {
  const w = useWallet();
  const { openConnect } = useShell();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-3xl border border-border/70 bg-surface px-6 py-14 text-center shadow-card">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
        <Wallet size={26} aria-hidden />
      </span>
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{body}</p>
      </div>
      <Button size="lg" onClick={openConnect} disabled={!w.ready}>
        <Wallet size={18} aria-hidden /> {w.ready ? "Connect NEAR wallet" : "Loading wallets…"}
      </Button>
      <p className="text-[13px] text-muted">Connecting only signs you in. Nothing is sent or spent.</p>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const w = useWallet();
  const reduce = useReducedMotion();
  const here = place(loc.pathname);
  const [guide, setGuide] = useState(false);
  const [connect, setConnect] = useState(false);
  const [profile, setProfile] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [notice, setNotice] = useState(() => {
    try {
      return sessionStorage.getItem("notice") !== "hidden";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [cmdk-root]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearch(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setGuide((g) => !g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const shell = useMemo(() => ({ openGuide: () => setGuide(true), openConnect: () => setConnect(true), openProfile: () => setProfile(true) }), []);
  const closeProfile = useCallback(() => setProfile(false), []);
  const closeGuide = useCallback(() => setGuide(false), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  return (
    <ShellCtx.Provider value={shell}>
      <div className="nt app-shell min-h-dvh bg-background font-sans text-[15px] leading-[1.6] text-foreground antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
          Skip to content
        </a>

        {/* Left rail: icons at rest, labels on hover or keyboard focus. */}
        <aside className="app-rail group/rail fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-border/70 bg-background text-foreground transition-[width,box-shadow] duration-300 ease-enter hover:w-[236px] hover:shadow-pop focus-within:w-[236px] focus-within:shadow-pop lg:flex">
          <Link to="/dashboard" aria-label="Notara, to your dashboard" className="flex h-[68px] shrink-0 items-center gap-3 overflow-hidden border-b border-border/70 px-[22px]">
            <SealMark className="size-7 shrink-0 text-accent" />
            <span className="text-[19px] font-extrabold tracking-[-0.04em] opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">notara</span>
          </Link>
          <Rail />
        </aside>

        {/* The same rail as a drawer on small screens. */}
        <AnimatePresence>
          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div className="absolute inset-0 bg-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
              <motion.aside
                className="app-rail group/rail absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-border bg-background text-foreground shadow-pop"
                initial={reduce ? { opacity: 0 } : { x: "-100%" }}
                animate={reduce ? { opacity: 1 } : { x: 0 }}
                exit={reduce ? { opacity: 0 } : { x: "-100%" }}
                transition={{ duration: 0.36, ease: EASE }}
              >
                <div className="flex h-[68px] items-center justify-between border-b border-border/70 px-5">
                  <span className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.04em]">
                    <SealMark className="size-7 text-accent" /> notara
                  </span>
                  <button type="button" aria-label="Close menu" onClick={closeDrawer} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-default">
                    <X size={19} />
                  </button>
                </div>
                <Rail pinned onNavigate={closeDrawer} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div className="lg:pl-[72px]">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
            <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-10">
              <button type="button" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-default lg:hidden">
                <Menu size={20} />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0 shrink">
                <ol className="flex items-center gap-1.5 text-[14.5px]">
                  {here.crumbs.map((c, i) => (
                    <li key={c} className={cn("flex items-center gap-1.5 truncate", i === here.crumbs.length - 1 ? "font-bold" : "text-muted max-sm:hidden")} aria-current={i === here.crumbs.length - 1 ? "page" : undefined}>
                      {i > 0 && <ChevronRight size={14} aria-hidden className="shrink-0 text-muted max-sm:hidden" />}
                      {c}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
                <div className="hidden min-w-0 flex-1 justify-end md:flex">
                  <GlobalSearch open={search} setOpen={setSearch} />
                </div>
                <Notifications />
                <SpinThemeToggle />
                <Hint text="Tips for this page (press ?)">
                  <button type="button" onClick={() => setGuide(true)} aria-label="Guide: tips for this page" className="inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-[14px] font-semibold transition-colors duration-200 hover:bg-default xl:px-3.5">
                    <Book size={18} aria-hidden /> <span className="hidden xl:inline">Guide</span>
                  </button>
                </Hint>
                <WalletChip compact onConnect={() => setConnect(true)} onOpenProfile={() => setProfile(true)} />
                {w.accountId && (
                  <Hint text="Disconnect wallet. Your money and links stay where they are.">
                    <button
                      type="button"
                      aria-label="Disconnect wallet"
                      onClick={() => {
                        setProfile(false);
                        void w.disconnect();
                      }}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-default"
                    >
                      <LogOut size={19} aria-hidden />
                    </button>
                  </Hint>
                )}
              </div>
            </div>
          </header>

          {notice && (
            <div className="px-4 pt-4 sm:px-6 lg:px-10">
              <div className="flex items-center gap-2.5 rounded-full border border-warning/25 bg-warning-soft py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-warning">
                <TriangleAlert size={15} aria-hidden className="shrink-0" />
                <span className="min-w-0 flex-1">Testnet prototype, not audited. {w.network === "mainnet" && w.accountId ? "You're on mainnet: links and sends move real money." : "Test money moves nothing of value."}</span>
                <IconButton
                  label="Dismiss"
                  className="!size-8 shrink-0 hover:!bg-warning/15"
                  onClick={() => {
                    setNotice(false);
                    try {
                      sessionStorage.setItem("notice", "hidden");
                    } catch {}
                  }}
                >
                  <X size={15} />
                </IconButton>
              </div>
            </div>
          )}

          {w.error && !connect && (
            <div className="px-4 pt-4 sm:px-6 lg:px-10">
              <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-[14px]">
                <p>{w.error}</p>
                <button type="button" className="shrink-0 font-semibold underline underline-offset-4" onClick={w.clearError}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Route transition: fade-up-mask (fade plus a 16px rise, 420ms). */}
          <motion.main id="main" key={loc.pathname} initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }} className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pt-8">
            {children}
          </motion.main>
        </div>

        <GuideSheet open={guide} onClose={closeGuide} page={here.guide} />
        <Sheet open={profile && !!w.accountId} onClose={closeProfile} title="Your profile" footer={<Link to="/profile" onClick={closeProfile} className="text-[14px] font-semibold underline underline-offset-4">Open the full profile page</Link>}>
          {w.accountId && <ProfileEditor compact onNavigate={closeProfile} />}
        </Sheet>
        <WalletModal open={connect} onClose={() => setConnect(false)} />
      </div>
    </ShellCtx.Provider>
  );
}

export function AppShell() {
  return (
    <AccountDataProvider>
      <Frame>
        <Outlet />
      </Frame>
    </AccountDataProvider>
  );
}

/** A page's title block. */
export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[clamp(28px,2.4vw+14px,40px)] font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]">{title}</h1>
        {sub && <p className="mt-2 text-[16px] leading-relaxed text-muted [text-wrap:pretty]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
