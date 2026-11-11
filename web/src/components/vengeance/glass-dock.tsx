import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { LineHoverLink } from "./line-hover-link";

/**
 * Glass Dock, adapted from Vengeance UI (https://www.vengenceui.com/components/glass-dock).
 *
 * Kept from the source: the frosted dock, the spring lift on the hovered item and the label that
 * slides between items with a directional blur.
 * Changed for Notara: colours come from the design tokens; items are real links or buttons (the source
 * used div role="button"); a "labels" variant shows words (each a Line Hover Link) for the marketing nav; the
 * GSAP morphing icons for a fixed set of titles were dropped, since none of Notara's items use them;
 * the label position is measured from the item instead of assumed; reduced motion is honoured.
 */
type DockIcon = React.ComponentType<{ className?: string; size?: number }>;

export interface DockItem {
  title: string;
  icon?: DockIcon;
  onClick?: () => void;
  href?: string;
  active?: boolean;
}

export interface GlassDockProps extends React.HTMLAttributes<HTMLDivElement> {
  items: DockItem[];
  dockClassName?: string;
  /** "icons": icon buttons with a sliding label above. "labels": words, with a sliding highlight behind. */
  variant?: "icons" | "labels";
  /** Tighter padding, for the condensed (scrolled) nav. */
  compact?: boolean;
  label?: string;
}

export const GlassDock = React.forwardRef<HTMLDivElement, GlassDockProps>(
  ({ items, className, dockClassName, variant = "icons", compact = false, label = "Quick actions", ...props }, ref) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const [direction, setDirection] = useState(0);
    const [tipX, setTipX] = useState(0);
    const reduce = useReducedMotion();
    const refs = useRef<(HTMLElement | null)[]>([]);

    const enter = (index: number) => {
      if (hovered !== null && index !== hovered) setDirection(index > hovered ? 1 : -1);
      const el = refs.current[index];
      if (el) setTipX(el.offsetLeft + el.offsetWidth / 2);
      setHovered(index);
    };
    const leave = () => {
      setHovered(null);
      setDirection(0);
    };

    return (
      <div ref={ref} className={cn("w-max", className)} {...props}>
        <nav
          aria-label={label}
          className={cn(
            "relative flex items-center justify-center rounded-full border border-border/70 bg-surface/70 shadow-card backdrop-blur-xl transition-[padding,gap] duration-300 ease-enter",
            variant === "icons" ? (compact ? "gap-1 px-2 py-1.5" : "gap-2 px-3 py-2") : compact ? "gap-0 px-1 py-1" : "gap-1 px-1.5 py-1.5",
            dockClassName,
          )}
          onMouseLeave={leave}
        >
          {variant === "icons" && (
            <AnimatePresence>
              {hovered !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: reduce ? -52 : 12, x: tipX }}
                  animate={{ opacity: 1, scale: 1, y: -52, x: tipX }}
                  exit={{ opacity: 0, scale: 0.92, y: reduce ? -52 : 12 }}
                  transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 160, damping: 20 }}
                  className="pointer-events-none absolute left-0 top-0 z-30"
                >
                  <div className="-translate-x-1/2 rounded-lg border border-moss bg-canopy px-3 py-1.5 text-cream shadow-pop">
                    <div className="relative flex h-4 items-center justify-center overflow-hidden">
                      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.span
                          key={items[hovered].title}
                          initial={reduce ? { opacity: 0 } : { x: direction > 0 ? 28 : -28, opacity: 0, filter: "blur(6px)" }}
                          animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
                          exit={reduce ? { opacity: 0 } : { x: direction > 0 ? -28 : 28, opacity: 0, filter: "blur(6px)" }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="whitespace-nowrap text-[12.5px] font-semibold"
                        >
                          {items[hovered].title}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {items.map((el, index) => {
            const Icon = el.icon;
            const isHovered = hovered === index;
            const Tag = el.href ? "a" : "button";
            const shared = {
              ref: (node: HTMLElement | null) => {
                refs.current[index] = node;
              },
              onMouseEnter: () => enter(index),
              onFocus: () => enter(index),
              onBlur: leave,
              onClick: (e: React.MouseEvent) => {
                if (el.onClick) {
                  e.preventDefault();
                  el.onClick();
                }
              },
              "aria-current": el.active ? ("page" as const) : undefined,
            };
            if (variant === "labels")
              return (
                <span key={el.title} className="relative" onMouseEnter={() => enter(index)}>
                  {isHovered && (
                    <motion.span
                      layoutId="dock-highlight"
                      className="absolute inset-0 rounded-full bg-foreground/10"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className={cn("relative block font-semibold text-foreground/85 transition-colors duration-200 hover:text-foreground", compact ? "px-2.5 py-1.5 text-[13.5px]" : "px-3.5 py-2 text-[14.5px]", el.active && "text-foreground")}>
                    <LineHoverLink
                      href={el.href ?? "#"}
                      aria-current={el.active ? "location" : undefined}
                      onFocus={() => enter(index)}
                      onBlur={leave}
                      onClick={(e) => {
                        if (el.onClick) {
                          e.preventDefault();
                          el.onClick();
                        }
                      }}
                    >
                      {el.title}
                    </LineHoverLink>
                  </span>
                </span>
              );
            return (
              <Tag
                key={el.title}
                {...(shared as object)}
                {...(el.href ? { href: el.href } : { type: "button" as const })}
                aria-label={el.title}
                className="relative flex h-10 w-10 items-center justify-center rounded-full"
              >
                <motion.span
                  whileTap={{ scale: 0.95 }}
                  animate={reduce ? undefined : { scale: isHovered ? 1.1 : 1, y: isHovered ? -3 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                >
                  {Icon && <Icon size={21} className={cn("transition-colors duration-200", isHovered || el.active ? "text-foreground" : "text-muted")} />}
                </motion.span>
              </Tag>
            );
          })}
        </nav>
      </div>
    );
  },
);

GlassDock.displayName = "GlassDock";

export default GlassDock;
