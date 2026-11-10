// The customer's side, drawn live in a device frame next to the composer. It shows only what the
// customer will really see; nothing in it is invented.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleX, Clock, Laptop, Lock, Phone } from "@/components/icons";
import { AnimatedNumber } from "@/components/vengeance/animated-number";
import { SealMark } from "@/components/Layout";
import { Segmented } from "./ui";

/** The value, 150ms after it last changed. */
export function useDebounced<T>(value: T, ms = 150): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export type PreviewCheck = { state: "ok" | "wait" | "bad"; text: string };

/** A phone or laptop frame that leans toward the pointer (4° at most; still under reduced motion). */
export function DeviceStage({ children, label }: { children: ReactNode; label: string }) {
  const [device, setDevice] = useState<"phone" | "laptop">("phone");
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div data-theme="dark" className="rounded-3xl bg-canopy p-5 text-cream shadow-card sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-mint">{label}</p>
        <Segmented
          label="Preview device"
          value={device}
          onChange={setDevice}
          options={[
            { value: "phone", label: (<><Phone size={14} aria-hidden /> Phone</>) },
            { value: "laptop", label: (<><Laptop size={14} aria-hidden /> Laptop</>) },
          ]}
        />
      </div>
      <div
        ref={ref}
        className="flex min-h-[440px] items-center justify-center [perspective:1200px]"
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse" || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
        }}
        onPointerLeave={() => {
          rx.set(0);
          ry.set(0);
        }}
      >
        <motion.div style={{ rotateX: rx, rotateY: ry }} layout={!reduce} transition={{ type: "spring", stiffness: 260, damping: 28 }} className={cn("w-full", device === "phone" ? "max-w-[300px]" : "max-w-[520px]")}>
          <div data-theme="light" className={cn("overflow-hidden border-moss bg-background text-foreground shadow-pop", device === "phone" ? "rounded-[36px] border-[7px]" : "rounded-2xl border-[5px]")}>
            {children}
          </div>
          {device === "laptop" && <div className="mx-auto h-2.5 w-[112%] -translate-x-[5.35%] rounded-b-2xl bg-moss" aria-hidden />}
        </motion.div>
      </div>
    </div>
  );
}

/** Notara's public payment (or claim) page, at preview size. */
export function PagePreview({ path, who, website, forText, emptyFor, amount, unit, checks, primary, secondary }: {
  path: string;
  who: ReactNode;
  website?: string | null;
  forText: string;
  emptyFor: string;
  /** The figure only ("12.50"); it rolls when it changes. */
  amount: string;
  unit: string;
  checks: PreviewCheck[];
  primary: string;
  secondary?: string;
}) {
  return (
    <div role="img" aria-label={`Preview of the page your link opens: ${forText || emptyFor}, ${amount} ${unit}`}>
      <div aria-hidden>
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-3 py-2 text-[10.5px] text-muted">
          <Lock size={10} />
          <span className="truncate font-mono">
            {location.host}
            {path}
          </span>
        </div>
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-5">
          <div className="flex items-center gap-2 text-[12px] font-extrabold tracking-[-0.03em]">
            <SealMark className="size-4 text-accent" /> Notara
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted">Pay</p>
            <p className="break-all font-mono text-[12px] font-semibold">{who}</p>
            {website && <p className="mt-0.5 text-[11px] text-success">Website proven: {website}</p>}
          </div>
          <p className={cn("text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]", !forText && "text-muted/70")}>{forText || emptyFor}</p>
          <p className="tnum flex items-baseline gap-1.5 text-[34px] font-extrabold leading-none tracking-[-0.04em]">
            <AnimatedNumber value={amount} />
            <span className="text-[13px] font-bold tracking-normal text-muted">{unit}</span>
          </p>
          <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
            {checks.map((c) => (
              <li key={c.text} className={cn("flex items-start gap-1.5 text-[11.5px] font-medium leading-snug", c.state === "ok" ? "text-success" : c.state === "bad" ? "text-danger" : "text-muted")}>
                {c.state === "ok" ? <CircleCheck size={13} className="mt-px shrink-0" /> : c.state === "bad" ? <CircleX size={13} className="mt-px shrink-0" /> : <Clock size={13} className="mt-px shrink-0" />}
                {c.text}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5">
            <span className="flex h-10 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">{primary}</span>
            {secondary && <span className="flex h-9 items-center justify-center rounded-full border border-border text-[12px] font-semibold">{secondary}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The 400ms check mark that draws itself after a successful write. No confetti. */
export function DrawnCheck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 48 48" className={cn("size-12", className)} fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="var(--color-mint)" fillOpacity=".35" />
      <motion.path d="m14 24.500 7 7 13.500-14" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} />
    </svg>
  );
}

/**
 * A large amount field. What you type is the real input; the digits you see roll as they change.
 * `error` goes underneath; `aside` sits at the right (a Max chip, the currency).
 */
export function AmountInput({ id, value, onChange, onBlur, invalid, describedBy, aside }: { id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; invalid?: boolean; describedBy?: string; aside?: ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 transition-[border-color,box-shadow] duration-[180ms] focus-within:border-focus focus-within:shadow-[inset_0_0_0_0.5px_var(--focus)]", invalid ? "border-danger" : "border-border hover:border-separator-tertiary")}>
      <span className="text-[28px] font-bold text-muted" aria-hidden>$</span>
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder="0.00"
          className="tnum w-full bg-transparent text-[40px] font-extrabold leading-[1.15] tracking-[-0.04em] text-transparent caret-foreground placeholder:text-muted/50 focus-visible:!outline-none"
        />
        <span className="tnum pointer-events-none absolute inset-0 flex items-center text-[40px] font-extrabold leading-[1.15] tracking-[-0.04em]" aria-hidden>
          {value && <AnimatedNumber value={value} />}
        </span>
      </div>
      {aside}
    </div>
  );
}
