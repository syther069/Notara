// Mainnet audit that moves no money: read-only checks, refused-by-design calls, and NEAR Intents
// quotes that are either dry (no deposit address) or open an address nobody pays (it expires).
// Usage: tsx scripts/audit-mainnet.ts            (live site)
//        API=http://127.0.0.1:8787 tsx scripts/audit-mainnet.ts   (local server, local database)
import { KeyPair } from "near-api-js";
import { sign } from "near-sign-verify";
import { USDC_MAINNET } from "../passport/src/assets.ts";

const API = process.env.API ?? "https://notara-sable.vercel.app";
const LOCAL = /127\.0\.0\.1|localhost/.test(API);
// A long-lived, well-known mainnet account to stand in as the merchant (read-only checks; local-only links).
// A random, unowned EVM address: valid for 1Click, and nobody ever deposits, so no refund ever happens.
const REFUND = "0x" + Buffer.from(crypto.getRandomValues(new Uint8Array(20))).toString("hex");
const MERCHANT = process.env.MERCHANT ?? "aurora";

async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(API + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j: any;
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  if (!r.ok) throw new Error(`${r.status}: ${typeof j === "string" ? j.slice(0, 200) : j.error ?? JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const results: { step: string; ok: boolean; note: string }[] = [];
async function step(name: string, fn: () => Promise<string>) {
  try {
    const note = await fn();
    results.push({ step: name, ok: true, note });
  } catch (e: any) {
    results.push({ step: name, ok: false, note: e.message });
  }
  const r = results.at(-1)!;
  console.log(`${r.ok ? "PASS" : "FAIL"} ${name}: ${r.note}`);
}
const expect = (c: unknown, m: string) => {
  if (!c) throw new Error(m);
};

await step("Passport check on mainnet (read-only)", async () => {
  const r = await call("POST", "/v1/check", { network: "mainnet", recipient: MERCHANT, amountDecimal: "1", asset: USDC_MAINNET });
  const sig = (r.report.signals ?? []).map((s: any) => `${s.name}:${s.status}`).join(", ");
  return `${MERCHANT} -> ${r.report.decision}; signals ${sig}`;
});

await step("Mainnet link signature is checked on mainnet (forged key refused)", async () => {
  const b = { merchant: MERCHANT, description: "audit", amountDecimal: "1", asset: USDC_MAINNET };
  const m = await call("POST", "/api/links/message", b);
  const kp = KeyPair.fromRandom("ed25519");
  const t = await sign(m.message, { signer: kp.toString(), accountId: MERCHANT, recipient: m.recipient });
  const out = await call("POST", "/api/invoices", { ...b, signedToken: t }).then(() => "accepted", (e) => e.message);
  expect(/doesn't belong to .* on NEAR mainnet/.test(out), `expected a mainnet key refusal, got: ${out}`);
  return out;
});

await step("Any-chain tokens list (NEAR Intents 1Click)", async () => {
  const { tokens } = await call("GET", "/api/checkout/tokens");
  expect(tokens.length > 10, `only ${tokens.length} tokens`);
  const evm = tokens.filter((t: any) => t.chainId).length;
  return `${tokens.length} tokens (${evm} on EVM chains), e.g. ${tokens.slice(0, 3).map((t: any) => t.label).join(", ")}`;
});

await step("1Click dry quote: 1 USDC to the merchant, paid in USDC on Base", async () => {
  const { tokens } = await call("GET", "/api/checkout/tokens");
  const base = tokens.find((t: any) => t.label === "USDC on base") ?? tokens.find((t: any) => t.chainId === 8453);
  expect(base, "no Base token");
  const r = await fetch("https://1click.chaindefuser.com/v0/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dry: true,
      swapType: "EXACT_OUTPUT",
      slippageTolerance: 100,
      originAsset: base.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: `nep141:${USDC_MAINNET}`,
      amount: "1000000",
      refundTo: REFUND,
      refundType: "ORIGIN_CHAIN",
      recipient: MERCHANT,
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    }),
  });
  const j: any = await r.json();
  expect(r.ok && j.quote, `1Click: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return `customer sends ${j.quote.amountInFormatted} ${base.label} -> merchant gets ${j.quote.amountOutFormatted} USDC (dry run, no address)`;
});

await step("Mainnet send link needs a mainnet sponsor", async () => {
  const kp = KeyPair.fromRandom("ed25519");
  const implicit = Buffer.from(kp.getPublicKey().data).toString("hex");
  const out = await call("POST", "/api/sends", { amountDecimal: "1", implicitAccount: implicit, network: "mainnet" }).then((i) => `created ${i.id}`, (e) => e.message);
  return out;
});

if (LOCAL)
  await step("Local only: mainnet link -> real 1Click deposit address -> status", async () => {
    const inv = await call("POST", "/api/invoices", { merchant: MERCHANT, description: "Audit any-chain link (local)", amountDecimal: "1", asset: USDC_MAINNET });
    const { tokens } = await call("GET", "/api/checkout/tokens");
    const base = tokens.find((t: any) => t.label === "USDC on base") ?? tokens.find((t: any) => t.chainId === 8453);
    const q = await call("POST", `/api/invoices/${inv.id}/quote`, { originAsset: base.assetId, refundTo: REFUND });
    const c = q.checkouts.at(-1);
    expect(c?.depositAddress, "no deposit address");
    const again = await call("GET", `/api/invoices/${inv.id}`);
    return `${inv.id}: send ${c.amountIn} ${c.label} to ${c.depositAddress.slice(0, 10)}… by ${c.deadline}; status ${again.checkouts.at(-1).status} (nobody pays it; it expires)`;
  });

console.log("\n" + results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.step}\n      ${r.note}`).join("\n"));
