import type { CheckResponse, Report } from "./types.ts";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: number, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const red = (s: string) => c(31, s);
export const yellow = (s: string) => c(33, s);
export const green = (s: string) => c(32, s);
export const dim = (s: string) => c(2, s);
export const bold = (s: string) => c(1, s);

export const decisionColor = (d: string) => (d === "BLOCK" ? red : d === "WARN" ? yellow : green)(bold(d));

export function nearAmount(yocto: string): string {
  const s = yocto.padStart(25, "0");
  const whole = s.slice(0, -24).replace(/^0+(?=\d)/, "");
  const frac = s.slice(-24).replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
}

export function formatReport(r: Report): string {
  const lines: string[] = [];
  const amt = r.request.asset === "NEAR" ? `${nearAmount(r.request.amount)} NEAR` : `${r.request.amount} ${r.request.asset}`;
  lines.push(`${bold("Notara check")}  ${r.request.recipient}  ${amt}  ${dim(`[${r.request.network}]`)}`);
  lines.push(`Decision: ${decisionColor(r.decision)}   evidence coverage ${r.coverage.ok}/${r.coverage.total} signals` +
    (r.coverage.failed.length ? red(`  (unavailable: ${r.coverage.failed.join(", ")})`) : ""));
  lines.push("");
  lines.push(bold("Reasons"));
  for (const x of r.reasons) {
    const tag = x.severity === "block" ? red("BLOCK") : x.severity === "warn" ? yellow("WARN ") : dim("info ");
    lines.push(`  ${tag} ${x.code}: ${x.message}`);
    for (const e of x.evidence ?? []) lines.push(dim(`          evidence: ${e}`));
  }
  lines.push("");
  lines.push(bold("Signals (provenance)"));
  for (const s of r.signals) {
    const st = s.status === "ok" ? green("ok     ") : s.status === "error" ? red("error  ") : dim("skipped");
    lines.push(`  ${st} ${s.name.padEnd(22)} ${dim(`${s.source.kind} @ ${s.source.endpoint}`)}`);
    if (s.status !== "ok" && s.error) lines.push(dim(`          ${s.error}`));
  }
  lines.push("");
  lines.push(dim(`Policy ${r.policyVersion}. ${r.disclaimer}`));
  return lines.join("\n");
}

export function formatCheck(res: CheckResponse): string {
  let out = formatReport(res.report);
  if (res.verdict) {
    out += `\n${dim(`Signed verdict nonce=${res.verdict.nonce} expires=${new Date(Number(res.verdict.expires_at_ms)).toISOString()} report_hash=${res.verdict.report_hash.slice(0, 16)}… signer=${res.signerPublicKey}`)}`;
  }
  return out;
}
