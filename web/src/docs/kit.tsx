// Building blocks for the docs: headings with anchors, code, callouts, tables, network badges and
// on-chain proof rows. Every page is plain TSX built from these, so the look stays the same everywhere.
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Check, CircleAlert, Copy, ExternalLink, Info, Link2 as LinkIcon, TriangleAlert } from "@/components/icons";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

function Anchor({ id }: { id: string }) {
  return (
    <a href={`#${id}`} aria-label="Link to this section" className="ml-2 inline-flex align-middle text-muted opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100">
      <LinkIcon size={15} aria-hidden />
    </a>
  );
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const a = id ?? slugify(typeof children === "string" ? children : "");
  return (
    <h2 id={a} data-toc="2" className="group mt-14 scroll-mt-24 border-t border-border/70 pt-10 text-[24px] font-extrabold leading-tight tracking-[-0.03em] first:mt-0 first:border-0 first:pt-0 sm:text-[26px]">
      {children}
      <Anchor id={a} />
    </h2>
  );
}

export function H3({ children, id }: { children: string; id?: string }) {
  const a = id ?? slugify(children);
  return (
    <h3 id={a} data-toc="3" className="group mt-9 scroll-mt-24 text-[18px] font-bold tracking-[-0.02em]">
      {children}
      <Anchor id={a} />
    </h3>
  );
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-4 text-[15.5px] leading-[1.75] text-foreground/85", className)}>{children}</p>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[62ch] text-[17.5px] leading-[1.65] text-muted">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[15.5px] leading-[1.7] text-foreground/85 marker:text-muted">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-[15.5px] leading-[1.7] text-foreground/85 marker:font-semibold marker:text-muted">{children}</ol>;
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
  return <code className="rounded-md border border-border/70 bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.86em] text-foreground [overflow-wrap:anywhere]">{children}</code>;
}

/** A link: internal paths use the router, everything else opens in a new tab. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const cls = "font-semibold text-foreground underline decoration-border decoration-2 underline-offset-[3px] transition-colors hover:decoration-foreground";
  if (href.startsWith("/")) return <Link to={href} className={cls}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
      aria-label={done ? "Copied" : label}
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-muted transition-colors hover:bg-default hover:text-foreground"
    >
      {done ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {done ? "Copied" : label}
    </button>
  );
}

/** A code block with a title bar and a copy button. */
export function Code({ children, title, lang }: { children: string; title?: string; lang?: string }) {
  const text = children.replace(/^\n/, "").replace(/\s+$/, "");
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface-secondary/60 py-1 pl-4 pr-1.5">
        <span className="truncate font-mono text-[12px] text-muted">{title ?? lang ?? "code"}</span>
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-foreground [scrollbar-width:thin]">
        <code>{text}</code>
      </pre>
    </div>
  );
}

const CALLOUT = {
  note: { icon: Info, cls: "border-border bg-surface-secondary", label: "Note" },
  warning: { icon: TriangleAlert, cls: "border-warning/30 bg-warning-soft", label: "Warning" },
  limit: { icon: CircleAlert, cls: "border-border bg-surface", label: "Limit" },
  success: { icon: Check, cls: "border-success/30 bg-success-soft", label: "Verified" },
} as const;

export function Callout({ kind = "note", title, children }: { kind?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const c = CALLOUT[kind];
  const Icon = c.icon;
  return (
    <div className={cn("mt-6 flex gap-3 rounded-xl border px-4 py-3.5", c.cls)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 text-[14.5px] leading-relaxed">
        <p className="font-bold">{title ?? c.label}</p>
        <div className="mt-0.5 text-foreground/85 [&_p]:mt-1.5">{children}</div>
      </div>
    </div>
  );
}

export type Net = "mainnet" | "testnet" | "arbitrum";

/** Says which network something lives on. Mainnet means real money. */
export function NetBadge({ net, className }: { net: Net; className?: string }) {
  const s = {
    mainnet: ["bg-gold/20 text-gold-ink", "Mainnet"],
    testnet: ["border border-border text-muted", "Testnet"],
    arbitrum: ["border border-border text-muted", "Arbitrum"],
  }[net];
  return <span className={cn("inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-bold uppercase tracking-[0.04em]", s[0], className)}>{s[1]}</span>;
}

/** A plain table. `head` is the header row; each row is a list of cells. */
export function Table({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("mt-6 overflow-x-auto rounded-xl border border-border [scrollbar-width:thin]", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead className="bg-surface-secondary/70">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap border-b border-border px-4 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.04em] text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 leading-relaxed text-foreground/90">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EXPLORER: Record<Net, { tx: string; account?: string }> = {
  testnet: { tx: "https://testnet.nearblocks.io/txns/", account: "https://testnet.nearblocks.io/address/" },
  mainnet: { tx: "https://nearblocks.io/txns/", account: "https://nearblocks.io/address/" },
  arbitrum: { tx: "https://arbiscan.io/tx/" },
};

export const short = (h: string) => (h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-5)}` : h);
export const txUrl = (net: Net, hash: string) => EXPLORER[net].tx + hash;
export const accountUrl = (net: "mainnet" | "testnet", id: string) => EXPLORER[net].account + id;

/** One transaction that proves a claim: network, what it shows, the hash, and a link to the explorer. */
export interface ProofItem {
  net: Net;
  hash: string;
  label: string;
  shows: ReactNode;
  result?: "ok" | "refused";
}

export function Proof({ items, title, note }: { items: ProofItem[]; title?: string; note?: ReactNode }) {
  return (
    <figure className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
      {title && (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-surface-secondary/60 px-4 py-2.5">
          <span className="text-[13px] font-bold">{title}</span>
          <span className="text-[12px] font-semibold text-muted">Opens the explorer for that chain</span>
        </figcaption>
      )}
      <ul className="divide-y divide-border/60">
        {items.map((p) => (
          <li key={p.hash} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex shrink-0 items-center gap-2 sm:w-[132px] sm:flex-col sm:items-start">
              <NetBadge net={p.net} />
              {p.result && (
                <span className={cn("text-[12px] font-bold", p.result === "ok" ? "text-success" : "text-danger")}>{p.result === "ok" ? "Succeeded" : "Refused on-chain"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold">{p.label}</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{p.shows}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:pt-0.5">
              <a
                href={txUrl(p.net, p.hash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-mono text-[12.5px] font-semibold transition-colors hover:bg-surface-secondary"
                aria-label={`Open transaction ${p.hash} in the explorer`}
              >
                {short(p.hash)} <ExternalLink size={12} aria-hidden />
              </a>
              <CopyButton text={p.hash} label="Copy" />
            </div>
          </li>
        ))}
      </ul>
      {note && <div className="border-t border-border/70 px-4 py-3 text-[13px] leading-relaxed text-muted">{note}</div>}
    </figure>
  );
}

/** An account on NEAR, linked to its explorer page. */
export function Account({ id, net = "testnet" }: { id: string; net?: "mainnet" | "testnet" }) {
  return (
    <a href={accountUrl(net, id)} target="_blank" rel="noreferrer" className="font-mono text-[0.86em] font-semibold text-foreground underline decoration-border underline-offset-[3px] [overflow-wrap:anywhere] hover:decoration-foreground">
      {id}
      <ExternalLink size={11} className="ml-1 inline align-[-1px]" aria-hidden />
    </a>
  );
}

/** An API endpoint: method, path, and whether the public site serves it. */
export function Endpoint({ method, path, children, local }: { method: "GET" | "POST"; path: string; children: ReactNode; local?: boolean }) {
  return (
    <div className="mt-8 scroll-mt-24" id={slugify(`${method} ${path}`)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex h-6 items-center rounded-md px-2 font-mono text-[12px] font-bold", method === "GET" ? "bg-accent-soft text-foreground" : "bg-gold/20 text-gold-ink")}>{method}</span>
        <code className="font-mono text-[14.5px] font-semibold [overflow-wrap:anywhere]">{path}</code>
        {local && <span className="inline-flex h-[22px] items-center rounded-full border border-border px-2.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-muted">Local only</span>}
      </div>
      <div className="mt-2 text-[15px] leading-[1.7] text-foreground/85 [&>p]:mt-2">{children}</div>
    </div>
  );
}

/** Numbered steps with a rail on the left. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-6 flex flex-col gap-6 border-l border-border pl-6 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="relative [counter-increment:step] before:absolute before:-left-[37px] before:top-0 before:flex before:size-[26px] before:items-center before:justify-center before:rounded-full before:border before:border-border before:bg-background before:text-[12.5px] before:font-bold before:content-[counter(step)]">
      <p className="text-[16px] font-bold tracking-[-0.01em]">{title}</p>
      <div className="mt-1 text-[15px] leading-[1.7] text-foreground/85 [&>p]:mt-2">{children}</div>
    </li>
  );
}

/** A grid of cards that link to other docs pages. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function DocCard({ to, title, children, badge }: { to: string; title: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <Link to={to} className="group flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 transition-[border-color,background-color] duration-200 hover:border-foreground/25 hover:bg-surface-secondary/60">
      <span className="flex items-center gap-2">
        <span className="text-[15.5px] font-bold tracking-[-0.01em]">{title}</span>
        {badge}
      </span>
      <span className="text-[14px] leading-relaxed text-muted">{children}</span>
    </Link>
  );
}

/** Key facts in a definition list: label on the left, value on the right. */
export function Facts({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="mt-6 divide-y divide-border/60 rounded-xl border border-border bg-surface">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6">
          <dt className="shrink-0 text-[13.5px] font-semibold text-muted sm:w-[200px]">{k}</dt>
          <dd className="min-w-0 text-[14.5px] leading-relaxed">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
