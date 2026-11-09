#!/usr/bin/env tsx
// One-time TESTNET setup. Idempotent: safe to re-run; finished steps are skipped.
//
// You need one funded testnet account (the human owner). Provide it with:
//   NEAR_OWNER_ACCOUNT=yourname.testnet NEAR_OWNER_PRIVATE_KEY=ed25519:... npm run setup:testnet
// or let the script create one through the public testnet faucet helper:
//   npm run setup:testnet -- --create-owner yourname-notara.testnet
//
// Needs about 7.5 testnet NEAR (contract storage is the bulk of it). Never run against mainnet.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Account, KeyPair, actions, parseNearAmount, type KeyPairString } from "near-api-js";
import { NETWORKS, ROOT, type Deployment } from "../passport/src/config.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { loadSigner } from "../passport/src/verdict.ts";
import { accountFromKey, hasKey, readKey, writeKey } from "../agent/src/keys.ts";
import { topUpFromFaucet } from "./faucet.ts";

const network = "testnet" as const;
const RPC = NETWORKS.testnet.rpc;
const DEP_FILE = join(ROOT, "deployment.testnet.json");
const N = (s: string) => BigInt(parseNearAmount(s as `${number}`)!);
const TGAS = 1_000_000_000_000n;
const log = (s: string) => console.log(s);
/** Vault subaccount prefix. Change it if an earlier run left an unusable `vault.` account. */
const VAULT_PREFIX = process.env.VAULT_PREFIX ?? "vault";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function ensureOwner(): Promise<Account> {
  if (process.env.NEAR_OWNER_ACCOUNT && process.env.NEAR_OWNER_PRIVATE_KEY) {
    const kp = KeyPair.fromString(process.env.NEAR_OWNER_PRIVATE_KEY as KeyPairString);
    writeKey("owner", {
      account_id: process.env.NEAR_OWNER_ACCOUNT,
      public_key: kp.getPublicKey().toString(),
      secret_key: process.env.NEAR_OWNER_PRIVATE_KEY,
      note: "Human owner. Never loaded by the agent.",
    });
  }
  if (!hasKey("owner")) {
    const id = arg("create-owner");
    if (!id) {
      throw new Error(
        "No owner account. Set NEAR_OWNER_ACCOUNT + NEAR_OWNER_PRIVATE_KEY, or pass --create-owner <name>.testnet to use the testnet faucet.",
      );
    }
    if (!id.endsWith(".testnet")) throw new Error("--create-owner must end with .testnet");
    const kp = KeyPair.fromRandom("ed25519");
    log(`Creating ${id} through the testnet faucet helper...`);
    const res = await fetch("https://helper.nearprotocol.com/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newAccountId: id, newAccountPublicKey: kp.getPublicKey().toString() }),
    });
    if (!res.ok) throw new Error(`Faucet helper refused (${res.status}): ${await res.text()}`);
    writeKey("owner", { account_id: id, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), note: "Human owner. Never loaded by the agent." });
    await new Promise((r) => setTimeout(r, 3000));
  }
  return accountFromKey(network, "owner");
}

async function ensureSubaccount(owner: Account, prefix: string, keyName: string, fund: string, note: string): Promise<string> {
  const id = `${prefix}.${owner.accountId}`;
  if (await viewAccount(network, id)) {
    if (!hasKey(keyName)) throw new Error(`${id} exists but keys/${keyName}.json is missing`);
    log(`  = ${id} exists`);
    return id;
  }
  // Reuse a key saved by an earlier interrupted run, otherwise create one and save it BEFORE sending,
  // so a flaky RPC response can never leave an account whose key we don't have.
  const kp = hasKey(keyName) && readKey(keyName).account_id === id
    ? KeyPair.fromString(readKey(keyName).secret_key as KeyPairString)
    : KeyPair.fromRandom("ed25519");
  writeKey(keyName, { account_id: id, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), note });
  try {
    await owner.createSubAccount({ accountOrPrefix: id, publicKey: kp.getPublicKey().toString(), nearToTransfer: N(fund) });
  } catch (e: any) {
    // The RPC sometimes returns an HTML error page after the transaction actually landed.
    await new Promise((r) => setTimeout(r, 4000));
    if (!(await viewAccount(network, id))) throw e;
    log(`  (RPC reply was unreadable, but ${id} exists on-chain; continuing)`);
  }
  log(`  + ${id} (${fund} NEAR)`);
  return id;
}

async function isDeployed(id: string) {
  const v = await viewAccount(network, id);
  return !!v && v.code_hash !== "11111111111111111111111111111111";
}

async function main() {
  log("Notara: testnet setup\n");
  const owner = await ensureOwner();
  if (process.argv.includes("--topup")) await topUpFromFaucet(owner.accountId, log);
  const bal =BigInt((await viewAccount(network, owner.accountId))?.amount ?? "0");
  log(`Owner ${owner.accountId}: ${Number(bal / 10n ** 21n) / 1000} NEAR`);

  const signer = loadSigner(true);
  log(`Notara signer public key: ${signer.getPublicKey().toString()}`);

  const vaultExists = !!(await viewAccount(network, `${VAULT_PREFIX}.${owner.accountId}`));
  if (!vaultExists && bal < N("7.5")) throw new Error("Owner needs at least 7.5 testnet NEAR for first-time setup.");

  log("\nAccounts");
  const vault = await ensureSubaccount(owner, VAULT_PREFIX, "vault-admin", "4.5", "Vault full-access key. Setup/deploy only. Delete with `npm run owner -- lock-vault`.");
  const registry = await ensureSubaccount(owner, "registry", "registry-admin", "2.3", "Registry deploy key.");
  const verifier = await ensureSubaccount(owner, "verifier", "verifier", "0.1", "Registry verifier (demo).");
  const merchant = await ensureSubaccount(owner, "merchant", "merchant", "0.05", "Demo merchant, allowlisted (onboarded vendor).");
  const newShop = await ensureSubaccount(owner, "newshop", "newshop", "0.05", "Demo unknown new shop (expect WARN).");
  const attacker = await ensureSubaccount(owner, "attacker", "attacker", "0.05", "Demo attacker recipient. We control it; it is labeled as attacker for the demo only.");

  log("\nContracts");
  const vaultAdmin = accountFromKey(network, "vault-admin");
  if (!(await isDeployed(vault))) {
    const code = readFileSync(join(ROOT, "contracts", "res", "vault.wasm"));
    await vaultAdmin.signAndSendTransaction({
      receiverId: vault,
      actions: [
        actions.deployContract(code),
        actions.functionCall(
          "new",
          {
            owner: owner.accountId,
            agent: vault, // the agent acts as the vault account through its function-call key
            signer_public_key: signer.getPublicKey().toString(),
            near_per_tx_cap: N("1").toString(),
            near_daily_cap: N("2").toString(),
          },
          30n * TGAS,
          0n,
        ),
      ],
    });
    log(`  + vault deployed to ${vault} (per-tx cap 1 NEAR, daily cap 2 NEAR)`);
  } else log(`  = vault already deployed at ${vault}`);

  const registryAdmin = accountFromKey(network, "registry-admin");
  if (!(await isDeployed(registry))) {
    const code = readFileSync(join(ROOT, "contracts", "res", "registry.wasm"));
    await registryAdmin.signAndSendTransaction({
      receiverId: registry,
      actions: [actions.deployContract(code), actions.functionCall("new", { owner: owner.accountId }, 30n * TGAS, 0n)],
    });
    log(`  + registry deployed to ${registry}`);
  } else log(`  = registry already deployed at ${registry}`);

  if (!(await viewFunction<boolean>(network, registry, "is_verifier", { account_id: verifier }))) {
    await owner.callFunction({ contractId: registry, methodName: "add_verifier", args: { account_id: verifier } });
    log(`  + ${verifier} appointed registry verifier`);
  }

  log("\nAgent key");
  if (!hasKey("agent-fc")) {
    const kp = KeyPair.fromRandom("ed25519");
    await vaultAdmin.addFunctionCallAccessKey({
      publicKey: kp.getPublicKey().toString(),
      contractId: vault,
      methodNames: ["request_payment"],
      allowance: N("0.5"),
    });
    writeKey("agent-fc", {
      account_id: vault,
      public_key: kp.getPublicKey().toString(),
      secret_key: kp.toString(),
      note: "Function-call key on the vault, method request_payment only, 0.5 NEAR gas allowance. The only key the agent loads.",
    });
    log(`  + function-call key ${kp.getPublicKey().toString()} on ${vault}: request_payment only, 0.5 NEAR gas allowance`);
  } else log(`  = agent key exists (${readKey("agent-fc").public_key})`);

  log("\nSeed data (DEMO FIXTURE, labeled on-chain with is_fixture=true)");
  const reports = await viewFunction<any[]>(network, registry, "get_reports_for", { subject: attacker });
  if (reports.length === 0) {
    const r: any = await owner.callFunctionRaw({
      contractId: registry,
      methodName: "submit_report",
      args: {
        subject: attacker,
        category: "Scam",
        description: "[DEMO FIXTURE] Sends fake 'overdue invoice' instructions to AI agents, asking for payment to this account.",
        evidence_uri: "fixture://scripts/setup-testnet.ts (seeded demo data, no real incident)",
        evidence_hash: null,
        is_fixture: true,
      },
      deposit: N("0.01"),
      gas: 30n * TGAS,
    });
    const id = JSON.parse(Buffer.from(r.status.SuccessValue, "base64").toString());
    const verifierAcct = accountFromKey(network, "verifier");
    await verifierAcct.callFunction({
      contractId: registry,
      methodName: "set_status",
      args: { report_id: id, status: "Verified", note: "DEMO FIXTURE: verified by the setup script, not by an independent investigation." },
    });
    log(`  + report #${id} on ${attacker}: Scam, Verified (fixture)`);
  } else log(`  = ${reports.length} report(s) already on ${attacker}`);

  const dep: Deployment = {
    network,
    vault,
    registry,
    owner: owner.accountId,
    verifier,
    accounts: { merchant, newShop, attacker },
    allowlist: [merchant],
  };
  writeFileSync(DEP_FILE, JSON.stringify(dep, null, 2));
  log(`\nWrote ${DEP_FILE}`);
  log(`Explorer: ${NETWORKS.testnet.explorer}/address/${vault}`);
  log(`\nNext: npm run demo`);
  log(`For USDC invoices: npm run owner -- enable-usdc, get testnet USDC at https://faucet.circle.com, then npm run owner -- fund-usdc 15`);
}

main().catch((e) => {
  console.error(`\nSetup failed: ${e?.message ?? e}`);
  process.exit(1);
});
