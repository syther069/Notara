#!/usr/bin/env tsx
// Human owner commands. Uses keys/owner.json, which the agent never loads.
//
//   npm run owner -- pending              list payments waiting for approval
//   npm run owner -- approve <id>         approve a WARN payment (vault re-checks caps)
//   npm run owner -- reject <id>
//   npm run owner -- show <id>            payment + Notara report hash it was based on
//   npm run owner -- pause | unpause
//   npm run owner -- rotate-agent-key [2] new agent key with a bigger gas allowance (in NEAR), old one removed
//   npm run owner -- lock-vault           delete the vault's full-access key (irreversible: no more upgrades or new keys)
//   npm run owner -- enable-usdc          USDC cap on the vault + token registration for vault/merchant/newshop
//   npm run owner -- fund-usdc <amount>   move testnet USDC from the owner to the vault (get it at faucet.circle.com)
//   npm run owner -- balances             NEAR and USDC balances of owner, vault and demo accounts
//   npm run owner -- topup                testnet faucet NEAR for the owner (about 10 per run)
//   npm run owner -- make-public-vaults   create vaults.<owner> (makes visitor vaults) and vault-agent.<owner> (public agent, gas only)
//   npm run owner -- make-sponsor         create sponsor.<owner> (1 testnet NEAR) that pays setup costs for testnet send links

import { NETWORKS, loadDeployment } from "../passport/src/config.ts";
import { viewFunction } from "../passport/src/near.ts";
import { accountFromKey, hasKey, readKey, writeKey } from "../agent/src/keys.ts";
import { KeyPair, type KeyPairString } from "near-api-js";
import { topUpFromFaucet } from "./faucet.ts";
import { nearAmount } from "../passport/src/format.ts";
import { USDC_TESTNET, formatUnits, getAsset, toUnits } from "../passport/src/assets.ts";
import { viewAccount } from "../passport/src/near.ts";

const network = "testnet" as const;

async function main() {
  const [cmd, id] = process.argv.slice(2);
  const dep = loadDeployment(network);
  if (!dep) throw new Error("No deployment.testnet.json. Run npm run setup:testnet first.");
  const owner = accountFromKey(network, "owner");
  const link = (h: string) => `${NETWORKS[network].explorer}/txns/${h}`;

  switch (cmd) {
    case "pending": {
      const ps = await viewFunction<any[]>(network, dep.vault, "get_payments", { from_index: "0", limit: "100" });
      const pending = ps.filter((p) => p.status === "PendingApproval");
      if (!pending.length) console.log("No payments waiting for approval.");
      for (const p of pending) console.log(`#${p.id}  ${nearAmount(p.amount)} ${p.asset} -> ${p.recipient}  report ${p.report_hash.slice(0, 16)}…  memo: ${p.memo ?? ""}`);
      break;
    }
    case "show":
      console.log(JSON.stringify(await viewFunction(network, dep.vault, "get_payment", { payment_id: id }), null, 2));
      break;
    case "approve":
    case "reject": {
      if (!id) throw new Error(`usage: owner ${cmd} <payment id>`);
      const r: any = await owner.callFunctionRaw({ contractId: dep.vault, methodName: cmd, args: { payment_id: id }, gas: 100_000_000_000_000n });
      console.log(`[owner] ${cmd} #${id}: ${link(r.transaction.hash)}`);
      await new Promise((r) => setTimeout(r, 2500));
      const p: any = await viewFunction(network, dep.vault, "get_payment", { payment_id: id });
      console.log(`[owner] payment #${id} status: ${p.status}`);
      break;
    }
    case "topup":
      await topUpFromFaucet(owner.accountId);
      break;
    case "make-public-vaults": {
      // Keys are saved BEFORE each account is created, so a flaky RPC reply can never lose one.
      for (const [name, sub, near, note] of [
        ["vault-factory", "vaults", 4n, "Creates visitor vaults (subaccounts) from the global vault code."],
        ["public-agent", "vault-agent", 2n, "Public demo agent: requests payments from visitor vaults. Holds gas only."],
      ] as const) {
        const aid = `${sub}.${owner.accountId}`;
        if (await viewAccount(network, aid)) {
          console.log(`[owner] ${aid} already exists`);
          continue;
        }
        const kp = hasKey(name) && readKey(name).account_id === aid ? KeyPair.fromString(readKey(name).secret_key as KeyPairString) : KeyPair.fromRandom("ed25519");
        writeKey(name, { account_id: aid, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), note });
        const r: any = await owner.createSubAccount({ accountOrPrefix: aid, publicKey: kp.getPublicKey().toString(), nearToTransfer: near * 10n ** 24n });
        console.log(`[owner] created ${aid} with ${near} NEAR: ${link(r.transaction?.hash ?? "")}`);
      }
      break;
    }
    case "make-sponsor": {
      const sid = `sponsor.${owner.accountId}`;
      if (await viewAccount(network, sid)) {
        console.log(`[owner] ${sid} already exists`);
        break;
      }
      // Save the key BEFORE sending, so a flaky RPC reply can never leave an account whose key we lost.
      const kp = hasKey("sponsor") && readKey("sponsor").account_id === sid ? KeyPair.fromString(readKey("sponsor").secret_key as KeyPairString) : KeyPair.fromRandom("ed25519");
      writeKey("sponsor", { account_id: sid, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), note: "Testnet send-link sponsor: pays USDC storage and claim gas." });
      const r: any = await owner.createSubAccount({ accountOrPrefix: sid, publicKey: kp.getPublicKey().toString(), nearToTransfer: 1_000_000_000_000_000_000_000_000n });
      console.log(`[owner] created ${sid} with 1 NEAR: ${link(r.transaction?.hash ?? r.transaction_outcome?.id ?? "")}`);
      break;
    }
    case "pause":
    case "unpause": {
      const r: any = await owner.callFunctionRaw({ contractId: dep.vault, methodName: "set_paused", args: { paused: cmd === "pause" } });
      console.log(`[owner] ${cmd}d: ${link(r.transaction.hash)}`);
      break;
    }
    case "rotate-agent-key": {
      // A fresh function-call key for the agent (request_payment only) with a bigger gas allowance, then
      // the old key is removed. Run this before lock-vault: after locking, no key can be added again.
      const allowance = id ?? "2";
      if (!/^\d+(\.\d+)?$/.test(allowance) || Number(allowance) <= 0 || Number(allowance) > 5) throw new Error("Allowance in NEAR, more than 0 and at most 5");
      const admin = accountFromKey(network, "vault-admin");
      const old = readKey("agent-fc");
      const kp = KeyPair.fromRandom("ed25519");
      const add: any = await admin.addFunctionCallAccessKey({ publicKey: kp.getPublicKey().toString(), contractId: dep.vault, methodNames: ["request_payment"], allowance: BigInt(toUnits(allowance, { symbol: "NEAR", decimals: 24 } as any)) });
      console.log(`[owner] added agent key ${kp.getPublicKey().toString()} (request_payment only, ${allowance} NEAR gas allowance): ${link(add.transaction.hash)}`);
      writeKey("agent-fc.prev", old);
      writeKey("agent-fc", { account_id: dep.vault, public_key: kp.getPublicKey().toString(), secret_key: kp.toString() as KeyPairString, note: `Function-call key on the vault, method request_payment only, ${allowance} NEAR gas allowance. The only key the agent loads.` });
      const del: any = await admin.deleteKey(old.public_key);
      console.log(`[owner] removed the old agent key ${old.public_key}: ${link(del.transaction.hash)}`);
      break;
    }
    case "lock-vault": {
      const admin = accountFromKey(network, "vault-admin");
      const k = readKey("vault-admin");
      // After this no key can be added, so the agent's gas allowance is all it will ever have.
      const q: any = await fetch(NETWORKS[network].rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_access_key", finality: "final", account_id: dep.vault, public_key: readKey("agent-fc").public_key } }),
      }).then((r) => r.json());
      const left = BigInt(q?.result?.permission?.FunctionCall?.allowance ?? 0);
      if (left < 10n ** 24n) throw new Error(`The agent key has ${nearAmount(left.toString())} NEAR of gas allowance left. Run rotate-agent-key first: after locking, it can't be topped up.`);
      const r: any = await admin.deleteKey(k.public_key);
      console.log(`[owner] deleted vault full-access key ${k.public_key}: ${link(r.transaction.hash)}`);
      console.log("[owner] The vault can now only change through its own contract methods.");
      break;
    }
    case "enable-usdc": {
      const usdc = getAsset(USDC_TESTNET)!;
      const cfg: any = await viewFunction(network, dep.vault, "get_config");
      if (!cfg.caps[USDC_TESTNET]) {
        const r: any = await owner.callFunctionRaw({
          contractId: dep.vault,
          methodName: "set_cap",
          args: { asset: USDC_TESTNET, per_tx: toUnits("50", usdc), daily: toUnits("100", usdc) },
        });
        console.log(`[owner] USDC caps set (50 per payment, 100 per day): ${link(r.transaction.hash)}`);
      } else console.log("[owner] USDC caps already set");
      // The owner too, so the Circle faucet can send USDC to it.
      const accounts = [owner.accountId, dep.vault, dep.accounts?.merchant, dep.accounts?.newShop].filter(Boolean) as string[];
      for (const acct of accounts) {
        const reg = await viewFunction<unknown>(network, USDC_TESTNET, "storage_balance_of", { account_id: acct });
        if (reg) {
          console.log(`[owner] ${acct} already registered with USDC`);
          continue;
        }
        const bounds: any = await viewFunction(network, USDC_TESTNET, "storage_balance_bounds");
        const r: any = await owner.callFunctionRaw({
          contractId: USDC_TESTNET,
          methodName: "storage_deposit",
          args: { account_id: acct, registration_only: true },
          deposit: BigInt(bounds.min),
          gas: 30_000_000_000_000n,
        });
        console.log(`[owner] registered ${acct} with USDC (paid ${nearAmount(bounds.min)} NEAR storage): ${link(r.transaction.hash)}`);
      }
      break;
    }
    case "fund-usdc": {
      const usdc = getAsset(USDC_TESTNET)!;
      if (!id) throw new Error("usage: owner fund-usdc <amount, e.g. 15>");
      const units = toUnits(id, usdc);
      const have = await viewFunction<string>(network, USDC_TESTNET, "ft_balance_of", { account_id: owner.accountId });
      if (BigInt(have) < BigInt(units))
        throw new Error(`Owner has only ${formatUnits(have, usdc)} USDC. Get testnet USDC at ${usdc.faucet} (network: NEAR testnet, address: ${owner.accountId}).`);
      const r: any = await owner.callFunctionRaw({
        contractId: USDC_TESTNET,
        methodName: "ft_transfer",
        args: { receiver_id: dep.vault, amount: units, memo: "fund Notara vault" },
        deposit: 1n,
        gas: 30_000_000_000_000n,
      });
      console.log(`[owner] sent ${id} USDC to the vault: ${link(r.transaction.hash)}`);
      break;
    }
    case "balances": {
      const usdc = getAsset(USDC_TESTNET)!;
      const accounts = [owner.accountId, dep.vault, dep.accounts?.merchant, dep.accounts?.newShop].filter(Boolean) as string[];
      for (const acct of accounts) {
        const [a, bal, reg] = await Promise.all([
          viewAccount(network, acct),
          viewFunction<string>(network, USDC_TESTNET, "ft_balance_of", { account_id: acct }).catch(() => "0"),
          viewFunction<unknown>(network, USDC_TESTNET, "storage_balance_of", { account_id: acct }).catch(() => null),
        ]);
        console.log(`${acct.padEnd(46)} ${nearAmount(a?.amount ?? "0").padStart(12)} NEAR  ${formatUnits(bal, usdc).padStart(10)} USDC  ${reg ? "" : "(not registered for USDC)"}`);
      }
      break;
    }
    default:
      console.log("usage: owner pending | show <id> | approve <id> | reject <id> | pause | unpause | lock-vault | enable-usdc | fund-usdc <amount> | balances");
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
