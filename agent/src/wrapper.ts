// The agent-side transaction wrapper. The ONLY way the agent's tools move money.
//
//   BLOCK -> refuse. Nothing is signed or sent.
//   WARN  -> submit to the vault, which parks the payment on-chain until the human owner approves
//            it with the owner key (which the agent does not have). The human is notified.
//   ALLOW -> submit to the vault, which re-checks the signed verdict and caps before paying.
//
// The wrapper is the first line of defence, not the last. If it is bypassed, the vault contract
// still requires a fresh, matching, signed, non-BLOCK verdict and enforces its own caps.

import type { Account } from "near-api-js";
import { check } from "../../passport/src/check.ts";
import { viewFunction } from "../../passport/src/near.ts";
import type { CheckResponse, Network } from "../../passport/src/types.ts";

export type PayOutcome =
  | { status: "refused"; decision: "BLOCK"; check: CheckResponse; signed: false }
  | { status: "pending_human_approval"; decision: "WARN"; paymentId: string; txHash: string; check: CheckResponse }
  | { status: "paid" | "payment_failed"; decision: "ALLOW"; paymentId: string; txHash: string; check: CheckResponse }
  | { status: "error"; error: string; check?: CheckResponse };

export interface WrapperOptions {
  network: Network;
  /** Vault account, acting through the agent's function-call key. */
  agentAccount: Account;
  vaultId: string;
  /** Called on BLOCK and WARN so a human hears about it. */
  notifyHuman?: (msg: string, check: CheckResponse) => void | Promise<void>;
  log?: (line: string) => void;
  /** Injected in tests. Defaults to the in-process Passport check. */
  checker?: typeof check;
}

export class GuardedPayments {
  constructor(private readonly o: WrapperOptions) {}

  private log(s: string) {
    (this.o.log ?? console.log)(s);
  }

  /** amount in yoctoNEAR (string) */
  async pay(recipient: string, amount: string, memo?: string, asset = "NEAR"): Promise<PayOutcome> {
    let res: CheckResponse;
    try {
      res = await (this.o.checker ?? check)({ network: this.o.network, payer: this.o.vaultId, recipient, amount, asset }, { sign: true });
    } catch (e: any) {
      // Passport unreachable or input invalid: nothing is signed. (Fail closed.)
      return { status: "error", error: `Passport check failed, payment not attempted: ${e?.message ?? e}` };
    }
    const d = res.report.decision;
    this.log(`[wrapper] Passport decision for ${recipient}: ${d}`);

    if (d === "BLOCK") {
      this.log(`[wrapper] BLOCK -> refusing to sign. No transaction created.`);
      await this.o.notifyHuman?.(`Blocked payment to ${recipient}: ${res.report.reasons.filter((r) => r.severity === "block").map((r) => r.code).join(", ")}`, res);
      return { status: "refused", decision: "BLOCK", check: res, signed: false };
    }

    const tx = await this.o.agentAccount.callFunctionRaw({
      contractId: this.o.vaultId,
      methodName: "request_payment",
      args: { recipient, amount, asset, verdict: res.verdict, signature: res.signature, memo: memo?.slice(0, 256) },
      gas: 100_000_000_000_000n,
      deposit: 0n,
      waitUntil: "EXECUTED_OPTIMISTIC",
    }).catch((e: any) => e);
    if (tx instanceof Error) return { status: "error", error: tx.message, check: res };

    const txHash = tx.transaction?.hash ?? tx.transaction_outcome?.id;
    const ret = tx.status?.SuccessValue !== undefined ? JSON.parse(Buffer.from(tx.status.SuccessValue, "base64").toString() || "null") : null;
    if (tx.status?.Failure) return { status: "error", error: JSON.stringify(tx.status.Failure), check: res };
    const paymentId = String(ret);

    if (d === "WARN") {
      this.log(`[wrapper] WARN -> vault parked payment #${paymentId} until the owner approves (tx ${txHash}).`);
      await this.o.notifyHuman?.(
        `Payment #${paymentId} to ${recipient} needs your approval: ${res.report.reasons.filter((r) => r.severity === "warn").map((r) => r.code).join(", ")}. Approve with: npm run owner -- approve ${paymentId}`,
        res,
      );
      return { status: "pending_human_approval", decision: "WARN", paymentId, txHash, check: res };
    }

    // ALLOW: the payout happened in a later receipt; read the final status from the vault.
    // Final-finality views can lag a couple of blocks behind the receipts, so poll briefly.
    let p: any;
    for (let i = 0; i < 15; i++) {
      p = await viewFunction(this.o.network, this.o.vaultId, "get_payment", { payment_id: paymentId });
      if (p && p.status !== "Executing") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const ok = p?.status === "Executed";
    this.log(`[wrapper] ALLOW -> vault payment #${paymentId} status ${p?.status} (tx ${txHash}).`);
    return { status: ok ? "paid" : "payment_failed", decision: "ALLOW", paymentId, txHash, check: res };
  }
}
