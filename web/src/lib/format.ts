export function nearAmount(yocto: string | undefined): string {
  if (!yocto || !/^\d+$/.test(yocto)) return "0";
  const s = yocto.padStart(25, "0");
  const whole = s.slice(0, -24).replace(/^0+(?=\d)/, "");
  const frac = s.slice(-24).replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
}

export const shortHash = (h: string, n = 6) => (h.length > n * 2 + 1 ? `${h.slice(0, n)}…${h.slice(-n)}` : h);

/** Shorten long sub-account names for tables, keeping the meaningful first label. */
export const shortAccount = (a: string) => {
  const parts = a.split(".");
  return parts.length > 2 ? `${parts[0]}.…${parts.at(-1) === "testnet" ? ".testnet" : ""}` : a;
};

export function timeAgo(ms: number | string): string {
  const t = typeof ms === "string" ? Number(ms) : ms;
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

/** "VERIFIED_REPORT" -> "Verified report" */
export const codeToWords = (c: string) => c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ");

export const SIGNAL_LABELS: Record<string, string> = {
  account_state: "Account state",
  activity_history: "Activity history",
  contract_deployments: "Contract deployments",
  prior_interactions: "Prior payments",
  shared_reports: "Shared reports",
  policy_lists: "Allow / deny lists",
};

export const DECISION_TEXT: Record<string, string> = {
  ALLOW: "No configured policy rule was broken. This is not a guarantee.",
  WARN: "Something is missing or unusual. A human must approve.",
  BLOCK: "A serious policy rule applies. The payment is refused.",
};
