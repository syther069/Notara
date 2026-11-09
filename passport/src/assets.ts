// Known payment assets. "NEAR" is native; every other key is a NEP-141 token contract id.
// Amounts are always integer strings in the asset's smallest unit (yoctoNEAR, or 10^-6 USDC).

import assetsJson from "../assets.json" with { type: "json" };

export interface AssetInfo {
  id: string;
  symbol: string;
  decimals: number;
  name: string;
  network?: string;
  faucet?: string;
}

const ASSETS: Record<string, Omit<AssetInfo, "id">> = assetsJson;

export const USDC_TESTNET = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
export const USDC_MAINNET = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

export function listAssets(): AssetInfo[] {
  return Object.entries(ASSETS).map(([id, a]) => ({ id, ...a }));
}

export function getAsset(id: string): AssetInfo | undefined {
  const a = ASSETS[id];
  return a ? { id, ...a } : undefined;
}

/** Accepts an asset id or a symbol ("USDC") and returns the asset. */
export function resolveAsset(idOrSymbol: string): AssetInfo | undefined {
  return getAsset(idOrSymbol) ?? listAssets().find((a) => a.symbol.toLowerCase() === idOrSymbol.toLowerCase());
}

/** "12.5" -> smallest units. Throws on bad input or too many decimals. */
export function toUnits(amount: string, asset: AssetInfo): string {
  const s = String(amount).trim();
  const m = s.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`Amount must be a number like 0.25`);
  const frac = m[2] ?? "";
  if (frac.length > asset.decimals) throw new Error(`${asset.symbol} has at most ${asset.decimals} decimals`);
  const units = BigInt(m[1]) * 10n ** BigInt(asset.decimals) + BigInt((frac + "0".repeat(asset.decimals)).slice(0, asset.decimals) || "0");
  if (units <= 0n) throw new Error("Amount must be greater than 0");
  return units.toString();
}

/** Smallest units -> "12.5" (trailing zeros trimmed, at most `maxFrac` decimals). */
export function formatUnits(units: string, asset: AssetInfo, maxFrac = 6): string {
  if (!/^\d+$/.test(units)) return "0";
  const s = units.padStart(asset.decimals + 1, "0");
  const whole = s.slice(0, s.length - asset.decimals).replace(/^0+(?=\d)/, "");
  const frac = s.slice(s.length - asset.decimals).slice(0, maxFrac).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** "1.5 USDC", or raw units + id for unknown tokens. */
export function formatAmount(units: string, assetId: string): string {
  const a = getAsset(assetId);
  return a ? `${formatUnits(units, a)} ${a.symbol}` : `${units} units of ${assetId}`;
}

/** Payment links are USDC links; the USDC contract says which network the link lives on. */
export function linkNetwork(assetId: string): "mainnet" | "testnet" | undefined {
  if (assetId === USDC_MAINNET) return "mainnet";
  if (assetId === USDC_TESTNET) return "testnet";
  return undefined;
}
export const usdcFor = (net: "mainnet" | "testnet") => (net === "mainnet" ? USDC_MAINNET : USDC_TESTNET);
