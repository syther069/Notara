// Send by link: the sender's browser makes a one-time NEAR key and puts it in the link's #part,
// which browsers never send to a server. Its implicit account (hex of the public key) receives
// the USDC through the same any-chain checkout. Whoever opens the link holds the key and claims.
//
// A small mainnet "sponsor" account pays the setup costs so the receiver needs no NEAR:
// USDC storage for the link account, and a little NEAR for gas once the link is funded.

import { Account, type KeyPairString } from "near-api-js";
import { NETWORKS } from "../passport/src/config.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { USDC_MAINNET } from "../passport/src/assets.ts";

/** Covers storage for the receiver's own account (0.00125 NEAR) plus gas for the claim transaction. */
export const CLAIM_GAS_NEAR = 3_000_000_000_000_000_000_000n; // 0.003 NEAR
export const MAX_SENDS_PER_DAY = 20; // shortcut: global cap, not per person; add accounts or captcha before real launch

export const isImplicit = (id: string) => /^[0-9a-f]{64}$/.test(id);

export function sponsor(): Account {
  const id = process.env.SPONSOR_ACCOUNT;
  const key = process.env.SPONSOR_PRIVATE_KEY;
  if (!id || !key) throw new Error("Send by link needs a sponsor: set SPONSOR_ACCOUNT and SPONSOR_PRIVATE_KEY (a mainnet account with a little NEAR) in .env");
  return new Account(id, NETWORKS.mainnet.rpc, key as KeyPairString);
}

/** NEP-145: an account must register with a token before it can receive it. Idempotent. */
export async function ensureUsdcStorage(account: string): Promise<void> {
  const reg = await viewFunction<unknown>("mainnet", USDC_MAINNET, "storage_balance_of", { account_id: account });
  if (reg) return;
  const bounds: any = await viewFunction("mainnet", USDC_MAINNET, "storage_balance_bounds");
  await sponsor().callFunction({
    contractId: USDC_MAINNET,
    methodName: "storage_deposit",
    args: { account_id: account, registration_only: true },
    deposit: BigInt(bounds.min),
    gas: 30_000_000_000_000n,
  });
}

/** Creates the link's implicit account (sending NEAR to it does that) so the receiver can pay gas. Idempotent. */
export async function ensureClaimGas(account: string): Promise<void> {
  if (await viewAccount("mainnet", account)) return;
  await sponsor().transfer({ receiverId: account, amount: CLAIM_GAS_NEAR });
}

export const usdcBalance = (account: string) => viewFunction<string>("mainnet", USDC_MAINNET, "ft_balance_of", { account_id: account });
