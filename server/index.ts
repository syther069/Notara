#!/usr/bin/env tsx
// Notara: backend for the website. One local process:
//   - Notara check API          POST /v1/check
//   - Deployment + vault views    GET  /api/deployment, /api/vault, /api/vault/payments
//   - Owner console (local only)  POST /api/owner/approve, /api/owner/reject
//   - Attack demo runner          GET  /api/demo/run (Server-Sent Events), /api/demo/logs
//   - Merchant invoices           /api/invoices ...
//   - The built website           web/dist (if present)
//
// Binds to 127.0.0.1. The owner console and demo runner sign testnet transactions, so this server
// must not be exposed publicly without authentication (see rules.md).

import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { check } from "../passport/src/check.ts";
import { NETWORKS, ROOT, loadDeployment } from "../passport/src/config.ts";
import { nearAmount } from "../passport/src/format.ts";
import { USDC_MAINNET, USDC_TESTNET, formatUnits, getAsset, linkNetwork, listAssets, resolveAsset, toUnits, usdcFor } from "../passport/src/assets.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { loadSigner } from "../passport/src/verdict.ts";
import type { Network } from "../passport/src/types.ts";
import { accountFromKey, hasKey } from "../agent/src/keys.ts";
import { llmConfigured } from "../agent/src/agent.ts";
import { LOCAL_ONLY, refuseReason, runOnce } from "./guard.ts";
import { createCheckout, isDone, overallStatus, payTokens, readCheckout } from "./checkout.ts";
import { fetchTx, receivedInTx } from "./nearpay.ts";
import {
  sendLimitReason,
  sendLinkMessage,
  verifySender,
  MAX_SEND_UNITS,
  MIN_SEND_UNITS,
  checkClaimDelegate,
  createName,
  decodeSignedDelegate,
  ensureUsdcStorage,
  fundLinkAccount,
  fundRefusal,
  hasSponsor,
  isImplicit,
  relayClaim,
  tla,
  usdcBalance,
} from "./sends.ts";
import { SIGN_RECIPIENT, checkWebsite, getMerchant, linkMessage, linksMessage, verifyLinkToken, verifyLinksProof } from "./merchants.ts";
import { INV_ID, cleanItems, clearInvoiceFlag, createInvoice, getInvoice, type Invoice, itemsTotal, listInvoices, setInvoiceFlag, statusFromVault, toCsv, updateInvoice } from "./invoices.ts";
import { SCENARIOS, createVisitorVault, getVisitorVault, isVisitorVault, runVisitorScenario } from "./vaults.ts";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
/** Public mode: no owner key, no agent demo, no verdict signing. For a public deploy. */
const PUBLIC = process.env.NOTARA_PUBLIC === "1";
process.env.PASSPORT_URL ??= `http://127.0.0.1:${PORT}`; // the agent code and demo runs ask this server
const MAX_BODY = 16 * 1024;
const NET: Network = "testnet";
const WEB_DIST = join(ROOT, "web", "dist");
const RUNS_DIR = join(ROOT, "demo", "runs");

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------- helpers

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<any> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new HttpError(413, "Request body too large");
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
}

function requireDeployment() {
  const d = loadDeployment(NET);
  if (!d) throw new HttpError(409, "Testnet is not set up yet. Run `npm run setup:testnet` (see README).");
  return d;
}

const explorerTx = (h: string) => `${NETWORKS[NET].explorer}/txns/${h}`;

/** Decimal amount in the asset's unit ("12.5" USDC) -> smallest units. */
/**
 * A link's signed fields from a request body: the same for the message the wallet signs and for the
 * link that is created, so the two always match. With line items, the amount is their total.
 */
function linkFields(b: any, merchant: string, asset: string) {
  const raw = Array.isArray(b.items) ? b.items : undefined;
  let items;
  try {
    items = cleanItems(raw?.map((i: any) => ({ description: i?.description, quantity: String(i?.quantity ?? ""), unitAmount: toAssetUnits(i?.unitDecimal, asset) })));
  } catch (e: any) {
    throw e instanceof HttpError ? e : new HttpError(400, e.message);
  }
  return {
    merchant,
    description: String(b.description ?? "").trim(),
    amount: items ? itemsTotal(items).toString() : toAssetUnits(b.amountDecimal ?? b.amountNear, asset),
    asset,
    ...(b.dueDate ? { dueDate: String(b.dueDate) } : {}),
    ...(items ? { items } : {}),
  };
}

function toAssetUnits(amount: unknown, assetId = "NEAR"): string {
  const asset = resolveAsset(assetId);
  if (!asset) throw new HttpError(400, `Unsupported asset ${assetId}`);
  try {
    return toUnits(String(amount ?? ""), asset);
  } catch (e: any) {
    throw new HttpError(400, e.message);
  }
}

/**
 * On the public site a merchant's list of links (and its CSV) needs their wallet's signature, sent in the
 * x-notara-proof header (never the URL), with the network in x-notara-network.
 */
async function requireLinksProof(req: IncomingMessage, account: string) {
  const net = req.headers["x-notara-network"] === "testnet" ? "testnet" : "mainnet";
  try {
    await verifyLinksProof(String(req.headers["x-notara-proof"] ?? ""), account, net);
  } catch (e: any) {
    throw new HttpError(401, e.message);
  }
}

// ---------------------------------------------------------------- vault + owner

/** The main demo vault, or a visitor's own vault (?vault=). Nothing else, so this can't be used to read arbitrary contracts. */
function pickVault(requested: string | null) {
  const d = requireDeployment();
  if (!requested || requested === d.vault) return d.vault;
  if (isVisitorVault(requested)) return requested;
  throw new HttpError(400, "Unknown vault");
}

async function vaultSummary(vault: string) {
  const d = { vault };
  const [config, acct, spent, pendingOwner] = await Promise.all([
    viewFunction<any>(NET, d.vault, "get_config"),
    viewAccount(NET, d.vault),
    viewFunction<string>(NET, d.vault, "get_spent_today", { asset: "NEAR" }),
    viewFunction<string | null>(NET, d.vault, "get_pending_owner").catch(() => null),
  ]);
  const usdc = getAsset(USDC_TESTNET)!;
  const [usdcBalance, usdcSpent] = await Promise.all([
    viewFunction<string>(NET, USDC_TESTNET, "ft_balance_of", { account_id: d.vault }).catch(() => "0"),
    viewFunction<string>(NET, d.vault, "get_spent_today", { asset: USDC_TESTNET }).catch(() => "0"),
  ]);
  const usdcCap = config.caps?.[USDC_TESTNET];
  return {
    vault: d.vault,
    explorer: `${NETWORKS[NET].explorer}/address/${d.vault}`,
    balanceYocto: acct?.amount ?? "0",
    balanceNear: nearAmount(acct?.amount ?? "0"),
    spentTodayYocto: spent,
    spentTodayNear: nearAmount(spent),
    pendingOwner,
    usdc: {
      asset: USDC_TESTNET,
      enabled: !!usdcCap,
      balance: formatUnits(usdcBalance, usdc),
      spentToday: formatUnits(usdcSpent, usdc),
      spentTodayUnits: usdcSpent,
      perTx: usdcCap ? formatUnits(usdcCap.per_tx, usdc) : null,
      daily: usdcCap ? formatUnits(usdcCap.daily, usdc) : null,
      dailyUnits: usdcCap?.daily ?? null,
    },
    /** True when keys/owner.json on this machine is still the vault owner (local owner console works). */
    // Only the main demo vault: visitor vaults are always approved from the owner's own wallet.
    localOwnerKey: !PUBLIC && vault === requireDeployment().vault && hasKey("owner") && accountFromKey(NET, "owner").accountId === config.owner,
    config,
  };
}

async function vaultPayments(vault: string) {
  const d = { vault };
  const all: any[] = [];
  for (let from = 0; ; from += 100) {
    const page = await viewFunction<any[]>(NET, d.vault, "get_payments", { from_index: String(from), limit: "100" });
    all.push(...page);
    if (page.length < 100) break;
  }
  return all.reverse();
}

/** Step 1 of handing the vault to the human's own wallet. Signed with the local owner key. */
async function proposeOwner(newOwner: unknown) {
  const d = requireDeployment();
  const id = String(newOwner ?? "").trim();
  if (!/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(id) || id.length < 2 || id.length > 64) throw new HttpError(400, "Invalid account id");
  if (!(await viewAccount(NET, id))) throw new HttpError(400, `${id} does not exist on testnet`);
  if (!hasKey("owner")) throw new HttpError(409, "No owner key on this machine (keys/owner.json).");
  const owner = accountFromKey(NET, "owner");
  const r: any = await owner
    .callFunctionRaw({ contractId: d.vault, methodName: "propose_owner", args: { new_owner: id }, gas: 30_000_000_000_000n })
    .catch((e: any) => {
      throw new HttpError(400, e?.message ?? String(e));
    });
  return { txHash: r.transaction.hash, explorer: explorerTx(r.transaction.hash), pendingOwner: id };
}

async function ownerAction(method: "approve" | "reject", id: unknown) {
  const d = requireDeployment();
  if (!/^\d+$/.test(String(id ?? ""))) throw new HttpError(400, "Payment id must be a number");
  if (!hasKey("owner")) throw new HttpError(409, "No owner key on this machine (keys/owner.json).");
  const owner = accountFromKey(NET, "owner");
  const r: any = await owner
    .callFunctionRaw({ contractId: d.vault, methodName: method, args: { payment_id: String(id) }, gas: 100_000_000_000_000n, waitUntil: "EXECUTED_OPTIMISTIC" })
    .catch((e: any) => {
      throw new HttpError(400, e?.message ?? String(e));
    });
  let payment: any;
  for (let i = 0; i < 10; i++) {
    payment = await viewFunction(NET, d.vault, "get_payment", { payment_id: String(id) });
    if (payment?.status !== "Executing") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { txHash: r.transaction.hash, explorer: explorerTx(r.transaction.hash), payment };
}

// ---------------------------------------------------------------- demo runner

let demoProc: ChildProcess | undefined;

function runDemo(req: IncomingMessage, res: ServerResponse, only?: string) {
  requireDeployment();
  if (demoProc) throw new HttpError(409, "A demo run is already in progress.");
  if (only && !/^[1-4]$/.test(only)) throw new HttpError(400, "only must be 1-4");

  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const event = (type: string, data: unknown) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  event("start", { only: only ?? "all", agentMode: llmConfigured() ? "llm" : "scripted", startedAt: new Date().toISOString() });

  const args = ["--import", "tsx", join(ROOT, "agent", "src", "demo.ts"), "--leave-pending"];
  if (only) args.push("--only", only);
  const proc = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } });
  demoProc = proc;

  let buf = "";
  const onData = (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) event("log", { line });
  };
  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);
  proc.on("close", (code) => {
    if (buf) event("log", { line: buf });
    const latest = latestRun();
    event("done", { exitCode: code, log: latest });
    res.end();
    demoProc = undefined;
  });
  // Closing the page does not kill the run: transactions already in flight should finish and be logged.
  req.on("close", () => {});
}

function latestRun(): string | undefined {
  if (!existsSync(RUNS_DIR)) return undefined;
  return readdirSync(RUNS_DIR).filter((f) => f.endsWith(".log")).sort().at(-1);
}

function listRuns() {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith(".log"))
    .sort()
    .reverse()
    .map((name) => ({ name, bytes: statSync(join(RUNS_DIR, name)).size }));
}

function readRun(name: string) {
  if (!/^[\w.-]+\.log$/.test(name)) throw new HttpError(400, "Bad log name");
  const p = join(RUNS_DIR, name);
  if (!existsSync(p)) throw new HttpError(404, "Log not found");
  return readFileSync(p, "utf8");
}

// ---------------------------------------------------------------- invoices

async function refreshInvoice(id: string) {
  const inv = await getInvoice(id);
  if (!inv) throw new HttpError(404, `Unknown invoice ${id}`);
  if (inv.asset === USDC_MAINNET) return syncCheckouts(inv);
  if (inv.status !== "pending_approval" || inv.vaultPaymentId === undefined) return inv;
  const d = requireDeployment();
  const p: any = await viewFunction(NET, d.vault, "get_payment", { payment_id: inv.vaultPaymentId });
  const status = statusFromVault(p?.status ?? "");
  if (status === inv.status) return inv;
  return await updateInvoice(id, { status, paidAt: status === "paid" ? new Date(Number(p.updated_at_ms)).toISOString() : undefined });
}

// ---------------------------------------------------------------- any-chain payment links

async function syncCheckouts(inv: Invoice) {
  if (!inv.checkouts?.length || inv.status === "paid") return inv;
  const checkouts = await Promise.all(inv.checkouts.map((c) => (isDone(c) ? c : readCheckout(c).catch(() => c))));
  const status = overallStatus(checkouts);
  const paid = checkouts.find((c) => c.status === "SUCCESS");
  return await updateInvoice(inv.id, { checkouts, status, txHash: paid?.txHash, txUrl: paid?.txUrl, paidAt: paid ? new Date().toISOString() : undefined });
}

async function quoteInvoice(id: string, b: any) {
  const inv = await refreshInvoice(id);
  if (inv.asset !== USDC_MAINNET) throw new HttpError(409, "This invoice is not an any-chain payment link");
  if (inv.status === "paid" || inv.status === "processing") throw new HttpError(409, `Invoice is already ${inv.status}`);
  const refundTo = String(b.refundTo ?? "").trim();
  if (!refundTo || refundTo.length > 128) throw new HttpError(400, "A refund address is required");
  const token = (await payTokens()).find((t) => t.assetId === b.originAsset);
  if (!token) throw new HttpError(400, "Unsupported payment token");

  // Same choice again (e.g. a page reload): keep the same address rather than opening a second one.
  const list = inv.checkouts ?? [];
  const last = list.at(-1);
  if (last?.status === "PENDING_DEPOSIT" && last.originAsset === token.assetId && last.refundTo === refundTo && Date.parse(last.deadline) - Date.now() > 600_000) return inv;
  if (list.length >= 5) throw new HttpError(409, "Too many payment attempts for this link");

  const { report } = await check({ network: "mainnet", recipient: inv.merchant, amount: inv.amount, asset: inv.asset });
  if (report.decision === "BLOCK") throw new HttpError(403, "A serious policy rule applies to this merchant, so no payment address was created");

  try {
    const c = await createCheckout({ merchant: inv.merchant, amount: inv.amount, originAsset: token.assetId, refundTo, label: token.label });
    return await updateInvoice(id, { checkouts: [...list, c], status: "unpaid" });
  } catch (e: any) {
    throw new HttpError(400, e.message);
  }
}

/** Anyone with a link can read it, so refund addresses stay private. */
const publicInvoice = ({ signedToken, ...i }: Invoice) => ({ ...i, signed: !!signedToken, checkouts: i.checkouts?.map(({ refundTo: _, ...c }) => c) });

const sigCache = new Map<string, { at: number; ok: boolean }>();
/** Re-checks the merchant's signature (their key may have been removed since), cached 10 minutes. */
async function withSignature(i: Invoice) {
  let signature: "valid" | "invalid" | "none" = "none";
  if (i.signedToken) {
    const hit = sigCache.get(i.id);
    let ok = hit && Date.now() - hit.at < 600_000 ? hit.ok : undefined;
    if (ok === undefined) {
      ok = await verifyLinkToken(i.signedToken, i, false).then(() => true, () => false);
      sigCache.set(i.id, { at: Date.now(), ok });
    }
    signature = ok ? "valid" : "invalid";
  }
  return { ...publicInvoice(i), signature };
}

async function merchantProfile(account: string) {
  let m = await getMerchant(account);
  if (m.website && Date.now() - Date.parse(m.websiteCheckedAt ?? "0") > 3_600_000) m = await checkWebsite(account, m.website).catch(() => m);
  const links = (await listInvoices()).filter((i) => i.merchant === account && linkNetwork(i.asset) && i.kind !== "send");
  const paid = links.filter((i) => i.status === "paid");
  return {
    ...m,
    links: links.length,
    signedLinks: links.filter((i) => i.signedToken).length,
    paid: paid.length,
    paidTotal: formatUnits(paid.reduce((s, i) => s + BigInt(i.amount), 0n).toString(), getAsset(USDC_MAINNET)!),
  };
}

// ---------------------------------------------------------------- send links

type Net = "mainnet" | "testnet";

/** Once per link: the sponsor makes the link account exist, so the claim's meta transaction has a nonce. */
async function activateSend(inv: Invoice, net: Net) {
  const why = fundRefusal(inv);
  if (why === "already") return inv;
  if (why) throw new HttpError(409, why);
  // The flag is set first, in one database statement, so of several servers only one ever funds this link.
  if (!(await setInvoiceFlag(inv.id, "linkFundedAt"))) return (await getInvoice(inv.id))!;
  try {
    await fundLinkAccount(net, inv.merchant);
  } catch (e: any) {
    await clearInvoiceFlag(inv.id, "linkFundedAt"); // nothing was sent, so it may be retried
    throw new HttpError(409, e.message);
  }
  return (await getInvoice(inv.id))!;
}

const CLAIM_STALE_MS = 5 * 60_000;

/** The sponsor relays the link's signed USDC transfer (NEP-366), after creating a new name if asked. Once per link. */
async function claimSend(inv: Invoice, net: Net, b: any) {
  const first = (await getInvoice(inv.id))!;
  if (first.claimedAt) throw new HttpError(409, "This link was already claimed");
  if (!first.linkFundedAt) throw new HttpError(409, "This link isn't ready yet");
  // A server that died mid-claim leaves the flag behind; after 5 minutes a retry may take over. That's safe:
  // NEAR's access-key nonce stops a signed delegate from running twice, and a drained link has nothing to send.
  if (first.claimingAt && Date.now() - Date.parse(first.claimingAt) > CLAIM_STALE_MS) await clearInvoiceFlag(inv.id, "claimingAt");
  if (!(await setInvoiceFlag(inv.id, "claimingAt"))) throw new HttpError(409, "This link is already being claimed");
  try {
    const cur = (await getInvoice(inv.id))!;
    if (cur.claimedAt) throw new HttpError(409, "This link was already claimed");
    let sd: any;
    let to: string;
    try {
      sd = decodeSignedDelegate(String(b.signedDelegate ?? ""));
      to = checkClaimDelegate(sd, cur.merchant, net);
    } catch (e: any) {
      throw new HttpError(400, e.message);
    }
    const exists = !!(await viewAccount(net, to).catch(() => undefined));
    if (b.newName) {
      if (exists) throw new HttpError(409, `${to} is taken. Try another name.`);
      if (!new RegExp(`^[a-z\\d]+([-_][a-z\\d]+)*\\.${tla(net)}$`).test(to)) throw new HttpError(400, `A new name looks like yourname.${tla(net)}`);
      await createName(net, to, cur.merchant);
    } else if (!exists) throw new HttpError(400, `${to} doesn't exist on NEAR ${net}`);
    await ensureUsdcStorage(net, to);
    const r: any = await relayClaim(net, cur.merchant, sd);
    if (receivedInTx(r, cur.asset, to) === 0n) throw new HttpError(502, "The transfer didn't go through. The money is still in the link.");
    const out = await updateInvoice(cur.id, { claimedAt: new Date().toISOString(), claimedTo: to, claimTx: r.transaction.hash });
    return { invoice: publicInvoice(out), claimTx: out.claimTx, claimedTo: out.claimedTo };
  } finally {
    await clearInvoiceFlag(inv.id, "claimingAt");
  }
}

async function payInvoice(id: string) {
  const out = await runOnce(`invoice:${id}`, () => payInvoiceNow(id));
  if (!out) throw new HttpError(409, "This invoice is already being paid");
  return out;
}

async function payInvoiceNow(id: string) {
  const inv = await refreshInvoice(id);
  if (inv.asset === USDC_MAINNET) throw new HttpError(409, "This is a payment link: the customer pays it from the link page");
  if (inv.status === "paid" || inv.status === "pending_approval") throw new HttpError(409, `Invoice is already ${inv.status.replace("_", " ")}`);
  requireDeployment();
  const { buildWallet } = await import("../agent/src/demo.ts");
  const logs: string[] = [];
  const { wallet } = buildWallet((l) => logs.push(l.replace(/\x1b\[[0-9;]*m/g, "")));
  const out = await wallet.pay(inv.merchant, inv.amount, `invoice:${inv.id}`, inv.asset);
  const reasons = "check" in out && out.check ? out.check.report.reasons.filter((r) => r.severity !== "info").map((r) => r.message) : [];
  let patch: Parameters<typeof updateInvoice>[1];
  switch (out.status) {
    case "paid":
      patch = { status: "paid", decision: "ALLOW", paidBy: requireDeployment().vault, vaultPaymentId: out.paymentId, txHash: out.txHash, reportHash: out.check.verdict?.report_hash, paidAt: new Date().toISOString(), reasons };
      break;
    case "pending_human_approval":
      patch = { status: "pending_approval", decision: "WARN", vaultPaymentId: out.paymentId, txHash: out.txHash, reportHash: out.check.verdict?.report_hash, reasons };
      break;
    case "refused":
      patch = { status: "refused", decision: "BLOCK", reasons };
      break;
    case "payment_failed":
      patch = { status: "failed", decision: "ALLOW", vaultPaymentId: out.paymentId, txHash: out.txHash, reasons };
      break;
    default:
      patch = { status: "failed", reasons: [out.error] };
  }
  const updated = await updateInvoice(id, patch);
  return { invoice: updated, check: "check" in out ? out.check : undefined, log: logs };
}

// ---------------------------------------------------------------- static website

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function serveStatic(pathname: string, res: ServerResponse): boolean {
  if (!existsSync(WEB_DIST)) return false;
  const root = resolve(WEB_DIST);
  let file = resolve(root, "." + normalize(decodeURIComponent(pathname)));
  if (!file.startsWith(root + sep) && file !== root) return false; // path traversal guard
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html"); // SPA fallback
  if (!existsSync(file)) return false;
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
  return true;
}

// ---------------------------------------------------------------- router

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;
  const m = req.method ?? "GET";
  const refused = refuseReason(m, path, req.headers);
  if (refused) throw new HttpError(403, refused);
  if (PUBLIC && LOCAL_ONLY.test(path)) throw new HttpError(404, "Not available on the public site. This runs locally only.");

  if (m === "GET" && path === "/v1/health") {
    let signer: string | null = null;
    try {
      signer = loadSigner().getPublicKey().toString();
    } catch {}
    return send(res, 200, { ok: true, public: PUBLIC, signerPublicKey: signer, deployed: !!loadDeployment(NET), agentMode: llmConfigured() ? "llm" : "scripted" });
  }

  if (m === "POST" && path === "/v1/check") {
    const b = await readJson(req);
    const network = b.network === "mainnet" ? "mainnet" : "testnet";
    const assetId = b.asset ? resolveAsset(String(b.asset))?.id ?? String(b.asset) : "NEAR";
    // amountNear is kept for older clients; amountDecimal is in the asset's own unit (e.g. USDC).
    const decimal = b.amountDecimal ?? b.amountNear;
    const amount = decimal !== undefined ? toAssetUnits(decimal, assetId) : String(b.amount ?? "");
    // On testnet, check "as the vault" by default so prior vault payments are part of the evidence.
    const payer = b.payer ?? (network === "testnet" ? loadDeployment(NET)?.vault : undefined);
    try {
      return send(res, 200, await check({ network, payer, recipient: String(b.recipient ?? "").trim(), amount, asset: assetId }, { sign: !!b.sign && !PUBLIC }));
    } catch (e: any) {
      throw new HttpError(400, e?.message ?? String(e));
    }
  }

  if (m === "GET" && path === "/api/assets") return send(res, 200, { assets: listAssets() });

  if (m === "GET" && path === "/api/deployment") {
    const d = loadDeployment(NET);
    const mainnetRegistry = loadDeployment("mainnet")?.registry;
    const mainnetSend = hasSponsor("mainnet");
    if (!d) return send(res, 200, { deployed: false, network: NET, mainnetRegistry, mainnetSend });
    return send(res, 200, { deployed: true, ...d, mainnetRegistry, mainnetSend, public: PUBLIC, explorer: NETWORKS[NET].explorer, agentMode: llmConfigured() ? "llm" : "scripted" });
  }

  if (m === "GET" && path === "/api/vault") return send(res, 200, await vaultSummary(pickVault(url.searchParams.get("vault"))));
  if (m === "GET" && path === "/api/vault/payments") return send(res, 200, { payments: await vaultPayments(pickVault(url.searchParams.get("vault"))) });
  // ---- visitor vaults: anyone with a testnet wallet gets their own vault and runs the agent on it
  const vm = path.match(/^\/api\/vaults\/([a-z0-9._-]{2,64})(\/run)?$/);
  if (vm && m === "GET" && !vm[2]) return send(res, 200, await getVisitorVault(vm[1]).catch((e) => { throw new HttpError(400, e.message); }));
  if (m === "POST" && path === "/api/vaults") {
    const b = await readJson(req);
    return send(res, 201, await createVisitorVault(String(b.owner ?? "").trim(), b.proof).catch((e) => { throw new HttpError(400, e.message); }));
  }
  if (vm && m === "POST" && vm[2]) {
    const b = await readJson(req);
    if (!SCENARIOS.includes(b.scenario)) throw new HttpError(400, `scenario must be one of ${SCENARIOS.join(", ")}`);
    return send(res, 200, await runVisitorScenario(vm[1], b.scenario, b.proof).catch((e) => { throw new HttpError(400, e.message); }));
  }

  if (m === "POST" && (path === "/api/owner/approve" || path === "/api/owner/reject")) {
    const b = await readJson(req);
    return send(res, 200, await ownerAction(path.endsWith("approve") ? "approve" : "reject", b.id));
  }

  if (m === "POST" && path === "/api/owner/propose") {
    const b = await readJson(req);
    return send(res, 200, await proposeOwner(b.newOwner));
  }

  if (m === "GET" && path === "/api/demo/run") return runDemo(req, res, url.searchParams.get("only") ?? undefined);
  if (m === "GET" && path === "/api/demo/status") return send(res, 200, { running: !!demoProc });
  if (m === "GET" && path === "/api/demo/logs") return send(res, 200, { logs: listRuns() });
  if (m === "GET" && path.startsWith("/api/demo/logs/")) {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end(readRun(path.slice("/api/demo/logs/".length)));
  }
  if (m === "GET" && path === "/api/demo/inbox") {
    const d = loadDeployment(NET);
    const files = ["invoice-merchant.md", "invoice-injected.md", "invoice-newshop.md"];
    const docs = files.map((f) => {
      let text = readFileSync(join(ROOT, "demo", "inbox", f), "utf8");
      if (d?.accounts) text = text.replaceAll("{{MERCHANT}}", d.accounts.merchant).replaceAll("{{ATTACKER}}", d.accounts.attacker).replaceAll("{{NEWSHOP}}", d.accounts.newShop);
      return { name: f, text };
    });
    return send(res, 200, { docs });
  }

  // invoices
  if (m === "GET" && path === "/api/invoices") {
    const merchant = url.searchParams.get("merchant");
    if (PUBLIC && !merchant) throw new HttpError(400, "Connect your wallet to see your links"); // no dump of every merchant's sales
    if (PUBLIC) await requireLinksProof(req, merchant!);
    const list = (await listInvoices()).filter((i) => !merchant || i.merchant === merchant);
    // Only vault approvals are refreshed here (one cheap view each, local demo only). Any-chain checkouts
    // update when their pay page polls, so a long list doesn't make one NEAR Intents call per open address.
    const refreshed = await Promise.all(list.map((i) => (i.status === "pending_approval" ? refreshInvoice(i.id).catch(() => i) : i)));
    return send(res, 200, { invoices: refreshed.map(publicInvoice) });
  }
  // ---- send by link
  if (m === "POST" && path === "/api/sends") {
    const b = await readJson(req);
    const account = String(b.implicitAccount ?? "");
    if (!isImplicit(account)) throw new HttpError(400, "Invalid link account");
    const net = b.network === "testnet" ? "testnet" : "mainnet";
    const amount = toAssetUnits(b.amountDecimal, usdcFor(net));
    if (BigInt(amount) > MAX_SEND_UNITS) throw new HttpError(400, "Send by link is limited to 25 USDC per link in this prototype");
    if (BigInt(amount) < MIN_SEND_UNITS) throw new HttpError(400, "A send link must hold at least 1 USDC");
    const sender = String(b.sender ?? "").trim();
    // A wallet signature first: nothing is spent, and no limit is counted, for a request nobody signed.
    try {
      await verifySender(b.proof, { sender, account, amount, asset: usdcFor(net) }, net);
    } catch (e: any) {
      throw new HttpError(401, e.message);
    }
    const why = sendLimitReason(await listInvoices(), sender, new Date().toISOString().slice(0, 10));
    if (why) throw new HttpError(429, why);
    try {
      await ensureUsdcStorage(net, account);
    } catch (e: any) {
      throw new HttpError(409, e.message);
    }
    const inv = await createInvoice({ merchant: account, description: String(b.note ?? "").trim().slice(0, 120) || "Money sent by link", amount, asset: usdcFor(net) });
    return send(res, 201, publicInvoice(await updateInvoice(inv.id, { kind: "send", sentBy: sender })));
  }
  if (m === "POST" && path === "/api/sends/message") {
    const b = await readJson(req);
    const net = b.network === "testnet" ? "testnet" : "mainnet";
    const account = String(b.implicitAccount ?? "");
    if (!isImplicit(account)) throw new HttpError(400, "Invalid link account");
    return send(res, 200, { recipient: SIGN_RECIPIENT, message: sendLinkMessage({ sender: String(b.sender ?? "").trim(), account, amount: toAssetUnits(b.amountDecimal, usdcFor(net)), asset: usdcFor(net) }) });
  }
  const nm = path.match(new RegExp(`^/api/invoices/(${INV_ID})/near-tx$`));
  if (nm && m === "POST") {
    const b = await readJson(req);
    const txHash = String(b.txHash ?? "");
    const signerId = String(b.signerId ?? "");
    if (!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(txHash) || !signerId) throw new HttpError(400, "txHash and signerId are required");
    const inv = await refreshInvoice(nm[1]);
    const net = linkNetwork(inv.asset);
    if (!net) throw new HttpError(409, "Only USDC payment links can be paid from a NEAR wallet");
    if (inv.status === "paid") return send(res, 200, publicInvoice(inv));
    if ((await listInvoices()).some((i) => i.nearTx === txHash)) throw new HttpError(409, "This transaction already paid another invoice");
    const tx = await fetchTx(net, txHash, signerId).catch((e) => {
      throw new HttpError(400, `Couldn't read the transaction: ${e.message}`);
    });
    // Only a transfer whose memo is this invoice's id counts, so one transfer can pay one link at most.
    const got = receivedInTx(tx, inv.asset, inv.merchant, inv.id);
    if (got < BigInt(inv.amount))
      throw new HttpError(400, `The transaction sent ${formatUnits(got.toString(), getAsset(inv.asset)!)} USDC to ${inv.merchant} with memo ${inv.id}, not the ${formatUnits(inv.amount, getAsset(inv.asset)!)} USDC needed`);
    const paid = await updateInvoice(inv.id, { status: "paid", nearTx: txHash, txHash, paidBy: signerId, txUrl: `${NETWORKS[net].explorer}/txns/${txHash}`, paidAt: new Date().toISOString() });
    return send(res, 200, publicInvoice(paid));
  }
  const sm = path.match(new RegExp(`^/api/sends/(${INV_ID})(/activate|/claim)?$`));
  if (sm) {
    let inv = await refreshInvoice(sm[1]);
    if (inv.kind !== "send") throw new HttpError(404, "Not a send link");
    const net = linkNetwork(inv.asset) ?? "mainnet";
    if (m === "POST" && sm[2] === "/activate") inv = await activateSend(inv, net);
    if (m === "POST" && sm[2] === "/claim") return send(res, 200, await claimSend(inv, net, await readJson(req)));
    if (m === "GET" || sm[2] === "/activate") {
      const [balance, acct] = await Promise.all([usdcBalance(net, inv.merchant).catch(() => "0"), viewAccount(net, inv.merchant).catch(() => undefined)]);
      // Right after activate the account exists even if "final" state lags a block or two.
      return send(res, 200, { invoice: publicInvoice(inv), balance, claimReady: !inv.claimedAt && (!!acct || !!inv.linkFundedAt) });
    }
  }
  if (m === "POST" && path === "/api/links/message") {
    const b = await readJson(req);
    const asset = resolveAsset(String(b.asset ?? ""))?.id;
    if (!asset) throw new HttpError(400, "Unsupported asset");
    return send(res, 200, { recipient: SIGN_RECIPIENT, message: linkMessage(linkFields(b, String(b.merchant ?? ""), asset)) });
  }
  const mm = path.match(/^\/api\/merchants\/([a-z0-9._-]{2,64})(\/website)?$/);
  if (mm && m === "GET" && !mm[2]) return send(res, 200, await merchantProfile(mm[1]));
  if (mm && m === "POST" && mm[2]) {
    const b = await readJson(req);
    let result;
    try {
      result = await checkWebsite(mm[1], String(b.website ?? ""));
    } catch (e: any) {
      throw new HttpError(400, e.message);
    }
    return send(res, 200, { ...(await merchantProfile(mm[1])), ...result });
  }
  if (m === "POST" && path === "/api/links/list-message") {
    const b = await readJson(req);
    return send(res, 200, { recipient: SIGN_RECIPIENT, message: linksMessage(String(b.account ?? "").trim()) });
  }
  if (m === "GET" && path === "/api/checkout/tokens") return send(res, 200, { tokens: await payTokens() });
  if (m === "GET" && path === "/api/invoices.csv") {
    const merchant = url.searchParams.get("merchant");
    if (PUBLIC && !merchant) throw new HttpError(400, "Connect your wallet to export your links");
    if (PUBLIC) await requireLinksProof(req, merchant!);
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="invoices.csv"' });
    const netOf = (a: string) => linkNetwork(a) ?? NET;
    return res.end(
      toCsv((await listInvoices()).filter((i) => !merchant || i.merchant === merchant), {
        network: netOf,
        explorer: (a) => NETWORKS[netOf(a)].explorer,
        formatAmount: (u, a) => (getAsset(a) ? formatUnits(u, getAsset(a)!) : u),
      }),
    );
  }
  if (m === "POST" && path === "/api/invoices") {
    const b = await readJson(req);
    const d = loadDeployment(NET);
    const merchant = String(b.merchant ?? d?.accounts?.merchant ?? "");
    try {
      const assetId = resolveAsset(String(b.asset ?? "NEAR"))?.id;
      if (!assetId) throw new HttpError(400, `Unsupported asset ${b.asset}`);
      const net = linkNetwork(assetId);
      if (net && !(await viewAccount(net, merchant))) throw new HttpError(400, `${merchant} does not exist on NEAR ${net}`);
      const fields = linkFields(b, merchant, assetId);
      if (b.signedToken) await verifyLinkToken(String(b.signedToken), fields, true).catch((e) => { throw new HttpError(400, `Signature check failed: ${e.message}`); });
      // Only for wallet-signed links: the signature proves the merchant asked, so nobody can make the
      // sponsor pay USDC storage for arbitrary accounts. Unsigned links still work: the "Pay with NEAR
      // wallet" transaction registers the merchant itself, paid by the customer.
      if (net && b.signedToken) await ensureUsdcStorage(net, merchant).catch((e) => console.warn(`USDC storage for ${merchant} not sponsored: ${e.message}`));
      const inv = await createInvoice(fields);
      return send(res, 201, publicInvoice(b.signedToken ? await updateInvoice(inv.id, { signedToken: String(b.signedToken) }) : inv));
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, e.message);
    }
  }
  const invMatch = path.match(new RegExp(`^/api/invoices/(${INV_ID})(/pay|/quote)?$`));
  if (invMatch) {
    if (m === "GET" && !invMatch[2]) return send(res, 200, await withSignature(await refreshInvoice(invMatch[1])));
    if (m === "POST" && invMatch[2] === "/quote") return send(res, 200, await withSignature(await quoteInvoice(invMatch[1], await readJson(req))));
    if (m === "POST" && invMatch[2]) return send(res, 200, await payInvoice(invMatch[1]));
  }

  if (path.startsWith("/api/") || path.startsWith("/v1/")) throw new HttpError(404, "Not found");
  if (m === "GET" && serveStatic(path, res)) return;
  send(res, 404, { error: "Website not built yet. Run the web dev server, or build it into web/dist." });
}

/** The whole backend as one Node request handler: the local server and the Vercel function both use it. */
export function app(req: IncomingMessage, res: ServerResponse) {
  handle(req, res).catch((e: any) => {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: e?.message ?? "Internal error" });
    else res.end();
  });
}

// On Vercel the platform calls app() per request (server/vercel.ts); locally we listen on a port.
if (!process.env.VERCEL)
  createServer(app).listen(PORT, HOST, () => {
    console.log(`Notara backend on http://${HOST}:${PORT}`);
    console.log(`Testnet deployment: ${loadDeployment(NET) ? "found" : "not set up (read-only checks still work)"}`);
  });
