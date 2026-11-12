// Scroll pieces for the landing page, adapted from Skiper UI (skiper-ui.com) components written for
// Next.js. Each is re-tokened to Notara's theme, uses Motion
// and the product's icon set, and is still and fully readable under reduced motion.
import * as React from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;
/** Scrolls to a section, through Lenis when it is running so the two never fight. */
export function scrollToSection(el: HTMLElement, offset = -76) {
  if (lenis) lenis.scrollTo(el, { offset });
  else {
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  }
}

/**
 * Smooths wheel scrolling on the landing page only (Lenis, as the Skiper 30 and 17 sources do). Touch
 * scrolling stays native. Off under reduced motion; destroyed on leaving, so the app's own scrolling is
 * never touched. It also keeps GSAP's ScrollTrigger in step with it.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (reducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);
    const instance = new Lenis({ autoRaf: true });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    return () => {
      lenis = null;
      instance.destroy();
    };
  }, []);
  return null;
}

/**
 * A stage that fills the view, then draws back into a rounded frame as you scroll (after Skiper 29).
 * `children` is the stage itself and stays interactive. Under reduced motion or on narrow screens it is
 * simply a framed stage so tall interactive content never clips.
 */
export function FrameZoom({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [wide, setWide] = React.useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  React.useEffect(() => {
    const on = () => setWide(window.innerWidth >= 1024);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const clipPath = useTransform(scrollYProgress, [0, 0.85], ["inset(0% 0% 0% 0% round 0px)", "inset(5% 4.5% 5% 4.5% round 28px)"]);
  const scale = useTransform(scrollYProgress, [0, 0.85], [1.06, 1]);
  if (reduced || !wide)
    return (
      <div className={cn("px-4 py-10 sm:px-6", className)}>
        <div className="mx-auto max-w-[1136px] overflow-hidden rounded-[28px] border border-border bg-surface shadow-pop">{children}</div>
      </div>
    );
  return (
    <div ref={ref} className={cn("relative h-[175vh]", className)}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div className="relative h-full overflow-hidden border border-border/60 bg-surface shadow-pop" style={{ clipPath }}>
          <motion.div className="absolute inset-0 flex items-center justify-center p-6 lg:p-10" style={{ scale }}>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export interface StackCard {
  id: string;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/**
 * Cards that stack as you scroll, each rising over the last as it shrinks and tilts away. Adapted from
 * Skiper 17 (StickyCard_002, https://skiper-ui.com/v1/skiper17). Pinning starts only from script with
 * motion allowed and a wide enough screen; otherwise the cards are a plain, readable column.
 */
export function CardStack({ cards }: { cards: StackCard[] }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);

  useGSAP(
    () => {
      const node = stage.current;
      const elements = cardRefs.current;
      if (!node || !elements[0] || reducedMotion() || window.innerWidth < 768) return;
      gsap.registerPlugin(ScrollTrigger);
      node.dataset.pinned = "true";

      gsap.set(elements[0], { y: "0%", scale: 1, rotation: 0 });
      for (let i = 1; i < elements.length; i++) gsap.set(elements[i], { y: "110%", scale: 1, rotation: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: node, start: "top top", end: () => `+=${window.innerHeight * (elements.length - 1)}`, pin: true, scrub: 0.5, invalidateOnRefresh: true },
      });
      for (let i = 0; i < elements.length - 1; i++) {
        timeline.to(elements[i], { scale: 0.7, rotation: 5, duration: 1, ease: "none" }, i);
        timeline.to(elements[i + 1], { y: "0%", duration: 1, ease: "none" }, i);
      }
      return () => {
        delete node.dataset.pinned;
        gsap.set(elements, { clearProps: "all" });
      };
    },
    { scope: stage },
  );

  return (
    <div ref={stage} className="stack-stage">
      <div className="stack-frame">
        {cards.map((card, index) => (
          <figure
            key={card.id}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            className="stack-card rounded-3xl border border-border bg-surface p-2 shadow-pop sm:p-3"
          >
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 pb-3 pt-2">
              <span className="text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em]">{card.title}</span>
              <span className="max-w-[52ch] text-[15px] text-muted">{card.body}</span>
            </figcaption>
            <div className="stack-shot relative overflow-hidden rounded-2xl bg-surface-secondary">{card.shot}</div>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** Dimming is applied from script only, so without it or under reduced motion every row is readable. */
function RememberRow({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0.28, 0.5, 0.72], [0.28, 1, 0.28]);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion()) return;
    const apply = (value: number) => {
      node.style.opacity = String(value);
    };
    apply(opacity.get());
    const stop = opacity.on("change", apply);
    return () => {
      stop();
      node.style.opacity = "";
    };
  }, [opacity]);
  return <li ref={ref}>{children}</li>;
}

/** One line stays still while the rules pass it, and the one level with it lights up (after Skiper 44). */
export function RemembersList({ lead, rules }: { lead: string; rules: string[] }) {
  const type = "text-[clamp(26px,3.2vw,44px)] font-extrabold leading-[1.12] tracking-[-0.035em]";
  return (
    <div className="mx-auto grid max-w-[1136px] gap-x-8 md:grid-cols-[auto_1fr]">
      <p className={cn(type, "sticky top-16 z-10 bg-background py-4 md:top-1/2 md:h-fit md:-translate-y-1/2 md:bg-transparent md:py-0")}>{lead}</p>
      <ul className={cn(type, "space-y-4 py-[4vh] text-highlight md:py-[38vh]")}>
        {rules.map((rule) => (
          <RememberRow key={rule}>{rule}</RememberRow>
        ))}
      </ul>
    </div>
  );
}

export interface WhereItem {
  mark: React.ReactNode;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/**
 * A list where the row in focus (scrolled to, or hovered) shifts the tone of the section and shows its
 * visual beside it (after Skiper 24). Every word stays readable whichever row is active.
 */
export function WhereList({ heading, items, id, labelledBy }: { heading: React.ReactNode; items: WhereItem[]; id?: string; labelledBy?: string }) {
  const [active, setActive] = React.useState(0);
  const rows = React.useRef<(HTMLLIElement | null)[]>([]);
  const grounds = ["var(--background)", "var(--background-secondary)", "var(--background-tertiary)"];

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(rows.current.indexOf(entry.target as HTMLLIElement));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    rows.current.forEach((row) => row && observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section id={id} aria-labelledby={labelledBy} className="relative scroll-mt-[76px] py-24 transition-colors duration-500 motion-reduce:transition-none lg:py-36" style={{ backgroundColor: grounds[active % grounds.length] }}>
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-[72px]">
          {heading}
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <ol>
              {items.map((item, index) => (
                <li
                  key={item.title}
                  ref={(element) => {
                    rows.current[index] = element;
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setActive(index);
                  }}
                  className="border-t border-border py-8 lg:py-10"
                >
                  <div className={cn("transition-opacity duration-300 motion-reduce:transition-none", active === index ? "opacity-100" : "opacity-60")}>
                    <span className="block w-fit">{item.mark}</span>
                    <h3 className="mt-4 text-[clamp(24px,1.2vw+16px,28px)] font-extrabold leading-[1.15] tracking-[-0.03em]">{item.title}</h3>
                  </div>
                  <p className="mt-2 max-w-xl text-[16px] text-muted">{item.body}</p>
                </li>
              ))}
            </ol>
            <div aria-hidden className="hidden lg:block">
              <div className="sticky top-[20vh] aspect-square overflow-hidden rounded-3xl border border-border bg-surface shadow-pop">
                <AnimatePresence initial={false}>
                  <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                    {items[active]?.shot}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
