import { useState, type ReactNode } from "react";
import {
  Check,
  CloudOff,
  Copy,
  ExternalLink,
  FileCode,
  FlaskConical,
  Info,
  Radio,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  CircleCheck,
} from "./icons";
import type { Decision, Invoice, SourceKind } from "../lib/api";
import { shortHash } from "../lib/format";

export function DecisionIcon({ d, size = 16 }: { d: Decision; size?: number }) {
  if (d === "ALLOW") return <ShieldCheck size={size} aria-hidden />;
  if (d === "WARN") return <ShieldAlert size={size} aria-hidden />;
  return <ShieldX size={size} aria-hidden />;
}

export function Badge({ d, size }: { d: Decision; size?: "lg" }) {
  return (
    <span className={`badge ${d} ${size ?? ""}`}>
      <DecisionIcon d={d} size={size === "lg" ? 18 : 14} />
      {d}
    </span>
  );
}

const SOURCE: Record<SourceKind, { label: string; cls: string; icon: ReactNode }> = {
  "live-rpc": { label: "Live · chain", cls: "live", icon: <Radio size={11} aria-hidden /> },
  "live-indexer": { label: "Live · indexer", cls: "live", icon: <Radio size={11} aria-hidden /> },
  "on-chain-contract": { label: "Our contract", cls: "", icon: <FileCode size={11} aria-hidden /> },
  "local-config": { label: "Local config", cls: "", icon: <Settings2 size={11} aria-hidden /> },
  "local-cache": { label: "Local cache", cls: "", icon: <Settings2 size={11} aria-hidden /> },
};

export function SourceTag({ kind, unavailable }: { kind: SourceKind; unavailable?: boolean }) {
  if (unavailable)
    return (
      <span className="tag unavailable">
        <CloudOff size={11} aria-hidden /> Unavailable
      </span>
    );
  const s = SOURCE[kind];
  return (
    <span className={`tag ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

export function FixtureTag() {
  return (
    <span className="tag fixture" title="Seeded demo data. Not evidence about any real account.">
      <FlaskConical size={11} aria-hidden /> Demo fixture
    </span>
  );
}

export function Banner({ kind = "info", title, children }: { kind?: "info" | "warn" | "error" | "ok"; title?: string; children?: ReactNode }) {
  const icon =
    kind === "warn" || kind === "error" ? <TriangleAlert size={18} aria-hidden /> : kind === "ok" ? <CircleCheck size={18} aria-hidden /> : <Info size={18} aria-hidden />;
  return (
    <div className={`banner ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {icon}
      <div>
        {title && <p style={{ fontWeight: 700 }}>{title}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * Copies text. Success shows on the button and is announced; a blocked clipboard (no permission, an
 * insecure page) says so and shows the text selected, so it can still be copied by hand.
 */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <span className="copy-wrap">
      <button
        type="button"
        className={`btn btn-secondary btn-sm${state === "done" ? " is-done" : ""}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("done");
            setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 2000);
          } catch {
            setState("failed");
          }
        }}
      >
        {state === "done" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {state === "done" ? "Copied" : label}
      </button>
      <span className="sr-only" role="status">
        {state === "done" ? "Copied to the clipboard" : ""}
      </span>
      {state === "failed" && (
        <span className="copy-fail" role="alert">
          <span className="small">Your browser blocked copying. Select it and copy it yourself:</span>
          <input className="input mono" readOnly value={text} onFocus={(e) => e.currentTarget.select()} aria-label="Text to copy" autoFocus />
        </span>
      )}
    </span>
  );
}

export function TxLink({ hash, explorer = "https://testnet.nearblocks.io" }: { hash: string; explorer?: string }) {
  return (
    <a className="mono" href={`${explorer}/txns/${hash}`} target="_blank" rel="noreferrer">
      {shortHash(hash)} <ExternalLink size={12} aria-hidden />
    </a>
  );
}

export function AccountLink({ id, explorer = "https://testnet.nearblocks.io" }: { id: string; explorer?: string }) {
  return (
    <a className="mono" href={`${explorer}/address/${id}`} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>
      {id}
    </a>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

/** Which network a reputation comes from. Real merchants' reputation is mainnet data, and always says so. */
export function NetworkTag({ network }: { network: string }) {
  return network === "mainnet" ? (
    <span className="tag mainnet" title="Account age, history and reports read live from NEAR mainnet">
      Mainnet · real account data
    </span>
  ) : (
    <span className="tag testnet" title="Read from NEAR testnet. Not the reputation of any real merchant.">
      Testnet · test data
    </span>
  );
}

/** Marks every feature that uses NEAR mainnet, so nobody mistakes real money for the testnet demo. */
export function MainnetBadge({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <span className="tag mainnet" title={readOnly ? "Reads live NEAR mainnet data. Nothing is sent." : "Real money on NEAR mainnet. Prototype, not audited: keep amounts small."}>
      {readOnly ? "Mainnet · read-only" : "Mainnet · real money"}
    </span>
  );
}

/** Where the user is in a short task ("1 Create · 2 Fund · 3 Share"). The current step is announced to screen readers. */
export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepbar" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? "done" : i === current ? "now" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="n" aria-hidden>
            {i < current ? "✓" : i + 1}
          </span>
          {s}
          {i < current && <span className="sr-only"> (done)</span>}
        </li>
      ))}
    </ol>
  );
}

export const INVOICE_STATUS: Record<Invoice["status"], { text: string; cls: string }> = {
  unpaid: { text: "Unpaid", cls: "NEUTRAL" },
  pending_approval: { text: "Waiting for approval", cls: "WARN" },
  processing: { text: "Processing", cls: "WARN" },
  refunded: { text: "Refunded", cls: "NEUTRAL" },
  paid: { text: "Paid", cls: "ALLOW" },
  refused: { text: "Refused", cls: "BLOCK" },
  failed: { text: "Failed", cls: "BLOCK" },
};

export function InvoiceStatus({ s }: { s: Invoice["status"] }) {
  const x = INVOICE_STATUS[s];
  return <span className={`badge ${x.cls}`}>{x.text}</span>;
}
