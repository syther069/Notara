#!/usr/bin/env tsx
// Human owner commands. Uses keys/owner.json, which the agent never loads.
//
//   npm run owner -- pending              list payments waiting for approval
//   npm run owner -- approve <id>         approve a WARN payment (vault re-checks caps)
//   npm run owner -- reject <id>
//   npm run owner -- show <id>            payment + the Passport report hash it was based on
//   npm run owner -- pause | unpause
//   npm run owner -- lock-vault           delete the vault's full-access key (irreversible: no more upgrades)

import { NETWORKS, loadDeployment } from "../passport/src/config.ts";
import { viewFunction } from "../passport/src/near.ts";
import { accountFromKey, readKey } from "../agent/src/keys.ts";
import { nearAmount } from "../passport/src/format.ts";

const network = "testnet" as const;

async function main() {
  const [cmd, id] = process.argv.slice(2);
  const dep = loadDeployment(network);
  if (!dep) throw new Error("No deployment.testnet.json. Run npm run setup:testnet first.");
  const owner = accountFromKey(network, "owner");
  const link = (h: string) => `${NETWORKS[network].explorer}/txns/${h}`;

  switch (cmd) {
    case "pending": {
      const ps = await viewFunction<any[]>(network, dep.vault, "get_payments", { from_index: "0", limit: "100" });
      const pending = ps.filter((p) => p.status === "PendingApproval");
      if (!pending.length) console.log("No payments waiting for approval.");
      for (const p of pending) console.log(`#${p.id}  ${nearAmount(p.amount)} ${p.asset} -> ${p.recipient}  report ${p.report_hash.slice(0, 16)}…  memo: ${p.memo ?? ""}`);
      break;
    }
    case "show":
      console.log(JSON.stringify(await viewFunction(network, dep.vault, "get_payment", { payment_id: id }), null, 2));
      break;
    case "approve":
    case "reject": {
      if (!id) throw new Error(`usage: owner ${cmd} <payment id>`);
      const r: any = await owner.callFunctionRaw({ contractId: dep.vault, methodName: cmd, args: { payment_id: id }, gas: 100_000_000_000_000n });
      console.log(`[owner] ${cmd} #${id}: ${link(r.transaction.hash)}`);
      await new Promise((r) => setTimeout(r, 2500));
      const p: any = await viewFunction(network, dep.vault, "get_payment", { payment_id: id });
      console.log(`[owner] payment #${id} status: ${p.status}`);
      break;
    }
    case "pause":
    case "unpause": {
      const r: any = await owner.callFunctionRaw({ contractId: dep.vault, methodName: "set_paused", args: { paused: cmd === "pause" } });
      console.log(`[owner] ${cmd}d: ${link(r.transaction.hash)}`);
      break;
    }
    case "lock-vault": {
      const admin = accountFromKey(network, "vault-admin");
      const k = readKey("vault-admin");
      const r: any = await admin.deleteKey(k.public_key);
      console.log(`[owner] deleted vault full-access key ${k.public_key}: ${link(r.transaction.hash)}`);
      console.log("[owner] The vault can now only change through its own contract methods.");
      break;
    }
    default:
      console.log("usage: owner pending | show <id> | approve <id> | reject <id> | pause | unpause | lock-vault");
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
