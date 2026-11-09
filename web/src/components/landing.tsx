import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ChevronDown } from "./icons";

export interface TrustItem {
  icon: ReactNode;
  title: string;
  body: string;
  panel: ReactNode;
}

/**
 * A large list where the row in view lights up and shows its detail beside it.
 * The idea comes from the Skiper 24 preview (skiper-ui.com/v1/skiper24); its source is paid and
 * was not used. Rows are buttons, so keyboard and touch users can pick one too. Every row stays
 * readable whichever one is active.
 */
export function TrustList({ items }: { items: TrustItem[] }) {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(rows.current.indexOf(e.target as HTMLLIElement));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    rows.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="trust-grid">
        <ul className="trust-list">
          {items.map((it, i) => (
            <li key={it.title} ref={(el) => void (rows.current[i] = el)} className={active === i ? "on" : ""}>
              <button
                aria-pressed={active === i}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              >
                <h3>
                  {it.icon}
                  {it.title}
                </h3>
                <p>{it.body}</p>
              </button>
            </li>
          ))}
        </ul>
        <div className="trust-panel" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              {items[active]?.panel}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

/**
 * Questions that open in place. An open row parts from its neighbours and the others stay joined.
 * The idea comes from the Skiper 103 preview (skiper-ui.com/v1/skiper103); its source is paid and
 * was not used.
 */
export function ExpandGroup({ items }: { items: { title: string; body: ReactNode }[] }) {
  const base = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  const R = 16;
  return (
    <MotionConfig reducedMotion="user">
      <ul className="xgroup">
        {items.map((it, i) => {
          const isOpen = open.has(i);
          const parted = i > 0 && (isOpen || open.has(i - 1));
          const top = i === 0 || parted ? R : 0;
          const bottom = i === items.length - 1 || isOpen || open.has(i + 1) ? R : 0;
          return (
            <motion.li
              key={it.title}
              layout="position"
              initial={false}
              animate={{ marginTop: parted ? 10 : 0, borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }}
              transition={SPRING}
              style={{ borderTopWidth: parted || i === 0 ? 1 : 0 }}
            >
              <h3 style={{ margin: 0 }}>
                <button className="x-head" aria-expanded={isOpen} aria-controls={`${base}-${i}`} onClick={() => toggle(i)}>
                  {it.title}
                  <ChevronDown size={20} aria-hidden />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`${base}-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="x-body">{it.body}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </MotionConfig>
  );
}
