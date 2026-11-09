// What a customer sees before paying: a plain verdict, the good facts, the concerns. The
// technical report stays one click away for anyone who wants it.

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, CircleX, Flag, LoaderCircle } from "./icons";
import { useWallet } from "../lib/wallet";
import type { CheckResponse, Decision, MerchantProfile } from "../lib/api";
import { DecisionCard, ReasonList } from "./CheckResult";
import { NetworkTag } from "./ui";

const HEADLINE: Record<Decision, { text: string; sub: string }> = {
  ALLOW: { text: "No problems found", sub: "None of our checks found a problem with this account. That isn't a guarantee." },
  WARN: { text: "Be careful", sub: "Check the points below before you pay." },
  BLOCK: { text: "Blocked", sub: "A serious problem was found. Don't pay this account." },
};

/** Plain words for each Notara reason code. Unknown codes fall back to Notara's own message. */
function plain(code: string, message: string, signals: string[]): string {
  switch (code) {
    case "VERIFIED_REPORT":
      return "This account has a verified scam report.";
    case "UNVERIFIED_REPORT":
    case "DISPUTED_REPORT":
      return "Someone reported this account. The report hasn't been verified.";
    case "DENYLISTED":
      return "This account is on our block list.";
    case "ACCOUNT_NOT_FOUND":
      return "This account doesn't exist.";
    case "NEW_ACCOUNT":
      return `This account is new (${message.match(/(\d+) day/)?.[1] ?? "a few"} days of activity).`;
    case "LOW_ACTIVITY":
      return "This account has very little history.";
    case "RECIPIENT_NOT_REGISTERED_FOR_TOKEN":
      return "This account isn't set up to receive USDC yet.";
    case "AMOUNT_OVER_WARN_LIMIT":
    case "AMOUNT_OVER_BLOCK_LIMIT":
      return "This is a large amount.";
    case "RECENT_CODE_DEPLOY":
    case "CODE_CHANGED_SINCE_LAST_CHECK":
      return "This account's code changed recently.";
    case "SIGNAL_UNAVAILABLE":
      return signals.includes("shared_reports") ? "We can't check scam reports for mainnet accounts yet." : "One of our checks didn't respond, so we know less than usual.";
    default:
      return message;
  }
}

const Fact = ({ kind, children }: { kind: "good" | "bad" | "warn"; children: React.ReactNode }) => (
  <li className="reason" style={{ padding: "8px 0" }}>
    {kind === "good" ? <CircleCheck size={20} style={{ color: "var(--allow)" }} aria-label="Good" /> : kind === "bad" ? <CircleX size={20} className="sev-block" aria-label="Problem" /> : <CircleAlert size={20} className="sev-warn" aria-label="Warning" />}
    <div>{children}</div>
  </li>
);

export function SafetyPanel({ check, merchant, signature, signedBy, registry }: { check: CheckResponse | null; merchant?: MerchantProfile | null; signature?: "valid" | "invalid" | "none"; signedBy?: string; registry?: string }) {
  if (!check) return <div className="card muted">Checking who you're paying…</div>;
  const r = check.report;
  const h = HEADLINE[r.decision];
  const history = r.signals.find((s) => s.name === "activity_history" && s.status === "ok")?.data;
  const concerns = r.reasons.filter((x) => x.severity !== "info");

  return (
    <div className={`card decision-card ${r.decision}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className={`badge lg ${r.decision}`} style={{ margin: 0 }}>
          {h.text}
        </p>
        <NetworkTag network={r.request.network} />
      </div>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        {h.sub}
      </p>
      <ul className="reasons" style={{ marginTop: 8 }}>
        {signature === "valid" && (
          <Fact kind="good">
            This request was signed by {signedBy}'s own wallet, so the amount, recipient and description are what they approved. It shows who is asking,
            not that they'll deliver.
          </Fact>
        )}
        {signature === "invalid" && <Fact kind="bad">This request's signature no longer checks out. It may have been changed, or the key was removed.</Fact>}
        {signature === "none" && (
          <Fact kind="warn">This request wasn't signed by the merchant's wallet, so anyone could have made it. Confirm with them another way before paying.</Fact>
        )}
        {merchant?.websiteVerified && (
          <Fact kind="good">
            {r.request.recipient} proved it owns <strong>{merchant.website}</strong>. That proves ownership, not honesty.
          </Fact>
        )}
        {merchant?.website && !merchant.websiteVerified && <Fact kind="warn">This account claims {merchant.website}, but the website doesn't confirm it.</Fact>}
        {history?.firstObservedAt && (
          <Fact kind="good">
            Active on NEAR since {new Date(history.firstObservedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} ({history.txCount} transactions).
          </Fact>
        )}
        {!!merchant?.paid && <Fact kind="good">{merchant.paid} earlier payment(s) to this account through Notara.</Fact>}
        {concerns.map((c, i) => (
          <Fact key={i} kind={c.severity === "block" ? "bad" : "warn"}>
            {plain(c.code, c.message, c.signals)}
          </Fact>
        ))}
      </ul>
      <p className="muted small" style={{ margin: "8px 0 0" }}>
        We check facts, not intentions. A real, verified person can still be dishonest, so only pay people you expect to pay.
      </p>
      {registry && <ReportForm registry={registry} subject={r.request.recipient} network={r.request.network === "mainnet" ? "mainnet" : "testnet"} />}
      <details style={{ marginTop: 8 }}>
        <summary className="small">Technical details</summary>
        <div className="stack tech-details" style={{ marginTop: 8 }}>
          <DecisionCard res={check} />
          <ReasonList reasons={r.reasons} network={r.request.network} />
        </div>
      </details>
    </div>
  );
}

/** Files a report in the shared on-chain registry, signed by the reporter's own wallet (0.01 NEAR bond). */
function ReportForm({ registry, subject, network }: { registry: string; subject: string; network: "mainnet" | "testnet" }) {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Scam");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [state, setState] = useState<{ busy?: boolean; done?: string; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      const hash = await w.call(registry, "submit_report", { subject, category, description: description.trim(), evidence_uri: evidence.trim(), evidence_hash: null }, 30, { network, deposit: "10000000000000000000000" });
      setState({ done: hash });
    } catch (err: any) {
      setState({ error: err.message });
    }
  }

  if (!open)
    return (
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        <Flag size={14} aria-hidden /> Report this account
      </button>
    );
  if (state.done)
    return (
      <p className="small" style={{ marginTop: 8 }}>
        Report filed. It shows as unverified until a verifier checks it.{" "}
        <a href={`${network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io"}/txns/${state.done}`} target="_blank" rel="noreferrer">View transaction</a>
      </p>
    );
  return (
    <form className="stack" style={{ marginTop: 12 }} onSubmit={submit}>
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="What happened">
        {["Scam", "Phishing", "Impersonation", "MaliciousContract", "Other"].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input className="input" maxLength={500} placeholder="What happened?" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <input className="input" maxLength={300} placeholder="Link to evidence (transaction, screenshot, post)" value={evidence} onChange={(e) => setEvidence(e.target.value)} required />
      <p className="hint" style={{ margin: 0 }}>Signed by your NEAR wallet with a 0.01 NEAR bond, so reports aren't free to spam. False reports can be disputed.</p>
      <div className="row">
        <button className="btn btn-danger btn-sm" disabled={state.busy || !description.trim() || !evidence.trim()}>
          {state.busy && <LoaderCircle size={14} className="spin" aria-hidden />} File report
        </button>
        {state.error && <span className="err">{state.error}</span>}
      </div>
    </form>
  );
}
