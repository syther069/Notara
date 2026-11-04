export type Network = "testnet" | "mainnet";
export type Decision = "ALLOW" | "WARN" | "BLOCK";

/** Where a piece of evidence came from. Shown on every signal so nobody mistakes a fixture for live data. */
export type SourceKind =
  | "live-rpc" // NEAR JSON-RPC, read at check time
  | "live-indexer" // FastNear transaction indexer, read at check time
  | "on-chain-contract" // view call on our vault/registry contract
  | "local-config" // policy file (allowlist / denylist)
  | "local-cache"; // our own snapshot store

export interface Source {
  kind: SourceKind;
  network: Network;
  endpoint: string;
}

export interface SignalResult<T = unknown> {
  name: string;
  status: "ok" | "error" | "skipped";
  source: Source;
  fetchedAt: string;
  data?: T;
  error?: string;
  /** Limits of this signal, disclosed with every result. */
  caveats: string[];
}

export interface PaymentRequest {
  network: Network;
  /** Account whose spending is being checked (the vault). */
  payer?: string;
  recipient: string;
  /** yocto units of the asset, as a decimal string */
  amount: string;
  /** "NEAR" or NEP-141 token contract id */
  asset: string;
}

export interface Reason {
  code: string;
  severity: "info" | "warn" | "block";
  message: string;
  /** Names of the signals this reason is based on. */
  signals: string[];
  /** Links/ids for supporting evidence, if any. */
  evidence?: string[];
}

export interface Report {
  version: "agentspend-passport/report/v1";
  request: PaymentRequest;
  decision: Decision;
  reasons: Reason[];
  /** Fraction of signals that returned data. Not an accuracy score. */
  coverage: { ok: number; total: number; failed: string[] };
  signals: SignalResult[];
  policyVersion: string;
  generatedAt: string;
  disclaimer: string;
}

export interface SignedVerdict {
  vault: string;
  recipient: string;
  amount: string;
  asset: string;
  decision: Decision;
  nonce: string;
  expires_at_ms: string;
  report_hash: string;
}

export interface CheckResponse {
  report: Report;
  verdict?: SignedVerdict;
  /** base64 ed25519 signature over the canonical verdict message */
  signature?: string;
  signerPublicKey?: string;
}
