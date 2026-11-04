import { NETWORKS, loadDeployment, type Policy } from "../config.ts";
import {
  accountTxs,
  daysSince,
  nsToIso,
  transactions,
  viewAccount,
  viewFunction,
} from "../near.ts";
import type { Network, PaymentRequest, SignalResult, Source } from "../types.ts";
import { recordCodeHash } from "./codeHashCache.ts";

const EMPTY_CODE_HASH = "11111111111111111111111111111111";
const IMPLICIT_RE = /^[0-9a-f]{64}$/;
const DEPLOY_SCAN_LIMIT = 100;
const INTERACTION_SCAN_PAGES = 5;

async function run<T>(
  name: string,
  source: Source,
  caveats: string[],
  fn: () => Promise<T>,
): Promise<SignalResult<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    return { name, status: "ok", source, fetchedAt, data: await fn(), caveats };
  } catch (e: any) {
    return { name, status: "error", source, fetchedAt, error: String(e?.message ?? e), caveats };
  }
}

const rpcSource = (n: Network): Source => ({ kind: "live-rpc", network: n, endpoint: NETWORKS[n].rpc });
const idxSource = (n: Network): Source => ({ kind: "live-indexer", network: n, endpoint: NETWORKS[n].txApi });

// ---------------------------------------------------------------- 1. account state

export interface AccountSignal {
  exists: boolean;
  implicit: boolean;
  isContract: boolean;
  codeHash?: string;
  balanceYocto?: string;
  storageUsage?: number;
  blockHeight?: number;
  codeHashChangedSinceLastCheck?: boolean;
  previousCodeHash?: string;
}

export function accountSignal(n: Network, id: string) {
  return run<AccountSignal>(
    "account_state",
    rpcSource(n),
    ["Current state only. Says nothing about who controls the account."],
    async () => {
      const v = await viewAccount(n, id);
      const implicit = IMPLICIT_RE.test(id) || id.startsWith("0x");
      if (!v) return { exists: false, implicit, isContract: false };
      const isContract = v.code_hash !== EMPTY_CODE_HASH;
      const prev = isContract ? recordCodeHash(n, id, v.code_hash) : undefined;
      return {
        exists: true,
        implicit,
        isContract,
        codeHash: v.code_hash,
        balanceYocto: v.amount,
        storageUsage: v.storage_usage,
        blockHeight: v.block_height,
        codeHashChangedSinceLastCheck: prev !== undefined && prev !== v.code_hash,
        previousCodeHash: prev,
      };
    },
  );
}

// ---------------------------------------------------------------- 2. activity history

export interface HistorySignal {
  txCount: number;
  firstObservedAt?: string;
  firstObservedTx?: string;
  observedAgeDays?: number;
  lastObservedAt?: string;
}

export function historySignal(n: Network, id: string) {
  return run<HistorySignal>(
    "activity_history",
    idxSource(n),
    [
      "Earliest OBSERVED activity in the FastNear index, not the account creation date.",
      "Index coverage can have gaps. Aged accounts can be bought, so age is weak evidence on its own.",
    ],
    async () => {
      const [oldest, newest] = await Promise.all([
        accountTxs(n, id, { desc: false, limit: 1 }),
        accountTxs(n, id, { desc: true, limit: 1 }),
      ]);
      const first = oldest.account_txs[0];
      const last = newest.account_txs[0];
      return {
        txCount: newest.txs_count,
        firstObservedAt: first ? nsToIso(first.tx_block_timestamp) : undefined,
        firstObservedTx: first?.transaction_hash,
        observedAgeDays: first ? Math.floor(daysSince(first.tx_block_timestamp)) : undefined,
        lastObservedAt: last ? nsToIso(last.tx_block_timestamp) : undefined,
      };
    },
  );
}

// ---------------------------------------------------------------- 3. contract deployments

export interface DeploySignal {
  scannedTxs: number;
  deploys: { tx: string; at: string; signer: string }[];
  lastDeployAt?: string;
  lastDeployAgeDays?: number;
}

export function deploySignal(n: Network, id: string) {
  return run<DeploySignal>(
    "contract_deployments",
    idxSource(n),
    [
      `Scans only the ${DEPLOY_SCAN_LIMIT} most recent transactions touching the account.`,
      "A recent deploy is a change signal, not proof of malicious code.",
    ],
    async () => {
      const page = await accountTxs(n, id, { desc: true, limit: DEPLOY_SCAN_LIMIT });
      const candidates = page.account_txs.filter((t) => t.is_receiver || t.is_signer);
      const txs = await transactions(n, candidates.map((t) => t.transaction_hash));
      const deploys: DeploySignal["deploys"] = [];
      for (const t of txs) {
        const tx = t.transaction;
        const inTx = tx.receiver_id === id && tx.actions.some((a: any) => a === "DeployContract" || a?.DeployContract);
        const inReceipts = (t.receipts ?? []).some(
          (r: any) =>
            r?.receipt?.receiver_id === id &&
            (r?.receipt?.receipt?.Action?.actions ?? []).some((a: any) => a?.DeployContract),
        );
        if (inTx || inReceipts) {
          const meta = candidates.find((c) => c.transaction_hash === tx.hash);
          deploys.push({ tx: tx.hash, at: meta ? nsToIso(meta.tx_block_timestamp) : "unknown", signer: tx.signer_id });
        }
      }
      deploys.sort((a, b) => b.at.localeCompare(a.at));
      const last = deploys[0];
      return {
        scannedTxs: txs.length,
        deploys,
        lastDeployAt: last?.at,
        lastDeployAgeDays: last && last.at !== "unknown" ? Math.floor((Date.now() - Date.parse(last.at)) / 86_400_000) : undefined,
      };
    },
  );
}

// ---------------------------------------------------------------- 4. prior interactions

export interface InteractionSignal {
  vaultPayments: { executed: number; failed: number; pending: number; rejected: number };
  sharedIndexedTxs: number;
  sharedTxSample: string[];
  scannedComplete: boolean;
}

export function interactionSignal(n: Network, payer: string | undefined, recipient: string) {
  const dep = loadDeployment(n);
  return run<InteractionSignal>(
    "prior_interactions",
    { kind: "on-chain-contract", network: n, endpoint: dep ? `${dep.vault} (vault) + ${NETWORKS[n].txApi}` : NETWORKS[n].txApi },
    [
      "Vault payment history is authoritative for payments made through this vault.",
      `Indexer overlap scans at most ${INTERACTION_SCAN_PAGES} pages per account and can miss older history.`,
    ],
    async () => {
      if (!payer) throw new Error("No payer/vault account configured, so prior interactions cannot be checked");
      const vaultPayments = { executed: 0, failed: 0, pending: 0, rejected: 0 };
      if (dep && dep.vault === payer) {
        const ps = await viewFunction<any[]>(n, payer, "get_payments_to", { recipient });
        for (const p of ps) {
          if (p.status === "Executed") vaultPayments.executed++;
          else if (p.status === "Failed") vaultPayments.failed++;
          else if (p.status === "PendingApproval" || p.status === "Executing") vaultPayments.pending++;
          else vaultPayments.rejected++;
        }
      }
      const collect = async (acc: string) => {
        const set = new Set<string>();
        let token: string | undefined;
        let pages = 0;
        do {
          const p = await accountTxs(n, acc, { desc: true, resume_token: token });
          p.account_txs.forEach((t) => set.add(t.transaction_hash));
          token = p.account_txs.length ? p.resume_token : undefined;
          pages++;
        } while (token && pages < INTERACTION_SCAN_PAGES);
        return { set, complete: !token };
      };
      const [a, b] = await Promise.all([collect(payer), collect(recipient)]);
      const shared = [...a.set].filter((h) => b.set.has(h));
      return {
        vaultPayments,
        sharedIndexedTxs: shared.length,
        sharedTxSample: shared.slice(0, 5),
        scannedComplete: a.complete && b.complete,
      };
    },
  );
}

// ---------------------------------------------------------------- 5. shared reports

export interface RegistryReport {
  id: string;
  subject: string;
  reporter: string;
  category: string;
  description: string;
  evidence_uri: string;
  evidence_hash?: string | null;
  status: "Unverified" | "Verified" | "Rejected" | "Disputed";
  status_by?: string | null;
  status_note?: string | null;
  is_fixture: boolean;
  disputes: unknown[];
}

export function reportsSignal(n: Network, recipient: string) {
  const dep = loadDeployment(n);
  return run<{ registry: string; reports: RegistryReport[] }>(
    "shared_reports",
    { kind: "on-chain-contract", network: n, endpoint: dep ? `${dep.registry} via ${NETWORKS[n].rpc}` : "not deployed" },
    [
      "A report is a claim with evidence, not proof. Only Verified reports can cause BLOCK.",
      "The registry is new and has few reporters. No report does NOT mean safe.",
      "Reports flagged is_fixture are seeded demo data and must not be presented as live evidence.",
    ],
    async () => {
      if (!dep) throw new Error(`No registry deployed on ${n} (deployment.${n}.json missing)`);
      const reports = await viewFunction<RegistryReport[]>(n, dep.registry, "get_reports_for", { subject: recipient });
      return { registry: dep.registry, reports };
    },
  );
}

// ---------------------------------------------------------------- 6. token registration (NEP-141 only)

export interface TokenRegistrationSignal {
  token: string;
  registered: boolean;
}

/** NEP-145: a token transfer to an account that never registered storage fails. */
export function tokenRegistrationSignal(n: Network, token: string, recipient: string) {
  return run<TokenRegistrationSignal>(
    "token_registration",
    rpcSource(n),
    ["Only says whether the recipient can receive this token. Not a trust signal."],
    async () => {
      const bal = await viewFunction<unknown>(n, token, "storage_balance_of", { account_id: recipient });
      return { token, registered: bal !== null && bal !== undefined };
    },
  );
}

// ---------------------------------------------------------------- 7. local policy lists

export function policyListSignal(n: Network, recipient: string, policy: Policy): Promise<SignalResult> {
  const deny = policy.denylist.find((d) => d.account === recipient);
  return Promise.resolve({
    name: "policy_lists",
    status: "ok",
    source: { kind: "local-config", network: n, endpoint: "passport/policy.json" },
    fetchedAt: new Date().toISOString(),
    data: { allowlisted: policy.allowlist.includes(recipient), denylisted: !!deny, denyReason: deny?.reason },
    caveats: ["Operator-maintained lists. As good as whoever edits them."],
  });
}

export async function collectSignals(req: PaymentRequest, policy: Policy): Promise<SignalResult[]> {
  const n = req.network;
  const acct = await accountSignal(n, req.recipient);
  const isContract = acct.status === "ok" && (acct.data as AccountSignal).isContract;
  const exists = acct.status === "ok" && (acct.data as AccountSignal).exists;
  const skipped = (name: string, why: string, source: Source): SignalResult => ({
    name,
    status: "skipped",
    source,
    fetchedAt: new Date().toISOString(),
    error: why,
    caveats: [],
  });
  const rest = await Promise.all([
    exists ? historySignal(n, req.recipient) : Promise.resolve(skipped("activity_history", "account does not exist", idxSource(n))),
    isContract
      ? deploySignal(n, req.recipient)
      : Promise.resolve(skipped("contract_deployments", "not a contract account", idxSource(n))),
    req.payer
      ? interactionSignal(n, req.payer, req.recipient)
      : Promise.resolve(skipped("prior_interactions", "read-only lookup: no payer/vault given", idxSource(n))),
    reportsSignal(n, req.recipient),
    policyListSignal(n, req.recipient, policy),
  ]);
  if (req.asset !== "NEAR" && exists) rest.push(await tokenRegistrationSignal(n, req.asset, req.recipient));
  return [acct, ...rest];
}
