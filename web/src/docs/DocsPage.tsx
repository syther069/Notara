// The docs: a top bar, a grouped sidebar, the article, an "On this page" outline and search.
// Content lives in ./pages; the table of contents in ./nav.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { NotaraMark } from "@/components/Layout";
import { SpinThemeToggle } from "@/components/app/SpinThemeToggle";
import { ArrowLeft, ArrowRight, ChevronDown, Github, Menu, Pencil, Search, X } from "@/components/icons";
import { EASE } from "@/components/app/ui";
import { DOCS, GROUPS, REPO, UPDATED, docPath, type DocPage } from "./nav";
import { PAGES } from "./pages";
import { NetBadge } from "./kit";

function Sidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Docs" className="flex flex-col gap-7 pb-10">
      {GROUPS.map((g) => (
        <div key={g}>
          <p className="mb-2 px-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">{g}</p>
          <ul className="flex flex-col gap-0.5">
            {DOCS.filter((d) => d.group === g).map((d) => {
              const active = d.slug === current;
              return (
                <li key={d.slug}>
                  <NavLink
                    to={docPath(d.slug)}
                    end
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center justify-between gap-2 rounded-lg px-3 py-[7px] text-[14px] transition-colors duration-150",
                      active ? "bg-surface-secondary font-semibold text-foreground" : "text-foreground/75 hover:bg-surface-secondary/60 hover:text-foreground",
                    )}
                  >
                    {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" />}
                    <span className="truncate">{d.title}</span>
                    {d.mainnet && <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-label="Mainnet" title="Mainnet" />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

type Heading = { id: string; text: string; level: number };

/** Reads the article's h2/h3 after each render of a page, and tracks which one is in view. */
function useOutline(key: string) {
  const [items, setItems] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const root = document.getElementById("doc-article");
    if (!root) return;
    const hs = [...root.querySelectorAll<HTMLElement>("[data-toc]")];
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? "", level: Number(h.dataset.toc) })));
    setActive(hs[0]?.id ?? "");
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [key]);
  return { items, active };
}

function Outline({ items, active }: { items: Heading[]; active: string }) {
  if (!items.length) return null;
  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">On this page</p>
      <ul className="flex flex-col gap-1 border-l border-border">
        {items.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l py-1 text-[13px] leading-snug transition-colors",
                h.level === 3 ? "pl-6" : "pl-3",
                active === h.id ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD");

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const results = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return DOCS;
    const words = t.split(/\s+/);
    return DOCS.map((d) => {
      const title = norm(d.title);
      const hay = `${title} ${norm(d.description)} ${norm(d.group)} ${norm(d.keywords ?? "")}`;
      if (!words.every((w) => hay.includes(w))) return null;
      return { d, score: (title.startsWith(t) ? 3 : 0) + (title.includes(t) ? 2 : 0) };
    })
      .filter((x): x is { d: DocPage; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.d);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setI(0);
    const t = setTimeout(() => input.current?.focus(), 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => setI(0), [q]);

  const go = (d: DocPage) => {
    onClose();
    nav(docPath(d.slug));
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="nt fixed inset-0 z-[85] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search the docs" data-theme={document.documentElement.dataset.theme}>
          <motion.div className="absolute inset-0 bg-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-pop"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={18} className="shrink-0 text-muted" aria-hidden />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  else if (e.key === "ArrowDown") (e.preventDefault(), setI((n) => Math.min(n + 1, results.length - 1)));
                  else if (e.key === "ArrowUp") (e.preventDefault(), setI((n) => Math.max(n - 1, 0)));
                  else if (e.key === "Enter" && results[i]) go(results[i]);
                }}
                placeholder="Search the docs"
                aria-label="Search the docs"
                aria-controls="doc-search-results"
                aria-activedescendant={results[i] ? `doc-r-${results[i].slug || "home"}` : undefined}
                className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
              />
              <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline">Esc</kbd>
            </div>
            <ul id="doc-search-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2 [scrollbar-width:thin]">
              {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">No page matches "{q}".</li>}
              {results.map((d, n) => (
                <li key={d.slug} id={`doc-r-${d.slug || "home"}`} role="option" aria-selected={n === i}>
                  <button
                    type="button"
                    onMouseEnter={() => setI(n)}
                    onClick={() => go(d)}
                    className={cn("flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left", n === i ? "bg-surface-secondary" : "")}
                  >
                    <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                      {d.title} {d.mainnet && <NetBadge net="mainnet" />}
                    </span>
                    <span className="line-clamp-1 text-[13px] text-muted">
                      {d.group} · {d.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function DocsPage() {
  const { slug = "" } = useParams();
  const loc = useLocation();
  const reduce = useReducedMotion();
  const idx = DOCS.findIndex((d) => d.slug === slug);
  const doc = DOCS[idx];
  const Body = doc ? PAGES[doc.slug] : undefined;
  const prev = idx > 0 ? DOCS[idx - 1] : undefined;
  const next = idx >= 0 && idx < DOCS.length - 1 ? DOCS[idx + 1] : undefined;
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const { items, active } = useOutline(slug);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  useEffect(() => {
    document.title = doc ? `${doc.title} · Notara Docs` : "Page not found · Notara Docs";
  }, [doc]);

  // New page: go to the top, or to the #section the link named.
  useEffect(() => {
    const id = decodeURIComponent(loc.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }, [slug, loc.hash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="nt min-h-dvh bg-background font-sans text-foreground">
      <a href="#doc-article" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open the docs menu" className="-ml-1.5 inline-flex size-10 items-center justify-center rounded-full hover:bg-default lg:hidden">
            <Menu size={20} />
          </button>
          <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label="Notara home">
            <NotaraMark className="size-7 text-accent" />
            <span className="text-[18px] font-extrabold tracking-[-0.04em]">Notara</span>
          </Link>
          <span aria-hidden className="h-5 w-px bg-border" />
          <Link to="/docs" className="text-[15px] font-semibold text-muted transition-colors hover:text-foreground">
            Docs
          </Link>

          <button
            type="button"
            onClick={() => setSearch(true)}
            className="ml-auto inline-flex h-10 items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 text-[14px] text-muted transition-colors hover:border-foreground/25 hover:text-foreground sm:w-[260px] md:w-[300px]"
            aria-label="Search the docs"
          >
            <Search size={16} aria-hidden />
            <span className="hidden flex-1 text-left sm:inline">Search the docs</span>
            <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <a href={REPO} target="_blank" rel="noreferrer" aria-label="Notara on GitHub" className="hidden size-10 items-center justify-center rounded-full hover:bg-default sm:inline-flex">
            <Github size={19} />
          </a>
          <SpinThemeToggle />
          <Link to="/dashboard" className="hidden h-10 items-center rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 md:inline-flex">
            Open the app
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_220px]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] overflow-y-auto pt-8 [scrollbar-width:thin] lg:block">
          <Sidebar current={slug} />
        </aside>

        <main className="min-w-0 pb-24 pt-8 sm:pt-10">
          {!doc || !Body ? (
            <div className="py-20">
              <h1 className="text-[34px] font-extrabold tracking-[-0.04em]">Page not found</h1>
              <p className="mt-3 text-muted">There's no docs page at this address.</p>
              <Link to="/docs" className="mt-6 inline-flex font-semibold underline underline-offset-4">
                Go to the docs home
              </Link>
            </div>
          ) : (
            <article id="doc-article" className="mx-auto max-w-[760px]" key={slug}>
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                <Link to="/docs" className="hover:text-foreground">
                  Docs
                </Link>
                <span aria-hidden>/</span>
                <span>{doc.group}</span>
              </nav>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.04em] sm:text-[40px]">{doc.title}</h1>
                {doc.mainnet && <NetBadge net="mainnet" />}
              </div>

              {items.length > 0 && (
                <details className="group mt-6 rounded-xl border border-border bg-surface xl:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
                    On this page <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t border-border/70 px-4 py-3">
                    <Outline items={items} active={active} />
                  </div>
                </details>
              )}

              <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                <Body />
              </motion.div>

              <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-6 text-[13px] text-muted">
                <span>Last updated {UPDATED}</span>
                <a href={`${REPO}/blob/main/web/src/docs/pages/${doc.file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-foreground">
                  <Pencil size={13} aria-hidden /> Edit this page on GitHub
                </a>
              </div>
              <nav aria-label="Previous and next" className="mt-6 grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <Link to={docPath(prev.slug)} className="group flex flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:border-foreground/25 hover:bg-surface">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                      <ArrowLeft size={13} aria-hidden /> Previous
                    </span>
                    <span className="text-[15px] font-bold">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link to={docPath(next.slug)} className="group flex flex-col items-end gap-1 rounded-xl border border-border p-4 text-right transition-colors hover:border-foreground/25 hover:bg-surface">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                      Next <ArrowRight size={13} aria-hidden />
                    </span>
                    <span className="text-[15px] font-bold">{next.title}</span>
                  </Link>
                )}
              </nav>
              <p className="mt-10 text-[12.5px] text-muted">Notara is an independent project built on NEAR. It's a prototype and has not been audited.</p>
            </article>
          )}
        </main>

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] overflow-y-auto pt-10 [scrollbar-width:thin] xl:block">
          <Outline items={items} active={active} />
        </aside>
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col border-r border-border bg-background text-foreground shadow-pop"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={{ duration: 0.32, ease: EASE }}
              aria-label="Docs menu"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4">
                <span className="text-[16px] font-extrabold tracking-[-0.03em]">Notara Docs</span>
                <button type="button" onClick={closeDrawer} aria-label="Close the docs menu" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-default">
                  <X size={19} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pt-5">
                <Sidebar current={slug} onNavigate={closeDrawer} />
                <Link to="/dashboard" onClick={closeDrawer} className="mx-1 mb-8 flex h-11 items-center justify-center rounded-full bg-accent text-[14.5px] font-semibold text-accent-foreground">
                  Open the app
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
