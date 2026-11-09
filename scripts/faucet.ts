// Testnet only: get faucet NEAR. The public testnet faucet helper funds a new throwaway account;
// deleting it with `beneficiary` set moves its whole balance there.
import { Account, KeyPair, type KeyPairString } from "near-api-js";
import { NETWORKS } from "../passport/src/config.ts";
import { viewAccount } from "../passport/src/near.ts";

export async function topUpFromFaucet(beneficiary: string, log: (s: string) => void = console.log) {
  const tmpId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.testnet`;
  const kp = KeyPair.fromRandom("ed25519");
  log(`Top-up: creating throwaway faucet account ${tmpId}...`);
  const res = await fetch("https://helper.nearprotocol.com/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newAccountId: tmpId, newAccountPublicKey: kp.getPublicKey().toString() }),
  });
  if (!res.ok) throw new Error(`Faucet helper refused (${res.status}): ${await res.text()}`);
  for (let i = 0; i < 10 && !(await viewAccount("testnet", tmpId)); i++) await new Promise((r) => setTimeout(r, 2000));
  const tmp = new Account(tmpId, NETWORKS.testnet.rpc, kp.toString() as KeyPairString);
  await tmp.deleteAccount(beneficiary).catch(async (e) => {
    await new Promise((r) => setTimeout(r, 4000));
    if (await viewAccount("testnet", tmpId)) throw e;
  });
  log(`Top-up: ${tmpId} deleted, balance sent to ${beneficiary}`);
}
