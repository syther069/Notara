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
  return new Date(t).toLocaleDateString(undefined, { dateStyle: "medium" });
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
  token_registration: "Token registration",
};

export const DECISION_TEXT: Record<string, string> = {
  ALLOW: "No configured policy rule was broken. This is not a guarantee.",
  WARN: "Something is missing or unusual. A human must approve.",
  BLOCK: "A serious policy rule applies. The payment is refused.",
};

// ---------------------------------------------------------------- assets
// Mirrors passport/assets.json (the backend's registry, also served at /api/assets).
export const USDC_TESTNET = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
export const USDC_MAINNET = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
export const ASSETS: Record<string, { symbol: string; decimals: number; label: string }> = {
  [USDC_MAINNET]: { symbol: "USDC", decimals: 6, label: "USDC (real money, any chain)" },
  NEAR: { symbol: "NEAR", decimals: 24, label: "NEAR" },
  [USDC_TESTNET]: { symbol: "USDC", decimals: 6, label: "USDC (Circle testnet)" },
};

export const assetSymbol = (id: string) => ASSETS[id]?.symbol ?? (id.length > 20 ? `${id.slice(0, 8)}…` : id);

/** Smallest units -> decimal string in the asset's own unit ("0.3", "2.5"). */
export function unitsToDecimal(units: string | undefined, assetId: string): string {
  const a = ASSETS[assetId];
  if (!a) return units ?? "0";
  if (!units || !/^\d+$/.test(units)) return "0";
  const s = units.padStart(a.decimals + 1, "0");
  const whole = s.slice(0, s.length - a.decimals).replace(/^0+(?=\d)/, "");
  const frac = s.slice(s.length - a.decimals).slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** "0.3 NEAR", "2.5 USDC" */
export const formatAsset = (units: string | undefined, assetId: string) => `${unitsToDecimal(units, assetId)} ${assetSymbol(assetId)}`;

/** Payment links are USDC links; the USDC contract says which network the link lives on. */
export function linkNetwork(assetId: string | undefined): "mainnet" | "testnet" | undefined {
  if (assetId === USDC_MAINNET) return "mainnet";
  if (assetId === USDC_TESTNET) return "testnet";
  return undefined;
}
export const usdcFor = (net: "mainnet" | "testnet") => (net === "mainnet" ? USDC_MAINNET : USDC_TESTNET);
export const EXPLORER = { mainnet: "https://nearblocks.io", testnet: "https://testnet.nearblocks.io" } as const;
/** Named accounts: .near on mainnet, .testnet on testnet. */
export const netOfAccount = (id: string): "mainnet" | "testnet" => (id.endsWith(".testnet") ? "testnet" : "mainnet");
