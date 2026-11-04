// The policy engine: a pure function from (request, signals, policy) to a decision with reasons.
// No I/O here, so every rule is table-tested in passport/test/policy.test.ts.
//
// Fail-closed rule: if any signal could not be collected, the result is at least WARN.
// The engine never returns ALLOW on missing evidence.

import type { Policy } from "./config.ts";
import type { AccountSignal, DeploySignal, HistorySignal, InteractionSignal, RegistryReport } from "./signals/index.ts";
import type { Decision, PaymentRequest, Reason, SignalResult } from "./types.ts";

const rank: Record<Decision, number> = { ALLOW: 0, WARN: 1, BLOCK: 2 };
const sevToDecision = { info: "ALLOW", warn: "WARN", block: "BLOCK" } as const;

function get<T>(signals: SignalResult[], name: string): SignalResult<T> | undefined {
  return signals.find((s) => s.name === name) as SignalResult<T> | undefined;
}

const fmt = (yocto: string, asset: string) =>
  asset === "NEAR" ? `${(Number(BigInt(yocto) / 10n ** 18n) / 1e6).toString()} NEAR` : `${yocto} units of ${asset}`;

export function evaluate(
  req: PaymentRequest,
  signals: SignalResult[],
  policy: Policy,
): { decision: Decision; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const add = (r: Reason) => reasons.push(r);
  const amount = BigInt(req.amount);

  // ---- missing evidence -> WARN (fail closed)
  for (const s of signals) {
    if (s.status === "error") {
      add({
        code: "SIGNAL_UNAVAILABLE",
        severity: "warn",
        message: `Could not check ${s.name}: ${s.error}. Treated as unverified.`,
        signals: [s.name],
      });
    }
  }

  // ---- local lists
  const lists = get<{ allowlisted: boolean; denylisted: boolean; denyReason?: string }>(signals, "policy_lists");
  const allowlisted = !!lists?.data?.allowlisted;
  if (lists?.data?.denylisted) {
    add({
      code: "DENYLISTED",
      severity: "block",
      message: `Recipient is on the operator denylist: ${lists.data.denyReason ?? "no reason given"}.`,
      signals: ["policy_lists"],
    });
  }
  if (allowlisted) {
    add({
      code: "ALLOWLISTED",
      severity: "info",
      message: "Recipient is on the operator allowlist. Age and first-payment checks are relaxed; reports and code changes still apply.",
      signals: ["policy_lists"],
    });
  }

  // ---- amount thresholds
  const blockAbove = policy.blockAboveAmount[req.asset];
  const warnAbove = policy.warnAboveAmount[req.asset];
  if (blockAbove === undefined || warnAbove === undefined) {
    add({
      code: "NO_ASSET_POLICY",
      severity: "warn",
      message: `No amount thresholds configured for asset ${req.asset}.`,
      signals: [],
    });
  }
  if (blockAbove !== undefined && amount > BigInt(blockAbove)) {
    add({
      code: "AMOUNT_OVER_BLOCK_LIMIT",
      severity: "block",
      message: `Amount ${fmt(req.amount, req.asset)} exceeds the hard policy limit of ${fmt(blockAbove, req.asset)}.`,
      signals: [],
    });
  } else if (warnAbove !== undefined && amount > BigInt(warnAbove)) {
    add({
      code: "AMOUNT_OVER_WARN_LIMIT",
      severity: "warn",
      message: `Amount ${fmt(req.amount, req.asset)} is above the human-approval threshold of ${fmt(warnAbove, req.asset)}.`,
      signals: [],
    });
  }

  // ---- account state
  const acct = get<AccountSignal>(signals, "account_state")?.data;
  if (acct && !acct.exists) {
    add(
      acct.implicit
        ? {
            code: "IMPLICIT_ACCOUNT_UNUSED",
            severity: "warn",
            message: "Recipient is an implicit account that has never been used on-chain.",
            signals: ["account_state"],
          }
        : {
            code: "ACCOUNT_NOT_FOUND",
            severity: "block",
            message: "Recipient account does not exist. This is often a typo or a look-alike name.",
            signals: ["account_state"],
          },
    );
  }
  if (acct?.isContract) {
    add({
      code: "RECIPIENT_IS_CONTRACT",
      severity: "info",
      message: `Recipient is a contract (code hash ${acct.codeHash}).`,
      signals: ["account_state"],
    });
    if (acct.codeHashChangedSinceLastCheck) {
      add({
        code: "CODE_CHANGED_SINCE_LAST_CHECK",
        severity: "warn",
        message: `Contract code changed since our last check (was ${acct.previousCodeHash}, now ${acct.codeHash}).`,
        signals: ["account_state"],
      });
    }
  }

  // ---- contract deployments
  const dep = get<DeploySignal>(signals, "contract_deployments")?.data;
  if (dep?.lastDeployAgeDays !== undefined && dep.lastDeployAgeDays < policy.recentDeployDays) {
    add({
      code: "RECENT_CODE_DEPLOY",
      severity: "warn",
      message: `Contract code was deployed ${dep.lastDeployAgeDays} day(s) ago (policy window: ${policy.recentDeployDays} days).`,
      signals: ["contract_deployments"],
      evidence: dep.deploys.slice(0, 3).map((d) => `tx:${d.tx}`),
    });
  }

  // ---- history
  const hist = get<HistorySignal>(signals, "activity_history")?.data;
  if (hist) {
    add({
      code: "HISTORY",
      severity: "info",
      message: `${hist.txCount} indexed transaction(s); first observed ${hist.firstObservedAt ?? "never"}, last ${hist.lastObservedAt ?? "never"}.`,
      signals: ["activity_history"],
    });
  }
  if (hist && !allowlisted) {
    if (hist.txCount < policy.minObservedTxCount) {
      add({
        code: "LOW_ACTIVITY",
        severity: "warn",
        message: `Only ${hist.txCount} indexed transaction(s) (policy minimum ${policy.minObservedTxCount}).`,
        signals: ["activity_history"],
      });
    }
    if (hist.observedAgeDays !== undefined && hist.observedAgeDays < policy.minObservedAgeDays) {
      add({
        code: "NEW_ACCOUNT",
        severity: "warn",
        message: `First observed activity ${hist.observedAgeDays} day(s) ago (policy minimum ${policy.minObservedAgeDays}). This is an estimate from the index, not the creation date.`,
        signals: ["activity_history"],
        evidence: hist.firstObservedTx ? [`tx:${hist.firstObservedTx}`] : undefined,
      });
    }
  }

  // ---- prior interactions
  const inter = get<InteractionSignal>(signals, "prior_interactions")?.data;
  if (inter && !allowlisted) {
    const known = inter.vaultPayments.executed > 0 || inter.sharedIndexedTxs > 0;
    const firstAbove = policy.firstPaymentWarnAbove[req.asset];
    if (!known && firstAbove !== undefined && amount > BigInt(firstAbove)) {
      add({
        code: "FIRST_PAYMENT_TO_RECIPIENT",
        severity: "warn",
        message: `No prior payments or shared transactions found with this recipient${inter.scannedComplete ? "" : " (history scan was partial)"}, and the amount is above ${fmt(firstAbove, req.asset)}.`,
        signals: ["prior_interactions"],
      });
    } else if (known) {
      add({
        code: "PRIOR_INTERACTIONS",
        severity: "info",
        message: `${inter.vaultPayments.executed} earlier vault payment(s) and ${inter.sharedIndexedTxs} shared indexed transaction(s).`,
        signals: ["prior_interactions"],
        evidence: inter.sharedTxSample.map((h) => `tx:${h}`),
      });
    }
  }

  // ---- shared reports
  const rep = get<{ registry: string; reports: RegistryReport[] }>(signals, "shared_reports")?.data;
  for (const r of rep?.reports ?? []) {
    const label = `${r.is_fixture ? "[DEMO FIXTURE] " : ""}report #${r.id} (${r.category}) by ${r.reporter}`;
    const evidence = [`registry:${rep!.registry}#${r.id}`, r.evidence_uri];
    if (r.status === "Verified" && policy.blockingCategories.includes(r.category)) {
      add({
        code: "VERIFIED_REPORT",
        severity: "block",
        message: `${label} was verified by ${r.status_by}: "${r.description}".`,
        signals: ["shared_reports"],
        evidence,
      });
    } else if (r.status === "Verified" || r.status === "Unverified" || r.status === "Disputed") {
      add({
        code: r.status === "Disputed" ? "DISPUTED_REPORT" : "UNVERIFIED_REPORT",
        severity: "warn",
        message: `${label} is ${r.status.toLowerCase()}: "${r.description}". Treated as a lead, not proof.`,
        signals: ["shared_reports"],
        evidence,
      });
    } else {
      add({
        code: "REJECTED_REPORT",
        severity: "info",
        message: `${label} was rejected by ${r.status_by}.`,
        signals: ["shared_reports"],
        evidence,
      });
    }
  }

  let decision: Decision = "ALLOW";
  for (const r of reasons) {
    const d = sevToDecision[r.severity];
    if (rank[d] > rank[decision]) decision = d;
  }
  const order = { block: 0, warn: 1, info: 2 };
  reasons.sort((a, b) => order[a.severity] - order[b.severity]);
  if (decision === "ALLOW") {
    reasons.push({
      code: "NO_POLICY_VIOLATION",
      severity: "info",
      message: "No configured policy rule was triggered by the evidence collected. This is not a guarantee the recipient is safe.",
      signals: [],
    });
  }
  return { decision, reasons };
}
