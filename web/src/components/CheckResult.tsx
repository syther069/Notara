import { CircleAlert, CircleX, Info } from "./icons";
import type { CheckResponse, Reason, Signal } from "../lib/api";
import { codeToWords, DECISION_TEXT, formatAsset, SIGNAL_LABELS } from "../lib/format";
import { Badge, CopyButton, FixtureTag, NetworkTag, SourceTag } from "./ui";

function SevIcon({ s }: { s: Reason["severity"] }) {
  if (s === "block") return <CircleX size={20} className="sev-block" aria-label="Block" />;
  if (s === "warn") return <CircleAlert size={20} className="sev-warn" aria-label="Warning" />;
  return <Info size={20} className="sev-info" aria-label="Info" />;
}

function Evidence({ e, network }: { e: string; network: string }) {
  if (e.startsWith("tx:")) {
    const h = e.slice(3);
    return (
      <a href={`https://${network === "mainnet" ? "" : "testnet."}nearblocks.io/txns/${h}`} target="_blank" rel="noreferrer">
        tx {h}
      </a>
    );
  }
  if (/^https?:\/\//.test(e))
    return (
      <a href={e} target="_blank" rel="noreferrer">
        {e}
      </a>
    );
  return <span>{e}</span>;
}

function ReasonRow({ r, network }: { r: Reason; network: string }) {
  const fixture = r.message.includes("[DEMO FIXTURE]") || r.evidence?.some((e) => e.startsWith("fixture://"));
  return (
    <li className="reason">
      <SevIcon s={r.severity} />
      <div>
        <div className="title">
          {codeToWords(r.code)} {fixture && <FixtureTag />}
        </div>
        <div className="msg">{r.message.replaceAll("[DEMO FIXTURE] ", "")}</div>
        {r.evidence?.map((e) => (
          <div className="ev" key={e}>
            Evidence: <Evidence e={e} network={network} />
          </div>
        ))}
      </div>
    </li>
  );
}

export function DecisionCard({ res }: { res: CheckResponse }) {
  const r = res.report;
  const amt = formatAsset(r.request.amount, r.request.asset);
  const bars = Array.from({ length: r.coverage.total }, (_, i) => i < r.coverage.ok);
  return (
    <div className={`card decision-card ${r.decision}`} aria-live="polite">
      <div className="meta">
        <Badge d={r.decision} size="lg" />
        <span className="muted small">
          {r.request.network} · {amt}
        </span>
      </div>
      <div className="who">{r.request.recipient}</div>
      <p className="muted" style={{ margin: 0 }}>
        {DECISION_TEXT[r.decision]}
      </p>
      <div className="coverage">
        <span>Evidence coverage</span>
        <span className="bars" aria-hidden>
          {bars.map((on, i) => (
            <span key={i} className={on ? "" : "off"} />
          ))}
        </span>
        <span>
          {r.coverage.ok} of {r.coverage.total} checks returned data
          {r.coverage.failed.length ? `, unavailable: ${r.coverage.failed.map((f) => SIGNAL_LABELS[f] ?? f).join(", ")}` : ""}
        </span>
      </div>
    </div>
  );
}

export function ReasonList({ reasons, network }: { reasons: Reason[]; network: string }) {
  const main = reasons.filter((r) => r.severity !== "info");
  const info = reasons.filter((r) => r.severity === "info");
  return (
    <div className="card">
      <h2>Why this decision</h2>
      {main.length > 0 ? (
        <ul className="reasons">{main.map((r, i) => <ReasonRow key={i} r={r} network={network} />)}</ul>
      ) : (
        <p className="muted">No warnings or blocking rules were triggered.</p>
      )}
      {info.length > 0 && (
        <details open={main.length === 0}>
          <summary>Other facts we found ({info.length})</summary>
          <ul className="reasons">{info.map((r, i) => <ReasonRow key={i} r={r} network={network} />)}</ul>
        </details>
      )}
    </div>
  );
}

function signalSummary(s: Signal): string {
  const d = s.data;
  if (s.status !== "ok") return s.error ?? "";
  switch (s.name) {
    case "account_state":
      return d.exists ? (d.isContract ? `exists · contract (code ${String(d.codeHash).slice(0, 8)}…)` : "exists · not a contract") : "does not exist";
    case "activity_history":
      return `${d.txCount} indexed txs · first seen ${d.firstObservedAt ? new Date(d.firstObservedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "never"}`;
    case "contract_deployments":
      return `${d.deploys.length} deploy(s) in last ${d.scannedTxs} txs${d.lastDeployAt ? ` · last ${new Date(d.lastDeployAt).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}`;
    case "prior_interactions":
      return `${d.vaultPayments.executed} paid via vault · ${d.sharedIndexedTxs} shared txs`;
    case "shared_reports":
      return d.reports.length ? `${d.reports.length} report(s): ${d.reports.map((r: any) => `${r.category} (${r.status})`).join(", ")}` : "no reports";
    case "token_registration":
      return d.registered ? "can receive this token" : "not registered: a transfer would fail";
    case "policy_lists":
      return d.denylisted ? "on denylist" : d.allowlisted ? "on allowlist" : "not listed";
    default:
      return "";
  }
}

export function EvidenceTable({ signals }: { signals: Signal[] }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: "20px 20px 8px" }}>
        <h2>Evidence and where it came from</h2>
        <p className="muted small">Live = read from NEAR at the time of this check. Our contract = the Notara vault or registry.</p>
      </div>
      <div className="table-wrap stack-mobile" style={{ border: 0, borderRadius: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Status</th>
              <th>Source</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const fixture = s.name === "shared_reports" && s.data?.reports?.some((r: any) => r.is_fixture);
              return (
                <tr key={s.name}>
                  <td data-label="Check">
                    <strong>{SIGNAL_LABELS[s.name] ?? s.name}</strong>
                    {s.caveats.length > 0 && (
                      <details>
                        <summary className="small">Limits</summary>
                        <ul className="small muted" style={{ paddingLeft: 18, margin: 0 }}>
                          {s.caveats.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                          <li className="mono" style={{ wordBreak: "break-all" }}>
                            {s.source.endpoint}
                          </li>
                        </ul>
                      </details>
                    )}
                  </td>
                  <td data-label="Status" className={`status-${s.status}`}>
                    {s.status}
                  </td>
                  <td data-label="Source">
                    <div className="row" style={{ gap: 6 }}>
                      {s.status === "skipped" ? <span className="tag">Not checked</span> : <SourceTag kind={s.source.kind} unavailable={s.status === "error"} />}
                      {fixture && <FixtureTag />}
                    </div>
                  </td>
                  <td data-label="Result" className="small">
                    {signalSummary(s)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CheckResult({ res }: { res: CheckResponse }) {
  return (
    <div className="stack">
      <div>
        <NetworkTag network={res.report.request.network} />
      </div>
      <DecisionCard res={res} />
      <ReasonList reasons={res.report.reasons} network={res.report.request.network} />
      <EvidenceTable signals={res.report.signals} />
      <p className="muted small">
        Policy {res.report.policyVersion} · generated {new Date(res.report.generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. {res.report.disclaimer}
      </p>
      <div className="row">
        <CopyButton text={JSON.stringify(res, null, 2)} label="Copy JSON report" />
      </div>
    </div>
  );
}
