// Typed client for the local backend (server/index.ts). Types mirror passport/src/types.ts.

export type Decision = "ALLOW" | "WARN" | "BLOCK";
export type SourceKind = "live-rpc" | "live-indexer" | "on-chain-contract" | "local-config" | "local-cache";

export interface Signal {
  name: string;
  status: "ok" | "error" | "skipped";
  source: { kind: SourceKind; network: string; endpoint: string };
  fetchedAt: string;
  data?: any;
  error?: string;
  caveats: string[];
}

export interface Reason {
  code: string;
  severity: "info" | "warn" | "block";
  message: string;
  signals: string[];
  evidence?: string[];
}

export interface Report {
  request: { network: string; recipient: string; amount: string; asset: string; payer?: string };
  decision: Decision;
  reasons: Reason[];
  coverage: { ok: number; total: number; failed: string[] };
  signals: Signal[];
  policyVersion: string;
  generatedAt: string;
  disclaimer: string;
}

export interface CheckResponse {
  report: Report;
  verdict?: { nonce: string; expires_at_ms: string; report_hash: string };
  signature?: string;
  signerPublicKey?: string;
}

export interface Deployment {
  deployed: boolean;
  network: string;
  vault?: string;
  registry?: string;
  owner?: string;
  verifier?: string;
  accounts?: { merchant: string; newShop: string; attacker: string };
  explorer?: string;
  agentMode?: "llm" | "scripted";
}

export interface Payment {
  id: string;
  recipient: string;
  amount: string;
  asset: string;
  decision: Decision;
  report_hash: string;
  memo?: string | null;
  status: "PendingApproval" | "Executing" | "Executed" | "Failed" | "Rejected" | "Expired";
  created_at_ms: string;
  updated_at_ms: string;
}

export interface VaultSummary {
  vault: string;
  explorer: string;
  balanceNear: string;
  spentTodayYocto: string;
  spentTodayNear: string;
  pendingOwner: string | null;
  localOwnerKey: boolean;
  config: {
    owner: string;
    agent: string;
    signer_public_key: string;
    paused: boolean;
    max_verdict_ttl_ms: string;
    caps: Record<string, { per_tx: string; daily: string }>;
  };
}

export interface Invoice {
  id: string;
  merchant: string;
  description: string;
  amount: string;
  asset: string;
  status: "unpaid" | "pending_approval" | "paid" | "refused" | "failed";
  createdAt: string;
  updatedAt: string;
  decision?: Decision;
  reasons?: string[];
  vaultPaymentId?: string;
  txHash?: string;
  reportHash?: string;
  paidAt?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new ApiError(0, "Can't reach the backend. Start it with `npm run serve` in the project folder.");
  }
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, res.status >= 500 || res.status === 404 ? "The backend isn't responding. Start it with `npm run serve`." : text.slice(0, 200));
  }
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const post = <T>(path: string, body: unknown) => req<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => req<{ ok: boolean; deployed: boolean; agentMode: string; signerPublicKey: string | null }>("/v1/health"),
  check: (b: { network: string; recipient: string; amountNear: string }) => post<CheckResponse>("/v1/check", b),
  deployment: () => req<Deployment>("/api/deployment"),
  vault: () => req<VaultSummary>("/api/vault"),
  payments: () => req<{ payments: Payment[] }>("/api/vault/payments"),
  approve: (id: string) => post<{ txHash: string; explorer: string; payment: Payment }>("/api/owner/approve", { id }),
  reject: (id: string) => post<{ txHash: string; explorer: string; payment: Payment }>("/api/owner/reject", { id }),
  proposeOwner: (newOwner: string) => post<{ txHash: string; explorer: string; pendingOwner: string }>("/api/owner/propose", { newOwner }),
  inbox: () => req<{ docs: { name: string; text: string }[] }>("/api/demo/inbox"),
  demoLogs: () => req<{ logs: { name: string; bytes: number }[] }>("/api/demo/logs"),
  demoLog: async (name: string) => {
    const r = await fetch(`/api/demo/logs/${encodeURIComponent(name)}`);
    if (!r.ok) throw new ApiError(r.status, "Log not found");
    return r.text();
  },
  demoStatus: () => req<{ running: boolean }>("/api/demo/status"),
  invoices: () => req<{ invoices: Invoice[] }>("/api/invoices"),
  invoice: (id: string) => req<Invoice>(`/api/invoices/${encodeURIComponent(id)}`),
  createInvoice: (b: { description: string; amountNear: string }) => post<Invoice>("/api/invoices", b),
  payInvoice: (id: string) => post<{ invoice: Invoice; check?: CheckResponse; log: string[] }>(`/api/invoices/${encodeURIComponent(id)}/pay`, {}),
};
