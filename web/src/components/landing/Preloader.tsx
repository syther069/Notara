// The first-visit preloader (progress-fill-horizontal, per the redesign brief, section 15).
// Canopy screen; the wordmark is revealed left to right (900ms); a 1px line fills left to right
// (1600ms, expo-out); the line grows to cover the screen, then wipes upward (320ms) to show the hero.
// Shown once a day (a cookie remembers it). Under reduced motion it is a 300ms fade and nothing else.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SealMark } from "@/components/Layout";

const COOKIE = "notara_preloaded";
const seen = () => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));

export function Preloader({ onDone }: { onDone?: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"off" | "fill" | "cover" | "lift">(() => (seen() ? "off" : "fill"));

  useEffect(() => {
    if (phase === "off") {
      onDone?.();
      return;
    }
    document.cookie = `${COOKIE}=1; max-age=86400; path=/; samesite=lax`;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const timers = reduce
      ? [setTimeout(() => setPhase("off"), 900)]
      : [setTimeout(() => setPhase("cover"), 1750), setTimeout(() => setPhase("lift"), 2050), setTimeout(() => setPhase("off"), 2400)];
    return () => {
      timers.forEach(clearTimeout);
      document.documentElement.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (phase === "off") {
      document.documentElement.style.overflow = "";
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <AnimatePresence>
      {phase !== "off" && (
        <motion.div
          key="preloader"
          role="status"
          aria-label="Loading Notara"
          className="nt fixed inset-0 z-[200] flex items-center justify-center bg-canopy text-cream"
          initial={{ opacity: 1 }}
          animate={reduce ? { opacity: 1 } : { y: phase === "lift" ? "-100%" : 0 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0.3 } } : { opacity: 1, transition: { duration: 0 } }}
          transition={{ duration: 0.32, ease: [0.7, 0, 0.2, 1] }}
        >
          <div className="flex w-[min(78vw,340px)] flex-col items-center gap-7">
            <motion.div
              className="flex items-center gap-3 text-[34px] font-extrabold tracking-[-0.05em]"
              initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 100% 0 0)" }}
              animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: reduce ? 0.3 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <SealMark className="size-9 text-mint" tick="var(--color-canopy)" /> Notara
            </motion.div>
            {!reduce && (
              <div className="relative h-px w-full bg-cream/15">
                <motion.div className="absolute inset-0 origin-left bg-mint" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            )}
          </div>
          {/* The line grows to cover the screen before the whole panel lifts away. */}
          {!reduce && <motion.div aria-hidden className="absolute inset-x-0 top-1/2 h-px origin-center bg-mint" initial={{ scaleY: 1, opacity: 0 }} animate={phase === "fill" ? { scaleY: 1, opacity: 0 } : { scaleY: 2400, opacity: 1 }} transition={{ duration: 0.3, ease: [0.7, 0, 0.2, 1] }} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
