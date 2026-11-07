import { test } from "node:test";
import assert from "node:assert/strict";
import { erc20TransferData } from "./evm.ts";

test("ERC-20 transfer data matches the ABI encoding", () => {
  // transfer(0x00000000000000000000000000000000000000aa, 510000) — 0.51 USDC
  assert.equal(
    erc20TransferData("0x00000000000000000000000000000000000000AA", "510000"),
    "0xa9059cbb" + "aa".padStart(64, "0") + "7c830".padStart(64, "0"),
  );
});
