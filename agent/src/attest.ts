// NEAR AI Cloud TEE checks for the agent's model, following NEAR's own verification example
// (github.com/near-examples/nearai-cloud-verification-example):
//
//   1. Ask NEAR AI Cloud for the model's attestation report with a fresh random nonce.
//   2. The gateway and every model TEE node must echo that nonce, so the evidence is new.
//   3. Send each node's GPU evidence to NVIDIA's attestation service (NRAS). It must pass, and
//      NVIDIA's token must carry our nonce.
//   4. After each reply, fetch its signature: it must sign "model:sha256(request):sha256(response)"
//      and recover to one of the attested TEE signing addresses.
//
// Not done here: verifying the Intel TDX quote itself (NEAR's docs suggest a DCAP verifier such as
// dcap-qvl) and replaying the event log. Those checks are listed as "not checked" in every result.

import { createHash, randomBytes } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

export const NEAR_AI_CLOUD = "https://cloud-api.near.ai/v1";
const NRAS = "https://nras.attestation.nvidia.com/v3/attest/gpu";

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}
export interface ModelAttestation {
  model: string;
  /** True only when every check passed. */
  verified: boolean;
  /** Not a TEE-hosted model on NEAR AI Cloud (for example a model NEAR AI Cloud relays to another provider). */
  notTee?: boolean;
  signingAddresses: string[];
  checks: Check[];
  notChecked: string[];
}

const NOT_CHECKED = ["Intel TDX quote (needs a DCAP verifier such as dcap-qvl)", "Event log replay (RTMR3)"];
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** The payload of a JWT, without checking its signature (NVIDIA's tokens come straight from NVIDIA over TLS). */
function jwtClaims(token: string): any {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

/** Steps 1 to 3 for one model. Never throws: a failure is a failed check. */
export async function attestModel(model: string, apiKey?: string, baseUrl = NEAR_AI_CLOUD): Promise<ModelAttestation> {
  const out: ModelAttestation = { model, verified: false, signingAddresses: [], checks: [], notChecked: NOT_CHECKED };
  const nonce = randomBytes(32).toString("hex");
  let report: any;
  try {
    const q = new URLSearchParams({ model, provider: "near", include_tls_fingerprint: "false", signing_algo: "ecdsa", nonce });
    const res = await fetch(`${baseUrl}/attestation/report?${q}`, {
      headers: { accept: "application/json", "x-no-aliasing": "true", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      signal: AbortSignal.timeout(30_000),
    });
    report = await res.json().catch(() => ({}));
    if (!res.ok) {
      const why = String(report?.error?.message ?? res.status);
      out.notTee = /supports attestation|No provider/i.test(why);
      out.checks.push({ name: "Attestation report from NEAR AI Cloud", pass: false, detail: why.slice(0, 200) });
      return out;
    }
  } catch (e: any) {
    out.checks.push({ name: "Attestation report from NEAR AI Cloud", pass: false, detail: e.message });
    return out;
  }

  const nodes: any[] = report.model_attestations ?? [];
  out.signingAddresses = [...new Set(nodes.map((n) => String(n.signing_address ?? "").toLowerCase()).filter(Boolean))];
  out.checks.push({ name: "Model runs in TEE nodes", pass: nodes.length > 0, detail: `${nodes.length} node(s)` });
  out.checks.push({ name: "Gateway echoes our fresh nonce", pass: report.gateway_attestation?.request_nonce === nonce });
  out.checks.push({ name: "Every model node echoes our fresh nonce", pass: nodes.length > 0 && nodes.every((n) => n.request_nonce === nonce) });

  let gpuOk = nodes.length > 0;
  for (const [i, n] of nodes.entries()) {
    try {
      if (!n.nvidia_payload) throw new Error("no GPU evidence");
      const payload = typeof n.nvidia_payload === "string" ? n.nvidia_payload : JSON.stringify(n.nvidia_payload);
      if (String(JSON.parse(payload).nonce ?? "").toLowerCase() !== nonce) throw new Error("GPU evidence carries another nonce");
      const res = await fetch(NRAS, { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: payload, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`NVIDIA attestation service ${res.status}`);
      const answer: any[] = await res.json();
      const overall = jwtClaims(answer.find((x) => Array.isArray(x) && x[0] === "JWT")[1]);
      if (overall["x-nvidia-overall-att-result"] !== true) throw new Error("NVIDIA says the GPU attestation failed");
      if (String(overall.eat_nonce ?? "").toLowerCase() !== nonce) throw new Error("NVIDIA's token carries another nonce");
    } catch (e: any) {
      gpuOk = false;
      out.checks.push({ name: `GPU attestation, node ${i + 1}`, pass: false, detail: e.message });
    }
  }
  if (gpuOk) out.checks.push({ name: "NVIDIA verifies the GPU evidence of every node", pass: true });
  out.verified = out.checks.every((c) => c.pass);
  return out;
}

/** Ethereum-style address of the key that made an EIP-191 (personal_sign) signature over `text`. */
export function recoverSigner(text: string, signatureHex: string): string {
  const sig = Buffer.from(signatureHex.replace(/^0x/, ""), "hex");
  if (sig.length !== 65) throw new Error("signature must be 65 bytes");
  const msg = Buffer.from(text, "utf8");
  const digest = keccak_256(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${msg.length}`, "utf8"), msg]));
  const v = sig[64] >= 27 ? sig[64] - 27 : sig[64];
  const pub = secp256k1.Signature.fromBytes(sig.subarray(0, 64), "compact").addRecoveryBit(v).recoverPublicKey(digest).toBytes(false);
  return "0x" + Buffer.from(keccak_256(pub.subarray(1)).subarray(12)).toString("hex");
}

/**
 * Step 4: the reply was produced inside one of the attested TEEs. `request` and `response` are the
 * exact strings sent and received. Never throws.
 */
export async function verifyReply(chatId: string, model: string, request: string, response: string, addresses: string[], apiKey: string, baseUrl = NEAR_AI_CLOUD): Promise<Check> {
  const name = "Reply signed inside an attested TEE";
  try {
    let sig: any;
    // The signature lives on the node that answered; another node can 404 for a moment.
    for (let i = 0; i < 5 && !sig; i++) {
      const res = await fetch(`${baseUrl}/signature/${encodeURIComponent(chatId)}?model=${encodeURIComponent(model)}&signing_algo=ecdsa`, { headers: { accept: "application/json", authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(20_000) });
      if (res.ok) sig = await res.json();
      else if (res.status !== 404) throw new Error(`signature endpoint ${res.status}`);
      else await new Promise((r) => setTimeout(r, 1000));
    }
    if (!sig) throw new Error("no signature for this reply");
    const expected = `${model}:${sha256(request)}:${sha256(response)}`;
    if (sig.text !== expected) throw new Error("the signed text doesn't match this request and reply");
    const signer = recoverSigner(sig.text, sig.signature);
    if (!addresses.includes(signer.toLowerCase())) throw new Error(`signed by ${signer}, not an attested TEE address`);
    return { name, pass: true, detail: signer };
  } catch (e: any) {
    return { name, pass: false, detail: e.message };
  }
}

/** For logs: one line per check. */
export function formatAttestation(a: ModelAttestation): string[] {
  if (a.notTee) return [`[tee] ${a.model} isn't TEE-hosted on NEAR AI Cloud, so there is nothing to attest. Set AGENT_LLM_MODEL to a TEE model, such as Qwen/Qwen3.8-27B.`];
  return [
    `[tee] ${a.model}: ${a.verified ? "VERIFIED" : "NOT VERIFIED"}`,
    ...a.checks.map((c) => `[tee]   ${c.pass ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`),
    ...a.notChecked.map((n) => `[tee]   not checked: ${n}`),
  ];
}
