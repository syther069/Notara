// Expanding pieces for the landing page, adapted from skiper-components.md and re-tokened to Notara:
// cards where one opens to fill its group (after Skiper 23), rows where the open one parts from its
// neighbours (after Skiper 103), and a caret that glides between characters (after Skiper 106).
import * as React from "react";
import { AnimatePresence, motion, MotionConfig, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "@/components/icons";

export interface ExpandCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  detail: React.ReactNode;
}

/** Surface fills only; each pairs with text that passes AA on it in both themes. */
const FILLS = ["bg-surface text-foreground", "bg-surface-secondary text-foreground", "bg-moss text-cream", "bg-surface-tertiary text-foreground", "bg-surface text-foreground", "bg-moss text-cream"];
const CARD_SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

/**
 * Small cards where one opens to fill the group and shows more. Focus moves into the open card and back
 * to its card on closing; Escape closes.
 */
export function ExpandCards({ cards, label }: { cards: ExpandCard[]; label: string }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const triggers = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const lastOpen = React.useRef<string | null>(null);
  const openIndex = cards.findIndex((card) => card.id === openId);
  const open = openIndex >= 0 ? cards[openIndex] : null;

  React.useEffect(() => {
    if (openId) {
      lastOpen.current = openId;
      closeRef.current?.focus({ preventScroll: true });
    } else if (lastOpen.current) {
      triggers.current[lastOpen.current]?.focus({ preventScroll: true });
      lastOpen.current = null;
    }
  }, [openId]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="group"
        aria-label={label}
        className="relative grid min-h-[34rem] grid-cols-2 gap-3 sm:gap-4 lg:min-h-[26rem] lg:grid-cols-3"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpenId(null);
        }}
      >
        {cards.map((card, index) => (
          <motion.button
            key={card.id}
            ref={(element) => {
              triggers.current[card.id] = element;
            }}
            layoutId={`card-${card.id}`}
            type="button"
            aria-expanded={openId === card.id}
            tabIndex={open ? -1 : 0}
            onClick={() => setOpenId(card.id)}
            transition={CARD_SPRING}
            style={{ borderRadius: 24 }}
            className={cn("flex min-h-36 flex-col justify-between gap-6 border border-border p-4 text-left sm:p-5", FILLS[index % FILLS.length], open && "pointer-events-none")}
          >
            <motion.span layout="position" className="block">
              {card.icon}
            </motion.span>
            <motion.span layout="position" className="block">
              <span className="block text-[18px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[20px]">{card.title}</span>
              <span className="mt-1 block text-[13.5px] leading-snug opacity-80">{card.hint}</span>
            </motion.span>
          </motion.button>
        ))}
        <AnimatePresence>
          {open && (
            <motion.div
              key={open.id}
              layoutId={`card-${open.id}`}
              role="group"
              aria-label={open.title}
              transition={CARD_SPRING}
              style={{ borderRadius: 24 }}
              className={cn("absolute inset-0 z-10 flex flex-col overflow-y-auto border border-border p-5 sm:p-7", FILLS[openIndex % FILLS.length])}
            >
              <div className="flex items-start justify-between gap-4">
                <motion.span layout="position" className="block">
                  {open.icon}
                </motion.span>
                <button ref={closeRef} type="button" onClick={() => setOpenId(null)} aria-label={`Close ${open.title}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground/10 transition-colors hover:bg-foreground/20">
                  <X size={18} aria-hidden />
                </button>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, delay: 0.08 }} className="mt-4 flex min-h-0 flex-1 flex-col">
                <h3 className="text-[24px] font-extrabold tracking-[-0.03em]">{open.title}</h3>
                {open.detail}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

const ROW_SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

/** A group of rows. An open row parts from its neighbours; the others stay joined. */
export function ExpandGroup({ items, className }: { items: { title: string; body: React.ReactNode }[]; className?: string }) {
  const baseId = React.useId();
  const [openRows, setOpenRows] = React.useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  return (
    <MotionConfig reducedMotion="user">
      <ul className={className}>
        {items.map((item, index) => {
          const open = openRows.has(index);
          const parted = index > 0 && (open || openRows.has(index - 1));
          const roundTop = index === 0 || parted;
          const roundBottom = index === items.length - 1 || open || openRows.has(index + 1);
          return (
            <motion.li
              key={item.title}
              layout="position"
              animate={{ marginTop: parted ? 10 : 0, borderTopLeftRadius: roundTop ? 22 : 0, borderTopRightRadius: roundTop ? 22 : 0, borderBottomLeftRadius: roundBottom ? 22 : 0, borderBottomRightRadius: roundBottom ? 22 : 0 }}
              initial={false}
              transition={ROW_SPRING}
              className={cn("overflow-hidden bg-surface", index > 0 && !parted && "border-t border-border")}
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`${baseId}-${index}`}
                  onClick={() => toggle(index)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-[17px] font-bold tracking-[-0.01em] transition-colors hover:bg-surface-secondary focus-visible:!outline-offset-[-2px] sm:px-6"
                >
                  {item.title}
                  <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-muted transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div key="panel" id={`${baseId}-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={ROW_SPRING} className="overflow-hidden">
                    <div className="max-w-[62ch] px-5 pb-5 text-[16px] text-muted sm:px-6">{item.body}</div>
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

const CARET_SPRING = { stiffness: 500, damping: 30, mass: 0.5 };

/**
 * A caret that glides between characters, as an overlay on a real text input. The native caret is hidden
 * only while this one is showing, and stays for reduced motion, forced colours and right-aligned fields.
 * Place it inside the input's `relative` wrapper.
 */
export function SmoothCaret({ inputRef, value }: { inputRef: React.RefObject<HTMLInputElement | null>; value: unknown }) {
  const reduced = useReducedMotion();
  const target = useMotionValue(0);
  const x = useSpring(target, CARET_SPRING);
  const opacity = useMotionValue(0);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const placeRef = React.useRef<(jump?: boolean) => void>(() => {});

  React.useEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    if (!input || !measure || reduced) return;
    if (window.matchMedia("(forced-colors: active)").matches) return;

    const place = (jump = false) => {
      if (document.activeElement !== input) return;
      const styles = window.getComputedStyle(input);
      if (styles.textAlign === "right" || styles.textAlign === "center") return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const index = input.selectionDirection === "backward" ? start : end;
      measure.style.font = styles.font;
      measure.style.letterSpacing = styles.letterSpacing;
      measure.textContent = input.value.slice(0, index);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const inset = input.offsetLeft + input.clientLeft;
      const position = measure.offsetWidth + paddingLeft - input.scrollLeft;
      const visible = position >= paddingLeft - 1 && position <= input.clientWidth - paddingRight + 1;
      target.set(inset + position);
      if (jump) x.jump(inset + position);
      input.style.caretColor = "transparent";
      opacity.set(start === end && visible ? 1 : 0);
    };
    const hide = () => {
      opacity.set(0);
      input.style.caretColor = "";
    };
    placeRef.current = place;

    const onFocus = () => place(true);
    const onChange = () => requestAnimationFrame(() => place());
    const fonts = () => place();
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", hide);
    input.addEventListener("input", onChange);
    input.addEventListener("scroll", onChange);
    document.addEventListener("selectionchange", onChange);
    document.fonts.addEventListener("loadingdone", fonts);
    const resize = new ResizeObserver(() => place());
    resize.observe(input);
    place(true);

    return () => {
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", hide);
      input.removeEventListener("input", onChange);
      input.removeEventListener("scroll", onChange);
      document.removeEventListener("selectionchange", onChange);
      document.fonts.removeEventListener("loadingdone", fonts);
      resize.disconnect();
      placeRef.current = () => {};
      hide();
    };
  }, [inputRef, opacity, reduced, target, x]);

  // A value set from outside, such as clearing the field, moves the caret too.
  React.useEffect(() => {
    placeRef.current();
  }, [value]);

  return (
    <>
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre" />
      <motion.span aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-highlight forced-colors:hidden" style={{ x, opacity }} />
    </>
  );
}
