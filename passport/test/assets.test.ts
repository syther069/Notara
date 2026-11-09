import { test } from "node:test";
import assert from "node:assert/strict";
import { USDC_MAINNET, USDC_TESTNET, linkNetwork, usdcFor } from "../src/assets.ts";

test("a payment link's network comes from its USDC contract", () => {
  assert.equal(linkNetwork(USDC_MAINNET), "mainnet");
  assert.equal(linkNetwork(USDC_TESTNET), "testnet");
  assert.equal(linkNetwork("NEAR"), undefined); // NEAR invoices are agent invoices, not payment links
  assert.equal(usdcFor("testnet"), USDC_TESTNET);
  assert.equal(usdcFor("mainnet"), USDC_MAINNET);
});
