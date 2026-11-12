#!/usr/bin/env tsx
// Check a NEAR AI Cloud model's TEE attestation: npm run attest -- [model]
// Default model: AGENT_LLM_MODEL, else Qwen/Qwen3.8-27B. Public models need no key; AGENT_LLM_API_KEY is
// sent when set (models enabled only for your organization need it).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../passport/src/config.ts";
import { attestModel, formatAttestation } from "../agent/src/attest.ts";

if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"));
const model = process.argv[2] || process.env.AGENT_LLM_MODEL?.trim() || "Qwen/Qwen3.8-27B";
const a = await attestModel(model, process.env.AGENT_LLM_API_KEY?.trim() || process.env.NEAR_AI_API_KEY?.trim() || undefined);
for (const line of formatAttestation(a)) console.log(line);
if (a.verified) console.log(`[tee]   signing address${a.signingAddresses.length > 1 ? "es" : ""}: ${a.signingAddresses.join(", ")}`);
process.exitCode = a.verified ? 0 : 1;
