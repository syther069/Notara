// The Notara landing page. Light (cream) throughout, with three canopy stages for contrast: the hero, the
// agent vault and the close. Every visual is Notara's own UI; every illustration that could pass for live data
// carries an "Example" tag. Every figure below is read from the code (passport/policy.json, the vault contract,
// the send-link limits), never a usage number: Notara is a prototype and publishes no volume.
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Coins,
  Download,
  Globe,
  Link2,
  Lock,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Wallet,
} from "@/components/icons";
import { Preloader } from "@/components/landing/Preloader";
import { useGo } from "@/components/shell/MarketingShell";
import { SmoothScroll } from "@/components/skiper/scroll";
import { ExpandGroup } from "@/components/skiper/expand";
import { PagePreview } from "@/components/app/preview";
import { Button, EASE, Reveal, RevealItem } from "@/components/app/ui";
import { NotaraMark } from "@/components/Layout";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-[72px]";
const H2 = "text-[clamp(30px,2.4vw+18px,52px)] font-extrabold leading-[1.05] tracking-[-0.04em] [text-wrap:balance]";
const LEAD = "text-[17px] leading-[1.6] text-muted [text-wrap:pretty]";
const EYEBROW = "font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-highlight";

// ------------------------------------------------------------------ small parts

/** Marks a card that shows Notara's UI with made-up values, so nobody reads it as live data. */
function Example({ className, children = "Example" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full border border-dashed border-current/40 px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted", className)}>
      {children}
    </span>
  );
}

/** A card in the product's own style, used for every floating fragment on the page. */
function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border/80 bg-surface text-foreground shadow-lift", className)}>{children}</div>;
}

/** The faint square grid behind a canopy stage (it reads as the reference's tiled ground, in Notara's own mint). */
function GridGround() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(color-mix(in_srgb,var(--color-mint)_9%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-mint)_9%,transparent)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(90%_70%_at_30%_0%,#000_30%,transparent_80%)]"
    />
  );
}

function SectionHead({ eyebrow, title, lead, id, center, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; id: string; center?: boolean; className?: string }) {
  return (
    <Reveal className={cn(center && "mx-auto text-center", "max-w-[720px]", className)}>
      <RevealItem as="p" className={EYEBROW}>
        {eyebrow}
      </RevealItem>
      <RevealItem as="h2" className={cn(H2, "mt-4")}>
        <span id={id}>{title}</span>
      </RevealItem>
      {lead && (
        <RevealItem as="p" className={cn(LEAD, "mt-5", center && "mx-auto max-w-[60ch]")}>
          {lead}
        </RevealItem>
      )}
    </Reveal>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15.5px] leading-[1.55]">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-highlight">
        <Check size={14} aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  );
}

// ------------------------------------------------------------------ 1. hero

function HeroVisual() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // The three cards part a little as the page scrolls: depth, not a show. Still under reduced motion.
  const yBack = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const rise = (delay: number) => ({ initial: { opacity: 0, y: reduce ? 0 : 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: EASE } });

  return (
    // The product cards stay light (cream) on the canopy stage, like a printed card on a dark desk.
    <div ref={ref} data-theme="light" className="relative mx-auto h-[500px] w-full max-w-[520px] text-foreground sm:h-[540px]">
      {/* back: the merchant's list of links */}
      <motion.div style={{ y: yBack }} className="absolute left-[-6%] top-10 w-[56%] max-sm:hidden">
        <motion.div {...rise(0.25)}>
          <Panel className="rotate-[-4deg] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold text-muted">Your payment links</p>
              <Example />
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-[12.5px]">
              {[
                ["Logo design, 2 rounds", "50", "Paid"],
                ["Website copy, 3 pages", "120", "Waiting"],
                ["October retainer", "400", "Paid"],
              ].map(([what, amt, st]) => (
                <li key={what} className="flex items-center justify-between gap-2 rounded-xl bg-surface-secondary px-3 py-2">
                  <span className="truncate font-semibold">{what}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tnum font-bold">{amt} USDC</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", st === "Paid" ? "bg-gold/25 text-gold-ink" : "bg-default text-muted")}>{st}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>
      </motion.div>

      {/* main: the page a customer opens */}
      <motion.div {...rise(0.1)} className="absolute right-0 top-0 w-full sm:w-[64%]">
        <Panel className="overflow-hidden !shadow-pop">
          <PagePreview
            host="notara.xyz"
            path="/pay/INV-0042"
            who="design-studio.near"
            website="design-studio.example"
            forText="Logo design, 2 rounds"
            emptyFor=""
            amount="50.00"
            unit="USDC"
            checks={[
              { state: "ok", text: "Signed by this account's wallet" },
              { state: "ok", text: "No rule broken in the account check" },
              { state: "wait", text: "Pay from NEAR, or from another chain" },
            ]}
            primary="Pay 50 USDC"
            secondary="Pay from another chain"
          />
        </Panel>
        <Example className="absolute right-3 top-2.5 bg-surface" />
      </motion.div>

      {/* front: what the signature and the check established */}
      <motion.div style={{ y: yFront }} className="absolute -bottom-2 left-2 w-[78%] sm:bottom-4 sm:left-[-4%] sm:w-[58%]">
        <motion.div {...rise(0.45)}>
          <Panel className="p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold leading-snug">Signature checks out</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted">The amount, recipient and description were signed by design-studio.near's own key (NEP-413).</p>
              </div>
            </div>
          </Panel>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Hero({ ready }: { ready: boolean }) {
  const go = useGo();
  const reduce = useReducedMotion();
  const enter = (d: number) => ({ initial: { opacity: 0, y: reduce ? 0 : 18 }, animate: ready ? { opacity: 1, y: 0 } : undefined, transition: { duration: 0.8, delay: d, ease: EASE } });
  return (
    <section aria-labelledby="hero-h" className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div data-theme="dark" className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,var(--color-canopy)_0%,var(--color-canopy)_48%,var(--color-moss)_100%)] text-foreground sm:rounded-[36px]">
        <GridGround />
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-mint)_16%,transparent),transparent)]" />
        <div className={cn(WRAP, "relative grid items-center gap-14 pb-16 pt-32 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24 lg:pt-40")}>
          <div>
            <motion.p {...enter(0)} className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-canopy/40 px-3.5 py-1.5 text-[13px] font-semibold text-cream/90">
              <span className="size-1.5 rounded-full bg-gold" aria-hidden /> Built on NEAR · prototype, not audited
            </motion.p>
            <motion.h1 {...enter(0.08)} id="hero-h" className="mt-6 text-[clamp(42px,4.6vw+12px,80px)] font-extrabold leading-[0.98] tracking-[-0.045em] [text-wrap:balance]">
              Payment links for people who invoice.
            </motion.h1>
            <motion.p {...enter(0.16)} className="mt-6 max-w-[52ch] text-[18px] leading-[1.6] text-cream/80 [text-wrap:pretty]">
              Your NEAR wallet signs the link, so your client can see it's really you. They pay from the chain they already use, and exact USDC arrives in your
              account. Notara never holds the money.
            </motion.p>
            <motion.div {...enter(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="mint" onClick={() => go("/get-paid")}>
                Create a payment link <ArrowRight size={18} aria-hidden />
              </Button>
              <Button size="lg" variant="secondary" className="!border-mint/30 !bg-transparent !text-cream hover:!bg-mint/10" onClick={() => go("/send")}>
                <Send size={17} aria-hidden /> Send money with a link
              </Button>
            </motion.div>
            <motion.ul {...enter(0.32)} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] font-medium text-cream/70">
              <li className="flex items-center gap-2">
                <Lock size={14} aria-hidden className="text-mint" /> Wallet-signed (NEP-413)
              </li>
              <li className="flex items-center gap-2">
                <Globe size={14} aria-hidden className="text-mint" /> Other chains through NEAR Intents
              </li>
              <li className="flex items-center gap-2">
                <Coins size={14} aria-hidden className="text-mint" /> Settles in USDC
              </li>
            </motion.ul>
          </div>
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 2. facts (product facts, not usage figures)

const FACTS = [
  { n: "6", label: "live signals read in every account check" },
  { n: "5 min", label: "a signed verdict stays valid before it must be asked again" },
  { n: "10", label: "attack cases the agent vault is built to refuse" },
  { n: "0", label: "customer funds Notara holds: a payment goes straight to you" },
];

function Facts() {
  return (
    <section aria-label="Product facts" className={cn(WRAP, "py-16 lg:py-24")}>
      <Reveal as="ul" className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        {FACTS.map((f, i) => (
          <RevealItem as="li" key={f.label} className={cn("px-2 sm:px-6", i > 0 && "lg:border-l lg:border-border", i % 2 === 1 && "max-lg:border-l max-lg:border-border")}>
            <p className="tnum text-[clamp(40px,3vw+20px,64px)] font-extrabold leading-none tracking-[-0.045em]">{f.n}</p>
            <p className="mt-3 max-w-[24ch] text-[14.5px] leading-[1.5] text-muted">{f.label}</p>
          </RevealItem>
        ))}
      </Reveal>
      <p className="mt-10 text-[13px] text-muted">Facts about how the product is built, read from its code. Notara is a prototype and doesn't publish usage figures.</p>
    </section>
  );
}

// ------------------------------------------------------------------ 3. get paid

function GetPaidSection() {
  const go = useGo();
  return (
    <section id="get-paid" aria-labelledby="getpaid-h" className="scroll-mt-24 border-t border-border/70 py-20 lg:py-32">
      <div className={cn(WRAP, "grid items-center gap-16 lg:grid-cols-2")}>
        <div>
          <SectionHead
            id="getpaid-h"
            eyebrow="01 · Get paid"
            title="Ask for money in a way your client can trust."
            lead="Write what it's for and how much. Your wallet signs it; nothing moves and there's no fee for signing. The link opens on a page that shows who is asking before anyone pays."
          />
          <Reveal as="ul" className="mt-8 flex flex-col gap-3.5">
            <RevealItem as="li">
              <Tick>
                <strong>Signed by your wallet.</strong> Change one character of the amount or recipient and the page says the signature no longer checks out.
              </Tick>
            </RevealItem>
            <RevealItem as="li">
              <Tick>
                <strong>Paid from where they are.</strong> A NEAR wallet pays directly; on mainnet, other chains pay through NEAR Intents and you receive exact USDC.
              </Tick>
            </RevealItem>
            <RevealItem as="li">
              <Tick>
                <strong>Proof of your website.</strong> Put one text file on your site and customers see "Website proven" next to your name.
              </Tick>
            </RevealItem>
            <RevealItem as="li">
              <Tick>
                <strong>Books that add up.</strong> Every link has a status and its transaction, and the list exports as a CSV your accountant can read.
              </Tick>
            </RevealItem>
          </Reveal>
          <div className="mt-9">
            <Button size="lg" onClick={() => go("/get-paid")}>
              Create a payment link <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </div>

        {/* layered cards: the signed message, and the money arriving */}
        <Reveal className="relative mx-auto h-[460px] w-full max-w-[520px]">
          <RevealItem className="absolute right-0 top-0 w-[86%]">
            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5 text-[12px] text-muted">
                <Wallet size={13} aria-hidden /> <span className="font-mono">Wallet · sign message</span>
                <Example className="ml-auto" />
              </div>
              <pre className="px-5 py-5 font-mono text-[13px] leading-[1.8] text-foreground">{"Notara payment link\nPay to:  design-studio.near\nAmount:  50 USDC\nFor:     Logo design, 2 rounds"}</pre>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
                <span className="text-[12.5px] text-muted">Short message, no transaction, no fee</span>
                <span className="rounded-full bg-accent px-4 py-1.5 text-[12.5px] font-bold text-accent-foreground">Sign</span>
              </div>
            </Panel>
          </RevealItem>
          <RevealItem className="absolute bottom-0 left-0 w-[74%]">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-muted">INV-0042 · paid</p>
                <Example />
              </div>
              <p className="tnum mt-3 text-[38px] font-extrabold leading-none tracking-[-0.04em]">
                50.00 <span className="text-[15px] font-bold tracking-normal text-muted">USDC</span>
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[12.5px]">
                <div>
                  <dt className="text-muted">Client paid with</dt>
                  <dd className="font-semibold">ETH on Arbitrum</dd>
                </div>
                <div>
                  <dt className="text-muted">You received</dt>
                  <dd className="font-semibold">USDC on NEAR</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-highlight">
                <Download size={13} aria-hidden /> In your CSV export
              </div>
            </Panel>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 4. three steps

const STEPS = [
  { n: "1", title: "Write the link", body: "What it's for and how much, in USDC. Your client reads exactly this.", icon: <Link2 size={20} aria-hidden /> },
  { n: "2", title: "Your wallet signs it", body: "One short message from your NEAR wallet. No transaction, nothing spent.", icon: <Wallet size={20} aria-hidden /> },
  { n: "3", title: "They pay, you're paid", body: "Your client sees who is asking, pays, and the USDC lands in your account.", icon: <CircleCheck size={20} aria-hidden /> },
];

function StepsSection() {
  return (
    <section aria-labelledby="steps-h" className="bg-background-secondary py-20 lg:py-28">
      <div className={WRAP}>
        <SectionHead id="steps-h" center eyebrow="How a link works" title="Three steps, about a minute." lead="No crypto words for your client to learn. The page they open tells them who you are and what they're paying for." />
        <Reveal as="ol" className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <RevealItem as="li" key={s.n}>
              <div className="flex h-full flex-col rounded-3xl border border-border/80 bg-surface p-7 shadow-card transition-[transform,box-shadow] duration-300 ease-enter hover:-translate-y-1 hover:shadow-lift motion-reduce:transform-none">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-highlight">{s.icon}</span>
                  <span className="font-mono text-[13px] font-semibold text-muted">0{s.n}</span>
                </div>
                <h3 className="mt-8 text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{s.title}</h3>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">{s.body}</p>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 5. send by link

function SendSection() {
  const go = useGo();
  return (
    <section id="send" aria-labelledby="send-h" className="scroll-mt-24 py-20 lg:py-32">
      <div className={cn(WRAP, "grid items-center gap-16 lg:grid-cols-2")}>
        {/* the claim page the receiver opens */}
        <Reveal className="relative order-2 mx-auto w-full max-w-[480px] lg:order-1">
          <RevealItem>
            <Panel className="overflow-hidden !shadow-pop">
              <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5 text-[12px] text-muted">
                <Lock size={13} aria-hidden /> <span className="truncate font-mono">notara · /claim/SEND-0007#…</span>
                <Example className="ml-auto" />
              </div>
              <div className="px-6 pb-7 pt-6">
                <p className="text-[13px] font-semibold text-muted">Someone sent you</p>
                <p className="tnum mt-1 text-[48px] font-extrabold leading-none tracking-[-0.045em]">
                  10.00 <span className="text-[16px] font-bold tracking-normal text-muted">USDC</span>
                </p>
                <p className="mt-3 text-[15px] font-semibold">"Thanks for the help with the move."</p>
                <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-[13px]">
                  <li className="flex items-center gap-2 text-success">
                    <CircleCheck size={15} aria-hidden /> Funded and waiting for you
                  </li>
                  <li className="flex items-center gap-2 text-success">
                    <CircleCheck size={15} aria-hidden /> No NEAR needed: gas and the USDC setup are covered
                  </li>
                </ul>
                <div className="mt-6 grid gap-2">
                  <span className="flex h-11 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-accent-foreground">Claim to my NEAR account</span>
                  <span className="flex h-10 items-center justify-center rounded-full border border-border text-[13px] font-semibold">Get my own NEAR name</span>
                </div>
              </div>
            </Panel>
          </RevealItem>
          <RevealItem className="absolute -right-3 -top-6 max-sm:hidden">
            <Panel className="flex items-center gap-2.5 px-4 py-3">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-warning-soft text-warning">
                <Lock size={15} aria-hidden />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight">
                The key lives after the #.
                <br />
                <span className="font-medium text-muted">Browsers never send it to our server.</span>
              </span>
            </Panel>
          </RevealItem>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHead
            id="send-h"
            eyebrow="02 · Send money"
            title="Send USDC to anyone, even without a wallet yet."
            lead="Fund a link and share it. Whoever opens it claims the money into a NEAR account, and can get their own NEAR name on the way."
          />
          <Reveal as="ul" className="mt-8 flex flex-col gap-3.5">
            <RevealItem as="li">
              <Tick>Your browser makes a one-time key for each link. It sits in the part of the link after the #, which is never sent to Notara.</Tick>
            </RevealItem>
            <RevealItem as="li">
              <Tick>From 1 to 25 USDC per link in this prototype. Not claimed in 7 days? Open your own link and take the money back.</Tick>
            </RevealItem>
            <RevealItem as="li">
              <Tick>It works like cash: anyone with the link can claim it, so the page says so before you share it.</Tick>
            </RevealItem>
          </Reveal>
          <p className="mt-6 text-[13.5px] text-muted">Runs on NEAR testnet today. Real-money send links need a sponsor account that pays the claimer's gas, which this site doesn't have yet.</p>
          <div className="mt-8">
            <Button size="lg" onClick={() => go("/send")}>
              <Send size={17} aria-hidden /> Send money with a link
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 6. agent vault (canopy stage)

const OUTCOMES = [
  { d: "ALLOW", word: "Paid", body: "An onboarded merchant, within the caps: the vault checks the verdict's signature and pays.", icon: <ShieldCheck size={18} aria-hidden />, ink: "text-success", soft: "bg-success-soft" },
  { d: "WARN", word: "Held for you", body: "A new shop or an unusual amount: the payment waits on-chain until the owner approves or rejects it.", icon: <ShieldAlert size={18} aria-hidden />, ink: "text-warning", soft: "bg-warning-soft" },
  { d: "BLOCK", word: "Refused", body: "An account with a verified scam report: Notara won't sign, and the vault refuses a BLOCK verdict.", icon: <ShieldX size={18} aria-hidden />, ink: "text-danger", soft: "bg-danger-soft" },
] as const;

const BYPASS = [
  "Submits the signed BLOCK verdict anyway",
  "Rewrites BLOCK into ALLOW",
  "Forges an ALLOW with its own key",
  "Reuses another payment's ALLOW",
  "Sends NEAR straight from the agent key",
  "Calls an owner-only method",
];

function VaultSection() {
  const go = useGo();
  return (
    <section id="agents" aria-labelledby="vault-h" className="scroll-mt-24 px-3 sm:px-4">
      <div data-theme="dark" className="relative overflow-hidden rounded-[28px] bg-background text-foreground sm:rounded-[36px]">
        <GridGround />
        <div className={cn(WRAP, "relative py-20 lg:py-28")}>
          <SectionHead
            id="vault-h"
            eyebrow="03 · AI agents"
            title="Let an agent pay, without handing it the keys."
            lead="The agent can only ask a vault contract to pay. The vault pays within the limits you set, holds anything unusual for you, and refuses what Notara blocks. Those rules run on NEAR, so a tricked agent still can't get past them."
          />

          <Reveal className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_1fr] [&>*]:min-w-0">
            {/* the vault console, as its owner sees it */}
            <RevealItem>
              <div className="h-full min-w-0 rounded-3xl border border-border bg-surface p-5 shadow-pop sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[14px] font-bold">
                    <Bot size={17} aria-hidden className="text-highlight" /> Vault console
                  </p>
                  <Example />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 border-b border-border pb-6 sm:gap-4">
                  {[
                    ["Spent today", "12.00"],
                    ["Daily cap", "100.00"],
                    ["Per payment", "50.00"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[12px] font-semibold text-muted">{k}</p>
                      <p className="tnum mt-1 text-[19px] font-extrabold leading-none tracking-[-0.03em] sm:text-[24px]">
                        {v} <span className="block text-[11px] font-bold tracking-normal text-muted sm:inline">USDC</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-default" aria-hidden>
                  <div className="h-full w-[12%] rounded-full bg-mint" />
                </div>
                <ul className="mt-6 flex flex-col gap-2.5 text-[13.5px]">
                  {[
                    ["hosting-co.near", "8.00", "Paid", "text-success", <CircleCheck key="a" size={15} aria-hidden />],
                    ["new-supplier.near", "30.00", "Held for you", "text-warning", <Clock key="b" size={15} aria-hidden />],
                    ["reported-account.near", "45.00", "Refused: scam report", "text-danger", <CircleX key="c" size={15} aria-hidden />],
                  ].map(([who, amt, st, ink, ic]) => (
                    <li key={who as string} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-surface-secondary px-4 py-3">
                      <span className="min-w-0 truncate font-mono text-[12.5px]">{who}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tnum font-bold">{amt}</span>
                        <span className={cn("flex items-center gap-1 text-[12.5px] font-bold", ink as string)}>
                          {ic} {st}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[12.5px] text-muted">The caps above are the demo vault's real limits on testnet: 50 USDC a payment, 100 USDC a day.</p>
              </div>
            </RevealItem>

            {/* the three outcomes */}
            <div className="flex flex-col gap-5">
              {OUTCOMES.map((o) => (
                <RevealItem key={o.d}>
                  <div className="flex items-start gap-4 rounded-3xl border border-border bg-surface p-5">
                    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", o.soft, o.ink)}>{o.icon}</span>
                    <div>
                      <p className="flex items-center gap-2 text-[15.5px] font-bold">
                        {o.word} <span className={cn("font-mono text-[11px] font-semibold", o.ink)}>{o.d}</span>
                      </p>
                      <p className="mt-1 text-[14px] leading-[1.55] text-muted">{o.body}</p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </div>
          </Reveal>

          {/* what a compromised agent tries */}
          <Reveal className="mt-5 rounded-3xl border border-border bg-surface/60 p-6 sm:p-7">
            <RevealItem as="p" className="text-[15px] font-bold">
              A hacked agent that skips its own checks still meets the contract. The vault refuses each of these:
            </RevealItem>
            <RevealItem>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {BYPASS.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 rounded-2xl bg-surface-secondary px-4 py-3 text-[13.5px] font-medium">
                    <CircleX size={15} aria-hidden className="shrink-0 text-danger" /> {b}
                  </li>
                ))}
              </ul>
            </RevealItem>
          </Reveal>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="mint" onClick={() => go("/agents/vault")}>
              Open the vault console <ArrowRight size={18} aria-hidden />
            </Button>
            <p className="text-[13.5px] text-muted">Testnet only, with free test money. Approvals are signed in the owner's own wallet.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 7. account check

const SIGNALS = [
  { name: "Account state", src: "Live · NEAR RPC", body: "Whether the account exists and holds a balance." },
  { name: "Activity history", src: "Live · indexer", body: "Earliest observed activity, which is not its creation date." },
  { name: "Contract deployments", src: "Live · indexer", body: "Code deployed in its recent transactions." },
  { name: "Code changes", src: "Notara records", body: "Whether its contract code changed since the last check." },
  { name: "Past payments", src: "Notara vault", body: "Payments the vault already made to this account." },
  { name: "Scam reports", src: "Notara registry", body: "Shared reports. Only a verified one can cause a red verdict." },
];

function CheckSection() {
  const go = useGo();
  const [acct, setAcct] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    const a = acct.trim().toLowerCase();
    if (!/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(a) || a.length < 2 || a.length > 64) {
      setErr("Enter a NEAR account, like studio.near or someone.testnet");
      document.getElementById("landing-acct")?.focus();
      return;
    }
    go(`/agents/check?account=${encodeURIComponent(a)}`);
  }
  return (
    <section id="check" aria-labelledby="check-h" className="scroll-mt-24 py-20 lg:py-32">
      <div className={cn(WRAP, "grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-start")}>
        <div>
          <SectionHead
            id="check-h"
            eyebrow="04 · Account check"
            title="See who's asking before you pay."
            lead="Notara reads an account's history and shared scam reports, then answers green, amber or red with the evidence behind it. It never calls an account safe: it can't tell you whether someone will deliver."
          />
          <form onSubmit={submit} noValidate className="mt-9 max-w-[480px]">
            <label htmlFor="landing-acct" className="text-[14px] font-bold">
              Check any NEAR account
            </label>
            <div className="mt-2 flex gap-2 max-sm:flex-col">
              <input
                id="landing-acct"
                value={acct}
                onChange={(e) => (setAcct(e.target.value), setErr(null))}
                placeholder="studio.near"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!err}
                aria-describedby={err ? "landing-acct-err" : "landing-acct-note"}
                className="h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-5 font-mono text-[16px] outline-none transition-colors placeholder:text-muted/60 focus:border-highlight"
              />
              <Button size="lg" type="submit">
                <Search size={17} aria-hidden /> Check account
              </Button>
            </div>
            {err ? (
              <p id="landing-acct-err" role="alert" className="mt-2 text-[13.5px] font-semibold text-danger">
                {err}
              </p>
            ) : (
              <p id="landing-acct-note" className="mt-2 text-[13px] text-muted">
                Read-only: nothing is signed or sent. Works for mainnet and testnet accounts.
              </p>
            )}
          </form>
        </div>

        <Reveal as="ul" className="grid gap-3 sm:grid-cols-2">
          {SIGNALS.map((s) => (
            <RevealItem as="li" key={s.name}>
              <div className="h-full rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
                <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-highlight">{s.src}</span>
                <p className="mt-3 text-[15.5px] font-bold">{s.name}</p>
                <p className="mt-1 text-[13.5px] leading-[1.55] text-muted">{s.body}</p>
              </div>
            </RevealItem>
          ))}
          <RevealItem as="li" className="sm:col-span-2">
            <p className="rounded-2xl bg-background-secondary px-5 py-4 text-[13.5px] leading-[1.55] text-muted">
              If a source can't be reached, its signal is marked unavailable and the answer is at least amber, never green.
            </p>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 8. cost and limits

function CostSection() {
  return (
    <section id="pricing" aria-labelledby="cost-h" className="scroll-mt-24 border-t border-border/70 bg-background-secondary py-20 lg:py-28">
      <div className={cn(WRAP, "grid gap-14 lg:grid-cols-2")}>
        <SectionHead id="cost-h" eyebrow="05 · Cost and limits" title="Notara adds no fee." lead="You pay what the networks charge, nothing on top. And because it's a prototype, here is what it doesn't do yet." />
        <Reveal className="flex flex-col gap-5">
          <RevealItem>
            <dl className="divide-y divide-border rounded-3xl border border-border/80 bg-surface shadow-card">
              {[
                ["Creating and signing a link", "Free: a signed message, not a transaction"],
                ["Paying on NEAR", "The network's own fee"],
                ["Paying from another chain", "The rate NEAR Intents quotes at checkout"],
                ["Account checks", "Free, read-only"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4">
                  <dt className="text-[15px] font-semibold">{k}</dt>
                  <dd className="text-[14.5px] text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </RevealItem>
          <RevealItem>
            <ul className="flex flex-col gap-2.5 rounded-3xl border border-dashed border-border px-6 py-5 text-[14px] leading-[1.55] text-muted">
              <li>Not audited. Keep real-money amounts small.</li>
              <li>The agent vault and send links run on testnet only.</li>
              <li>A green answer means no rule was broken, not that a person is honest.</li>
            </ul>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 9. questions

const FAQ_ITEMS = [
  {
    title: "Does Notara hold my money or my keys?",
    body: "No. A payment link pays from your client's wallet straight to your account. A send link keeps its key in the part of the link after the #, which browsers never send to our server. An agent vault is a contract that moves money only by its own rules.",
  },
  {
    title: "What does the wallet signature prove?",
    body: "That the amount, the recipient and the description were approved by the wallet that gets paid. It shows who is asking. It can't show that they will deliver what they promise.",
  },
  {
    title: "Can my client pay from Ethereum, Base, Arbitrum or Solana?",
    body: "Yes, on mainnet. They send their own token to a one-time address, NEAR Intents swaps and routes it, and you receive the exact USDC on NEAR. A NEAR wallet can also pay the link directly.",
  },
  {
    title: "Why enforce the agent's limits in a contract?",
    body: "A check inside the agent only stops an agent that cooperates. A tricked or hacked agent can skip it. Notara's agent key can only ask the vault to pay, and the vault needs a fresh verdict signed by Notara for that exact payment.",
  },
  {
    title: "What can I try for free?",
    body: "Payment links, send links, account checks and the AI-agent vault all run on NEAR testnet with free test money. Paying from another chain needs mainnet.",
  },
];

/** Paste a link someone sent you: it opens the pay or claim page (the claim key after # is kept). */
function OpenLink() {
  const go = useGo();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    const m = v.trim().match(/\/(pay|claim)\/([A-Za-z0-9-]+)(#.*)?/) ?? v.trim().match(/^()(INV-[0-9A-F]{4,16})$/i);
    if (!m) {
      setErr("Paste the whole link, like https://…/pay/INV-0042");
      return;
    }
    go(`/${m[1] || "pay"}/${m[2].toUpperCase()}${m[3] ?? ""}`);
  }
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-[520px]">
      <label htmlFor="open-link" className="text-[14px] font-bold text-cream">
        Were you sent a link? Open it here
      </label>
      <div className="mt-2 flex gap-2 max-sm:flex-col">
        <input
          id="open-link"
          value={v}
          onChange={(e) => (setV(e.target.value), setErr(null))}
          placeholder="https://…/pay/INV-0042"
          aria-invalid={!!err}
          aria-describedby={err ? "open-link-err" : undefined}
          className="h-12 min-w-0 flex-1 rounded-full border border-mint/25 bg-canopy/50 px-5 font-mono text-[16px] text-cream outline-none placeholder:text-cream/45 focus:border-mint"
        />
        <Button size="lg" variant="secondary" type="submit" className="!border-mint/30 !bg-transparent !text-cream hover:!bg-mint/10">
          Open link <ArrowUpRight size={16} aria-hidden />
        </Button>
      </div>
      {err && (
        <p id="open-link-err" role="alert" className="mt-2 text-[13.5px] font-semibold text-danger">
          {err}
        </p>
      )}
    </form>
  );
}

function FaqAndClose() {
  const go = useGo();
  return (
    <>
      <section id="faq" aria-labelledby="faq-h" className="scroll-mt-24 py-20 lg:py-28">
        <div className={cn(WRAP, "grid gap-12 lg:grid-cols-[0.8fr_1.2fr]")}>
          <SectionHead id="faq-h" eyebrow="06 · Questions" title="Questions, answered plainly." />
          <ExpandGroup items={FAQ_ITEMS} />
        </div>
      </section>

      <section aria-labelledby="close-h" className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div data-theme="dark" className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(0deg,var(--color-canopy)_0%,var(--color-canopy)_45%,var(--color-moss)_130%)] text-foreground sm:rounded-[36px]">
          <GridGround />
          <div className={cn(WRAP, "relative grid gap-14 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:py-28")}>
            <Reveal>
              <RevealItem>
                <NotaraMark className="size-10 text-mint" />
              </RevealItem>
              <RevealItem as="h2" className="mt-8 text-[clamp(36px,3.6vw+14px,68px)] font-extrabold leading-[1.02] tracking-[-0.045em] [text-wrap:balance]">
                <span id="close-h">Send your next invoice as a link.</span>
              </RevealItem>
              <RevealItem as="p" className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-cream/75">
                It takes about a minute. Signing is free and moves no money.
              </RevealItem>
              <RevealItem className="mt-9 flex flex-wrap gap-3">
                <Button size="lg" variant="mint" onClick={() => go("/get-paid")}>
                  Create a payment link <ArrowRight size={18} aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" className="!border-mint/30 !bg-transparent !text-cream hover:!bg-mint/10" onClick={() => go("/dashboard")}>
                  Open the dashboard
                </Button>
              </RevealItem>
            </Reveal>
            <OpenLink />
          </div>
        </div>
      </section>
    </>
  );
}

// ------------------------------------------------------------------ page root

export function LandingPage() {
  const [ready, setReady] = useState(false);
  return (
    <div data-theme="light" className="bg-background text-foreground">
      <SmoothScroll />
      <Preloader onDone={() => setReady(true)} />
      <Hero ready={ready} />
      <Facts />
      <GetPaidSection />
      <StepsSection />
      <SendSection />
      <VaultSection />
      <CheckSection />
      <CostSection />
      <FaqAndClose />
    </div>
  );
}
