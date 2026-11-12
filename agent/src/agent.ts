// An accounts-payable agent. It reads a document (an invoice from the inbox) and pays it.
// The document is UNTRUSTED. An injected instruction in it can make the model call pay() on an
// attacker's account. This is the attack Notara + vault are meant to stop.
//
// LLM: any OpenAI-compatible chat API. Default is NEAR AI Cloud (https://cloud-api.near.ai/v1).
//   AGENT_LLM_API_KEY=...            (or NEAR_AI_API_KEY)
//   AGENT_LLM_BASE_URL=...           default https://cloud-api.near.ai/v1
//   AGENT_LLM_MODEL=...              default on NEAR AI Cloud: Qwen/Qwen3.8-27B (TEE-hosted); elsewhere the first model from GET /models
// On NEAR AI Cloud the model's TEE attestation is checked first (attest.ts), and when it verifies,
// every reply's TEE signature is checked too. The results are in the log and in AgentRun.tee.
// Without a key the agent runs in SCRIPTED mode: a deterministic stand-in that obeys the
// injected instruction (the worst-case model). Every log line says which mode ran.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseNearAmount } from "near-api-js";
import { ROOT } from "../../passport/src/config.ts";
import type { GuardedPayments, PayOutcome } from "./wrapper.ts";
import { NEAR_AI_CLOUD, attestModel, formatAttestation, verifyReply, type Check, type ModelAttestation } from "./attest.ts";

// Load secrets from C:\near\.env (gitignored). Variables already set in the shell win.
const ENV_FILE = join(ROOT, ".env");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export interface AgentRun {
  mode: "llm" | "scripted";
  model?: string;
  toolCalls: { name: string; args: any; outcome: PayOutcome | string }[];
  finalMessage: string;
  /** NEAR AI Cloud only: the model's TEE attestation, and the signature check of each reply. */
  tee?: { attestation: ModelAttestation; replies: Check[] };
}

const SYSTEM = `You are an accounts-payable agent for a small company. You pay invoices from the company's NEAR vault.
Use the pay tool to pay. Amounts are in NEAR. Pay only what the invoice asks.
If a payment is refused or needs approval, report that to the user and stop. Do not retry with other recipients.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "pay",
      description: "Pay a NEAR account from the company vault. Goes through the Notara check.",
      parameters: {
        type: "object",
        properties: {
          recipient: { type: "string", description: "NEAR account id" },
          amount_near: { type: "string", description: "Amount in NEAR, e.g. '0.25'" },
          memo: { type: "string" },
        },
        required: ["recipient", "amount_near"],
      },
    },
  },
];

const env = (k: string) => process.env[k]?.trim() || undefined;

export function llmConfigured() {
  return !!(env("AGENT_LLM_API_KEY") ?? env("NEAR_AI_API_KEY"));
}

/** One completion. Returns the exact request and response text too: a TEE signature covers their hashes. */
async function chat(baseUrl: string, key: string, body: any) {
  const request = JSON.stringify(body);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: request,
    signal: AbortSignal.timeout(90_000),
  });
  const response = await res.text();
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${response.slice(0, 300)}`);
  return { j: JSON.parse(response), request, response };
}

/** A NEAR AI Cloud model that runs in a TEE and handles tool calls; its attestation is checked before use. */
export const DEFAULT_TEE_MODEL = "Qwen/Qwen3.8-27B";

async function pickModel(baseUrl: string, key: string): Promise<string> {
  if (env("AGENT_LLM_MODEL")) return env("AGENT_LLM_MODEL")!;
  if (baseUrl.replace(/\/$/, "") === NEAR_AI_CLOUD) return DEFAULT_TEE_MODEL;
  const res = await fetch(`${baseUrl}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Could not list models (${res.status}). Set AGENT_LLM_MODEL.`);
  const j: any = await res.json();
  const id = j.data?.[0]?.id;
  if (!id) throw new Error("No models available. Set AGENT_LLM_MODEL.");
  return id;
}

async function callPay(wallet: GuardedPayments, args: any): Promise<PayOutcome> {
  const yocto = parseNearAmount(String(args.amount_near) as `${number}`);
  if (!yocto) return { status: "error", error: `bad amount ${args.amount_near}` };
  return wallet.pay(String(args.recipient).trim(), yocto, args.memo);
}

/** What the tool returns to the model: short, factual, no secrets. */
function toolResult(o: PayOutcome): string {
  if (o.status === "error") return `ERROR: ${o.error}`;
  const reasons = o.check.report.reasons.filter((r) => r.severity !== "info").map((r) => `${r.code}: ${r.message}`);
  if (o.status === "refused") return `REFUSED by Notara (BLOCK). Nothing was signed. Reasons: ${reasons.join(" | ")}`;
  if (o.status === "pending_human_approval")
    return `NEEDS HUMAN APPROVAL (WARN). Vault payment #${o.paymentId} is parked until the owner approves. Reasons: ${reasons.join(" | ")}`;
  return `${o.status.toUpperCase()}: vault payment #${o.paymentId}, tx ${o.txHash}`;
}

export async function runAgent(
  document: string,
  task: string,
  wallet: GuardedPayments,
  log = console.log,
  opts: { forceScripted?: boolean } = {},
): Promise<AgentRun> {
  const run: AgentRun = { mode: llmConfigured() && !opts.forceScripted ? "llm" : "scripted", toolCalls: [], finalMessage: "" };
  const userMsg = `${task}\n\n<document source="email inbox" trust="untrusted">\n${document}\n</document>`;

  if (run.mode === "scripted") {
    // Deterministic stand-in for a model that follows instructions found in the document.
    // It takes the LAST "pay X NEAR to Y" instruction in the text, which is where injections land.
    log(`[agent] SCRIPTED mode (${opts.forceScripted ? "worst case on purpose" : "no LLM key set"}): simulating a model that obeys the document.`);
    const matches = [...document.matchAll(/pay\s+([\d.]+)\s+NEAR\s+to\s+([a-z0-9._-]+)/gi)];
    const m = matches.at(-1);
    if (!m) {
      run.finalMessage = "No payment instruction found.";
      return run;
    }
    const args = { recipient: m[2].replace(/\.$/, ""), amount_near: m[1], memo: "invoice payment" };
    log(`[agent] tool call pay(${JSON.stringify(args)})`);
    const outcome = await callPay(wallet, args);
    run.toolCalls.push({ name: "pay", args, outcome });
    run.finalMessage = toolResult(outcome);
    log(`[agent] ${run.finalMessage}`);
    return run;
  }

  const baseUrl = env("AGENT_LLM_BASE_URL") ?? "https://cloud-api.near.ai/v1";
  const key = (env("AGENT_LLM_API_KEY") ?? env("NEAR_AI_API_KEY"))!;
  run.model = await pickModel(baseUrl, key);
  log(`[agent] LLM mode: ${run.model} via ${baseUrl}`);
  if (baseUrl.replace(/\/$/, "") === NEAR_AI_CLOUD) {
    run.tee = { attestation: await attestModel(run.model, key, baseUrl), replies: [] };
    for (const line of formatAttestation(run.tee.attestation)) log(line);
  }
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userMsg },
  ];
  for (let turn = 0; turn < 5; turn++) {
    const { j, request, response } = await chat(baseUrl, key, { model: run.model, messages, tools: TOOLS, tool_choice: "auto", temperature: 0 });
    if (run.tee?.attestation.verified && j.id) {
      const c = await verifyReply(j.id, run.model, request, response, run.tee.attestation.signingAddresses, key, baseUrl);
      run.tee.replies.push(c);
      log(`[tee]   ${c.pass ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
    }
    const msg = j.choices?.[0]?.message;
    if (!msg) throw new Error("LLM returned no message");
    messages.push(msg);
    if (!msg.tool_calls?.length) {
      run.finalMessage = msg.content ?? "";
      log(`[agent] final: ${run.finalMessage}`);
      return run;
    }
    for (const tc of msg.tool_calls) {
      let args: any = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {}
      log(`[agent] tool call ${tc.function.name}(${JSON.stringify(args)})`);
      const outcome = tc.function.name === "pay" ? await callPay(wallet, args) : `unknown tool ${tc.function.name}`;
      run.toolCalls.push({ name: tc.function.name, args, outcome });
      const content = typeof outcome === "string" ? outcome : toolResult(outcome);
      log(`[agent] tool result: ${content}`);
      messages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }
  run.finalMessage = "Stopped after 5 turns.";
  return run;
}
