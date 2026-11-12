// Merchant identity: wallet-signed payment links (NEP-413) and website ownership proofs.
// Stored in SQLite (server/db.ts).

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { verifySigned } from "./nep413.ts";
import { docs } from "./db.ts";
import { formatAmount, linkNetwork } from "../passport/src/assets.ts";

export const SIGN_RECIPIENT = "notara";

export interface Merchant {
  account: string;
  website?: string;
  websiteVerified?: boolean;
  websiteCheckedAt?: string;
}

/** What a merchant's wallet signs (NEP-413) to see their own list of links. One signature lasts a day. */
export const linksMessage = (account: string) => `Notara: show my payment links
Account: ${account}`;
export const LINKS_PROOF_MAX_AGE_MS = 24 * 3_600_000;

/** Proves the caller controls `account` before its links (descriptions, amounts, status) are listed. */
export async function verifyLinksProof(proof: unknown, account: string, network: "mainnet" | "testnet"): Promise<void> {
  if (typeof proof !== "string" || !proof) throw new Error("Sign with your wallet to see your links");
  const r = await verifySigned(proof, { expectedRecipient: SIGN_RECIPIENT, expectedMessage: linksMessage(account), validateNonce: freshNonce(LINKS_PROOF_MAX_AGE_MS) }, network).catch((e) => {
    throw new Error(`Your wallet signature didn't check out: ${e.message}`);
  });
  if (r.accountId !== account) throw new Error(`Signed by ${r.accountId}, not ${account}`);
}

/** The exact text the merchant sees and signs in their wallet. */
export function linkMessage(l: { merchant: string; amount: string; asset: string; description: string }): string {
  return `Notara payment link\nPay to: ${l.merchant}\nAmount: ${formatAmount(l.amount, l.asset)}\nFor: ${l.description}`;
}

/**
 * NEP-413 nonce freshness, allowing signers whose clock runs a little fast. near-sign-verify's own
 * nonceMaxAge refuses any nonce "from the future", and phone/laptop clocks are often seconds ahead of
 * the server's. The nonce starts with the signing time in ms as 16 ASCII digits (near-sign-verify's format).
 */
export function freshNonce(maxAgeMs: number, skewMs = 120_000) {
  return (nonce: Uint8Array) => {
    if (nonce.length !== 32) return false;
    const signedAt = parseInt(new TextDecoder().decode(nonce.slice(0, 16)).replace(/^0+/, ""), 10);
    const age = Date.now() - signedAt;
    return Number.isFinite(signedAt) && age >= -skewMs && age <= maxAgeMs;
  };
}

/** Verifies a NEP-413 token from the merchant's wallet for exactly this link. Returns the signer, or throws. */
export async function verifyLinkToken(token: string, l: Parameters<typeof linkMessage>[0], fresh: boolean): Promise<string> {
  const r = await verifySigned(
    token,
    {
      expectedRecipient: SIGN_RECIPIENT,
      expectedMessage: linkMessage(l),
      // When a link is created the signature must be new; later views only re-check that it still matches.
      validateNonce: fresh ? freshNonce(600_000) : () => true,
    },
    // The key is checked on the link's own network (a testnet implicit account isn't on mainnet).
    linkNetwork(l.asset) ?? (l.merchant.endsWith(".testnet") ? "testnet" : "mainnet"),
  );
  if (r.accountId !== l.merchant) throw new Error(`Signed by ${r.accountId}, not ${l.merchant}`);
  return r.accountId;
}

const store = docs<Merchant>("merchants");
export const getMerchant = async (account: string): Promise<Merchant> => (await store.get(account)) ?? { account };

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
  const saved = await store.get(account);
  const result = { account, website: host, websiteVerified: ok, websiteCheckedAt: new Date().toISOString() };
  // Save only proofs and re-checks of a saved site, so nobody can pin an unconfirmed claim on someone else's profile.
  if (ok || saved?.website === host) await store.put(account, result.websiteCheckedAt, result);
  return result;
}
