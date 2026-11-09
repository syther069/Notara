#!/usr/bin/env tsx
// MAINNET: deploy the shared report registry (no vault, no funds held). Costs about 1.7 real NEAR,
// mostly contract storage (153 KB wasm at 0.01 NEAR per KB). Build first: bash scripts/deploy-contracts.sh --build. Run only after the project owner approves:
//
//   NEAR_MAINNET_OWNER=you.near NEAR_MAINNET_OWNER_KEY=ed25519:... npx tsx scripts/setup-mainnet-registry.ts --yes
//
// Creates registry.<owner>, deploys contracts/res/registry.wasm, sets the owner as a verifier,
// and writes deployment.mainnet.json so mainnet checks read real reports.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Account, KeyPair, actions, type KeyPairString } from "near-api-js";
import { NETWORKS, ROOT } from "../passport/src/config.ts";
import { viewAccount } from "../passport/src/near.ts";
import { writeKey } from "../agent/src/keys.ts";

const ownerId = process.env.NEAR_MAINNET_OWNER;
const ownerKey = process.env.NEAR_MAINNET_OWNER_KEY;
if (!ownerId || !ownerKey) throw new Error("Set NEAR_MAINNET_OWNER and NEAR_MAINNET_OWNER_KEY");
if (!process.argv.includes("--yes")) throw new Error("This spends real NEAR. Re-run with --yes once approved.");

const owner = new Account(ownerId, NETWORKS.mainnet.rpc, ownerKey as KeyPairString);
const registry = `registry.${ownerId}`;
const TGAS = 1_000_000_000_000n;

if (!(await viewAccount("mainnet", registry))) {
  const kp = KeyPair.fromRandom("ed25519");
  // Key saved before sending, so a flaky RPC reply can't leave an account we can't control.
  writeKey("mainnet-registry-admin", { account_id: registry, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), note: "Mainnet registry deploy key." });
  await owner.createSubAccount({ accountOrPrefix: registry, publicKey: kp.getPublicKey().toString(), nearToTransfer: 1_700_000_000_000_000_000_000_000n });
  const admin = new Account(registry, NETWORKS.mainnet.rpc, kp.toString() as KeyPairString);
  await admin.signAndSendTransaction({
    receiverId: registry,
    actions: [actions.deployContract(readFileSync(join(ROOT, "contracts", "res", "registry.wasm"))), actions.functionCall("new", { owner: ownerId }, 30n * TGAS, 0n)],
  });
  await owner.callFunction({ contractId: registry, methodName: "add_verifier", args: { account_id: ownerId } });
  console.log(`Deployed ${registry}`);
} else console.log(`${registry} already exists`);

writeFileSync(join(ROOT, "deployment.mainnet.json"), JSON.stringify({ network: "mainnet", registry, owner: ownerId, vault: "" }, null, 2));
console.log("Wrote deployment.mainnet.json (mainnet has a registry only; vault stays empty on purpose)");
