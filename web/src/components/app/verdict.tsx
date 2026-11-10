// The account check, shown the same way everywhere: a green / amber / red verdict, one plain reason,
// and the signals behind it with where each came from. Careful words: green is "no rule broken", never "safe".
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CheckResponse, Decision, Reason, Signal, SourceKind } from "@/lib/api";
import { codeToWords, SIGNAL_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleAlert, CircleCheck, CircleX, CloudOff, FlaskConical, ShieldAlert, ShieldCheck, ShieldX } from "@/components/icons";
import { Chip, EASE, Hint, type Tone } from "./ui";

export const VERDICT: Record<Decision, { word: string; tone: Tone; line: string; hint: string; ring: string; ink: string; soft: string }> = {
  ALLOW: { word: "No rule broken", tone: "success", line: "No policy rule was broken. This is not a guarantee.", hint: "Green: none of Notara's rules were broken for this account. It is not a guarantee about the person behind it.", ring: "border-success/40", ink: "text-success", soft: "bg-success-soft" },
  WARN: { word: "Take a second look", tone: "warning", line: "Something is new, unusual or couldn't be checked. A person should decide.", hint: "Amber: something is new, missing or unusual. A person should look before paying.", ring: "border-warning/40", ink: "text-warning", soft: "bg-warning-soft" },
  BLOCK: { word: "Don't pay", tone: "danger", line: "A serious rule applies to this account.", hint: "Red: a serious rule applies, such as a verified scam report.", ring: "border-danger/50", ink: "text-danger", soft: "bg-danger-soft" },
};

export function VerdictIcon({ decision, size = 18 }: { decision: Decision; size?: number }) {
  const I = decision === "ALLOW" ? ShieldCheck : decision === "WARN" ? ShieldAlert : ShieldX;
  return <I size={size} aria-hidden />;
}

export function VerdictChip({ decision }: { decision: Decision }) {
  const v = VERDICT[decision];
  return (
    <Chip tone={v.tone} hint={v.hint} icon={<VerdictIcon decision={decision} size={13} />}>
      {v.word}
    </Chip>
  );
}

/** The one reason to show first: the most serious, in plain words. */
export function topReason(res: CheckResponse): string {
  const order = { block: 0, warn: 1, info: 2 } as const;
  const r = [...res.report.reasons].sort((a, b) => order[a.severity] - order[b.severity])[0];
  if (!r || (res.report.decision === "ALLOW" && r.severity === "info")) return VERDICT[res.report.decision].line;
  return r.message.replaceAll("[DEMO FIXTURE] ", "");
}
export const coverageLine = (res: CheckResponse) => `${res.report.coverage.ok} of ${res.report.coverage.total} checks returned data`;

const SOURCE: Record<SourceKind, { label: string; hint: string }> = {
  "live-rpc": { label: "Live · NEAR", hint: "Read from the NEAR network at the moment of this check." },
  "live-indexer": { label: "Live · indexer", hint: "Read from a transaction index (FastNear) at the moment of this check." },
  "on-chain-contract": { label: "Notara registry", hint: "Read from Notara's report registry contract on NEAR." },
  "local-config": { label: "Notara rules", hint: "From Notara's own allow and deny lists." },
  "local-cache": { label: "Notara cache", hint: "From Notara's saved copy of an earlier lookup." },
};

function isFixture(r: Reason) {
  return r.message.includes("[DEMO FIXTURE]") || !!r.evidence?.some((e) => e.startsWith("fixture://"));
}

function SignalRow({ s, fired }: { s: Signal; fired: Reason[] }) {
  const ok = s.status === "ok";
  const src = SOURCE[s.source.kind];
  return (
    <li className="flex flex-col gap-2 border-b border-border/70 py-3.5 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        {ok ? <CircleCheck size={16} className="text-success" aria-label="Checked" /> : <CloudOff size={16} className="text-warning" aria-label="Unavailable" />}
        <span className="text-[14.5px] font-bold">{SIGNAL_LABELS[s.name] ?? codeToWords(s.name.toUpperCase())}</span>
        {ok ? (
          <Chip tone="outline" hint={`${src.hint} Source: ${s.source.endpoint}. Fetched ${new Date(s.fetchedAt).toLocaleTimeString()}.`}>
            {src.label}
          </Chip>
        ) : (
          <Chip tone="warning" hint={`This check returned no data${s.error ? `: ${s.error}` : ""}. Notara treats missing data as a reason for caution, never as a pass.`}>
            Unavailable
          </Chip>
        )}
      </div>
      {fired.map((r) => (
        <div key={r.code + r.message} className="ml-6 flex items-start gap-2 text-[13.5px] leading-relaxed">
          {r.severity === "block" ? <CircleX size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden /> : r.severity === "warn" ? <CircleAlert size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden /> : <CircleCheck size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
          <span>
            <Hint text={`The rule that fired: ${r.code}. It read: ${r.signals.map((n) => SIGNAL_LABELS[n] ?? n).join(", ") || "no signal"}.`} focusable>
              <span className="font-semibold underline decoration-dotted decoration-muted/60 underline-offset-4">{codeToWords(r.code)}</span>
            </Hint>{" "}
            {isFixture(r) && (
              <Chip tone="outline" className="mx-1 !border-fixture !text-fixture" hint="Seeded demo data. It is not evidence about any real account." icon={<FlaskConical size={11} aria-hidden />}>
                Demo fixture
              </Chip>
            )}
            <span className="text-muted">{r.message.replaceAll("[DEMO FIXTURE] ", "")}</span>
          </span>
        </div>
      ))}
      {s.caveats.length > 0 && <p className="ml-6 text-[12.5px] leading-relaxed text-muted">{s.caveats.join(" ")}</p>}
    </li>
  );
}

/** The raw signals: each fact, which rule fired on it, and which source it came from. Collapsed by default. */
export function SignalsPanel({ res, defaultOpen = false }: { res: CheckResponse; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const r = res.report;
  const unplaced = r.reasons.filter((x) => !x.signals.some((n) => r.signals.some((s) => s.name === n)));
  return (
    <div className="rounded-2xl border border-border/70 bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left">
        <span>
          <span className="block text-[15px] font-bold">Signals</span>
          <span className="block text-[13px] text-muted">{coverageLine(res)}. Each shows its source.</span>
        </span>
        <ChevronDown size={17} aria-hidden className={cn("shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <ul className="px-4 pb-2">
              {r.signals.map((s) => (
                <SignalRow key={s.name} s={s} fired={r.reasons.filter((x) => x.signals.includes(s.name))} />
              ))}
              {unplaced.map((x) => (
                <li key={x.code + x.message} className="border-b border-border/70 py-3.5 text-[13.5px] last:border-0">
                  <span className="font-semibold">{codeToWords(x.code)}</span> <span className="text-muted">{x.message.replaceAll("[DEMO FIXTURE] ", "")}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border/70 px-4 py-3 text-[12.5px] leading-relaxed text-muted">{r.disclaimer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The verdict card: colour, word, account, one plain reason. */
export function VerdictCard({ res, children }: { res: CheckResponse; children?: React.ReactNode }) {
  const d = res.report.decision;
  const v = VERDICT[d];
  const reduce = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} aria-live="polite" className={cn("rounded-2xl border-2 p-5 shadow-card sm:p-6", v.ring, v.soft)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex size-11 items-center justify-center rounded-xl bg-surface", v.ink)}>
          <VerdictIcon decision={d} size={24} />
        </span>
        <div className="min-w-0">
          <p className={cn("text-[22px] font-extrabold leading-tight tracking-[-0.03em]", v.ink)}>{v.word}</p>
          <p className="break-all font-mono text-[13px] text-foreground/80">{res.report.request.recipient}</p>
        </div>
        <Chip tone="outline" className="ml-auto" hint={res.report.request.network === "mainnet" ? "Checked against live NEAR mainnet data. Nothing was sent." : "Checked against NEAR testnet. Not the reputation of any real business."}>
          {res.report.request.network === "mainnet" ? "Mainnet data" : "Testnet data"}
        </Chip>
      </div>
      <p className="mt-4 text-[16px] font-semibold leading-relaxed [text-wrap:pretty]">{topReason(res)}</p>
      <p className="mt-1 text-[13.5px] text-foreground/70">{v.line}</p>
      {children}
    </motion.div>
  );
}
