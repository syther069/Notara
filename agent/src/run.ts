#!/usr/bin/env tsx
// Run the agent on one inbox document: npm run agent -- demo/inbox/invoice-injected.md
import { readFileSync } from "node:fs";
import { runAgent } from "./agent.ts";
import { buildWallet, renderDoc } from "./demo.ts";

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run agent -- <document.md>");
  process.exit(2);
}
const { wallet } = buildWallet(console.log);
await runAgent(renderDoc(readFileSync(file, "utf8")), "Please process this invoice.", wallet);
