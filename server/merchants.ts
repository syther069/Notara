// Merchant identity: wallet-signed payment links (NEP-413) and website ownership proofs.
// Stored in SQLite (server/db.ts).

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { verify } from "near-sign-verify";
import { docs } from "./db.ts";
import { formatAmount } from "../passport/src/assets.ts";

export const SIGN_RECIPIENT = "notara";

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

const store = docs<Merchant>("merchants");
export const getMerchant = (account: string): Merchant => store.get(account) ?? { account };

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
  const saved = store.get(account);
  const result = { account, website: host, websiteVerified: ok, websiteCheckedAt: new Date().toISOString() };
  // Save only proofs and re-checks of a saved site, so nobody can pin an unconfirmed claim on someone else's profile.
  if (ok || saved?.website === host) store.put(account, result.websiteCheckedAt, result);
  return result;
}
