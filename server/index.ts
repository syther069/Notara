#!/usr/bin/env tsx
// AgentSpend Passport: backend for the website. One local process:
//   - Passport check API          POST /v1/check
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
import { USDC_TESTNET, formatUnits, getAsset, listAssets, resolveAsset, toUnits } from "../passport/src/assets.ts";
import { viewAccount, viewFunction } from "../passport/src/near.ts";
import { loadSigner } from "../passport/src/verdict.ts";
import type { Network } from "../passport/src/types.ts";
import { accountFromKey, hasKey } from "../agent/src/keys.ts";
import { llmConfigured } from "../agent/src/agent.ts";
import { refuseReason, runOnce } from "./guard.ts";
import { createInvoice, getInvoice, listInvoices, statusFromVault, toCsv, updateInvoice } from "./invoices.ts";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
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
function toAssetUnits(amount: unknown, assetId = "NEAR"): string {
  const asset = resolveAsset(assetId);
  if (!asset) throw new HttpError(400, `Unsupported asset ${assetId}`);
  try {
    return toUnits(String(amount ?? ""), asset);
  } catch (e: any) {
    throw new HttpError(400, e.message);
  }
}

// ---------------------------------------------------------------- vault + owner

async function vaultSummary() {
  const d = requireDeployment();
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
    localOwnerKey: hasKey("owner") && accountFromKey(NET, "owner").accountId === config.owner,
    config,
  };
}

async function vaultPayments() {
  const d = requireDeployment();
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
  const inv = getInvoice(id);
  if (!inv) throw new HttpError(404, `Unknown invoice ${id}`);
  if (inv.status !== "pending_approval" || inv.vaultPaymentId === undefined) return inv;
  const d = requireDeployment();
  const p: any = await viewFunction(NET, d.vault, "get_payment", { payment_id: inv.vaultPaymentId });
  const status = statusFromVault(p?.status ?? "");
  if (status === inv.status) return inv;
  return updateInvoice(id, { status, paidAt: status === "paid" ? new Date(Number(p.updated_at_ms)).toISOString() : undefined });
}

async function payInvoice(id: string) {
  const out = await runOnce(`invoice:${id}`, () => payInvoiceNow(id));
  if (!out) throw new HttpError(409, "This invoice is already being paid");
  return out;
}

async function payInvoiceNow(id: string) {
  const inv = await refreshInvoice(id);
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
      patch = { status: "paid", decision: "ALLOW", vaultPaymentId: out.paymentId, txHash: out.txHash, reportHash: out.check.verdict?.report_hash, paidAt: new Date().toISOString(), reasons };
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
  const updated = updateInvoice(id, patch);
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

  if (m === "GET" && path === "/v1/health") {
    let signer: string | null = null;
    try {
      signer = loadSigner().getPublicKey().toString();
    } catch {}
    return send(res, 200, { ok: true, signerPublicKey: signer, deployed: !!loadDeployment(NET), agentMode: llmConfigured() ? "llm" : "scripted" });
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
      return send(res, 200, await check({ network, payer, recipient: String(b.recipient ?? "").trim(), amount, asset: assetId }, { sign: !!b.sign }));
    } catch (e: any) {
      throw new HttpError(400, e?.message ?? String(e));
    }
  }

  if (m === "GET" && path === "/api/assets") return send(res, 200, { assets: listAssets() });

  if (m === "GET" && path === "/api/deployment") {
    const d = loadDeployment(NET);
    if (!d) return send(res, 200, { deployed: false, network: NET });
    return send(res, 200, { deployed: true, ...d, explorer: NETWORKS[NET].explorer, agentMode: llmConfigured() ? "llm" : "scripted" });
  }

  if (m === "GET" && path === "/api/vault") return send(res, 200, await vaultSummary());
  if (m === "GET" && path === "/api/vault/payments") return send(res, 200, { payments: await vaultPayments() });

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
    const list = listInvoices();
    const refreshed = await Promise.all(list.map((i) => (i.status === "pending_approval" ? refreshInvoice(i.id).catch(() => i) : i)));
    return send(res, 200, { invoices: refreshed });
  }
  if (m === "GET" && path === "/api/invoices.csv") {
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="invoices.csv"' });
    return res.end(toCsv(listInvoices(), NETWORKS[NET].explorer, (u, a) => (getAsset(a) ? formatUnits(u, getAsset(a)!) : u)));
  }
  if (m === "POST" && path === "/api/invoices") {
    const b = await readJson(req);
    const d = loadDeployment(NET);
    const merchant = String(b.merchant ?? d?.accounts?.merchant ?? "");
    try {
      const assetId = resolveAsset(String(b.asset ?? "NEAR"))?.id;
      if (!assetId) throw new HttpError(400, `Unsupported asset ${b.asset}`);
      return send(res, 201, createInvoice({ merchant, description: b.description, amount: toAssetUnits(b.amountDecimal ?? b.amountNear, assetId), asset: assetId }));
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, e.message);
    }
  }
  const invMatch = path.match(/^\/api\/invoices\/(INV-\d{4,})(\/pay)?$/);
  if (invMatch) {
    if (m === "GET" && !invMatch[2]) return send(res, 200, await refreshInvoice(invMatch[1]));
    if (m === "POST" && invMatch[2]) return send(res, 200, await payInvoice(invMatch[1]));
  }

  if (path.startsWith("/api/") || path.startsWith("/v1/")) throw new HttpError(404, "Not found");
  if (m === "GET" && serveStatic(path, res)) return;
  send(res, 404, { error: "Website not built yet. Run the web dev server, or build it into web/dist." });
}

const server = createServer((req, res) => {
  handle(req, res).catch((e: any) => {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: e?.message ?? "Internal error" });
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`AgentSpend Passport backend on http://${HOST}:${PORT}`);
  console.log(`Testnet deployment: ${loadDeployment(NET) ? "found" : "not set up (read-only checks still work)"}`);
});
