#!/usr/bin/env tsx
// TESTNET: redeploy new contract code over a deployed contract, keeping its state.
//   npx tsx scripts/upgrade-contract.ts vault
//   npx tsx scripts/upgrade-contract.ts registry
// Needs that contract's full-access key (the vault's is gone after `owner -- lock-vault`).
// Safe only for changes that keep the stored state layout (no new fields in the contract struct).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actions } from "near-api-js";
import { ROOT, loadDeployment } from "../passport/src/config.ts";
import { rpcQuery, viewFunction } from "../passport/src/near.ts";
import { accountFromKey } from "../agent/src/keys.ts";

const which = process.argv[2];
if (which !== "vault" && which !== "registry") throw new Error("usage: upgrade-contract.ts vault|registry");
const dep = loadDeployment("testnet");
if (!dep) throw new Error("No deployment.testnet.json");
const contract = dep[which];

// Reads a record count, so we can see that the existing state survived.
const count = async () =>
  which === "vault"
    ? (await viewFunction<any[]>("testnet", contract, "get_payments", { from_index: "0", limit: "100" })).length
    : Number(await viewFunction<string>("testnet", contract, "get_report_count"));

const before = await count();
const hashBefore = (await rpcQuery("testnet", { request_type: "view_account", account_id: contract })).code_hash;
const admin = accountFromKey("testnet", which === "vault" ? "vault-admin" : "registry-admin");
const r: any = await admin.signAndSendTransaction({
  receiverId: contract,
  actions: [actions.deployContract(readFileSync(join(ROOT, "contracts", "res", `${which}.wasm`)))],
});
console.log(`Upgraded ${contract}: https://testnet.nearblocks.io/txns/${r.transaction.hash}`);

await new Promise((res) => setTimeout(res, 3000));
const after = await count();
const hashAfter = (await rpcQuery("testnet", { request_type: "view_account", account_id: contract })).code_hash;
console.log(`State check: ${before} records before, ${after} after; code changed: ${hashBefore !== hashAfter}`);
if (before !== after) throw new Error("Record count changed after upgrade");
