// The landing page's intro, modelled on the loading sequence at solais.ai: a full-screen 12×12 grid of
// blocks, a small bracketed mark that cycles glyphs, a three-line statement, and a block-by-block dissolve
// into the page. Uses Manrope (font-sans) to match Notara's typography across the site.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SealMark } from "@/components/Layout";
import { Link2, ShieldCheck, Wallet } from "@/components/icons";

const COOKIE = "notara_intro";
const LINES = ["Payment links signed by your wallet.", "Counterparties checked across 6 live signals.", "Enforced on-chain by your NEAR vault."];
const COLS = 12;
const ROWS = 12;
let played = false;

const seenToday = () => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function replayPreloader() {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE}=; max-age=0; path=/; samesite=lax`;
  }
  played = false;
  window.dispatchEvent(new CustomEvent("notara:replay-intro"));
}

function Typed({ text, start, className }: { text: string; start: number; className?: string }) {
  return (
    <span className={className} aria-hidden>
      {text.split("").map((ch, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.01, delay: start + i * 0.018 }}>
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Preloader({ onDone }: { onDone?: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"off" | "show" | "leave">(() => (played || seenToday() || prefersReduced() ? "off" : "show"));
  const [runId, setRunId] = useState(0);
  const [glyph, setGlyph] = useState(0);
  const done = useRef(false);
  const order = useMemo(() => Array.from({ length: COLS * ROWS }, () => Math.random()), [runId]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setPhase("off");
    onDone?.();
  }, [onDone]);
  const leave = useCallback(() => setPhase((p) => (p === "show" ? "leave" : p)), []);

  useEffect(() => {
    const onReplay = () => {
      if (prefersReduced()) return;
      done.current = false;
      setGlyph(0);
      setRunId((n) => n + 1);
      setPhase("show");
    };
    window.addEventListener("notara:replay-intro", onReplay);
    return () => window.removeEventListener("notara:replay-intro", onReplay);
  }, []);

  useEffect(() => {
    played = true;
    if (phase === "off") {
      finish();
      return;
    }
    if (phase !== "show") return;
    document.cookie = `${COOKIE}=1; max-age=86400; path=/; samesite=lax`;
    const auto = setTimeout(leave, 2400);
    const hard = setTimeout(finish, 4000);
    const cycle = setInterval(() => setGlyph((g) => (g + 1) % 4), 480);
    const skip = () => leave();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      clearTimeout(auto);
      clearTimeout(hard);
      clearInterval(cycle);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase, runId, leave, finish]);

  useEffect(() => {
    if (phase !== "leave") return;
    const t = setTimeout(finish, 860);
    return () => clearTimeout(t);
  }, [phase, finish]);

  useEffect(() => {
    if (reduce && phase !== "off") finish();
  }, [reduce, phase, finish]);

  if (phase === "off") return null;
  const leaving = phase === "leave";
  const Glyph = [null, Link2, Wallet, ShieldCheck][glyph];

  return (
    <div role="status" aria-label="Notara is loading. Press any key to skip." className="nt fixed inset-0 z-[200] font-sans text-foreground" style={{ pointerEvents: leaving ? "none" : "auto" }}>
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }} aria-hidden>
        {order.map((r, i) => (
          <motion.div
            key={`${runId}-${i}`}
            className="bg-background shadow-[inset_0_0_0_0.5px_color-mix(in_srgb,var(--border)_55%,transparent)]"
            initial={false}
            animate={{ opacity: leaving ? 0 : 1 }}
            transition={{ duration: 0.28, delay: leaving ? r * 0.48 : 0, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </div>

      <motion.div key={runId} className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center" animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.24 }}>
        <div className="pointer-events-none absolute inset-x-6 top-6 flex items-center justify-between text-[13px] font-semibold text-muted sm:inset-x-10 sm:top-8" aria-hidden>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-highlight" /> Notara · Built on NEAR
          </span>
          <span className="font-mono text-[12px]">testnet &amp; mainnet read</span>
        </div>

        <motion.div className="relative size-16 text-highlight" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} aria-hidden>
          <span className="absolute left-0 top-0 size-3.5 border-l-2 border-t-2 border-highlight" />
          <span className="absolute right-0 top-0 size-3.5 border-r-2 border-t-2 border-highlight" />
          <span className="absolute bottom-0 left-0 size-3.5 border-b-2 border-l-2 border-highlight" />
          <span className="absolute bottom-0 right-0 size-3.5 border-b-2 border-r-2 border-highlight" />
          <span className="absolute inset-0 flex items-center justify-center">{Glyph ? <Glyph size={24} strokeWidth={1.6} /> : <SealMark className="size-7" tick="var(--background)" />}</span>
        </motion.div>

        <p className="flex w-fit max-w-full flex-col text-[clamp(20px,3.2vw,36px)] font-extrabold leading-[1.2] tracking-[-0.03em]">
          <span className="sr-only">{LINES.join(" ")}</span>
          <Typed text={LINES[0]} start={0.2} />
          <Typed text={LINES[1]} start={0.65} />
          <Typed text={LINES[2]} start={1.15} className="text-highlight" />
        </p>
      </motion.div>

      <motion.div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between text-[13px] font-semibold text-muted sm:inset-x-10 sm:bottom-8" animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.2 }} aria-hidden>
        <span className="hidden sm:inline">6 live signals · On-chain vault</span>
        <span className="mx-auto text-foreground sm:mx-0">
          Loading
          {[0, 1, 2].map((i) => (
            <motion.span key={i} animate={{ opacity: [0.15, 1, 0.15] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}>
              .
            </motion.span>
          ))}
        </span>
        <span className="hidden sm:inline">Click or press any key to skip</span>
      </motion.div>
    </div>
  );
}
