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
} from "lucide-react";
import type { Decision, SourceKind } from "../lib/api";
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

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {done ? "Copied" : label}
    </button>
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
