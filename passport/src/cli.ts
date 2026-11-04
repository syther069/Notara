#!/usr/bin/env tsx
// passport check <recipient> [--amount 1.5] [--asset NEAR] [--network testnet|mainnet] [--payer vault.x.testnet] [--json]
//
// Read-only. Works against mainnet with no keys and no deployment: shows live signals for real accounts.

import { parseNearAmount } from "near-api-js";
import { check } from "./check.ts";
import { loadDeployment } from "./config.ts";
import { formatCheck } from "./format.ts";
import type { Network } from "./types.ts";

function arg(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [cmd, recipient, ...rest] = process.argv.slice(2);
  if (cmd !== "check" || !recipient) {
    console.error("usage: passport check <recipient> [--amount 1] [--asset NEAR] [--network testnet|mainnet] [--payer <vault>] [--json]");
    process.exit(2);
  }
  const network = (arg(rest, "network") ?? "testnet") as Network;
  const asset = arg(rest, "asset") ?? "NEAR";
  const amountStr = arg(rest, "amount") ?? "1";
  const amount = asset === "NEAR" ? parseNearAmount(amountStr as `${number}`) : amountStr;
  if (!amount) throw new Error(`bad amount ${amountStr}`);
  const payer = arg(rest, "payer") ?? loadDeployment(network)?.vault;

  const res = await check({ network, recipient, amount, asset, payer }, { sign: false });
  if (rest.includes("--json")) console.log(JSON.stringify(res, null, 2));
  else console.log(formatCheck(res));
  process.exitCode = res.report.decision === "BLOCK" ? 3 : res.report.decision === "WARN" ? 1 : 0;
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(2);
});
