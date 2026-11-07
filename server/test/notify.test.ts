import { test } from "node:test";
import assert from "node:assert/strict";
import { paidMessage } from "../notify.ts";
import { USDC_MAINNET } from "../../passport/src/assets.ts";

test("paid alert names the link, amount, merchant and tx", () => {
  const m = paidMessage({ id: "INV-0007", amount: "510000", asset: USDC_MAINNET, merchant: "shop.near", description: "Logo", txUrl: "https://nearblocks.io/txns/abc" } as any);
  assert.equal(m, 'Notara: INV-0007 paid. 0.51 USDC to shop.near for "Logo".\nhttps://nearblocks.io/txns/abc');
});
