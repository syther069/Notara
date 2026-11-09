import { test } from "node:test";
import assert from "node:assert/strict";

process.env.VAULT_FACTORY_ACCOUNT = "vaults.demo.testnet";
import { KeyPair } from "near-api-js";
process.env.VAULT_FACTORY_PRIVATE_KEY = KeyPair.fromRandom("ed25519").toString(); // throwaway, never used to sign
const { vaultIdFor, isVisitorVault, isAccountId } = await import("../vaults.ts");

test("each owner gets one vault, named from a hash, always under 64 characters", () => {
  const a = vaultIdFor("alice.testnet");
  assert.equal(a, vaultIdFor("alice.testnet"));
  assert.notEqual(a, vaultIdFor("bob.testnet"));
  assert.match(a, /^v[0-9a-f]{16}\.vaults\.demo\.testnet$/);
  assert.ok(vaultIdFor("a".repeat(64)).length <= 64);
});

test("?vault= only accepts our visitor vaults, never other contracts", () => {
  assert.ok(isVisitorVault(vaultIdFor("alice.testnet")));
  for (const bad of ["usdc.testnet", "vaults.demo.testnet", "x.vaults.demo.testnet", "vabc.vaults.demo.testnet.evil.testnet"]) assert.ok(!isVisitorVault(bad), bad);
  assert.ok(isAccountId("alice.testnet") && !isAccountId("Alice!") && !isAccountId("a"));
});

test("using a vault needs the owner's wallet signature", async () => {
  const { verifyOwnerProof, vaultMessage } = await import("../vaults.ts");
  assert.equal(vaultMessage("alice.testnet"), "Notara: use my vault\nOwner: alice.testnet");
  await assert.rejects(() => verifyOwnerProof(undefined, "alice.testnet"), /Sign with your wallet/);
  await assert.rejects(() => verifyOwnerProof("", "alice.testnet"), /Sign with your wallet/);
  await assert.rejects(() => verifyOwnerProof("not-a-token", "alice.testnet"), /didn't check out/);
});
