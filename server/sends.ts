// Send by link: the sender's browser makes a one-time NEAR key and puts it in the link's #part,
// which browsers never send to a server. Its implicit account (hex of the public key) receives
// the USDC through the same any-chain checkout. Whoever opens the link holds the key and claims.
//
// A small "sponsor" account (one per network) pays the setup costs so the receiver needs no NEAR:
// USDC storage for the link account, and a little NEAR for gas once the link is funded.

import { Account, type KeyPairString } from "near-api-js";
import { NETWORKS } from "../passport/src/config.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { usdcFor } from "../passport/src/assets.ts";
import { hasKey, readKey } from "../agent/src/keys.ts";

type Net = "mainnet" | "testnet";

// NEAR reserves attached gas at a pessimistic price (~0.001 NEAR per Tgas, refunded after), so the link
// account needs: ~0.0018 locked for its own storage, a new name (0.002 + 30 Tgas), USDC storage for the
// receiver (0.00125) and two 10 Tgas calls. Measured on testnet: create_account burns ~12 Tgas, ft_transfer ~3.
// The claim page then closes the link account, so what is left goes to the receiver as gas money.
export const CLAIM_GAS_NEAR = 60_000_000_000_000_000_000_000n; // 0.06 NEAR
export const MAX_SENDS_PER_DAY = 20; // shortcut: global cap, not per person; add accounts or captcha before real launch

export const isImplicit = (id: string) => /^[0-9a-f]{64}$/.test(id);

/** Mainnet: SPONSOR_ACCOUNT / SPONSOR_PRIVATE_KEY. Testnet: TESTNET_SPONSOR_*, or keys/sponsor.json from `npm run owner -- make-sponsor`. */
export function sponsor(net: Net): Account {
  const p = net === "mainnet" ? "" : "TESTNET_";
  let id = process.env[`${p}SPONSOR_ACCOUNT`];
  let key = process.env[`${p}SPONSOR_PRIVATE_KEY`];
  if ((!id || !key) && net === "testnet" && hasKey("sponsor")) ({ account_id: id, secret_key: key } = readKey("sponsor"));
  if (!id || !key) throw new Error(`Send by link needs a ${net} sponsor: set ${p}SPONSOR_ACCOUNT and ${p}SPONSOR_PRIVATE_KEY (an account with a little NEAR) in .env`);
  return new Account(id, NETWORKS[net].rpc, key as KeyPairString);
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

/** Creates the link's implicit account (sending NEAR to it does that) so the receiver can pay gas. Idempotent. */
export async function ensureClaimGas(net: Net, account: string): Promise<void> {
  if (await viewAccount(net, account)) return;
  await sponsor(net).transfer({ receiverId: account, amount: CLAIM_GAS_NEAR });
}

export const usdcBalance = (net: Net, account: string) => viewFunction<string>(net, usdcFor(net), "ft_balance_of", { account_id: account });
