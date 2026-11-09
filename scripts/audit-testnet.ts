// Live testnet audit: drives every Notara workflow through the local backend (http://127.0.0.1:8787),
// signing as the demo accounts in keys/. Spends only free testnet NEAR/USDC. Usage: tsx scripts/audit-testnet.ts [step...]
import { Account, KeyPair, actions, encodeSignedDelegate, type KeyPairString } from "near-api-js";
import { sign } from "near-sign-verify";
import { readKey } from "../agent/src/keys.ts";
import { NETWORKS } from "../passport/src/config.ts";
import { viewFunction } from "../passport/src/near.ts";
import { USDC_TESTNET } from "../passport/src/assets.ts";

const API = process.env.API ?? "http://127.0.0.1:8787";
const RPC = NETWORKS.testnet.rpc;
const acct = (name: string) => {
  const k = readKey(name);
  return new Account(k.account_id, RPC, k.secret_key as KeyPairString);
};
const keyOf = (name: string) => readKey(name);
async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(API + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${typeof json === "string" ? json : json.error ?? JSON.stringify(json)}`);
  return json;
}
const usdc = (a: string) => viewFunction<string>("testnet", USDC_TESTNET, "ft_balance_of", { account_id: a }).catch(() => "0");
const results: { step: string; ok: boolean; note: string }[] = [];
async function step(name: string, fn: () => Promise<string>) {
  const t = Date.now();
  try {
    const note = await fn();
    results.push({ step: name, ok: true, note });
    console.log(`PASS ${name} (${((Date.now() - t) / 1000).toFixed(1)}s): ${note}`);
  } catch (e: any) {
    results.push({ step: name, ok: false, note: e.message });
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
const expect = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

const dep = await call("GET", "/api/deployment");
const merchant = keyOf("merchant").account_id;
const newshop = keyOf("newshop").account_id;
const attacker = dep.accounts.attacker as string;
const only = process.argv.slice(2);
const want = (s: string) => !only.length || only.includes(s);

if (want("check"))
  await step("Passport check: known merchant, new shop, reported attacker", async () => {
    const d = async (recipient: string) => {
      const r = await call("POST", "/v1/check", { network: "testnet", recipient, amountDecimal: "0.1", asset: "NEAR" });
      return r.report?.decision ?? r.decision;
    };
    const [m, n, a] = [await d(merchant), await d(newshop), await d(attacker)];
    expect(a === "BLOCK", `attacker got ${a}, expected BLOCK`);
    return `merchant ${m}, new shop ${n}, attacker ${a}`;
  });

if (want("link"))
  await step("Signed USDC payment link: merchant signs, customer pays from NEAR wallet", async () => {
    const description = `Audit link ${new Date().toISOString().slice(11, 19)}`;
    const amountDecimal = "0.1";
    const msg = await call("POST", "/api/links/message", { merchant: newshop, description, amountDecimal, asset: USDC_TESTNET });
    const k = keyOf("newshop");
    const token = await sign(msg.message, { signer: k.secret_key, accountId: k.account_id, recipient: msg.recipient });
    const inv = await call("POST", "/api/invoices", { merchant: newshop, description, amountDecimal, asset: USDC_TESTNET, signedToken: token });
    const view = await call("GET", `/api/invoices/${inv.id}`);
    expect(view.signature?.valid ?? view.signatureValid ?? view.signature, `link ${inv.id} shows no valid signature: ${JSON.stringify(view.signature)}`);
    const before = BigInt(await usdc(newshop));
    // The same two actions the "Pay with a NEAR wallet" button sends (web/src/lib/wallet.tsx payUsdc).
    const out: any = await acct("merchant").signAndSendTransaction({
      receiverId: USDC_TESTNET,
      actions: [
        actions.functionCall("storage_deposit", { account_id: newshop, registration_only: true }, 30_000_000_000_000n, 1_250_000_000_000_000_000_000n),
        actions.functionCall("ft_transfer", { receiver_id: newshop, amount: inv.amount, memo: inv.id }, 30_000_000_000_000n, 1n),
      ],
    });
    const paid = await call("POST", `/api/invoices/${inv.id}/near-tx`, { txHash: out.transaction.hash, signerId: merchant });
    expect(paid.status === "paid", `status ${paid.status}`);
    const after = BigInt(await usdc(newshop));
    expect(after - before === BigInt(inv.amount), `new shop USDC moved by ${after - before}`);
    // Replaying the same tx for another link must be refused.
    const inv2 = await call("POST", "/api/invoices", { merchant: newshop, description: description + " b", amountDecimal, asset: USDC_TESTNET });
    const replay = await call("POST", `/api/invoices/${inv2.id}/near-tx`, { txHash: out.transaction.hash, signerId: merchant }).then(() => "accepted", (e) => e.message);
    expect(replay !== "accepted", "a used transaction paid a second link");
    return `${inv.id} paid, tx ${paid.txUrl}; replay on ${inv2.id} refused`;
  });

if (want("invoice"))
  await step("NEAR invoice paid by the customer's AI agent through Passport and the vault", async () => {
    const inv = await call("POST", "/api/invoices", { description: "Audit agent invoice", amountDecimal: "0.01", asset: "NEAR" });
    const r = await call("POST", `/api/invoices/${inv.id}/pay`);
    expect(["paid", "pending_approval"].includes(r.invoice.status), `status ${r.invoice.status}: ${(r.invoice.reasons ?? []).join("; ")}`);
    return `${inv.id} ${r.invoice.status} (${r.invoice.decision}), tx ${r.invoice.txHash}`;
  });

if (want("usdc-invoice"))
  await step("USDC invoice paid by the customer's AI agent from the vault (ft_transfer)", async () => {
    const before = BigInt(await usdc(merchant));
    const inv = await call("POST", "/api/invoices", { description: "Audit USDC agent invoice", amountDecimal: "2", asset: USDC_TESTNET });
    const r = await call("POST", `/api/invoices/${inv.id}/pay`);
    expect(r.invoice.status === "paid", `status ${r.invoice.status}: ${(r.invoice.reasons ?? []).join("; ")}`);
    await new Promise((res) => setTimeout(res, 3000));
    const after = BigInt(await usdc(merchant));
    expect(after - before === 2_000_000n, `merchant USDC moved by ${after - before}`);
    return `${inv.id} paid 2 USDC (${r.invoice.decision}), tx ${r.invoice.txHash}`;
  });

if (want("send"))
  await step("Send by link: create, fund from a wallet, claim into a brand-new name (gas sponsored)", async () => {
    const kp = KeyPair.fromRandom("ed25519");
    const implicit = Buffer.from(kp.getPublicKey().data).toString("hex");
    const inv = await call("POST", "/api/sends", { amountDecimal: "1", implicitAccount: implicit, network: "testnet", note: "Audit send" });
    // The sender funds it on the link's pay page, which sends ft_transfer with memo = link id, then reports the tx.
    const fund: any = await acct("merchant").signAndSendTransaction({
      receiverId: USDC_TESTNET,
      actions: [actions.functionCall("ft_transfer", { receiver_id: implicit, amount: inv.amount, memo: inv.id }, 30_000_000_000_000n, 1n)],
    });
    await call("POST", `/api/invoices/${inv.id}/near-tx`, { txHash: fund.transaction.hash, signerId: merchant });
    let st = await call("GET", `/api/sends/${inv.id}`);
    expect(st.invoice.status === "paid", `after funding the link shows ${st.invoice.status}`);
    st = await call("POST", `/api/sends/${inv.id}/activate`);
    expect(st.claimReady, "not claim-ready after activate");
    const name = `notara-audit-${Date.now().toString(36)}.testnet`;
    // Same meta transaction the claim page builds (web/src/pages/Claim.tsx moveUsdc).
    const link = new Account(implicit, RPC, kp.toString() as KeyPairString);
    const { signedDelegate } = await link.createSignedMetaTransaction({
      receiverId: USDC_TESTNET,
      actions: [actions.functionCall("ft_transfer", { receiver_id: name, amount: st.balance, memo: "Notara send link" }, 15_000_000_000_000n, 1n)],
      blockHeightTtl: 200,
    });
    const r = await call("POST", `/api/sends/${inv.id}/claim`, { signedDelegate: Buffer.from(encodeSignedDelegate(signedDelegate)).toString("base64"), newName: true });
    const got = await usdc(name);
    expect(got === inv.amount, `${name} holds ${got} USDC units, expected ${inv.amount}`);
    const again = await call("POST", `/api/sends/${inv.id}/claim`, { signedDelegate: Buffer.from(encodeSignedDelegate(signedDelegate)).toString("base64"), newName: false }).then(() => "accepted", (e) => e.message);
    expect(again !== "accepted", "second claim accepted");
    return `${inv.id}: 1 USDC claimed into new account ${name}, tx ${r.claimTx}; second claim refused`;
  });

if (want("vault"))
  await step("Own AI-agent vault: sign, create, fund, run all four scenarios", async () => {
    const k = keyOf("newshop");
    const info = await call("GET", `/api/vaults/${newshop}`);
    const proof = () => sign(info.message, { signer: k.secret_key, accountId: k.account_id, recipient: "notara" });
    let v = info;
    if (!info.exists) v = await call("POST", "/api/vaults", { owner: newshop, proof: await proof() });
    if (BigInt(v.balance ?? "0") < 300_000_000_000_000_000_000_000n) await acct("newshop").transfer({ receiverId: v.vault, amount: 300_000_000_000_000_000_000_000n });
    const outs: string[] = [];
    for (const scenario of (process.env.SCEN ?? "legit,injected,new-shop,tamper").split(",")) {
      const r = await call("POST", `/api/vaults/${newshop}/run`, { scenario, proof: await proof() });
      outs.push(`${scenario}: ${(r.calls ?? []).map((c: any) => `${c.recipient ?? c.attempt} -> ${c.status ?? (c.refused === undefined ? c.error : c.refused ? "refused: " + c.reason : "NOT REFUSED")}`).join(", ")}`);
      await new Promise((res) => setTimeout(res, 16_000)); // one run per 15 s per vault
    }
    return `${v.vault} ${info.exists ? "(existing)" : "created"} | ${outs.join(" | ")}`;
  });

if (want("report"))
  await step("Scam registry: file a report with the 0.01 NEAR bond, read it back", async () => {
    const before: any[] = await viewFunction("testnet", dep.registry, "get_reports_for", { subject: attacker });
    const r: any = await acct("newshop").callFunction({
      contractId: dep.registry,
      methodName: "submit_report",
      args: { subject: attacker, category: "Scam", description: "Audit: asked for payment to a lookalike account", evidence_uri: "https://testnet.nearblocks.io/address/" + attacker, evidence_hash: null },
      deposit: 10_000_000_000_000_000_000_000n,
      gas: 30_000_000_000_000n,
    });
    await new Promise((res) => setTimeout(res, 3000)); // views read "final" state, a block or two behind
    const after: any[] = await viewFunction("testnet", dep.registry, "get_reports_for", { subject: attacker });
    expect(after.length === before.length + 1, `reports ${before.length} -> ${after.length}`);
    return `report #${after.length} on ${attacker} (${JSON.stringify(r).slice(0, 40)}…)`;
  });

if (want("misc"))
  await step("Merchant profile, vault summary, CSV export", async () => {
    const p = await call("GET", `/api/merchants/${newshop}`);
    const v = await call("GET", "/api/vault");
    const csv = await fetch(`${API}/api/invoices.csv?merchant=${newshop}`).then((r) => r.text());
    expect(csv.split("\n").length > 1, "empty CSV");
    return `profile paid ${p.paidTotal} over ${p.links} links; vault ${JSON.stringify(v.balance ?? v.near ?? "").slice(0, 40)}; CSV ${csv.trim().split("\n").length - 1} rows`;
  });

console.log("\n" + results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.step}\n      ${r.note}`).join("\n"));
process.exit(results.every((r) => r.ok) ? 0 : 1);
