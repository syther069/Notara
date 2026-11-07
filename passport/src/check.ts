import { DISCLAIMER, loadDeployment, loadPolicy, type Policy } from "./config.ts";
import type { Network } from "./types.ts";

/** Operator allowlist entries recorded at setup (e.g. the onboarded demo merchant). */
export function withDeploymentLists(policy: Policy, network: Network): Policy {
  const dep = loadDeployment(network);
  return dep?.allowlist?.length ? { ...policy, allowlist: [...policy.allowlist, ...dep.allowlist] } : policy;
}
import { evaluate } from "./policy.ts";
import { collectSignals } from "./signals/index.ts";
import type { CheckResponse, PaymentRequest, Report, SignalResult } from "./types.ts";
import { loadSigner, newNonce, reportHash, signVerdict } from "./verdict.ts";

const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function validateRequest(req: PaymentRequest) {
  if (req.network !== "testnet" && req.network !== "mainnet") throw new Error("network must be testnet or mainnet");
  if (!ACCOUNT_RE.test(req.recipient) || req.recipient.length < 2 || req.recipient.length > 64)
    throw new Error(`invalid recipient account id: ${req.recipient}`);
  if (!/^\d+$/.test(req.amount) || BigInt(req.amount) <= 0n) throw new Error("amount must be a positive integer string (yocto)");
  if (req.asset !== "NEAR" && !ACCOUNT_RE.test(req.asset)) throw new Error("asset must be NEAR or a token account id");
}

export function buildReport(req: PaymentRequest, signals: SignalResult[], policy: Policy): Report {
  const { decision, reasons } = evaluate(req, signals, policy);
  const counted = signals.filter((s) => s.status !== "skipped");
  return {
    version: "notara/report/v1",
    request: req,
    decision,
    reasons,
    coverage: {
      ok: counted.filter((s) => s.status === "ok").length,
      total: counted.length,
      failed: counted.filter((s) => s.status === "error").map((s) => s.name),
    },
    signals,
    policyVersion: policy.version,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/**
 * Full check. When `sign` is true and a payer (vault) is given, the verdict is signed so the
 * vault contract can verify it. BLOCK verdicts are signed too: the vault refuses them on-chain,
 * and the signed record documents why.
 */
export async function check(
  req: PaymentRequest,
  opts: { sign?: boolean; policy?: Policy } = {},
): Promise<CheckResponse> {
  validateRequest(req);
  if (opts.sign && !req.payer) throw new Error("A signed verdict needs the payer (vault) account");
  const policy = opts.policy ?? withDeploymentLists(loadPolicy(), req.network);
  const signals = await collectSignals(req, policy);
  const report = buildReport(req, signals, policy);
  if (!opts.sign || !req.payer) return { report };

  const kp = loadSigner();
  const verdict = {
    vault: req.payer,
    recipient: req.recipient,
    amount: req.amount,
    asset: req.asset,
    decision: report.decision,
    nonce: newNonce(),
    expires_at_ms: String(Date.now() + policy.verdictTtlMs),
    report_hash: reportHash(report),
  };
  return { report, verdict, signature: signVerdict(verdict, kp), signerPublicKey: kp.getPublicKey().toString() };
}
