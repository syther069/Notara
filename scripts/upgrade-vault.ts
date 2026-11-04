#!/usr/bin/env tsx
// TESTNET: redeploy new vault code over the existing vault, keeping its state.
// Only works while keys/vault-admin.json still has full access (before `owner -- lock-vault`).
// Safe only for changes that keep the stored state layout (no new fields in the Vault struct).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actions } from "near-api-js";
import { ROOT, loadDeployment } from "../passport/src/config.ts";
import { viewFunction } from "../passport/src/near.ts";
import { accountFromKey } from "../agent/src/keys.ts";

const dep = loadDeployment("testnet");
if (!dep) throw new Error("No deployment.testnet.json");

const before = await viewFunction<any[]>("testnet", dep.vault, "get_payments", { from_index: "0", limit: "100" });
const admin = accountFromKey("testnet", "vault-admin");
const code = readFileSync(join(ROOT, "contracts", "res", "vault.wasm"));
const r: any = await admin.signAndSendTransaction({ receiverId: dep.vault, actions: [actions.deployContract(code)] });
console.log(`Upgraded ${dep.vault}: https://testnet.nearblocks.io/txns/${r.transaction.hash}`);

await new Promise((res) => setTimeout(res, 3000));
const after = await viewFunction<any[]>("testnet", dep.vault, "get_payments", { from_index: "0", limit: "100" });
const cfg = await viewFunction<any>("testnet", dep.vault, "get_config");
const pending = await viewFunction<string | null>("testnet", dep.vault, "get_pending_owner");
console.log(`State check: ${before.length} payments before, ${after.length} after; owner ${cfg.owner}; pending owner ${pending ?? "none"}`);
if (before.length !== after.length) throw new Error("Payment count changed after upgrade");
