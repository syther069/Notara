// The product's own building blocks, on top of the design tokens (styles/theme.css).
// Motion language: expo-out entrances, 300-500ms for interface changes, a 1.02 / 0.98 spring on buttons,
// and nothing but opacity when the visitor asks for reduced motion.
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, type LinkProps } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Tooltip } from "@heroui/react";
import { cn } from "@/lib/utils";
import Field, { FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/smoothui/field";
import Combobox, { type ComboboxOption } from "@/components/smoothui/combobox";
import { Check, Copy, X } from "@/components/icons";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_EXIT = [0.4, 0, 0.2, 1] as const;
const PRESS = { type: "spring", stiffness: 520, damping: 30, mass: 0.6 } as const;

// ------------------------------------------------------------------ tooltip

/**
 * A hover and focus explanation (HeroUI Tooltip, themed in theme.css). Every chip and every balance
 * carries one. It never holds the only copy of something the visitor needs.
 */
export function Hint({ text, children, className, focusable = false }: { text: ReactNode; children: ReactNode; className?: string; focusable?: boolean }) {
  return (
    <Tooltip delay={120} closeDelay={60}>
      <Tooltip.Trigger className={cn("inline-flex", className)} {...(focusable ? { tabIndex: 0 } : {})}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content className="nt max-w-[280px]" offset={8}>
        {text}
      </Tooltip.Content>
    </Tooltip>
  );
}

// ------------------------------------------------------------------ buttons

const BTN = {
  base: "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
  size: { sm: "h-9 px-4 text-[13.5px]", md: "h-11 px-5 text-[15px]", lg: "h-[52px] px-7 text-base" },
  variant: {
    primary: "bg-accent text-accent-foreground hover:bg-accent/90",
    secondary: "border border-border bg-surface text-foreground hover:bg-surface-secondary",
    ghost: "text-foreground hover:bg-default",
    mint: "bg-mint text-canopy hover:bg-mint/90",
    danger: "bg-danger text-danger-foreground hover:bg-danger/90",
    "danger-quiet": "border border-danger/40 bg-danger-soft text-danger hover:border-danger hover:bg-danger hover:text-danger-foreground",
  },
};
export type ButtonVariant = keyof typeof BTN.variant;
type ButtonOwn = { variant?: ButtonVariant; size?: keyof typeof BTN.size; busy?: boolean; pulse?: number; block?: boolean };

export const buttonClass = ({ variant = "primary", size = "md", block }: ButtonOwn = {}, className?: string) =>
  cn(BTN.base, BTN.size[size], BTN.variant[variant], block && "w-full", className);

/** `busy` shows the waiting outline (never a spinner). `pulse` plays one mint pulse each time it changes. */
export function Button({ variant, size, busy, pulse, block, className, children, disabled, ...rest }: ButtonOwn & HTMLMotionProps<"button">) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileHover={reduce || disabled ? undefined : { scale: 1.02 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.98 }}
      transition={PRESS}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonClass({ variant, size, block }), busy && "outline-run !opacity-100", className)}
      {...rest}
    >
      {pulse ? <span key={pulse} aria-hidden className="pointer-events-none absolute inset-0 rounded-full animate-pulse-mint motion-reduce:animate-none" /> : null}
      {children as ReactNode}
    </motion.button>
  );
}

/** The same button, as a link. Its hover and press are CSS, at the same 1.02 / 0.98. */
export function LinkButton({ variant, size, block, className, children, ...rest }: Omit<ButtonOwn, "busy" | "pulse"> & LinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, cn("transition-[transform,background-color] duration-[120ms] hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none", className))} {...rest}>
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string } & HTMLMotionProps<"button">) {
  const reduce = useReducedMotion();
  return (
    <Hint text={label}>
      <motion.button
        type="button"
        aria-label={label}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        transition={PRESS}
        className={cn("inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-default", className)}
        {...rest}
      >
        {children as ReactNode}
      </motion.button>
    </Hint>
  );
}

/** Copies text; the button itself says it worked, and a blocked clipboard shows the text to copy by hand. */
export function CopyChip({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("done");
            setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 1800);
          } catch {
            setState("failed");
          }
        }}
        className={cn(buttonClass({ variant: "secondary", size: "sm" }), className)}
      >
        {state === "done" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {state === "done" ? "Copied" : label}
        <span className="sr-only" role="status">{state === "done" ? "Copied to the clipboard" : ""}</span>
      </button>
      {state === "failed" && (
        <input readOnly value={text} aria-label="Text to copy" autoFocus onFocus={(e) => e.currentTarget.select()} className="h-9 rounded-lg border border-border bg-surface px-2 font-mono text-xs" />
      )}
    </span>
  );
}

// ------------------------------------------------------------------ surfaces

export function Card({ className, lift, children, ...rest }: { lift?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-surface p-5 shadow-card sm:p-6",
        lift && "transition-[transform,box-shadow] duration-300 ease-enter hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transform-none",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

const TONE = {
  neutral: "bg-default text-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold/20 text-gold-ink",
  mint: "bg-accent-soft text-foreground",
  outline: "border border-border text-muted",
};
export type Tone = keyof typeof TONE;

/** A status or label pill. `hint` is its hover explanation: a chip never stands without one. */
export function Chip({ tone = "neutral", hint, icon, children, className }: { tone?: Tone; hint: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Hint text={hint} focusable>
      <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold", TONE[tone], className)}>
        {icon}
        {children}
      </span>
    </Hint>
  );
}

/** Loading placeholder. A figure that hasn't arrived shimmers; it is never shown as 0. */
export function Shimmer({ className }: { className?: string }) {
  return <span aria-hidden className={cn("shimmer block h-4 w-24", className)} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[12.5px] font-semibold text-muted", className)}>{children}</p>;
}

export function EmptyState({ title, body, actions, art }: { title: string; body: string; actions?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      {art}
      <div className="max-w-sm">
        <p className="text-[17px] font-bold tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{body}</p>
      </div>
      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

/** A plain message block: what happened, and what to do. */
export function Notice({ tone = "neutral", title, children, action }: { tone?: "neutral" | "warning" | "danger" | "success"; title?: string; children?: ReactNode; action?: ReactNode }) {
  const c = { neutral: "border-border bg-surface-secondary", warning: "border-warning/30 bg-warning-soft", danger: "border-danger/30 bg-danger-soft", success: "border-success/30 bg-success-soft" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-[14px] leading-relaxed", c)}>
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ reveal

/** A section that rises in as it scrolls into view: children 60ms apart, 24px up. Opacity only under reduced motion. */
export function Reveal({ children, className, as = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul" | "ol"; delay?: number }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
    >
      {children}
      <span hidden data-reduce={reduce ? "" : undefined} />
    </M>
  );
}
export function RevealItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "p" | "h2" | "h3" }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M className={className} variants={{ hidden: { opacity: 0, y: reduce ? 0 : 24 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
      {children}
    </M>
  );
}

// ------------------------------------------------------------------ forms

/** A labelled field (SmoothUI Field). `note` is the one quiet line of guidance under the label. */
export function FormField({ label, note, error, children, className, counter }: { label: ReactNode; note?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; counter?: ReactNode }) {
  return (
    <Field className={cn("gap-2", className)} invalid={!!error}>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel className="text-[13.5px] font-semibold text-foreground">{label}</FieldLabel>
        {counter}
      </div>
      {note && <FieldDescription className="-mt-1 text-[13px] leading-snug text-muted">{note}</FieldDescription>}
      {children}
      {error && (
        <FieldError match className="text-[13px] font-semibold text-danger">
          {error}
        </FieldError>
      )}
    </Field>
  );
}

const CONTROL =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] font-medium text-foreground shadow-none outline-none transition-[border-color,box-shadow] duration-[180ms] placeholder:text-muted/70 hover:border-separator-tertiary focus:border-focus focus:shadow-[inset_0_0_0_0.5px_var(--focus)] focus-visible:!outline-none aria-invalid:border-danger disabled:bg-default disabled:text-muted";

export function TextInput({ className, ...rest }: ComponentProps<typeof FieldControl>) {
  return <FieldControl className={cn(CONTROL, "h-11", className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return <FieldControl render={<textarea {...rest} />} className={cn(CONTROL, "min-h-[92px] resize-y py-2.5 leading-relaxed", className)} />;
}

/** "42 / 180", turning to the warning colour for the last tenth. */
export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("tnum text-[12px] font-semibold", value.length > max * 0.9 ? "text-warning" : "text-muted")} aria-live="polite">
      {value.length} / {max}
    </span>
  );
}

/** A field whose label rests inside and floats up on focus or when filled. */
export function FloatInput({ label, error, note, className, id, ...rest }: { label: string; error?: ReactNode; note?: ReactNode } & ComponentProps<"input">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative">
        <input
          id={fid}
          placeholder=" "
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-e` : note ? `${fid}-n` : undefined}
          className={cn(CONTROL, "peer h-14 pt-5")}
          {...rest}
        />
        <label
          htmlFor={fid}
          className="pointer-events-none absolute left-3.5 top-1/2 origin-left -translate-y-1/2 text-[15px] font-medium text-muted transition-transform duration-[180ms] ease-enter peer-focus:-translate-y-[22px] peer-focus:scale-[0.8] peer-[:not(:placeholder-shown)]:-translate-y-[22px] peer-[:not(:placeholder-shown)]:scale-[0.8]"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${fid}-e`} className="text-[13px] font-semibold text-danger">{error}</p>
      ) : note ? (
        <p id={`${fid}-n`} className="text-[13px] text-muted">{note}</p>
      ) : null}
    </div>
  );
}

export type Option = ComboboxOption;

/** Every dropdown in the product: custom (no native select), built on the SmoothUI combobox. */
export function Select({ label, options, value, onChange, searchable = false, className, placeholder, id, ...rest }: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  searchable?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
} & Pick<ComponentProps<typeof Combobox>, "allowCustom" | "emptyText" | "searchPlaceholder" | "disabled" | "contentClassName">) {
  return <Combobox aria-label={label} id={id} options={options} value={value} onValueChange={onChange} searchable={searchable} placeholder={placeholder ?? label} className={className} {...rest} />;
}

/** A quiet two-or-three way switch. The selected segment slides. */
export function Segmented<T extends string>({ label, options, value, onChange, className }: { label: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const lid = useId();
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-default p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("relative h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200", value === o.value ? "text-foreground" : "text-muted hover:text-foreground")}
        >
          {value === o.value && <motion.span layoutId={lid} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-surface shadow-card" />}
          <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ side sheet

/**
 * A panel that slides in from the right (420px; the full width on a phone). Focus moves into it, Tab stays
 * inside, Escape or the backdrop closes it, and focus returns to what opened it.
 */
export function Sheet({ open, onClose, title, children, footer, width = 420 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const hid = useId();
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="nt fixed inset-0 z-[70]" data-theme={document.documentElement.dataset.theme}>
          <motion.div className="absolute inset-0 bg-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hid}
            tabIndex={-1}
            style={{ width: `min(100vw, ${width}px)` }}
            className="absolute inset-y-0 right-0 flex flex-col border-l border-border bg-background text-foreground shadow-pop outline-none"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id={hid} className="text-[17px] font-bold tracking-[-0.02em]">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-default">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <footer className="border-t border-border px-5 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** A label and its value on one line, for detail panels. */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 text-[14px] last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold">{children}</span>
    </div>
  );
}
