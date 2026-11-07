// Merchant identity: wallet-signed payment links (NEP-413) and website ownership proofs.
// Stored locally in data/merchants.json.

import { lookup } from "node:dns/promises";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { join } from "node:path";
import { verify } from "near-sign-verify";
import { ROOT } from "../passport/src/config.ts";
import { formatAmount } from "../passport/src/assets.ts";

export const SIGN_RECIPIENT = "notara";
const DIR = process.env.NOTARA_DATA_DIR ?? join(ROOT, "data");
const FILE = join(DIR, "merchants.json");

export interface Merchant {
  account: string;
  website?: string;
  websiteVerified?: boolean;
  websiteCheckedAt?: string;
}

/** The exact text the merchant sees and signs in their wallet. */
export function linkMessage(l: { merchant: string; amount: string; asset: string; description: string }): string {
  return `Notara payment link\nPay to: ${l.merchant}\nAmount: ${formatAmount(l.amount, l.asset)}\nFor: ${l.description}`;
}

/** Verifies a NEP-413 token from the merchant's wallet for exactly this link. Returns the signer, or throws. */
export async function verifyLinkToken(token: string, l: Parameters<typeof linkMessage>[0], fresh: boolean): Promise<string> {
  const r = await verify(token, {
    expectedRecipient: SIGN_RECIPIENT,
    expectedMessage: linkMessage(l),
    // When a link is created the signature must be new; later views only re-check that it still matches.
    ...(fresh ? { nonceMaxAge: 600_000 } : { validateNonce: () => true }),
  });
  if (r.accountId !== l.merchant) throw new Error(`Signed by ${r.accountId}, not ${l.merchant}`);
  return r.accountId;
}

function load(): Record<string, Merchant> {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
}

function save(all: Record<string, Merchant>) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${FILE}.tmp`, JSON.stringify(all, null, 2));
  renameSync(`${FILE}.tmp`, FILE);
}

export const getMerchant = (account: string): Merchant => load()[account] ?? { account };

/** "https://Shop.example.com/x" -> "shop.example.com". Throws on anything that isn't a public hostname. */
export function normalizeWebsite(input: string): string {
  const raw = String(input).trim().toLowerCase();
  const host = (raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`)).hostname;
  if (!host.includes(".") || isIP(host) || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))
    throw new Error("Enter a public website like yourshop.com");
  return host;
}

/** True for loopback, private, link-local and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) return /^(::1$|::$|f[cd]|fe80|::ffff:(127|10|192\.168|169\.254)\.)/i.test(ip);
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/**
 * The merchant proves they own a website by publishing their NEAR account at
 * https://<site>/.well-known/near.txt. Anyone can ask us to check; the file is the proof.
 */
export async function checkWebsite(account: string, website: string): Promise<Merchant> {
  const host = normalizeWebsite(website);
  // Refuse sites that resolve to our own network, so this can't be used to probe it.
  const addrs = await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error(`${host} can't be checked`);
  let ok = false;
  try {
    const res = await fetch(`https://${host}/.well-known/near.txt`, { redirect: "error", signal: AbortSignal.timeout(5000) });
    const text = res.ok ? (await res.text()).slice(0, 2000) : "";
    ok = text.split(/\s+/).includes(account);
  } catch {}
  const all = load();
  const result = { account, website: host, websiteVerified: ok, websiteCheckedAt: new Date().toISOString() };
  // Save only proofs and re-checks of a saved site, so nobody can pin an unconfirmed claim on someone else's profile.
  if (ok || all[account]?.website === host) {
    all[account] = result;
    save(all);
  }
  return result;
}
