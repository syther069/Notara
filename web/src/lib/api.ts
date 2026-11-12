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
  /** Mainnet report registry, once deployed (deployment.mainnet.json). */
  mainnetRegistry?: string;
  /** Mainnet Send by link is set up (a mainnet sponsor account pays the gas). */
  mainnetSend?: boolean;
  /** Public deploy: owner and agent-pay routes run locally only. */
  public?: boolean;
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
  usdc: {
    asset: string;
    enabled: boolean;
    balance: string;
    spentToday: string;
    spentTodayUnits: string;
    perTx: string | null;
    daily: string | null;
    dailyUnits: string | null;
  };
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

export interface Checkout {
  depositAddress: string;
  depositMemo?: string;
  originAsset: string;
  label: string;
  amountIn: string;
  amountInUnits?: string;
  deadline: string;
  status: string;
  txHash?: string;
  txUrl?: string;
  refundReason?: string;
}

export interface MerchantProfile {
  account: string;
  website?: string;
  websiteVerified?: boolean;
  websiteCheckedAt?: string;
  links: number;
  signedLinks: number;
  paid: number;
  paidTotal: string;
}

export interface SendState {
  invoice: Invoice;
  /** USDC (6 decimals) held by the link's account right now. */
  balance: string;
  /** The link account exists on-chain, so it can pay gas for the claim. */
  claimReady: boolean;
}

export interface PayToken {
  assetId: string;
  label: string;
  chainId?: number;
  contract?: string;
}

/** One invoice line. quantity: decimal, up to 2 places; unitAmount: token units. */
export interface LineItem {
  description: string;
  quantity: string;
  unitAmount: string;
}
/** A line as the form sends it: the price as a decimal. */
export type LineItemInput = { description: string; quantity: string; unitDecimal: string };

export interface Invoice {
  id: string;
  merchant: string;
  description: string;
  /** YYYY-MM-DD the customer should pay by. */
  dueDate?: string;
  items?: LineItem[];
  /** The NEAR account the payment came from, when known. */
  paidBy?: string;
  /** Paid straight from a NEAR wallet: that transaction. */
  nearTx?: string;
  amount: string;
  asset: string;
  status: "unpaid" | "pending_approval" | "processing" | "paid" | "refused" | "refunded" | "failed";
  checkouts?: Checkout[];
  txUrl?: string;
  signed?: boolean;
  kind?: "send";
  /** Only on single-invoice reads: does the merchant's wallet signature still check out? */
  signature?: "valid" | "invalid" | "none";
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
    throw new ApiError(0, "Couldn't reach Notara's server. Check your connection");
  }
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Visitors see this text: plain words, no terminal commands (developer setup lives in the local-only details).
    throw new ApiError(res.status, res.status >= 500 || res.status === 404 ? "Notara's server didn't respond" : text.slice(0, 200));
  }
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const post = <T>(path: string, body: unknown) => req<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => req<{ ok: boolean; deployed: boolean; agentMode: string; signerPublicKey: string | null }>("/v1/health"),
  check: (b: { network: string; recipient: string; amountDecimal: string; asset?: string }) => post<CheckResponse>("/v1/check", b),
  deployment: () => req<Deployment>("/api/deployment"),
  vault: (vault?: string) => req<VaultSummary>(`/api/vault${vault ? `?vault=${encodeURIComponent(vault)}` : ""}`),
  payments: (vault?: string) => req<{ payments: Payment[] }>(`/api/vault/payments${vault ? `?vault=${encodeURIComponent(vault)}` : ""}`),
  /** Your own vault (visitor vaults): look up, create, and run the agent on it. */
  myVault: (owner: string) => req<MyVault>(`/api/vaults/${encodeURIComponent(owner)}`),
  createMyVault: (owner: string, proof: string) => post<MyVault>("/api/vaults", { owner, proof }),
  runMyVault: (owner: string, scenario: string, proof: string) => post<AgentRun>(`/api/vaults/${encodeURIComponent(owner)}/run`, { scenario, proof }),
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
  /** A merchant's links. The public site wants the merchant's wallet signature (`proof`), sent as a header. */
  invoices: (merchant?: string, auth?: { proof: string; network: "mainnet" | "testnet" }) =>
    req<{ invoices: Invoice[] }>(`/api/invoices${merchant ? `?merchant=${encodeURIComponent(merchant)}` : ""}`, auth ? { headers: { "x-notara-proof": auth.proof, "x-notara-network": auth.network } } : undefined),
  /** The exact text a merchant's wallet signs to see their own links. */
  linksListMessage: (account: string) => post<{ recipient: string; message: string }>("/api/links/list-message", { account }),
  invoice: (id: string) => req<Invoice>(`/api/invoices/${encodeURIComponent(id)}`),
  linkMessage: (b: { merchant: string; description: string; amountDecimal: string; asset: string; dueDate?: string; items?: LineItemInput[] }) => post<{ message: string }>("/api/links/message", b),
  merchant: (account: string) => req<MerchantProfile>(`/api/merchants/${encodeURIComponent(account)}`),
  checkWebsite: (account: string, website: string) => post<MerchantProfile>(`/api/merchants/${encodeURIComponent(account)}/website`, { website }),
  /** The exact text the sender's wallet signs for a send link. */
  sendMessage: (b: { sender: string; amountDecimal: string; implicitAccount: string; network?: "mainnet" | "testnet" }) => post<{ recipient: string; message: string }>("/api/sends/message", b),
  createSend: (b: { amountDecimal: string; implicitAccount: string; note?: string; network?: "mainnet" | "testnet"; sender: string; proof: string }) => post<Invoice>("/api/sends", b),
  getSend: (id: string) => req<SendState>(`/api/sends/${encodeURIComponent(id)}`),
  activateSend: (id: string) => post<SendState>(`/api/sends/${encodeURIComponent(id)}/activate`, {}),
  /** Hands the link-signed transfer (base64 borsh SignedDelegate, NEP-366) to the sponsor to relay. */
  claimSend: (id: string, b: { signedDelegate: string; newName?: boolean }) =>
    post<{ invoice: Invoice; claimTx?: string; claimedTo?: string }>(`/api/sends/${encodeURIComponent(id)}/claim`, b),
  nearTx: (id: string, b: { txHash: string; signerId: string }) => post<Invoice>(`/api/invoices/${encodeURIComponent(id)}/near-tx`, b),
  payTokens: () => req<{ tokens: PayToken[] }>("/api/checkout/tokens"),
  quote: (id: string, b: { originAsset: string; refundTo: string }) => post<Invoice>(`/api/invoices/${encodeURIComponent(id)}/quote`, b),
  createInvoice: (b: { description: string; amountDecimal: string; asset: string; merchant?: string; signedToken?: string; dueDate?: string; items?: LineItemInput[] }) => post<Invoice>("/api/invoices", b),
  payInvoice: (id: string) => post<{ invoice: Invoice; check?: CheckResponse; log: string[] }>(`/api/invoices/${encodeURIComponent(id)}/pay`, {}),
};

export interface MyVault {
  owner: string;
  vault: string;
  exists: boolean;
  /** yoctoNEAR */
  balance: string;
  tx?: string;
  /** What the owner's wallet signs to prove it's theirs. */
  message: string;
}

export interface AgentRun {
  vault: string;
  scenario: string;
  calls: { recipient?: string; decision?: string; status?: string; txHash?: string; paymentId?: string; attempt?: string; refused?: boolean; reason?: string }[];
  log: string[];
}
