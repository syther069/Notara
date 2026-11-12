import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyPair } from "near-api-js";
import { sign } from "near-sign-verify";
import { isPrivateAddress, linkMessage, normalizeWebsite, verifyLinkToken, SIGN_RECIPIENT } from "../merchants.ts";

const USDC = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const link = { merchant: "priya.near", amount: "50000000", asset: USDC, description: "Logo design" };

test("the signed message says who gets paid, how much, and for what", () => {
  assert.equal(linkMessage(link), "Notara payment link\nPay to: priya.near\nAmount: 50 USDC\nFor: Logo design");
});

test("a signature for one link can't be reused for another amount or merchant", async () => {
  const kp = KeyPair.fromRandom("ed25519");
  const token = await sign(linkMessage(link), { signer: kp.toString(), accountId: "priya.near", recipient: SIGN_RECIPIENT });
  // Fails before the on-chain key lookup: the message no longer matches.
  await assert.rejects(verifyLinkToken(token, { ...link, amount: "500000000" }, true), /signed text doesn.t match/);
  await assert.rejects(verifyLinkToken(token, { ...link, merchant: "scammer.near" }, true), /signed text doesn.t match/);
});

test("the due date and line items are signed too, so nobody can change them after", async () => {
  const items = [{ description: "Logo", quantity: "2", unitAmount: "25000000" }];
  const full = { ...link, dueDate: "2026-12-01", items };
  assert.equal(linkMessage(full), "Notara payment link\nPay to: priya.near\nAmount: 50 USDC\nFor: Logo design\nDue: 2026-12-01\nItems:\n- 2 x Logo @ 25 USDC");
  const kp = KeyPair.fromRandom("ed25519");
  const token = await sign(linkMessage(full), { signer: kp.toString(), accountId: "priya.near", recipient: SIGN_RECIPIENT });
  await assert.rejects(verifyLinkToken(token, { ...full, dueDate: "2027-01-01" }, true), /signed text doesn.t match/);
  await assert.rejects(verifyLinkToken(token, { ...full, items: [{ ...items[0], quantity: "3" }] }, true), /signed text doesn.t match/);
});

test("website input becomes a bare public hostname", () => {
  assert.equal(normalizeWebsite("https://Shop.Example.com/about"), "shop.example.com");
  assert.equal(normalizeWebsite("shop.example.com"), "shop.example.com");
  for (const bad of ["localhost", "127.0.0.1", "intranet", "printer.local"]) assert.throws(() => normalizeWebsite(bad));
});

test("private and loopback addresses are refused", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1"]) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ["8.8.8.8", "104.16.1.1", "2606:4700::1111"]) assert.ok(!isPrivateAddress(ip), ip);
});

test("a signature stays fresh for its window, even from a clock that runs a little fast", async () => {
  const { freshNonce } = await import("../merchants.ts");
  const nonceAt = (ms: number) => {
    const n = new Uint8Array(32);
    n.set(new TextEncoder().encode(String(ms).padStart(16, "0")));
    return n;
  };
  const ok = freshNonce(600_000);
  assert.ok(ok(nonceAt(Date.now())));
  assert.ok(ok(nonceAt(Date.now() + 6_000)), "signer's clock 6 s ahead (seen live against Vercel)");
  assert.ok(!ok(nonceAt(Date.now() + 10 * 60_000)), "far in the future");
  assert.ok(!ok(nonceAt(Date.now() - 11 * 60_000)), "expired");
  assert.ok(!ok(new Uint8Array(16)), "wrong length");
});

test("listing a merchant's links needs that merchant's wallet signature", async () => {
  const { verifyLinksProof, linksMessage } = await import("../merchants.ts");
  assert.equal(linksMessage("shop.near"), "Notara: show my payment links\nAccount: shop.near");
  await assert.rejects(() => verifyLinksProof("", "shop.near", "mainnet"), /Sign with your wallet/);
  await assert.rejects(() => verifyLinksProof("garbage", "shop.near", "mainnet"), /didn't check out/);
});
