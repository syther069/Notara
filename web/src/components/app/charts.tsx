// Small SVG charts: line and area only. No pies, no donuts.
import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "./ui";

function path(values: number[], w: number, h: number, pad: number, max: number) {
  const n = values.length;
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => h - pad - (max === 0 ? 0 : (v / max) * (h - pad * 2));
  return { d: values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" "), x, y };
}

/** A tiny trend line for a KPI card. Decorative: the card's figure and delta carry the meaning. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...values, 0);
  const { d } = path(values, 120, 36, 4, max);
  return (
    <svg viewBox="0 0 120 36" className={className} preserveAspectRatio="none" aria-hidden>
      <motion.path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE }} />
    </svg>
  );
}

const money = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Money in against money out, per day. Hover or focus a day for its figures. */
export function FlowChart({ data }: { data: { day: number; in: number; out: number }[] }) {
  const id = useId();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 240;
  const max = useMemo(() => Math.max(...data.map((d) => Math.max(d.in, d.out)), 0), [data]);
  const pin = path(data.map((d) => d.in), W, H, 18, max);
  const pout = path(data.map((d) => d.out), W, H, 18, max);
  const area = `${pin.d} L${W} ${H} L0 ${H} Z`;
  const day = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const shown = hover ?? data.length - 1;
  const totalIn = data.reduce((s, d) => s + d.in, 0);
  const totalOut = data.reduce((s, d) => s + d.out, 0);
  return (
    <figure>
      <figcaption className="sr-only">
        Money in and out per day over the last {data.length} days. Received {money(totalIn)}, sent {money(totalOut)}.
      </figcaption>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-semibold">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-success" /> In <span className="tnum text-muted">{money(data[shown]?.in ?? 0)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-gold-ink" /> Out <span className="tnum text-muted">{money(data[shown]?.out ?? 0)}</span>
        </span>
        <span className="ml-auto text-muted">{hover === null ? `Latest day, ${day(data[shown]?.day ?? Date.now())}` : day(data[shown].day)}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Activity chart">
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--success)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--success)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          <motion.path d={area} fill={`url(#${id})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={pin.d} fill="none" stroke="var(--success)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
          <motion.path d={pout.d} fill="none" stroke="var(--gold-ink)" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
          {hover !== null && <line x1={pin.x(hover)} x2={pin.x(hover)} y1="0" y2={H} stroke="var(--foreground)" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* One invisible, focusable column per day. */}
        <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <button key={d.day} type="button" tabIndex={i === data.length - 1 ? 0 : -1} aria-label={`${day(d.day)}: in ${money(d.in)}, out ${money(d.out)}`} className="h-full flex-1 !outline-none focus-visible:bg-foreground/5" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                const sib = e.key === "ArrowRight" ? e.currentTarget.nextElementSibling : e.key === "ArrowLeft" ? e.currentTarget.previousElementSibling : null;
                (sib as HTMLElement | null)?.focus();
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted">
        <span>{day(data[0]?.day ?? Date.now())}</span>
        <span>{day(data[data.length - 1]?.day ?? Date.now())}</span>
      </div>
    </figure>
  );
}
