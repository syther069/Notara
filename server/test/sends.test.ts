import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyPair, KeyPairSigner, actions, buildDelegateAction, encodeSignedDelegate } from "near-api-js";
import { checkClaimDelegate, decodeSignedDelegate, fundRefusal, implicitPublicKey } from "../sends.ts";
import { USDC_TESTNET } from "../../passport/src/assets.ts";

const hex = (kp: KeyPair) => Buffer.from(kp.getPublicKey().data).toString("hex");

/** Builds and signs a delegate action the way the claim page does, then round-trips it through base64 borsh. */
async function signed(kp: KeyPair, opts: { sender?: string; receiver?: string; acts?: any[] } = {}) {
  const link = hex(kp);
  const d = buildDelegateAction({
    senderId: opts.sender ?? link,
    receiverId: opts.receiver ?? USDC_TESTNET,
    actions: opts.acts ?? [actions.functionCall("ft_transfer", { receiver_id: "alice.testnet", amount: "1000000" }, 15_000_000_000_000n, 1n)],
    nonce: 1n,
    maxBlockHeight: 100n,
    publicKey: kp.getPublicKey(),
  });
  const { signedDelegate } = await new KeyPairSigner(kp).signDelegateAction(d);
  return decodeSignedDelegate(Buffer.from(encodeSignedDelegate(signedDelegate)).toString("base64"));
}

test("a claim may only be one USDC transfer signed by the link's own key", async () => {
  const kp = KeyPair.fromRandom("ed25519");
  const link = hex(kp);
  assert.equal(checkClaimDelegate(await signed(kp), link, "testnet"), "alice.testnet");

  const other = KeyPair.fromRandom("ed25519");
  await assert.rejects(async () => checkClaimDelegate(await signed(other, { sender: link }), link, "testnet"), /link's key/);
  await assert.rejects(async () => checkClaimDelegate(await signed(kp, { receiver: "evil.testnet" }), link, "testnet"), /USDC contract/);
  await assert.rejects(async () => checkClaimDelegate(await signed(kp, { acts: [actions.transfer(1n)] }), link, "testnet"), /one USDC transfer/);
  await assert.rejects(
    async () => checkClaimDelegate(await signed(kp, { acts: [actions.functionCall("ft_transfer", { receiver_id: "a.testnet", amount: "1" }, 15_000_000_000_000n, 5n)] }), link, "testnet"),
    /1 yoctoNEAR/,
  );
  await assert.rejects(
    async () =>
      checkClaimDelegate(
        await signed(kp, { acts: [1, 2].map(() => actions.functionCall("ft_transfer", { receiver_id: "a.testnet", amount: "1" }, 15_000_000_000_000n, 1n)) }),
        link,
        "testnet",
      ),
    /one USDC transfer/,
  );
});

test("the sponsor funds a link account once, and only after the link is paid", () => {
  assert.equal(fundRefusal({ kind: "send", status: "paid" }), null);
  assert.equal(fundRefusal({ kind: "send", status: "paid", linkFundedAt: "2026-11-09T00:00:00Z" }), "already");
  assert.match(fundRefusal({ kind: "send", status: "unpaid" })!, /funded/);
  assert.match(fundRefusal({ status: "paid" })!, /Not a send link/);
});

test("an implicit account id maps back to its ed25519 key", () => {
  const kp = KeyPair.fromRandom("ed25519");
  assert.equal(implicitPublicKey(hex(kp)), kp.getPublicKey().toString());
});

test("send links are limited per signing wallet, with a site-wide backstop", async () => {
  const { sendLimitReason, MAX_SENDS_PER_SENDER_PER_DAY, MAX_SENDS_PER_DAY } = await import("../sends.ts");
  const today = "2026-11-12";
  const mk = (sentBy: string, n: number, day = today) => Array.from({ length: n }, () => ({ kind: "send" as const, createdAt: `${day}T10:00:00Z`, sentBy }));
  assert.equal(sendLimitReason([], "alice.testnet", today), null);
  assert.match(sendLimitReason(mk("alice.testnet", MAX_SENDS_PER_SENDER_PER_DAY), "alice.testnet", today)!, /send links a day/);
  assert.equal(sendLimitReason(mk("alice.testnet", MAX_SENDS_PER_SENDER_PER_DAY), "bob.testnet", today), null); // one sender can't block another
  assert.equal(sendLimitReason(mk("alice.testnet", 50, "2026-11-11"), "alice.testnet", today), null); // yesterday doesn't count
  const many = Array.from({ length: MAX_SENDS_PER_DAY }, (_, i) => mk(`s${i}.testnet`, 1)).flat();
  assert.match(sendLimitReason(many, "new.testnet", today)!, /Daily limit/);
});

test("a send link needs the sender's wallet signature", async () => {
  const { verifySender } = await import("../sends.ts");
  const l = { sender: "alice.testnet", account: "a".repeat(64), amount: "5000000", asset: USDC_TESTNET };
  await assert.rejects(() => verifySender(undefined, l, "testnet"), /Sign with your wallet/);
  await assert.rejects(() => verifySender("not-a-token", l, "testnet"), /didn't check out/);
});
