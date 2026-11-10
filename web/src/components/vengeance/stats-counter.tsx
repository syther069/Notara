// Stats Counter, adapted from Vengeance UI (https://www.vengenceui.com/components/stats-counter).
// Changed for Notara: it counts with a timed tween instead of a spring (the spring's duration option
// changed meaning in Motion 12 and left the figure at 0), it re-counts from the last value when the
// value changes, and under reduced motion it shows the figure at once.
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface StatsCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function StatsCounter({ value, duration = 1.5, prefix = "", suffix = "", decimals = 0, className }: StatsCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (!isInView) return;
    if (reduce) {
      shown.current = value;
      setDisplayValue(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        shown.current = latest;
        setDisplayValue(latest);
      },
    });
    return () => controls.stop();
  }, [isInView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
      <span aria-hidden>
        {prefix}
        {displayValue.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}
