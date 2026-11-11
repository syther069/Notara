# Memeora Skiper-based components

Each section is one file. Paste it at the path shown. Imports starting with `@/` point to this project's `src/` folder.

## src/components/landing/card-stack.tsx

```tsx
'use client';

import * as React from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface StackCard {
  id: string;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/**
 * Screens that stack as you scroll, each one rising over the last as it shrinks and
 * tilts away. Adapted from Skiper 17 (StickyCard_002) by Skiper UI
 * (https://skiper-ui.com/v1/skiper17). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: cards hold a title and a real screen, and pinning starts
 * only from script with motion allowed, so otherwise the cards are a plain column.
 * Cleanup removes this stack's own trigger, where the source killed every
 * ScrollTrigger on the page.
 */
export function CardStack({ cards }: { cards: StackCard[] }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);

  useGSAP(() => {
    const node = stage.current;
    const elements = cardRefs.current;
    if (!node || !elements[0] || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    node.dataset.pinned = 'true';

    gsap.set(elements[0], { y: '0%', scale: 1, rotation: 0 });
    for (let i = 1; i < elements.length; i++) gsap.set(elements[i], { y: '110%', scale: 1, rotation: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: { trigger: node, start: 'top top', end: () => `+=${window.innerHeight * (elements.length - 1)}`, pin: true, scrub: 0.5, invalidateOnRefresh: true },
    });
    for (let i = 0; i < elements.length - 1; i++) {
      timeline.to(elements[i], { scale: 0.7, rotation: 5, duration: 1, ease: 'none' }, i);
      timeline.to(elements[i + 1], { y: '0%', duration: 1, ease: 'none' }, i);
    }
    return () => {
      delete node.dataset.pinned;
    };
  }, { scope: stage });

  return (
    <div ref={stage} className="stack-stage">
      <div className="stack-frame">
        {cards.map((card, index) => (
          <figure key={card.id} ref={(element) => { cardRefs.current[index] = element; }} className="stack-card rounded-[var(--radius-xl)] bg-[var(--surface-card)] p-2 sm:p-3">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 pb-3 pt-2">
              <span className="text-xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-2xl">{card.title}</span>
              <span className="text-sm text-[var(--ink-secondary)] sm:text-base">{card.body}</span>
            </figcaption>
            <div className="stack-shot relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]">{card.shot}</div>
          </figure>
        ))}
      </div>
    </div>
  );
}
```

## src/components/landing/parallax-gallery.tsx

```tsx
'use client';

import * as React from 'react';
import Image, { type StaticImageData } from 'next/image';
import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import assistant from '../../../public/guide/assistant.jpg';
import budgets from '../../../public/guide/budgets.jpg';
import business from '../../../public/guide/business.jpg';
import memory from '../../../public/guide/memory.jpg';
import overview from '../../../public/guide/overview.jpg';
import proof from '../../../public/guide/proof.jpg';
import transactions from '../../../public/guide/transactions.jpg';

/** Each tile looks at a different part of a real screen, past the navigation rail. */
const TILES: { src: StaticImageData; position: string }[][] = [
  [{ src: overview, position: '30% 0%' }, { src: memory, position: '55% 40%' }, { src: budgets, position: '40% 0%' }],
  [{ src: assistant, position: '60% 50%' }, { src: transactions, position: '45% 30%' }, { src: proof, position: '35% 0%' }],
  [{ src: business, position: '35% 0%' }, { src: overview, position: '100% 40%' }, { src: memory, position: '30% 0%' }],
  [{ src: budgets, position: '90% 30%' }, { src: proof, position: '80% 60%' }, { src: transactions, position: '100% 0%' }],
];

/** Where each column starts, so that it can travel down through the whole section. */
const COLUMN_START = ['-top-[45%]', '-top-[95%]', '-top-[45%]', '-top-[75%]'];

function Column({ tiles, y, className }: { tiles: typeof TILES[number]; y: MotionValue<number> | number; className: string }) {
  return (
    <motion.div className={`relative flex h-full w-1/2 flex-col gap-[2vw] motion-reduce:top-0 md:w-1/4 ${className}`} style={{ y }}>
      {tiles.map((tile, index) => (
        <div key={index} className="relative h-full w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-sunken)]">
          <Image src={tile.src} alt="" fill sizes="(max-width: 768px) 80vw, 45vw" placeholder="blur" className="pointer-events-none object-cover" style={{ objectPosition: tile.position }} />
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Four columns of screens moving at their own speeds. Adapted from Skiper 30 by
 * Skiper UI (https://skiper-ui.com/v1/skiper30). Free version, attribution is shown
 * in the site footers. Inspired, its author notes, by siena.film.
 *
 * Changes from the source: real Memeora screens in sample data in place of stock
 * images, two columns on a phone, a still layout under reduced motion, and the
 * smooth scrolling lives in SmoothScroll, which also cleans up after itself.
 */
export function ParallaxGallery() {
  const gallery = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [height, setHeight] = React.useState(0);
  const { scrollYProgress } = useScroll({ target: gallery, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, height * 2]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, height * 3.3]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, height * 1.25]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, height * 3]);

  React.useEffect(() => {
    const resize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', resize);
    const frame = requestAnimationFrame(resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const speeds = [y1, y2, y3, y4];
  return (
    <div ref={gallery} aria-hidden className="relative box-border flex h-[175vh] gap-[2vw] overflow-hidden p-[2vw]">
      {TILES.map((tiles, index) => (
        <Column key={index} tiles={tiles} y={reduced ? 0 : speeds[index]} className={`${COLUMN_START[index]} ${index > 1 ? 'hidden md:flex' : ''}`} />
      ))}
    </div>
  );
}
```

## src/components/ui/animated-link.tsx

```tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Animated links, adapted from Skiper 40 by Skiper UI (https://skiper-ui.com/v1/skiper40).
 * Free version, attribution is shown in the site footers.
 *
 * Changes from the source: real focus states as well as hover, one component with
 * variants, and the rise and fill links use a brand colour behind the text instead
 * of a white mix-blend-difference block, which turned orange on royal blue.
 */
type Variant = 'slide' | 'grow' | 'center' | 'rise' | 'fill';

const LINE = "before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:h-[0.07em] before:min-h-px before:w-full before:bg-current before:content-[''] before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:before:transition-none hover:before:scale-x-100 focus-visible:before:scale-x-100";
const BLOCK = "isolate px-2 before:pointer-events-none before:absolute before:left-0 before:-z-10 before:w-full before:bg-[var(--ink-inverse)] before:content-[''] before:transition-all before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:before:transition-none transition-colors duration-300 motion-reduce:transition-none hover:text-[var(--brand-blue)] focus-visible:text-[var(--brand-blue)]";

const VARIANTS: Record<Variant, string> = {
  slide: `${LINE} before:origin-right hover:before:origin-left focus-visible:before:origin-left`,
  grow: `${LINE} before:origin-left hover:before:origin-right focus-visible:before:origin-right`,
  center: `${LINE} before:origin-center`,
  rise: `${BLOCK} before:bottom-0 before:h-0 hover:before:h-full focus-visible:before:h-full`,
  fill: `${BLOCK} before:top-0 before:h-full before:origin-left before:scale-x-0 hover:before:scale-x-100 focus-visible:before:scale-x-100`,
};

function Arrow() {
  return (
    <svg data-link-arrow aria-hidden fill="none" viewBox="0 0 10 10" className="ml-[0.3em] size-[0.55em] shrink-0 translate-y-1 opacity-0 transition-all duration-300 group-hover/link:translate-y-0 group-hover/link:opacity-100 group-focus-visible/link:translate-y-0 group-focus-visible/link:opacity-100 motion-reduce:transition-none">
      <path d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnimatedLink({ href, variant = 'slide', arrow, className, children }: { href: string; variant?: Variant; arrow?: boolean; className?: string; children: ReactNode }) {
  const classes = cn('group/link relative inline-flex w-fit items-center', VARIANTS[variant], className);
  if (/^https?:/.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{children}{arrow !== false && <Arrow />}</a>;
  }
  if (href.startsWith('#')) return <a href={href} className={classes}>{children}{arrow && <Arrow />}</a>;
  return <Link href={href} className={classes}>{children}{arrow && <Arrow />}</Link>;
}
```

## src/components/ui/tooltip.tsx

```tsx
'use client';

import type { ReactElement, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Tooltip with a border arrow, adapted from Skiper 101 by Skiper UI
 * (https://skiper-ui.com/v1/skiper101). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: Memeora tokens, a short delay, and its entrance lives
 * in globals.css. A tooltip only ever repeats a control's accessible name, so the
 * button keeps its own aria-label and works on touch without it.
 */
function TipArrow() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden className="ml-px -mt-px">
      <path d="M10.3356 7.39793L15.1924 3.02682C15.9269 2.36577 16.8801 2 17.8683 2H20V0H0V2H1.4651C2.4532 2 3.4064 2.36577 4.1409 3.02682L8.9977 7.39793C9.378 7.7402 9.9553 7.74021 10.3356 7.39793Z" fill="var(--surface-elevated)" />
      <path d="M9.6667 6.65461L14.5235 2.28352C15.4416 1.45721 16.6331 1 17.8683 1H20V2H17.8683C16.8801 2 15.9269 2.36577 15.1924 3.02682L10.3356 7.39793C9.9553 7.74021 9.378 7.7402 8.9977 7.39793L4.1409 3.02682C3.4064 2.36577 2.4532 2 1.4651 2H0V1H1.4651C2.7002 1 3.8917 1.45722 4.8099 2.28352L9.6667 6.65461Z" fill="var(--border-strong)" />
    </svg>
  );
}

export function Tooltip({ label, side = 'top', children }: { label: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactElement }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={2} collisionPadding={8} className="tip z-[80] w-fit max-w-64 text-balance rounded-[var(--radius-xs)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] outline outline-1 outline-[var(--border-strong)]">
            {label}
            <TooltipPrimitive.Arrow asChild><span><TipArrow /></span></TooltipPrimitive.Arrow>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
```

## src/components/ui/input.tsx

```tsx
'use client';

import * as React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

/** Types whose text can be measured. Numbers and dates expose no caret position. */
const TEXT_TYPES = new Set([undefined, 'text', 'search', 'email', 'url', 'tel']);
const CARET_SPRING = { stiffness: 500, damping: 30, mass: 0.5 };

/**
 * A caret that glides between characters, adapted from Skiper 106 by Skiper UI
 * (https://skiper-ui.com/v1/skiper106). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: no dialkit control panel, no browser globals at import,
 * which break server rendering, and it is an overlay on the real input. The native
 * caret is hidden only while this one is showing, and stays for reduced motion,
 * forced colours and right-aligned fields.
 */
function SmoothCaret({ inputRef, value }: { inputRef: React.RefObject<HTMLInputElement | null>; value: unknown }) {
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
    if (window.matchMedia('(forced-colors: active)').matches) return;

    const place = (jump = false) => {
      if (document.activeElement !== input) return;
      const styles = window.getComputedStyle(input);
      if (styles.textAlign === 'right' || styles.textAlign === 'center') return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const index = input.selectionDirection === 'backward' ? start : end;
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
      input.style.caretColor = 'transparent';
      opacity.set(start === end && visible ? 1 : 0);
    };
    const hide = () => {
      opacity.set(0);
      input.style.caretColor = '';
    };
    placeRef.current = place;

    const onFocus = () => place(true);
    const onChange = () => requestAnimationFrame(() => place());
    const fonts = () => place();
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', hide);
    input.addEventListener('input', onChange);
    input.addEventListener('scroll', onChange);
    document.addEventListener('selectionchange', onChange);
    document.fonts.addEventListener('loadingdone', fonts);
    const resize = new ResizeObserver(() => place());
    resize.observe(input);
    place(true);

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', hide);
      input.removeEventListener('input', onChange);
      input.removeEventListener('scroll', onChange);
      document.removeEventListener('selectionchange', onChange);
      document.fonts.removeEventListener('loadingdone', fonts);
      resize.disconnect();
      placeRef.current = () => {};
      hide();
    };
  }, [inputRef, opacity, reduced, target, x]);

  // A value set from outside, such as clearing a search, moves the caret too.
  React.useEffect(() => {
    placeRef.current();
  }, [value]);

  return (
    <>
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre" />
      <motion.span aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-blue)] forced-colors:hidden" style={{ x, opacity }} />
    </>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftAddon, rightAddon, id, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--ink-primary)]">{label}</label>}
        <div className="relative flex items-center">
          {leftAddon && <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--ink-muted)]">{leftAddon}</div>}
          <input
            id={inputId}
            ref={innerRef}
            type={type}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
            className={cn(
              'w-full h-11 px-4 rounded-[var(--radius-sm)] border bg-[var(--surface-elevated)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:border-transparent',
              'disabled:opacity-60 disabled:bg-[var(--surface-sunken)] disabled:cursor-not-allowed',
              type === 'number' && 'tabular-nums',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              hasError
                ? 'border-[var(--accent-danger)] focus-visible:ring-[var(--accent-danger)]'
                : 'border-[var(--border-field)] hover:border-[var(--border-strong)]',
              className,
            )}
            {...props}
          />
          {TEXT_TYPES.has(type) && <SmoothCaret inputRef={innerRef} value={props.value} />}
          {rightAddon && <div className="absolute right-3.5 flex items-center text-[var(--ink-muted)]">{rightAddon}</div>}
        </div>
        {error && <p id={`${inputId}-error`} className="text-xs text-[var(--accent-danger)]" role="alert">{error}</p>}
        {!error && helperText && <p id={`${inputId}-desc`} className="text-xs text-[var(--ink-muted)]">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
```

## src/components/landing/preloader.tsx

```tsx
import type { CSSProperties } from 'react';

const COLUMNS = [0, 1, 2, 3, 4, 5];
const NAME = 'Memeora';

/** Runs before the first paint, so a repeat visit in this tab never flashes the intro. */
const SEEN_SCRIPT = `try{if(sessionStorage.getItem('memeora-intro'))document.documentElement.setAttribute('data-intro-seen','');sessionStorage.setItem('memeora-intro','1')}catch(e){document.documentElement.setAttribute('data-intro-seen','')}`;

/**
 * Memeora's own opening: the name rises, a ledger rule is drawn under it, and two
 * rows of blue steps part to show the page. The parting takes its idea from the
 * Skiper 10 preview (https://skiper-ui.com/v1/preview/skiper10). Its source is paid
 * and was not used.
 *
 * Plain CSS, so it runs and ends without script and never waits on the network. It
 * reports no progress because there is none to report. It is hidden unless motion
 * is allowed, and clicks pass straight through it.
 */
export function Preloader() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SEEN_SCRIPT }} />
      <div aria-hidden className="intro">
        <div className="intro-row intro-top">{COLUMNS.map((step) => <span key={step} style={{ '--s': step } as CSSProperties} />)}</div>
        <div className="intro-row intro-bottom">{COLUMNS.map((step) => <span key={step} style={{ '--s': 5 - step } as CSSProperties} />)}</div>
        <div className="intro-word">
          <p className="intro-letters text-[clamp(3rem,10vw,7rem)] font-bold leading-none tracking-[-0.04em]">
            {NAME.split('').map((letter, index) => <span key={index} style={{ '--i': index } as CSSProperties}>{letter}</span>)}
          </p>
          <span className="intro-rule" />
        </div>
      </div>
    </>
  );
}
```

## src/components/landing/expand-cards.tsx

```tsx
'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { Xmark } from 'iconoir-react';

export interface ExpandCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  detail: React.ReactNode;
}

/** Brand fills only, each with text that passes AA on it. */
const FILLS = [
  'bg-[var(--brand-blue)] text-[var(--ink-inverse)]',
  'bg-[var(--ink-primary)] text-[var(--ink-inverse)]',
  'bg-[var(--brand-blue-pressed)] text-[var(--ink-inverse)]',
  'bg-[var(--brand-blue-bright)] text-[var(--ink-inverse)]',
];

const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const;

/**
 * Small cards where one opens to fill the group and shows more. An original Memeora
 * component. The idea comes from the Skiper 23 preview
 * (https://skiper-ui.com/v1/preview/skiper23), which has no source available.
 * Focus moves into the open card and back to its card on closing, and Escape closes.
 */
export function ExpandCards({ cards }: { cards: ExpandCard[] }) {
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
      <div className="relative grid min-h-[30rem] grid-cols-2 gap-3 sm:min-h-[28rem] sm:gap-4" onKeyDown={(event) => { if (event.key === 'Escape') setOpenId(null); }}>
        {cards.map((card, index) => (
          <motion.button
            key={card.id}
            ref={(element) => { triggers.current[card.id] = element; }}
            layoutId={`card-${card.id}`}
            type="button"
            aria-expanded={openId === card.id}
            tabIndex={open ? -1 : 0}
            onClick={() => setOpenId(card.id)}
            transition={SPRING}
            style={{ borderRadius: 24 }}
            className={`flex min-h-36 cursor-pointer flex-col justify-between gap-6 p-4 text-left sm:p-5 ${FILLS[index % FILLS.length]} ${open ? 'pointer-events-none' : ''}`}
          >
            <motion.span layout="position" className="block">{card.icon}</motion.span>
            <motion.span layout="position" className="block">
              <span className="block text-lg font-bold leading-tight sm:text-xl">{card.title}</span>
              <span className="mt-1 block text-sm leading-snug">{card.hint}</span>
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
              transition={SPRING}
              style={{ borderRadius: 24 }}
              className={`absolute inset-0 z-10 flex flex-col overflow-hidden p-4 sm:p-6 ${FILLS[openIndex % FILLS.length]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <motion.span layout="position" className="block">{open.icon}</motion.span>
                <button ref={closeRef} type="button" onClick={() => setOpenId(null)} aria-label={`Close ${open.title}`} className="hit grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"><Xmark aria-hidden className="h-5 w-5" /></button>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, delay: 0.08 }} className="mt-4 flex min-h-0 flex-1 flex-col">
                <h3 className="text-2xl font-bold tracking-tight">{open.title}</h3>
                {open.detail}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
```

## src/components/landing/where-list.tsx

```tsx
'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';

export interface WhereItem {
  mark: React.ReactNode;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/** All three give cream text at least AA contrast. */
const GROUNDS = ['var(--brand-blue)', 'var(--brand-blue-pressed)', 'var(--brand-blue-bright)'];

/**
 * A large list where the row in focus sets the colour of the whole section and shows
 * its screen beside it. An original Memeora section. The idea comes from the
 * Skiper 24 preview (https://skiper-ui.com/v1/skiper24). Its source is paid and was
 * not used. Every word stays readable whichever row is active.
 */
export function WhereList({ heading, items }: { heading: React.ReactNode; items: WhereItem[] }) {
  const [active, setActive] = React.useState(0);
  const rows = React.useRef<(HTMLLIElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(rows.current.indexOf(entry.target as HTMLLIElement));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.current.forEach((row) => row && observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section id="where" className="relative scroll-mt-6 px-4 py-20 text-[var(--ink-inverse)] transition-colors duration-500 motion-reduce:transition-none sm:px-8 lg:py-32" style={{ backgroundColor: GROUNDS[active] }}>
        <div className="mx-auto max-w-6xl">
          {heading}
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.title}
                  ref={(element) => { rows.current[index] = element; }}
                  onPointerEnter={(event) => { if (event.pointerType === 'mouse') setActive(index); }}
                  className="border-t border-white/25 py-8 lg:py-12"
                >
                  <div className={`transition-opacity duration-300 motion-reduce:transition-none ${active === index ? 'opacity-100' : 'opacity-60'}`}>
                    <span className="block w-fit">{item.mark}</span>
                    <h3 className="mt-4 text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.025em]">{item.title}</h3>
                  </div>
                  <p className="mt-3 max-w-xl text-base leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ul>
            <div aria-hidden className="hidden lg:block">
              <div className="sticky top-[20vh] aspect-square overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-card)] shadow-[var(--shadow-card-hard)]">
                <AnimatePresence initial={false}>
                  <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
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
```

## src/components/landing/frame-zoom.tsx

```tsx
'use client';

import * as React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * A screen that fills the view, then draws back into a rounded frame as you scroll.
 * An original Memeora section. The idea comes from the Skiper 29 preview
 * (https://skiper-ui.com/v1/preview/skiper29). Its source is paid and was not used.
 * Under reduced motion it is simply a framed screen.
 */
export function FrameZoom({ shot, children }: { shot: React.ReactNode; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const clipPath = useTransform(scrollYProgress, [0, 0.85], ['inset(0% 0% 0% 0% round 0px)', 'inset(9% 8% 9% 8% round 28px)']);
  const scale = useTransform(scrollYProgress, [0, 0.85], [1.14, 1]);

  return (
    <div ref={ref} className="relative h-[220vh] bg-[var(--brand-blue)] motion-reduce:h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-[70vh] motion-reduce:p-4">
        <motion.div className="relative h-full overflow-hidden bg-[var(--surface-sunken)] motion-reduce:rounded-[var(--radius-xl)] motion-reduce:[clip-path:none]!" style={reduced ? undefined : { clipPath }}>
          <motion.div className="absolute inset-0 motion-reduce:transform-none!" style={reduced ? undefined : { scale }}>{shot}</motion.div>
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 px-4 text-center">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
```

## src/components/landing/remembers-list.tsx

```tsx
'use client';

import * as React from 'react';
import { useScroll, useTransform } from 'framer-motion';

/** Dimming is applied from script only, so without it or under reduced motion all rows are readable. */
function Row({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0.28, 0.5, 0.72], [0.28, 1, 0.28]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const apply = (value: number) => { node.style.opacity = String(value); };
    apply(opacity.get());
    const stop = opacity.on('change', apply);
    return () => {
      stop();
      node.style.opacity = '';
    };
  }, [opacity]);

  return <li ref={ref}>{children}</li>;
}

/**
 * One line stays still while examples pass it, and the one level with it lights up.
 * An original Memeora section. The idea comes from the Skiper 44 preview
 * (https://skiper-ui.com/v1/preview/skiper44). Its source is paid and was not used.
 */
export function RemembersList({ lead, rules }: { lead: string; rules: string[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-x-6 md:grid-cols-[auto_1fr]">
      <p className="sticky top-0 z-10 bg-[var(--surface-base)] py-4 text-[clamp(1.9rem,4.4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--ink-primary)] md:top-1/2 md:h-fit md:-translate-y-1/2 md:bg-transparent md:py-0">{lead}</p>
      <ul className="space-y-3 py-[6vh] text-[clamp(1.9rem,4.4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--brand-blue)] md:py-[42vh]">
        {rules.map((rule) => <Row key={rule}>{rule}</Row>)}
      </ul>
    </div>
  );
}
```

## src/components/ui/expand.tsx

```tsx
'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { NavArrowDown } from 'iconoir-react';
import { cn } from '@/lib/utils';

/**
 * Original Memeora expands. The way an open row parts from its group takes its idea
 * from the Skiper 103 preview (https://skiper-ui.com/v1/skiper103). Its source is
 * paid and was not used.
 */
const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 } as const;

function Panel({ id, open, children }: { id: string; open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div key="panel" id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** One line that opens what sits under it, such as a table behind a chart. */
export function Expand({ label, className, summaryClassName, children }: { label: string; className?: string; summaryClassName?: string; children: React.ReactNode }) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  return (
    <MotionConfig reducedMotion="user">
      <div className={className}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className={cn('hit flex w-fit cursor-pointer items-center gap-1 font-semibold text-[var(--brand-blue)]', summaryClassName)}>
          {label}
          <NavArrowDown aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
        </button>
        <Panel id={id} open={open}>{children}</Panel>
      </div>
    </MotionConfig>
  );
}

/** A group of rows. An open row parts from its neighbours and the others stay joined. */
export function ExpandGroup({ items, className }: { items: { title: string; body: React.ReactNode }[]; className?: string }) {
  const baseId = React.useId();
  const [openRows, setOpenRows] = React.useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number) => setOpenRows((current) => {
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
              transition={SPRING}
              className="overflow-hidden bg-[var(--surface-card)]"
            >
              <h3>
                <button type="button" aria-expanded={open} aria-controls={`${baseId}-${index}`} onClick={() => toggle(index)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-lg font-semibold text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface-hover)] sm:px-6">
                  {item.title}
                  <NavArrowDown aria-hidden className={cn('h-5 w-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')} />
                </button>
              </h3>
              <Panel id={`${baseId}-${index}`} open={open}>
                <div className="max-w-3xl px-5 pb-5 text-base leading-relaxed text-[var(--ink-body)] sm:px-6">{item.body}</div>
              </Panel>
            </motion.li>
          );
        })}
      </ul>
    </MotionConfig>
  );
}
```

## src/components/landing/smooth-scroll.tsx

```tsx
'use client';

import * as React from 'react';
import Lenis from 'lenis';

/**
 * Smooths wheel scrolling on the landing page, as the Skiper 30 and 17 sources do.
 * Touch scrolling stays native. It is off under reduced motion, and it is destroyed
 * on leaving, so the app's own scrolling is never touched.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
```

## src/lib/utils.ts (needed by `cn`)

```ts
import { formatMinorUnits } from '@/modules/finance/domain/money';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with exact tabular formatting
 */
export function formatCurrency(amountMinor: number, currency: string = 'USD'): string {
  return formatMinorUnits(amountMinor, currency);
}
```

## Packages

```bash
npm install framer-motion gsap @gsap/react lenis @radix-ui/react-tooltip iconoir-react clsx tailwind-merge
```

## Also needed

- Tailwind CSS 4 with Memeora's colour tokens from `src/app/globals.css` (classes like `bg-surface` and `text-ink` rely on them).
- `parallax-gallery.tsx` imports seven screenshots from `public/guide/`; replace them with your own images.
