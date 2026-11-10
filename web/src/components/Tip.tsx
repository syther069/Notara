import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, CircleX, Info, LoaderCircle } from "./icons";

/**
 * Supplementary help next to a term (the UI notes: a tooltip is never the only place a required fact,
 * an error or a reason lives). Opens on hover after a short intent delay, at once on keyboard focus or a
 * tap; stays open while the pointer moves into it; Escape, a tap elsewhere or leaving closes it.
 */
export function Tip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [right, setRight] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const later = (v: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(v), ms);
  };
  useEffect(() => {
    if (!open) return;
    // flip to the left edge of the trigger when the tip would run past the screen
    const r = root.current?.getBoundingClientRect();
    setRight(!!r && r.left + 300 > window.innerWidth - 16);
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span
      ref={root}
      className="tip"
      onPointerEnter={(e) => e.pointerType === "mouse" && later(true, 250)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(false, 150)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="tip__btn"
        aria-label={`What is ${label}?`}
        aria-describedby={id}
        aria-expanded={open}
        // keyboard focus opens it; a mouse or tap focus doesn't, so the click that follows can toggle it
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && later(true, 0)}
        onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && later(false, 0)}
        onClick={() => setOpen((o) => !o)}
      >
        <Info size={14} aria-hidden />
      </button>
      <span role="tooltip" id={id} className={`tip__body${open ? " is-open" : ""}${right ? " is-right" : ""}`}>
        {children}
      </span>
    </span>
  );
}

/**
 * A thin bar across the top of the screen while real work is pending (a load, a refresh). Indeterminate:
 * Notara can't know how far a network call is, so it never shows an invented percentage.
 */
export function LoadBar({ on, label }: { on: boolean; label: string }) {
  if (!on) return null;
  return <div className="loadbar" role="progressbar" aria-label={label} aria-busy="true" />;
}

export type Stage = { text: ReactNode; state: "done" | "now" | "todo" | "failed" };

/** The real stages of one action (wallet signature, chain, list update), each marked as it happens. */
export function StageList({ stages, label }: { stages: Stage[]; label: string }) {
  return (
    <ol className="stages" aria-label={label}>
      {stages.map((s, i) => (
        <li key={i} className={`stages__s is-${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
          <span className="stages__dot" aria-hidden>
            {s.state === "done" ? <Check size={13} /> : s.state === "now" ? <LoaderCircle size={13} className="spin" /> : s.state === "failed" ? <CircleX size={13} /> : i + 1}
          </span>
          <span>
            {s.text}
            <span className="sr-only">{s.state === "done" ? " (done)" : s.state === "now" ? " (in progress)" : s.state === "failed" ? " (failed)" : ""}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
