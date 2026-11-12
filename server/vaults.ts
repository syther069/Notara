// Visitor vaults: anyone with a NEAR testnet wallet gets their own spending vault and can watch the
// AI agent pay (or fail to pay) from it.
//
// - The vault code is published once as a NEAR global contract by code hash (immutable), so a new
//   vault costs only its account and state (~0.03 NEAR), not 2 NEAR of code storage.
// - The factory creates <hash>.vaults.<owner> in one transaction: create account, small transfer,
//   use the global code, init with the visitor's wallet as owner. No access key is added, so nobody,
//   including us, can sign as the vault: it moves money only through its own contract rules.
// - A public agent account (gas only) requests payments; verdicts are signed in-process by Notara.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Account, KeyPair, actions, baseDecode, parseNearAmount, type KeyPairString } from "near-api-js";
import { NETWORKS, ROOT, loadDeployment } from "../passport/src/config.ts";
import { viewAccount } from "../passport/src/near.ts";
import { check } from "../passport/src/check.ts";
import { loadSigner, signVerdict } from "../passport/src/verdict.ts";
import { hasKey, readKey } from "../agent/src/keys.ts";
import { GuardedPayments } from "../agent/src/wrapper.ts";
import { runAgent } from "../agent/src/agent.ts";
import { verifySigned } from "./nep413.ts";
import { docs } from "./db.ts";
import { SIGN_RECIPIENT, freshNonce } from "./merchants.ts";

/** sha256 of contracts/res/vault.wasm (base58), published with `near contract deploy-as-global ... as-global-hash`. */
export const VAULT_CODE_HASH = "AjewPGjjqqFwDYD6GnYrKkkH7UyNmhBHgJ5M2r4sehCm";
export const VAULT_STORAGE_NEAR = parseNearAmount("0.03")!; // account + vault state; the visitor funds payments
export const MAX_VAULTS_PER_DAY = 50; // global cap: bounds what the factory can spend in a day
const RUN_GAP_MS = 15_000; // one agent run per vault at a time, roughly

const net = "testnet" as const;
const rpc = NETWORKS[net].rpc;

/** Env vars on Vercel, keys/*.json locally (`npm run owner -- make-public-vaults`). */
function keyed(envPrefix: string, keyName: string): Account {
  let id = process.env[`${envPrefix}_ACCOUNT`];
  let key = process.env[`${envPrefix}_PRIVATE_KEY`];
  if ((!id || !key) && hasKey(keyName)) ({ account_id: id, secret_key: key } = readKey(keyName));
  if (!id || !key) throw new Error(`Visitor vaults need ${envPrefix}_ACCOUNT and ${envPrefix}_PRIVATE_KEY`);
  return new Account(id, rpc, key as KeyPairString);
}
const factory = () => keyed("VAULT_FACTORY", "vault-factory");
const agent = () => keyed("DEMO_AGENT", "public-agent");

export const isAccountId = (id: string) => /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(id) && id.length >= 2 && id.length <= 64;
/** One vault per owner, named from a hash so any account id fits under the 64-character limit. */
export const vaultIdFor = (owner: string, factoryId = factory().accountId) => `v${createHash("sha256").update(owner).digest("hex").slice(0, 16)}.${factoryId}`;
/** Is this one of our visitor vaults? (Vault pages accept only these or the main demo vault.) */
export const isVisitorVault = (id: string) => {
  try {
    return id.endsWith(`.${factory().accountId}`) && /^v[0-9a-f]{16}\./.test(id);
  } catch {
    return false;
  }
};

const store = docs<{ owner: string; vault: string; createdAt: string; lastRunAt?: string }>("vaults");

/** What the owner's wallet signs (NEP-413) to create or use their vault. One signature is good for 10 minutes. */
export const vaultMessage = (owner: string) => `Notara: use my vault\nOwner: ${owner}`;
export const PROOF_MAX_AGE_MS = 10 * 60_000;

/**
 * Proves the caller controls `owner`: a fresh NEP-413 signature by one of the owner's full-access keys.
 * Without it anyone could run the agent on someone else's vault, or use up the daily vault limit.
 */
export async function verifyOwnerProof(proof: unknown, owner: string): Promise<void> {
  if (typeof proof !== "string" || !proof) throw new Error("Sign with your wallet to use your vault");
  const r = await verifySigned(proof, { expectedRecipient: SIGN_RECIPIENT, expectedMessage: vaultMessage(owner), validateNonce: freshNonce(PROOF_MAX_AGE_MS) }, "testnet").catch((e) => {
    throw new Error(`Your wallet signature didn't check out: ${e.message}`);
  });
  if (r.accountId !== owner) throw new Error(`Signed by ${r.accountId}, not ${owner}`);
}

export async function getVisitorVault(owner: string) {
  if (!isAccountId(owner)) throw new Error("Enter a NEAR testnet account");
  const vault = vaultIdFor(owner);
  const acct = await viewAccount(net, vault).catch(() => undefined);
  return { owner, vault, exists: !!acct, balance: acct?.amount ?? "0", message: vaultMessage(owner) };
}

export async function createVisitorVault(owner: string, proof: unknown) {
  const cur = await getVisitorVault(owner);
  if (cur.exists) return cur;
  if (!owner.endsWith(".testnet") && !/^[0-9a-f]{64}$/.test(owner)) throw new Error("Use your NEAR testnet account (yourname.testnet)");
  await verifyOwnerProof(proof, owner); // only real owners count toward the daily limit
  if (!(await viewAccount(net, owner).catch(() => undefined))) throw new Error(`${owner} doesn't exist on NEAR testnet`);
  const today = new Date().toISOString().slice(0, 10);
  if ((await store.all()).filter((v) => v.createdAt.startsWith(today)).length >= MAX_VAULTS_PER_DAY) throw new Error("Daily limit for new vaults reached. Try again tomorrow.");
  const signer = loadSigner();
  const r: any = await factory().signAndSendTransaction({
    receiverId: cur.vault,
    actions: [
      actions.createAccount(),
      actions.transfer(BigInt(VAULT_STORAGE_NEAR)),
      actions.useGlobalContract({ codeHash: baseDecode(VAULT_CODE_HASH) }), // 32 raw bytes, not the base58 text
      actions.functionCall(
        "new",
        { owner, agent: agent().accountId, signer_public_key: signer.getPublicKey().toString(), near_per_tx_cap: parseNearAmount("0.5"), near_daily_cap: parseNearAmount("1") },
        30_000_000_000_000n,
        0n,
      ),
    ],
    waitUntil: "FINAL" as any,
  });
  await store.insert(owner, new Date().toISOString(), { owner, vault: cur.vault, createdAt: new Date().toISOString() });
  return { ...cur, exists: true, tx: r.transaction.hash };
}

export const SCENARIOS = ["legit", "injected", "new-shop", "tamper"] as const;
export type Scenario = (typeof SCENARIOS)[number];

/** Runs one agent scenario against the visitor's own vault. Returns the log lines and what happened. */
export async function runVisitorScenario(owner: string, scenario: Scenario, proof: unknown) {
  const v = await getVisitorVault(owner);
  if (!v.exists) throw new Error("Create your vault first");
  await verifyOwnerProof(proof, owner); // the agent spends from this vault, so only its owner may start it
  const rec = await store.get(owner);
  if (rec?.lastRunAt && Date.now() - Date.parse(rec.lastRunAt) < RUN_GAP_MS) throw new Error("One run at a time: try again in a few seconds");
  const now = new Date().toISOString();
  // A vault made outside this database (or whose row failed to save) gets a row now, so the gap always applies.
  if (rec) await store.merge(owner, { lastRunAt: now });
  else await store.put(owner, now, { owner, vault: v.vault, createdAt: now, lastRunAt: now });

  const d = loadDeployment(net);
  if (!d?.accounts) throw new Error("Demo accounts are missing");
  const lines: string[] = [];
  const log = (s: string) => lines.push(s.replace(/\x1b\[[0-9;]*m/g, ""));
  const agentAccount = agent();
  // Notara signs here, in-process. The public /v1/check endpoint never signs.
  const checker = (req: any) => check(req, { sign: true });
  const wallet = new GuardedPayments({ network: net, agentAccount, vaultId: v.vault, log, checker, notifyHuman: (m) => void log(`[waiting for you] ${m}`) });
  const inbox = (f: string) =>
    readFileSync(join(ROOT, "demo", "inbox", f), "utf8").replaceAll("{{MERCHANT}}", d.accounts!.merchant).replaceAll("{{ATTACKER}}", d.accounts!.attacker).replaceAll("{{NEWSHOP}}", d.accounts!.newShop);

  if (scenario !== "tamper") {
    const file = { legit: "invoice-merchant.md", injected: "invoice-injected.md", "new-shop": "invoice-newshop.md" }[scenario];
    // Scripted agent = the worst case: it does whatever the document says, hidden text included.
    const run = await runAgent(inbox(file), "Please process this invoice.", wallet, log, { forceScripted: true });
    const calls = run.toolCalls.map((t: any) => ({ recipient: t.args?.recipient, amount: t.args?.amount, decision: t.outcome?.decision, status: t.outcome?.status, txHash: t.outcome?.txHash, paymentId: t.outcome?.paymentId }));
    return { vault: v.vault, scenario, calls, log: lines };
  }

  // Hacked agent: skips the wrapper and talks to the vault directly. The vault must refuse each one.
  const half = parseNearAmount("0.5")!;
  const submit = (verdict: any, signature: string, recipient = d.accounts!.attacker, amount = half) =>
    agentAccount.signAndSendTransaction({
      receiverId: v.vault,
      actions: [actions.functionCall("request_payment", { recipient, amount, asset: "NEAR", verdict, signature, memo: "bypass" }, 50_000_000_000_000n, 0n)],
      throwOnFailure: false,
      waitUntil: "EXECUTED_OPTIMISTIC" as any,
    });
  const signed = (recipient: string, amount: string) => check({ network: net, payer: v.vault, recipient, amount, asset: "NEAR" }, { sign: true });
  const attempts: [string, () => Promise<any>][] = [
    ["submit Notara's signed BLOCK verdict anyway", async () => { const r: any = await signed(d.accounts!.attacker, half); return submit(r.verdict, r.signature); }],
    ["rewrite the signed BLOCK verdict to ALLOW", async () => { const r: any = await signed(d.accounts!.attacker, half); return submit({ ...r.verdict, decision: "ALLOW" }, r.signature); }],
    ["forge an ALLOW verdict with its own key", async () => {
      const vd = { vault: v.vault, recipient: d.accounts!.attacker, amount: half, asset: "NEAR", decision: "ALLOW", nonce: String(Date.now()), expires_at_ms: String(Date.now() + 60_000), report_hash: "0".repeat(64) };
      return submit(vd, signVerdict(vd as any, KeyPair.fromRandom("ed25519")));
    }],
    ["reuse the merchant's ALLOW to pay the attacker", async () => { const amt = parseNearAmount("0.1")!; const r: any = await signed(d.accounts!.merchant, amt); return submit(r.verdict, r.signature, d.accounts!.attacker, amt); }],
  ];
  const calls = [];
  for (const [name, run] of attempts) {
    const r: any = await run().catch((e: any) => ({ error: e.message }));
    const failure = r?.status?.Failure ?? r?.receipts_outcome?.map((o: any) => o.outcome?.status?.Failure).find(Boolean);
    const why = r?.error ?? (failure ? JSON.stringify(failure).match(/"(?:ExecutionError|panic_msg|kind)"\s*:\s*"([^"]+)"/)?.[1] ?? "refused" : "");
    log(`${name}: ${failure || r?.error ? `refused (${why})` : "NOT REFUSED"}`);
    calls.push({ attempt: name, refused: !!(failure || r?.error), reason: why, txHash: r?.transaction?.hash });
  }
  return { vault: v.vault, scenario, calls, log: lines };
}
