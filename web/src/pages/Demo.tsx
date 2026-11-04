import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, CircleX, Download, ExternalLink, LoaderCircle, Pause, Play } from "lucide-react";
import { api } from "../lib/api";
import { Banner } from "../components/ui";
import { NotDeployed, useDeployment } from "../components/Layout";

type Scenario = { key: string; group: string; title: string; expected: string };

const SCENARIOS: Scenario[] = [
  { key: "1", group: "1", title: "Legit invoice from an onboarded merchant", expected: "ALLOW → paid by the vault" },
  { key: "2", group: "2", title: "Prompt-injected invoice redirects to the attacker", expected: "BLOCK → refused, nothing signed" },
  { key: "3a", group: "3", title: "Hacked agent submits the signed BLOCK anyway", expected: "Vault refuses on-chain" },
  { key: "3b", group: "3", title: "Rewrites BLOCK into ALLOW", expected: "Vault: invalid signature" },
  { key: "3c", group: "3", title: "Forges an ALLOW with its own key", expected: "Vault: invalid signature" },
  { key: "3d", group: "3", title: "Reuses the merchant's ALLOW for the attacker", expected: "Vault: different recipient" },
  { key: "3e", group: "3", title: "Sends NEAR directly with the agent key", expected: "NEAR refuses: needs full access" },
  { key: "3f", group: "3", title: "Calls an owner method with the agent key", expected: "NEAR refuses: method not allowed" },
  { key: "4", group: "4", title: "First invoice from an unknown new shop", expected: "WARN → waits for a human" },
];

type Result = { pass: boolean; got: string; evidence?: string };

/** Pull scenario results out of the demo log (the same text the CLI prints). */
function parseLog(lines: string[]) {
  const results: Record<string, Result> = {};
  let currentGroup: string | null = null;
  lines.forEach((line, i) => {
    const head = line.match(/^([1-4])\.\s/);
    if (head) currentGroup = head[1];
    if (line.startsWith("Summary")) currentGroup = null;
    const m = line.match(/^(PASS|FAIL)\s+(\d[a-f]?)\s.*?\bgot\s+(.*)$/);
    if (m) {
      const next = lines[i + 1]?.trim();
      results[m[2]] = { pass: m[1] === "PASS", got: m[3].trim().replaceAll("->", "→"), evidence: next && !/^(PASS|FAIL)/.test(next) ? next : undefined };
    }
  });
  return { results, currentGroup };
}

function lineClass(l: string) {
  if (/^(PASS|All \d+ checks|\s+REFUSED)/.test(l)) return "l-good";
  if (/^(FAIL|\s+NOT AS EXPECTED|Demo failed)/.test(l)) return "l-bad";
  if (l.startsWith("[wrapper]")) return "l-wrapper";
  if (l.startsWith("[notify human]") || l.startsWith("[human]")) return "l-human";
  if (l.startsWith("[agent]")) return "l-agent";
  if (/^[1-4]\.\s|^Summary|^AgentSpend Passport demo/.test(l)) return "l-head";
  return "";
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/testnet\.nearblocks\.io\/txns\/[A-Za-z0-9]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("https://") ? (
          <a key={i} href={p} target="_blank" rel="noreferrer">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

function InjectedInvoice({ text }: { text: string }) {
  const i = text.indexOf("<!--");
  if (i < 0) return <div className="doc">{text}</div>;
  const hidden = text
    .slice(i)
    .replace(/<!--.*?-->\s*/s, "")
    .replace(/<\/?div[^>]*>/g, "")
    .trim();
  return (
    <div className="doc">
      {text.slice(0, i).trimEnd()}
      {"\n\n"}
      <span className="muted">{"<!-- hidden in the email's HTML -->\n"}</span>
      <mark>{hidden}</mark>
    </div>
  );
}

export function DemoPage() {
  const { dep } = useDeployment();
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ name: string }[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    api.inbox().then((r) => setDoc(r.docs.find((d) => d.name === "invoice-injected.md")?.text ?? null)).catch(() => {});
    api.demoLogs().then((r) => setLogs(r.logs)).catch(() => {});
    api.demoStatus().then((s) => s.running && setError("A demo run started elsewhere is still in progress. Wait for it to finish, then run again.")).catch(() => {});
    return () => esRef.current?.close();
  }, []);

  useEffect(() => {
    if (follow && consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [lines, follow]);

  const { results, currentGroup } = useMemo(() => parseLog(lines), [lines]);
  const passCount = Object.values(results).filter((r) => r.pass).length;
  const total = Object.keys(results).length;

  function start(only?: string) {
    setError(null);
    setLines([]);
    setViewing(null);
    setRunning(true);
    let started = false;
    const es = new EventSource(`/api/demo/run${only ? `?only=${only}` : ""}`);
    esRef.current = es;
    es.addEventListener("start", (e) => {
      started = true;
      setAgentMode(JSON.parse((e as MessageEvent).data).agentMode);
    });
    es.addEventListener("log", (e) => {
      const { line } = JSON.parse((e as MessageEvent).data);
      setLines((l) => [...l, line]);
    });
    es.addEventListener("done", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      es.close();
      setRunning(false);
      if (d.log) setViewing(d.log);
      api.demoLogs().then((r) => setLogs(r.logs)).catch(() => {});
    });
    es.onerror = () => {
      es.close();
      setRunning(false);
      if (!started) setError("The demo couldn't start. Another run may be in progress, or the backend isn't running.");
    };
  }

  async function openLog(name: string) {
    if (!name) return;
    try {
      const text = await api.demoLog(name);
      setLines(text.split(/\r?\n/));
      setViewing(name);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const status = (s: Scenario): "idle" | "running" | "pass" | "fail" => {
    const r = results[s.key];
    if (r) return r.pass ? "pass" : "fail";
    if (running && currentGroup === s.group) return "running";
    return "idle";
  };

  return (
    <>
      <div className="page-head">
        <h1>Watch a prompt-injected agent get stopped</h1>
        <p>
          An AI accounts-payable agent reads invoices and pays them from a NEAR testnet vault. One invoice hides an instruction to pay an attacker. Every
          transaction below is real and links to the testnet explorer.
        </p>
        <div className="row">
          <span className="tag">{agentMode === "llm" || dep?.agentMode === "llm" ? "Agent: real LLM" : "Agent: scripted (obeys the hidden text)"}</span>
          {dep?.vault && <span className="tag mono">vault {dep.vault}</span>}
        </div>
      </div>

      {!dep?.deployed ? (
        <NotDeployed />
      ) : (
        <div className="row" style={{ marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={() => start()} disabled={running}>
            {running ? <LoaderCircle size={16} className="spin" aria-hidden /> : <Play size={16} aria-hidden />} {running ? "Running on testnet…" : "Run all scenarios"}
          </button>
          {["1", "2", "3", "4"].map((n) => (
            <button key={n} className="btn btn-secondary btn-sm" onClick={() => start(n)} disabled={running}>
              Run {n}
            </button>
          ))}
          <span className="muted small">A full run takes about a minute and uses testnet gas only.</span>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">
            <p>{error}</p>
          </Banner>
        </div>
      )}

      <div className="split">
        <div className="stack">
          {SCENARIOS.map((s) => {
            const st = status(s);
            const r = results[s.key];
            return (
              <div key={s.key} className={`card scenario ${st}`}>
                <div className="scenario-head">
                  <h3>
                    {s.key} · {s.title}
                  </h3>
                  {st === "pass" && <CircleCheck size={20} className="sev-info" style={{ color: "var(--allow)" }} aria-label="Pass" />}
                  {st === "fail" && <CircleX size={20} className="sev-block" aria-label="Fail" />}
                  {st === "running" && <LoaderCircle size={20} className="spin" aria-label="Running" />}
                </div>
                <dl>
                  <dt>Expected</dt>
                  <dd>{s.expected}</dd>
                  <dt>Actual</dt>
                  <dd>{r ? r.got : st === "running" ? "running…" : "not run yet"}</dd>
                  {r?.evidence && (
                    <>
                      <dt>Evidence</dt>
                      <dd className="small">
                        {r.evidence.startsWith("https://") ? (
                          <a href={r.evidence} target="_blank" rel="noreferrer">
                            View transaction <ExternalLink size={12} aria-hidden />
                          </a>
                        ) : (
                          r.evidence
                        )}
                      </dd>
                    </>
                  )}
                </dl>
                {s.key === "4" && r && /pending/.test(r.got) && (
                  <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
                    <Link to="/vault">Approve or reject it on the Vault page →</Link>
                  </p>
                )}
              </div>
            );
          })}
          {total > 0 && (
            <Banner kind={passCount === total ? "ok" : "error"}>
              <p style={{ fontWeight: 700 }}>
                {passCount} of {total} checks behaved as expected.
              </p>
            </Banner>
          )}
        </div>

        <div className="stack">
          <div>
            <h3>The injected invoice</h3>
            {doc ? <InjectedInvoice text={doc} /> : <div className="doc muted">Loading…</div>}
          </div>
          <div className="console">
            <div className="console-head">
              <span>{viewing ? `Log · ${viewing}` : running ? "Live log" : "Log"}</span>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setFollow((f) => !f)} aria-pressed={!follow} title="Pause auto-scroll">
                  <Pause size={14} aria-hidden /> {follow ? "Pause scroll" : "Follow"}
                </button>
                {lines.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
                      const a = Object.assign(document.createElement("a"), { href: url, download: viewing ?? "agentspend-demo.log" });
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={14} aria-hidden /> Download
                  </button>
                )}
              </span>
            </div>
            <div className="console-body" ref={consoleRef} aria-live="polite" tabIndex={0}>
              {lines.length === 0 ? (
                <span className="muted">Press "Run all scenarios" or open a saved run below.</span>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className={`line ${lineClass(l)}`}>
                    <Linkified text={l || " "} />
                  </div>
                ))
              )}
            </div>
          </div>
          {logs.length > 0 && (
            <div className="field">
              <label htmlFor="saved">Saved runs</label>
              <select id="saved" className="input" value={viewing ?? ""} onChange={(e) => openLog(e.target.value)} disabled={running}>
                <option value="">Choose a saved run…</option>
                {logs.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name.replace(/\.log$/, "").replace(/T(\d\d)-(\d\d)-(\d\d)-\d+Z/, " $1:$2:$3 UTC")}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
