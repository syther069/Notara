// Send by link: the sender's browser makes a one-time NEAR key and puts it in the link's #part,
// which browsers never send to a server. Its implicit account (hex of the public key) receives
// the USDC through the same any-chain checkout. Whoever opens the link holds the key and claims.
//
// A small "sponsor" account (one per network) pays every cost, so the receiver needs no NEAR:
//  - USDC storage for the link account when the link is made,
//  - 0.002 NEAR once, so the link account exists on-chain (a meta transaction needs its access key nonce),
//  - the claim itself, as a NEP-366 meta transaction: the link key signs a DelegateAction with one
//    ft_transfer, and the sponsor relays it and pays gas and the 1 yoctoNEAR deposit. The sponsor also
//    creates the receiver's new name and registers it with USDC.
// So the key holder never gets spendable sponsor NEAR: at most the 0.002 that keeps the account alive.

import { Account, SCHEMA, actions, baseEncode, type KeyPairString } from "near-api-js";
import { deserialize } from "borsh";
import { NETWORKS } from "../passport/src/config.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { usdcFor } from "../passport/src/assets.ts";
import { hasKey, readKey } from "../agent/src/keys.ts";
import type { Invoice } from "./invoices.ts";
import { verifySigned } from "./nep413.ts";
import { SIGN_RECIPIENT, freshNonce } from "./merchants.ts";
import { formatAmount } from "../passport/src/assets.ts";

type Net = "mainnet" | "testnet";

/** Enough for the link account to exist: ~0.00182 NEAR is locked for an account with one key. */
export const LINK_ACCOUNT_NEAR = 2_000_000_000_000_000_000_000n; // 0.002 NEAR
export const NEW_NAME_DEPOSIT = 2_000_000_000_000_000_000_000n; // 0.002 NEAR, what the near/testnet account contract needs
export const MIN_SEND_UNITS = 1_000_000n; // 1 USDC: a link must be worth more than what it costs the sponsor
export const MAX_SEND_UNITS = 25_000_000n; // 25 USDC in this prototype
// Backstop for the whole site; each signing wallet is also limited below. High enough that a few free testnet
// accounts can't use up the day for everyone; at about 0.003 test NEAR of sponsor cost per link it's ~0.65 a day at most.
export const MAX_SENDS_PER_DAY = 200;
export const MAX_SENDS_PER_SENDER_PER_DAY = 5;
const MAX_DELEGATE_GAS = 50_000_000_000_000n;

export const isImplicit = (id: string) => /^[0-9a-f]{64}$/.test(id);
/** The ed25519 public key behind an implicit account id (its hex). */
export const implicitPublicKey = (id: string) => `ed25519:${baseEncode(Buffer.from(id, "hex"))}`;
/** Top-level suffix for new names: .near on mainnet, .testnet on testnet. */
export const tla = (net: Net) => (net === "mainnet" ? "near" : "testnet");

/** Mainnet: SPONSOR_ACCOUNT / SPONSOR_PRIVATE_KEY. Testnet: TESTNET_SPONSOR_*, or keys/sponsor.json from `npm run owner -- make-sponsor`. */
export function sponsor(net: Net): Account {
  const p = net === "mainnet" ? "" : "TESTNET_";
  let id = process.env[`${p}SPONSOR_ACCOUNT`];
  let key = process.env[`${p}SPONSOR_PRIVATE_KEY`];
  if ((!id || !key) && net === "testnet" && hasKey("sponsor")) ({ account_id: id, secret_key: key } = readKey("sponsor"));
  if (!id || !key) throw new Error(`Send by link needs a ${net} sponsor: set ${p}SPONSOR_ACCOUNT and ${p}SPONSOR_PRIVATE_KEY (an account with a little NEAR) in .env`);
  return new Account(id, NETWORKS[net].rpc, key as KeyPairString);
}

/** Whether Send by link can run on `net` (a sponsor account is configured). */
export function hasSponsor(net: Net): boolean {
  try {
    sponsor(net);
    return true;
  } catch {
    return false;
  }
}

/** NEP-145: an account must register with a token before it can receive it. Idempotent. */
export async function ensureUsdcStorage(net: Net, account: string): Promise<void> {
  const usdc = usdcFor(net);
  const reg = await viewFunction<unknown>(net, usdc, "storage_balance_of", { account_id: account });
  if (reg) return;
  const bounds: any = await viewFunction(net, usdc, "storage_balance_bounds");
  await sponsor(net).callFunction({
    contractId: usdc,
    methodName: "storage_deposit",
    args: { account_id: account, registration_only: true },
    deposit: BigInt(bounds.min),
    gas: 30_000_000_000_000n,
  });
}

/**
 * Why the sponsor must not fund this link's account, or null if it may. Funding happens once per link:
 * after a claim the key holder can close the account, and re-funding it would hand them free NEAR.
 */
export function fundRefusal(inv: Pick<Invoice, "kind" | "status" | "linkFundedAt">): string | null {
  if (inv.kind !== "send") return "Not a send link";
  if (inv.status !== "paid") return "This link hasn't been funded yet";
  if (inv.linkFundedAt) return "already";
  return null;
}

/** Makes the link's implicit account exist (sending NEAR to it does that). */
export async function fundLinkAccount(net: Net, account: string): Promise<void> {
  if (await viewAccount(net, account)) return;
  await sponsor(net).transfer({ receiverId: account, amount: LINK_ACCOUNT_NEAR });
}

/** Reads a base64 borsh SignedDelegate (NEP-366) sent by the claim page. */
export function decodeSignedDelegate(b64: string): any {
  return deserialize(SCHEMA.SignedDelegate, Buffer.from(b64, "base64"));
}

/**
 * Checks a claim's meta transaction does exactly one thing: the link account sends USDC to one receiver.
 * Returns that receiver. Anything else would let a link holder spend the sponsor's gas or deposit on their own calls.
 */
export function checkClaimDelegate(sd: any, linkAccount: string, net: Net): string {
  const d = sd?.delegateAction;
  if (!d || d.senderId !== linkAccount) throw new Error("The claim must be signed by this link's key");
  if (d.receiverId !== usdcFor(net)) throw new Error("The claim may only call the USDC contract");
  // An implicit account id is the hex of its ed25519 key, so the signing key must be exactly that.
  const key = d.publicKey?.ed25519Key?.data;
  if (!key || Buffer.from(key).toString("hex") !== linkAccount) throw new Error("The claim must be signed by this link's key");
  if (d.actions?.length !== 1 || !d.actions[0].functionCall) throw new Error("The claim must be one USDC transfer");
  const fc = d.actions[0].functionCall;
  if (fc.methodName !== "ft_transfer") throw new Error("The claim must be one USDC transfer");
  if (BigInt(fc.deposit) !== 1n) throw new Error("ft_transfer must attach exactly 1 yoctoNEAR");
  if (BigInt(fc.gas) > MAX_DELEGATE_GAS) throw new Error("Too much gas on the claim");
  const args = JSON.parse(Buffer.from(fc.args).toString());
  const to = String(args.receiver_id ?? "");
  if (!/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(to) || to.length < 2 || to.length > 64) throw new Error("Invalid receiver");
  if (to === linkAccount) throw new Error("Claim to another account");
  return to;
}

/** Sponsor creates <name>.near (or .testnet) owned by the link's key, so the receiver can import that key. */
export async function createName(net: Net, newAccountId: string, linkAccount: string): Promise<void> {
  await sponsor(net).callFunction({
    contractId: tla(net),
    methodName: "create_account",
    args: { new_account_id: newAccountId, new_public_key: implicitPublicKey(linkAccount) },
    deposit: NEW_NAME_DEPOSIT,
    gas: 30_000_000_000_000n,
  });
}

/** Sponsor relays the link's signed transfer (NEP-366) and pays its gas and deposit. */
export async function relayClaim(net: Net, linkAccount: string, sd: any): Promise<any> {
  return sponsor(net).signAndSendTransaction({ receiverId: linkAccount, actions: [actions.signedDelegate(sd)], waitUntil: "FINAL" as any });
}

export const usdcBalance = (net: Net, account: string) => viewFunction<string>(net, usdcFor(net), "ft_balance_of", { account_id: account });

/** The exact text the sender's wallet signs (NEP-413) to make a send link. Free, and moves no money. */
export const sendLinkMessage = (l: { sender: string; account: string; amount: string; asset: string }) =>
  `Notara send link
From: ${l.sender}
Link account: ${l.account}
Amount: ${formatAmount(l.amount, l.asset)}`;

/**
 * Proves a real wallet asked for this link: a fresh NEP-413 signature by one of the sender's full-access keys.
 * Without it anyone could script empty links, spend the sponsor's NEAR on storage and use up the day's limit.
 */
export async function verifySender(proof: unknown, l: Parameters<typeof sendLinkMessage>[0], net: Net): Promise<void> {
  if (typeof proof !== "string" || !proof) throw new Error("Sign with your wallet to make a send link");
  const r = await verifySigned(proof, { expectedRecipient: SIGN_RECIPIENT, expectedMessage: sendLinkMessage(l), validateNonce: freshNonce(600_000) }, net).catch((e) => {
    throw new Error(`Your wallet signature didn't check out: ${e.message}`);
  });
  if (r.accountId !== l.sender) throw new Error(`Signed by ${r.accountId}, not ${l.sender}`);
}

/** Why a new send link must wait until tomorrow, or null. `today` is YYYY-MM-DD (UTC). */
export function sendLimitReason(list: Pick<Invoice, "kind" | "createdAt" | "sentBy">[], sender: string, today: string): string | null {
  const sends = list.filter((i) => i.kind === "send" && i.createdAt.startsWith(today));
  if (sends.filter((i) => i.sentBy === sender).length >= MAX_SENDS_PER_SENDER_PER_DAY) return `You can make ${MAX_SENDS_PER_SENDER_PER_DAY} send links a day in this prototype. Try again tomorrow.`;
  if (sends.length >= MAX_SENDS_PER_DAY) return "Daily limit for new send links reached";
  return null;
}
