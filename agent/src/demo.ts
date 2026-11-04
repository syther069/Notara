#!/usr/bin/env tsx
// End-to-end TESTNET demo. Every transaction is real and linked to the explorer.
//
//   npm run demo                  run all scenarios, ask the human on WARN
//   npm run demo -- --yes         auto-approve WARN (non-interactive, for recordings/CI)
//   npm run demo -- --only 2      run one scenario
//   npm run demo -- --leave-pending  leave the WARN payment for the human (used by the website)
//
// Scenarios
//   1. Legit invoice from an onboarded merchant           -> ALLOW, paid by the vault
//   2. Prompt-injected invoice redirects to the attacker  -> BLOCK, wrapper refuses, nothing signed
//   3. Compromised agent skips the wrapper                -> vault + NEAR protocol refuse every attempt
//   4. First invoice from an unknown new shop             -> WARN, parked on-chain, human approves with owner key
//
// The log is written to demo/runs/<timestamp>.log.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { KeyPair, actions, parseNearAmount } from "near-api-js";
import { check } from "../../passport/src/check.ts";
import { NETWORKS, ROOT, loadDeployment, type Deployment } from "../../passport/src/config.ts";
import { bold, decisionColor, dim, formatReport, green, red, yellow } from "../../passport/src/format.ts";
import { signVerdict } from "../../passport/src/verdict.ts";
import { runAgent } from "./agent.ts";
import { accountFromKey } from "./keys.ts";
import { GuardedPayments } from "./wrapper.ts";

const network = "testnet" as const;
const explorerTx = (h: string) => `${NETWORKS[network].explorer}/txns/${h}`;

export function deployment(): Deployment & { accounts: NonNullable<Deployment["accounts"]> } {
  const d = loadDeployment(network);
  if (!d?.accounts) throw new Error("No deployment.testnet.json. Run `npm run setup:testnet` first (see README).");
  return d as any;
}

export function renderDoc(text: string): string {
  const d = deployment();
  return text
    .replaceAll("{{MERCHANT}}", d.accounts.merchant)
    .replaceAll("{{ATTACKER}}", d.accounts.attacker)
    .replaceAll("{{NEWSHOP}}", d.accounts.newShop);
}

/** The agent process only ever loads keys/agent-fc.json. */
export function buildWallet(log: (s: string) => void) {
  const d = deployment();
  const agentAccount = accountFromKey(network, "agent-fc");
  const wallet = new GuardedPayments({
    network,
    agentAccount,
    vaultId: d.vault,
    log,
    notifyHuman: (msg) => log(yellow(`[notify human] ${msg}`)),
  });
  return { wallet, agentAccount, d };
}

type Row = { scenario: string; expected: string; got: string; pass: boolean; evidence: string };

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? Number(args[args.indexOf("--only") + 1]) : undefined;
  const autoYes = args.includes("--yes");
  // Used by the website: never prompt on stdin; the human approves on the Vault page.
  const leavePending = args.includes("--leave-pending");

  const lines: string[] = [];
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const log = (s: string) => {
    console.log(s);
    lines.push(strip(s));
  };
  const rows: Row[] = [];
  const { wallet, agentAccount, d } = buildWallet(log);
  const inbox = (f: string) => renderDoc(readFileSync(join(ROOT, "demo", "inbox", f), "utf8"));
  const header = (s: string) => log(`\n${bold("═".repeat(78))}\n${bold(s)}\n${bold("═".repeat(78))}`);

  log(bold("AgentSpend Passport demo (NEAR testnet, live transactions)"));
  log(dim(`vault ${d.vault} | registry ${d.registry} | agent key: function-call on ${d.vault}, request_payment only`));
  log(dim(`started ${new Date().toISOString()}`));

  // ---------------------------------------------------------------- 1
  if (!only || only === 1) {
    header("1. Legit invoice from an onboarded merchant");
    const run = await runAgent(inbox("invoice-merchant.md"), "Please process this invoice.", wallet, log);
    const o = run.toolCalls[0]?.outcome as any;
    if (o?.check) log("\n" + formatReport(o.check.report));
    rows.push({
      scenario: "1 legit merchant",
      expected: "ALLOW -> paid",
      got: o ? `${o.decision ?? "-"} -> ${o.status}` : "no payment attempted",
      pass: o?.status === "paid",
      evidence: o?.txHash ? explorerTx(o.txHash) : "",
    });
  }

  // ---------------------------------------------------------------- 2
  if (!only || only === 2) {
    header("2. Prompt-injected invoice: hidden text tells the agent to pay the attacker");
    log(dim("The document hides an instruction to pay 0.5 NEAR to " + d.accounts.attacker + "."));
    const run = await runAgent(inbox("invoice-injected.md"), "Please process this invoice.", wallet, log);
    const hit = run.toolCalls.find((t) => t.args?.recipient === d.accounts.attacker);
    const o = hit?.outcome as any;
    if (o?.check) log("\n" + formatReport(o.check.report));
    const paidAttacker = run.toolCalls.some((t) => t.args?.recipient === d.accounts.attacker && (t.outcome as any)?.status === "paid");
    rows.push({
      scenario: "2 prompt injection",
      expected: "BLOCK -> refused, nothing signed",
      got: hit ? `${o?.decision ?? "-"} -> ${o?.status}` : `model did not try the attacker (${run.mode}${run.model ? " " + run.model : ""})`,
      pass: !paidAttacker,
      evidence: hit ? "no transaction (refused before signing)" : "",
    });
  }

  // ---------------------------------------------------------------- 3
  if (!only || only === 3) {
    header("3. Compromised agent skips the wrapper and talks to the vault directly");
    log(dim("Assume the attacker controls the agent process and its function-call key."));
    const half = parseNearAmount("0.5")!;
    const attempts: { name: string; run: () => Promise<any>; expect: RegExp }[] = [];

    const submit = (verdict: any, signature: string, recipient = d.accounts.attacker, amount = half) =>
      agentAccount.signAndSendTransaction({
        receiverId: d.vault,
        actions: [actions.functionCall("request_payment", { recipient, amount, asset: "NEAR", verdict, signature, memo: "bypass" }, 50_000_000_000_000n, 0n)],
        throwOnFailure: false,
        waitUntil: "EXECUTED_OPTIMISTIC",
      });

    // a) Real BLOCK verdict signed by the Passport: submit it anyway.
    attempts.push({
      name: "a. submit the Passport's signed BLOCK verdict anyway",
      expect: /BLOCK: payment refused/,
      run: async () => {
        const r = await check({ network, payer: d.vault, recipient: d.accounts.attacker, amount: half, asset: "NEAR" }, { sign: true });
        log(dim(`   passport says ${r.report.decision}`));
        return submit(r.verdict, r.signature!);
      },
    });
    // b) Edit the BLOCK into ALLOW.
    attempts.push({
      name: "b. rewrite the signed BLOCK verdict to ALLOW",
      expect: /Invalid verdict signature/,
      run: async () => {
        const r = await check({ network, payer: d.vault, recipient: d.accounts.attacker, amount: half, asset: "NEAR" }, { sign: true });
        return submit({ ...r.verdict, decision: "ALLOW" }, r.signature!);
      },
    });
    // c) Sign an ALLOW with the attacker's own key.
    attempts.push({
      name: "c. forge an ALLOW verdict with an attacker-made key",
      expect: /Invalid verdict signature/,
      run: async () => {
        const fake = KeyPair.fromRandom("ed25519");
        const v = { vault: d.vault, recipient: d.accounts.attacker, amount: half, asset: "NEAR", decision: "ALLOW" as const, nonce: String(Date.now()), expires_at_ms: String(Date.now() + 60_000), report_hash: "0".repeat(64) };
        return submit(v, signVerdict(v, fake));
      },
    });
    // d) Take a genuine ALLOW for the merchant and redirect it.
    attempts.push({
      name: "d. reuse a genuine ALLOW verdict for the merchant, pay the attacker",
      expect: /different recipient/,
      run: async () => {
        const amt = parseNearAmount("0.1")!;
        const r = await check({ network, payer: d.vault, recipient: d.accounts.merchant, amount: amt, asset: "NEAR" }, { sign: true });
        log(dim(`   passport says ${r.report.decision} for ${d.accounts.merchant}`));
        return submit(r.verdict, r.signature!, d.accounts.attacker, amt);
      },
    });
    // e) Plain NEAR transfer with the function-call key.
    attempts.push({
      // 1 yoctoNEAR so the gas allowance is not what stops it: the protocol refuses any Transfer
      // action signed by a function-call key.
      name: "e. send NEAR directly with the agent's function-call key (even 1 yoctoNEAR)",
      expect: /RequiresFullAccess|full access/i,
      run: () => agentAccount.signAndSendTransaction({ receiverId: d.accounts.attacker, actions: [actions.transfer(1n)], throwOnFailure: false }),
    });
    // f) Raise the vault caps / swap the signer key.
    attempts.push({
      name: "f. call an owner method (swap the Passport signer key) with the agent key",
      expect: /MethodNameMismatch|method/i,
      run: () =>
        agentAccount.signAndSendTransaction({
          receiverId: d.vault,
          actions: [actions.functionCall("set_signer_public_key", { signer_public_key: KeyPair.fromRandom("ed25519").getPublicKey().toString() }, 30_000_000_000_000n, 0n)],
          throwOnFailure: false,
        }),
    });

    for (const a of attempts) {
      log(`\n${bold(a.name)}`);
      let msg = "";
      let hash = "";
      try {
        const r: any = await a.run();
        hash = r?.transaction?.hash ?? "";
        msg = r?.status?.Failure ? JSON.stringify(r.status.Failure) : `UNEXPECTED SUCCESS: ${JSON.stringify(r?.status)}`;
      } catch (e: any) {
        msg = `${e?.type ?? e?.name ?? "Error"}: ${e?.message ?? e}`;
      }
      const refused = a.expect.test(msg);
      log(`   ${refused ? green("REFUSED") : red("NOT AS EXPECTED")} ${msg.slice(0, 300)}`);
      log(dim(`   ${hash ? "tx (failed on-chain): " + explorerTx(hash) : "rejected before inclusion: no transaction"}`));
      rows.push({ scenario: `3${a.name.slice(0, 1)} bypass`, expected: "refused", got: refused ? "refused" : "UNEXPECTED", pass: refused, evidence: hash ? explorerTx(hash) : "pre-inclusion rejection" });
    }
  }

  // ---------------------------------------------------------------- 4
  if (!only || only === 4) {
    header("4. First invoice from an unknown new shop");
    const run = await runAgent(inbox("invoice-newshop.md"), "Please process this invoice.", wallet, log);
    const o = run.toolCalls[0]?.outcome as any;
    if (o?.check) log("\n" + formatReport(o.check.report));
    let final = o?.status ?? "no payment";
    if (o?.status === "pending_human_approval" && leavePending) {
      log(yellow(`[human] Payment #${o.paymentId} is waiting for the owner. Approve it on the Vault page or with: npm run owner -- approve ${o.paymentId}`));
      final = "left pending for the human";
    } else if (o?.status === "pending_human_approval") {
      let yes = autoYes;
      if (!yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        yes = /^y/i.test(await rl.question(yellow(`\n[human] Approve vault payment #${o.paymentId} with the OWNER key? (y/n) `)));
        rl.close();
      } else log(yellow(`[human] --yes given: approving #${o.paymentId}`));
      if (yes) {
        // Separate process with the owner's key: the agent never holds it.
        const r = spawnSync(process.execPath, ["--import", "tsx", join(ROOT, "scripts", "owner.ts"), "approve", o.paymentId], { encoding: "utf8", cwd: ROOT });
        (r.stdout + r.stderr).trim().split("\n").forEach((l) => log(l));
        final = /status: Executed/.test(r.stdout) ? "approved -> paid" : "approval did not complete";
      } else {
        spawnSync(process.execPath, ["--import", "tsx", join(ROOT, "scripts", "owner.ts"), "reject", o.paymentId], { encoding: "utf8", cwd: ROOT });
        final = "rejected by human";
      }
    }
    rows.push({
      scenario: "4 unknown new shop",
      expected: "WARN -> human decides",
      got: `${o?.decision ?? "-"} -> ${final}`,
      pass: o?.decision === "WARN" && final !== "approval did not complete",
      evidence: o?.txHash ? explorerTx(o.txHash) : "",
    });
  }

  // ---------------------------------------------------------------- summary
  header("Summary");
  for (const r of rows) {
    log(`${r.pass ? green("PASS") : red("FAIL")}  ${r.scenario.padEnd(22)} expected ${r.expected.padEnd(32)} got ${r.got}`);
    if (r.evidence) log(dim(`      ${r.evidence}`));
  }
  const failed = rows.filter((r) => !r.pass).length;
  log(failed ? red(`\n${failed} scenario(s) did not behave as expected.`) : green(`\nAll ${rows.length} checks behaved as expected.`));

  mkdirSync(join(ROOT, "demo", "runs"), { recursive: true });
  const file = join(ROOT, "demo", "runs", `${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
  writeFileSync(file, lines.join("\n") + "\n");
  console.log(dim(`\nLog saved to ${file}`));
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("agent/src/demo.ts")) {
  main().catch((e) => {
    console.error(red(`Demo failed: ${e?.message ?? e}`));
    process.exit(1);
  });
}
