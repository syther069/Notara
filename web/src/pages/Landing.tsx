// The landing page. One idea per fold, a lot of room, one headline, one supporting line, one action.
// Every claim on it is something the product does today; the figures are product facts, not usage numbers.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Accordion, Modal } from "@heroui/react";
import { cn } from "@/lib/utils";
import { SIGNAL_LABELS } from "@/lib/format";
import { ArrowRight, Bot, Check, Copy, Link2, Pencil, Play, Send, ShieldCheck, Shop, Suitcase, Terminal, Users } from "@/components/icons";
import { AnimatedNumber } from "@/components/vengeance/animated-number";
import { LineHoverLink } from "@/components/vengeance/line-hover-link";
import { MorphText } from "@/components/vengeance/morph-text";
import { PerspectiveCarousel } from "@/components/vengeance/perspective-carousel";
import StatsCounter from "@/components/vengeance/stats-counter";
import { VerseCards } from "@/components/vengeance/verse-cards";
import { Preloader } from "@/components/landing/Preloader";
import { useGo } from "@/components/shell/MarketingShell";
import { PagePreview } from "@/components/app/preview";
import { Button, EASE, Reveal, RevealItem } from "@/components/app/ui";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-[72px]";
const H2 = "text-[clamp(30px,3.2vw+12px,56px)] font-extrabold leading-[1.05] tracking-[-0.04em] [text-wrap:balance]";
const LEAD = "text-[17px] leading-relaxed text-muted [text-wrap:pretty] sm:text-[18px]";

// ------------------------------------------------------------------ tour

const TOUR = [
  { caption: "Type an amount and what it's for.", amount: "0.00", text: "", signed: false, paid: false },
  { caption: "The customer's page fills in as you type.", amount: "480.00", text: "Brand refresh, final invoice", signed: false, paid: false },
  { caption: "Your wallet signs the link. It's free, and no money moves.", amount: "480.00", text: "Brand refresh, final invoice", signed: true, paid: false },
  { caption: "Share it. Your customer pays; USDC lands in your account.", amount: "480.00", text: "Brand refresh, final invoice", signed: true, paid: true },
];

/** A silent walk-through built from the product's own screens. It loops, about five seconds a step. */
function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return setI(0);
    if (reduce) return; // under reduced motion the visitor steps through it themselves
    const t = setInterval(() => setI((x) => (x + 1) % TOUR.length), 5000);
    return () => clearInterval(t);
  }, [open, reduce]);
  const s = TOUR[i];
  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={(o) => !o && onClose()} className="nt" variant="blur">
        <Modal.Container size="lg">
          <Modal.Dialog aria-label="A short tour of Notara" data-theme="dark" className="nt rounded-3xl border border-border bg-background p-6 text-foreground shadow-pop">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-mint">Tour · step {i + 1} of {TOUR.length}</p>
                <p className="mt-1 min-h-[3.2em] text-[19px] font-bold leading-snug tracking-[-0.02em]" aria-live="polite">{s.caption}</p>
              </div>
              <Modal.CloseTrigger aria-label="Close the tour" />
            </div>
            <div className="mx-auto mt-4 max-w-[300px] overflow-hidden rounded-[32px] border-[6px] border-moss" data-theme="light">
              <div className="bg-background text-foreground">
                <PagePreview
                  path="/pay/…"
                  who="studio.near"
                  forText={s.text}
                  emptyFor="What it's for appears here"
                  amount={s.amount}
                  unit="USDC"
                  checks={[
                    s.signed ? { state: "ok", text: "Signed by this account's wallet" } : { state: "wait", text: "Signed by your wallet when you create it" },
                    s.paid ? { state: "ok", text: "Paid. USDC is in the account." } : { state: "wait", text: "Account check runs when your customer opens it" },
                  ]}
                  primary={s.paid ? "Paid" : `Pay ${s.amount} USDC`}
                />
              </div>
            </div>
            <p className="mt-3 text-center text-[12.5px] text-muted">An illustration with example values, drawn with the product's real payment page.</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1.5" role="tablist" aria-label="Tour steps">
                {TOUR.map((_, n) => (
                  <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`Step ${n + 1}`} onClick={() => setI(n)} className={cn("h-2 rounded-full transition-[width,background-color] duration-300", n === i ? "w-7 bg-mint" : "w-2 bg-foreground/25")} />
                ))}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setI((x) => (x + 1) % TOUR.length)}>
                Next <ArrowRight size={14} aria-hidden />
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// ------------------------------------------------------------------ sections

function Hero({ ready, onTour }: { ready: boolean; onTour: () => void }) {
  const go = useGo();
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({ initial: { opacity: 0, y: reduce ? 0 : 28 }, animate: ready ? { opacity: 1, y: 0 } : undefined, transition: { duration: 0.9, ease: EASE, delay } });
  return (
    <section aria-labelledby="hero-h" className="relative flex min-h-dvh items-center overflow-hidden pb-20 pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--color-moss)_55%,transparent),transparent)]" />
      <div className={cn(WRAP, "relative flex flex-col items-center text-center")}>
        <motion.p {...rise(0)} className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-[13px] font-semibold text-mint">
          <span className="size-1.5 rounded-full bg-gold" aria-hidden /> Testnet prototype · not audited
        </motion.p>
        <motion.h1 id="hero-h" {...rise(0.06)} className="max-w-[14ch] text-[clamp(44px,7vw+8px,104px)] font-extrabold leading-[1.02] tracking-[-0.05em] [text-wrap:balance]">
          Payment links for people who invoice.
        </motion.h1>
        <motion.p {...rise(0.12)} className={cn(LEAD, "mt-7 max-w-[46ch]")}>
          Invoice anyone, get paid in seconds, let safe AI agents handle the rest. Built on NEAR.
        </motion.p>
        <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" variant="mint" onClick={() => go("/get-paid")}>
            Get started <ArrowRight size={18} aria-hidden />
          </Button>
          <Button size="lg" variant="secondary" onClick={onTour}>
            <Play size={16} aria-hidden /> See the demo
          </Button>
        </motion.div>
        <motion.div {...rise(0.26)} className="mt-16 flex flex-col items-center gap-1 text-muted" aria-label="One place to get paid, pay a contractor, run an AI payout, and verify an account">
          <span className="text-[13.5px] font-semibold" aria-hidden>One place to</span>
          <span aria-hidden className="text-mint">
            {reduce ? (
              <span className="text-[clamp(28px,4vw,48px)] font-bold tracking-[-0.03em]">get paid</span>
            ) : (
              <MorphText words={["get paid", "pay a contractor", "run an AI payout", "verify an account"]} interval={2800} fontSize="clamp(28px, 4vw, 48px)" textClassName="tracking-[-0.03em]" />
            )}
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section aria-label="What Notara runs on" className="border-y border-border/70">
      <Reveal className={cn(WRAP, "flex flex-col items-center gap-5 py-9 text-center")}>
        <RevealItem as="p" className="text-[14px] font-semibold text-muted">Built on NEAR · USDC settlement · Human-in-the-loop AI</RevealItem>
        <RevealItem className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[17px] font-extrabold tracking-[-0.03em] text-foreground/55">
          {["NEAR", "USDC", "NEAR Intents", "FastNear"].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </RevealItem>
        <RevealItem as="p" className="text-[12.5px] text-muted">The networks and services Notara runs on. Their names belong to their owners.</RevealItem>
      </Reveal>
    </section>
  );
}

const STEPS = [
  { icon: Pencil, title: "Write the invoice", body: "An amount and a line about what it's for. That's the whole form." },
  { icon: ShieldCheck, title: "Your wallet signs it", body: "A short, free message that proves the link is yours. No money moves." },
  { icon: Send, title: "They pay, you're paid", body: "Your customer pays from the chain they already use. USDC lands in your account." },
];

function HowItWorks() {
  const [dealt, setDealt] = useState(0);
  return (
    <section id="how-it-works" aria-labelledby="how-h" className="scroll-mt-24 py-28 lg:py-40">
      <div className={cn(WRAP, "grid items-center gap-14 lg:grid-cols-2")}>
        <Reveal>
          <RevealItem as="h2" className={H2}><span id="how-h">Three steps, about a minute.</span></RevealItem>
          <RevealItem as="p" className={cn(LEAD, "mt-5 max-w-[44ch]")}>No crypto words on the way. Your customer sees who is asking before they pay.</RevealItem>
          <ol className="mt-10 flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <RevealItem as="li" key={s.title} className={cn("flex gap-4 rounded-2xl border p-4 transition-colors duration-300", i === dealt % STEPS.length ? "border-border bg-surface" : "border-transparent")}>
                <span className="tnum inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-bold text-mint">{i + 1}</span>
                <span>
                  <span className="block text-[17px] font-bold tracking-[-0.02em]">{s.title}</span>
                  <span className="mt-0.5 block text-[15px] leading-relaxed text-muted">{s.body}</span>
                </span>
              </RevealItem>
            ))}
          </ol>
        </Reveal>
        <div className="relative h-[440px]" aria-hidden>
          <VerseCards
            defaultOpen
            loop
            navItems={[]}
            footerText="Click the card for the next step."
            onDeal={(i) => setDealt(i + 1)}
            className="rounded-3xl [&_[data-verse-close]]:hidden"
            cards={STEPS.map((s, i) => ({
              label: s.title,
              className: "!h-[320px] !w-[240px] !rounded-3xl !items-stretch !justify-stretch border border-border !bg-surface",
              content: (
                <span className="flex h-full w-full flex-col justify-between p-6 text-left">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-mint">
                    <s.icon size={28} />
                  </span>
                  <span>
                    <span className="tnum block text-[13px] font-semibold text-muted">Step {i + 1}</span>
                    <span className="mt-1 block text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{s.title}</span>
                  </span>
                </span>
              ),
            }))}
          />
        </div>
      </div>
    </section>
  );
}

const SCRIPT = [
  { who: "hosting-co.near", amount: "42.00", verdict: "Paid", tone: "text-success", spent: "42.00", held: "0" },
  { who: "new-supplier.near", amount: "310.00", verdict: "Held for you", tone: "text-warning", spent: "42.00", held: "1" },
  { who: "urgent-refund.near", amount: "900.00", verdict: "Refused", tone: "text-danger", spent: "42.00", held: "1" },
];

function SafetyPanel() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? SCRIPT.length : 1);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((x) => (x >= SCRIPT.length ? 1 : x + 1)), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  const now = SCRIPT[n - 1];
  return (
    <section aria-labelledby="safe-h" className="bg-background-secondary py-28 lg:py-40">
      <div className={cn(WRAP, "grid items-center gap-14 lg:grid-cols-2")}>
        <Reveal className="order-2 lg:order-1">
          <RevealItem className="rounded-3xl border border-border bg-surface p-6 shadow-pop">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-bold"><ShieldCheck size={18} className="text-mint" aria-hidden /> Vault Console</p>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] font-semibold text-muted">Illustration · example values</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[["Spent today", now.spent, "$"], ["Daily limit", "500.00", "$"], ["Held for you", now.held, ""]].map(([l, v, p]) => (
                <div key={l}>
                  <p className="text-[12px] font-semibold text-muted">{l}</p>
                  <p className="tnum mt-1 flex text-[24px] font-extrabold tracking-[-0.03em]">{p}<AnimatedNumber value={v} /></p>
                </div>
              ))}
            </div>
            <ul className="mt-5 flex min-h-[168px] flex-col gap-2 border-t border-border pt-4" aria-hidden>
              <AnimatePresence initial={false}>
                {SCRIPT.slice(0, n).map((e) => (
                  <motion.li key={e.who} layout={!reduce} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary px-3.5 py-2.5 text-[13.5px]">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12.5px] font-semibold">{e.who}</span>
                      <span className="tnum text-muted">Agent asked to pay ${e.amount}</span>
                    </span>
                    <span className={cn("shrink-0 font-bold", e.tone)}>{e.verdict}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <p className="sr-only">Example: an agent asks a vault to make three payments. One is paid, one is held for the owner, one is refused.</p>
          </RevealItem>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <RevealItem as="h2" className={H2}><span id="safe-h">Let an agent pay, without handing it the keys.</span></RevealItem>
          <RevealItem as="p" className={cn(LEAD, "mt-5 max-w-[46ch]")}>
            The agent can only ask a vault to pay. The vault pays within the limits you set, holds anything unusual for your approval, and refuses an account with a verified scam report. Those rules are enforced on NEAR, so a tricked agent still can't get past them.
          </RevealItem>
          <ul className="mt-8 flex flex-col gap-3 text-[15.5px]">
            {["Limits per payment and per day", "A person approves anything Notara flags", "One button pauses every payment"].map((t) => (
              <RevealItem as="li" key={t} className="flex items-center gap-3 font-semibold">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent-soft text-mint"><Check size={14} aria-hidden /></span> {t}
              </RevealItem>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

const PERSONAS: { icon: typeof Bot; who: string; job: string; where: string }[] = [
  { icon: Pencil, who: "Freelance designer or developer", job: "Invoice a client in another country and get paid in USDC.", where: "Get Paid" },
  { icon: Users, who: "Small agency or studio", job: "Send contractor payouts, and keep an agent inside a vault with limits.", where: "Send · Vault Console" },
  { icon: Link2, who: "Creator or newsletter writer", job: "Put one payment link in your bio for tips and paid work.", where: "Get Paid" },
  { icon: Terminal, who: "SaaS founder", job: "Let an AI agent pay infrastructure bills up to a cap you choose.", where: "Vault Console" },
  { icon: Suitcase, who: "Finance at a small team", job: "Check a counterparty before paying, and keep a person in the loop.", where: "Check an Account" },
  { icon: Shop, who: "Shop or small business owner", job: "Take a one-off payment with a link. No wallet words for your customer.", where: "Get Paid" },
];

function UseCases() {
  const [w, setW] = useState(300);
  useEffect(() => {
    const on = () => setW(window.innerWidth < 640 ? 250 : 300);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return (
    <section aria-labelledby="who-h" className="overflow-hidden py-28 lg:py-40">
      <Reveal className={cn(WRAP, "text-center")}>
        <RevealItem as="h2" className={cn(H2, "mx-auto max-w-[16ch]")}><span id="who-h">Made for the people who send the invoice.</span></RevealItem>
        <RevealItem as="p" className={cn(LEAD, "mx-auto mt-5 max-w-[44ch]")}>Use the arrow keys, the dots, or click a card.</RevealItem>
      </Reveal>
      <div className="mt-12 h-[520px]">
        <PerspectiveCarousel
          aria-label="Who Notara is for"
          slideWidth={w + 24}
          defaultActiveIndex={1}
          labelClassName="hidden"
          items={PERSONAS.map((p) => ({
            title: p.who,
            content: (
              <span className="flex h-full w-full flex-col justify-between rounded-3xl border border-border bg-surface p-6 shadow-pop">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-mint"><p.icon size={24} /></span>
                <span>
                  <span className="block text-[21px] font-extrabold leading-tight tracking-[-0.03em]">{p.who}</span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-muted">{p.job}</span>
                  <span className="mt-4 inline-block rounded-full bg-surface-secondary px-3 py-1 text-[12.5px] font-semibold">{p.where}</span>
                </span>
              </span>
            ),
          }))}
        />
      </div>
    </section>
  );
}

function Stats() {
  const facts: { value: number; suffix?: string; label: string }[] = [
    { value: Object.keys(SIGNAL_LABELS).length, label: "live signals read for every account check" },
    { value: 5, suffix: " min", label: "is how long a verdict stays valid, then it must be asked again" },
    { value: 10, label: "attack cases the vault is built to refuse, each one runnable" },
    { value: 0, label: "keys or customer funds held by Notara" },
  ];
  return (
    <section aria-labelledby="facts-h" className="border-y border-border/70 bg-background-secondary py-20">
      <div className={WRAP}>
        <h2 id="facts-h" className="sr-only">Notara in numbers</h2>
        <Reveal as="ul" className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <RevealItem as="li" key={f.label}>
              <p className="text-[clamp(44px,4vw+16px,72px)] font-extrabold leading-none tracking-[-0.05em] text-mint">
                <StatsCounter value={f.value} suffix={f.suffix} duration={1.4} />
              </p>
              <p className="mt-3 max-w-[24ch] text-[14.5px] leading-relaxed text-muted">{f.label}</p>
            </RevealItem>
          ))}
        </Reveal>
        <p className="mt-10 text-[12.5px] text-muted">Product facts from the code that runs today, not usage figures. Notara is a prototype and doesn't publish volume yet.</p>
      </div>
    </section>
  );
}

function CodeLine({ children }: { children: ReactNode }) {
  return <span className="block">{children}</span>;
}

function Developers() {
  const host = typeof location !== "undefined" ? location.origin : "";
  const code = `curl -s ${host}/v1/check \\\n  -H 'content-type: application/json' \\\n  -d '{"network":"mainnet","recipient":"shop.near","amountDecimal":"12.50"}'`;
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  return (
    <section id="developers" aria-labelledby="dev-h" className="scroll-mt-24 py-28 lg:py-40">
      <div className={cn(WRAP, "grid items-center gap-14 [&>*]:min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
        <Reveal>
          <RevealItem as="h2" className={H2}><span id="dev-h">One call before your agent pays.</span></RevealItem>
          <RevealItem as="p" className={cn(LEAD, "mt-5 max-w-[44ch]")}>Ask check_an_account, get a verdict and the evidence. No API key. Stop on amber and ask a person; never pay on red.</RevealItem>
          <RevealItem className="mt-7 text-[16px] font-semibold text-mint">
            <LineHoverLink href="/llms.txt">Read the API notes <ArrowRight size={15} aria-hidden /></LineHoverLink>
          </RevealItem>
        </Reveal>
        <Reveal>
          <RevealItem className="overflow-hidden rounded-3xl border border-border bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-mono text-[12.5px] text-muted">POST /v1/check</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied("done");
                    setTimeout(() => setCopied("idle"), 1800);
                  } catch {
                    setCopied("failed");
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-semibold transition-colors hover:bg-surface-secondary"
              >
                {copied === "done" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied === "done" ? "Copied" : copied === "failed" ? "Select and copy" : "Copy"}
                <span className="sr-only" role="status">{copied === "done" ? "Copied to the clipboard" : ""}</span>
              </button>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-[1.75]" tabIndex={0} aria-label="Example request and response">
              <code>
                <CodeLine><span className="text-mint">curl</span> -s {host}/v1/check \</CodeLine>
                <CodeLine>{"  "}-H <span className="text-gold">'content-type: application/json'</span> \</CodeLine>
                <CodeLine>{"  "}-d <span className="text-gold">{`'{"network":"mainnet","recipient":"shop.near","amountDecimal":"12.50"}'`}</span></CodeLine>
                <CodeLine>&nbsp;</CodeLine>
                <CodeLine><span className="text-muted">{"# →"} {"{"} "report": {"{"} "decision": </span><span className="text-mint">"ALLOW"</span><span className="text-muted"> | </span><span className="text-gold">"WARN"</span><span className="text-muted"> | </span><span className="text-danger">"BLOCK"</span><span className="text-muted">,</span></CodeLine>
                <CodeLine><span className="text-muted">{"#     "}"reasons": [...], "signals": [...] {"}"} {"}"}</span></CodeLine>
              </code>
            </pre>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" aria-labelledby="price-h" className="scroll-mt-24 bg-background-secondary py-28">
      <Reveal className={cn(WRAP, "grid items-end gap-10 lg:grid-cols-2")}>
        <div>
          <RevealItem as="h2" className={H2}><span id="price-h">Notara adds no fee.</span></RevealItem>
          <RevealItem as="p" className={cn(LEAD, "mt-5 max-w-[46ch]")}>While it's a prototype, Notara is free to use. Money goes from the payer straight to you; Notara never holds it.</RevealItem>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-3xl border border-border bg-surface px-6">
          {[
            ["Creating and signing a link", "Free"],
            ["Sending on NEAR", "The network's own fee, usually under 1¢"],
            ["Paying from another chain", "The rate NEAR Intents quotes at checkout"],
            ["Test money", "Free, and worth nothing"],
          ].map(([a, b]) => (
            <RevealItem as="li" key={a} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
              <span className="text-[15.5px] font-semibold">{a}</span>
              <span className="text-[14.5px] text-muted">{b}</span>
            </RevealItem>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

const FAQ = [
  ["Does Notara hold my money?", "No. Money goes from the customer's wallet to your account. Payments from other chains are routed by NEAR Intents, which delivers USDC to you on NEAR."],
  ["What does the wallet signature prove?", "That the link's amount, recipient and description were approved by the wallet that gets paid. It shows who is asking, not that they will deliver."],
  ["Does my customer need a crypto wallet?", "To pay a link, they need a wallet on a chain they already use. To receive a send link, they need nothing: they can claim the money into a new account."],
  ["What does the account check actually look at?", "The account's age and activity, contracts it has deployed, earlier payments, shared scam reports and Notara's own lists, all read live. Green means no rule was broken. It never means safe."],
  ["What stops an AI agent from being tricked?", "The agent can only ask a vault to pay. The vault checks a signed verdict, your limits and whether it's paused, on NEAR. Anything flagged waits for a person. A hacked agent can't skip those checks."],
  ["What can I try for free?", "Payment links, wallet payments, send links, account checks and the agent vault all run on NEAR testnet with free test money. Paying from another chain needs mainnet."],
  ["Is it audited?", "No. Notara is a hackathon prototype. Keep real-money amounts small."],
  ["Where is my profile stored?", "Your display name, picture and links stay in your browser on your device. Your payment links live on Notara's server, listed only for your wallet."],
];

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="scroll-mt-24 py-28 lg:py-40">
      <div className={cn(WRAP, "grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]")}>
        <Reveal>
          <RevealItem as="h2" className={H2}><span id="faq-h">Questions, answered plainly.</span></RevealItem>
        </Reveal>
        <Reveal>
          <RevealItem>
            <Accordion className="nt-faq" variant="default">
              {FAQ.map(([q, a]) => (
                <Accordion.Item key={q} id={q}>
                  <Accordion.Heading>
                    <Accordion.Trigger className="py-5 text-left text-[17px] font-bold tracking-[-0.01em] text-foreground">
                      {q}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="max-w-[60ch] pb-5 text-[15.5px] leading-relaxed text-muted">{a}</Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

/** Customers usually arrive from a link; this opens one they were sent. */
function OpenLink() {
  const nav = useNavigate();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function open(e: FormEvent) {
    e.preventDefault();
    const m = v.trim().match(/\/(pay|claim)\/([A-Za-z0-9-]+)(#.*)?/) ?? v.trim().match(/^()(INV-\d+)$/i);
    if (!m) return setErr("Paste the whole link, like https://…/pay/INV-0042");
    nav(`/${m[1] || "pay"}/${m[2].toUpperCase()}${m[3] ?? ""}`);
  }
  return (
    <form onSubmit={open} noValidate className="mx-auto mt-12 flex w-full max-w-md flex-col gap-2 text-left">
      <label htmlFor="open-link" className="text-[13.5px] font-semibold text-muted">Were you sent a link? Open it here.</label>
      <div className="flex gap-2">
        <input id="open-link" value={v} onChange={(e) => (setV(e.target.value), setErr(null))} placeholder="https://…/pay/INV-0042" aria-invalid={!!err || undefined} aria-describedby={err ? "open-link-err" : undefined} className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-[14.5px] placeholder:text-muted/60 focus:border-focus" />
        <Button type="submit" variant="secondary">Open</Button>
      </div>
      {err && <p id="open-link-err" role="alert" className="text-[13px] font-semibold text-danger">{err}</p>}
    </form>
  );
}

function Closing() {
  const go = useGo();
  return (
    <section aria-labelledby="close-h" className="relative overflow-hidden py-32 lg:py-44">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(55%_70%_at_50%_100%,color-mix(in_srgb,var(--color-moss)_60%,transparent),transparent)]" />
      <Reveal className={cn(WRAP, "relative flex flex-col items-center text-center")}>
        <RevealItem as="h2" className="max-w-[14ch] text-[clamp(40px,6vw+8px,92px)] font-extrabold leading-[1.02] tracking-[-0.05em] [text-wrap:balance]"><span id="close-h">Send your next invoice as a link.</span></RevealItem>
        <RevealItem as="p" className={cn(LEAD, "mt-6 max-w-[40ch]")}>It takes about a minute. Signing is free and moves no money.</RevealItem>
        <RevealItem className="mt-9">
          <Button size="lg" variant="mint" onClick={() => go("/get-paid")}>
            Get started <ArrowRight size={18} aria-hidden />
          </Button>
        </RevealItem>
        <RevealItem className="w-full">
          <OpenLink />
        </RevealItem>
      </Reveal>
    </section>
  );
}

export function LandingPage() {
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(false);
  return (
    <>
      <Preloader onDone={() => setReady(true)} />
      <Hero ready={ready} onTour={() => setTour(true)} />
      <TrustStrip />
      <HowItWorks />
      <SafetyPanel />
      <UseCases />
      <Stats />
      <Developers />
      <Pricing />
      <Faq />
      <Closing />
      <Tour open={tour} onClose={() => setTour(false)} />
    </>
  );
}

