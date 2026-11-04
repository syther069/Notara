use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseResult, RuntimeFeesConfig};

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const NOW_MS: u64 = 1_800_000_000_000;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn vault_id() -> AccountId {
    acc("vault.testnet")
}
fn owner() -> AccountId {
    acc("owner.testnet")
}
fn merchant() -> AccountId {
    acc("merchant.testnet")
}
fn attacker() -> AccountId {
    acc("attacker.testnet")
}

fn signing_key() -> SigningKey {
    SigningKey::from_bytes(&[7u8; 32])
}
fn other_key() -> SigningKey {
    SigningKey::from_bytes(&[9u8; 32])
}
fn public_key(sk: &SigningKey) -> PublicKey {
    let mut raw = vec![0u8];
    raw.extend_from_slice(sk.verifying_key().as_bytes());
    PublicKey::try_from(raw).unwrap()
}

fn ctx(predecessor: AccountId, now_ms: u64) {
    testing_env!(VMContextBuilder::new()
        .current_account_id(vault_id())
        .predecessor_account_id(predecessor.clone())
        .signer_account_id(predecessor)
        .block_timestamp(now_ms * 1_000_000)
        .account_balance(NearToken::from_near(100))
        .build());
}

fn setup() -> Vault {
    ctx(owner(), NOW_MS);
    // The agent is the vault account itself, acting through its function-call key.
    Vault::new(
        owner(),
        vault_id(),
        public_key(&signing_key()),
        U128(2 * ONE_NEAR),
        U128(3 * ONE_NEAR),
    )
}

fn verdict(recipient: AccountId, amount: u128, decision: Decision, nonce: u64) -> Verdict {
    Verdict {
        vault: vault_id(),
        recipient,
        amount: U128(amount),
        asset: NEAR_ASSET.into(),
        decision,
        nonce: U64(nonce),
        expires_at_ms: U64(NOW_MS + 60_000),
        report_hash: "ab".repeat(32),
    }
}

fn sign(v: &Verdict, sk: &SigningKey) -> Base64VecU8 {
    Base64VecU8(sk.sign(v.signing_message().as_bytes()).to_bytes().to_vec())
}

fn pay(c: &mut Vault, v: Verdict, sig: Base64VecU8) -> U64 {
    c.request_payment(v.recipient.clone(), v.amount, v.asset.clone(), v, sig, None)
}

#[test]
fn allow_executes_and_reserves_daily() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    let p = c.get_payment(id).unwrap();
    assert_eq!(p.status, PaymentStatus::Executing);
    assert_eq!(c.get_spent_today(NEAR_ASSET.into()).0, ONE_NEAR);
    assert!(c.is_nonce_used(U64(1)));
    assert!(get_logs().iter().any(|l| l.contains("payment_executing")));
}

#[test]
#[should_panic(expected = "Passport verdict is BLOCK: payment refused")]
fn block_verdict_refused_on_chain() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(attacker(), ONE_NEAR, Decision::Block, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Invalid verdict signature")]
fn forged_signature_rejected() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(attacker(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &other_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Invalid verdict signature")]
fn block_rewritten_as_allow_rejected() {
    // A compromised agent edits a signed BLOCK into ALLOW: the signature no longer matches.
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(attacker(), ONE_NEAR, Decision::Block, 1);
    let s = sign(&v, &signing_key());
    let mut tampered = v.clone();
    tampered.decision = Decision::Allow;
    pay(&mut c, tampered, s);
}

#[test]
#[should_panic(expected = "Verdict is for a different recipient")]
fn verdict_reused_for_other_recipient_rejected() {
    // An ALLOW verdict for the merchant cannot be redirected to the attacker.
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    c.request_payment(attacker(), v.amount, v.asset.clone(), v, s, None);
}

#[test]
#[should_panic(expected = "Verdict is for a different amount")]
fn verdict_amount_mismatch_rejected() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    c.request_payment(merchant(), U128(2 * ONE_NEAR), v.asset.clone(), v, s, None);
}

#[test]
#[should_panic(expected = "Verdict expired")]
fn expired_verdict_rejected() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS + 120_000);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Verdict lifetime exceeds vault maximum")]
fn long_lived_verdict_rejected() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let mut v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    v.expires_at_ms = U64(NOW_MS + 24 * 3_600_000);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Verdict nonce already used")]
fn replayed_verdict_rejected() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v.clone(), s.clone());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Only the configured agent can request payments")]
fn stranger_cannot_request_payment() {
    let mut c = setup();
    ctx(attacker(), NOW_MS);
    let v = verdict(attacker(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Amount exceeds per-transaction cap")]
fn per_tx_cap_enforced_even_with_allow() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), 5 * ONE_NEAR / 2, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "Amount exceeds daily cap")]
fn daily_cap_enforced_across_payments() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    for n in 1..=2 {
        let v = verdict(merchant(), 2 * ONE_NEAR, Decision::Allow, n);
        let s = sign(&v, &signing_key());
        pay(&mut c, v, s);
    }
}

#[test]
fn daily_cap_resets_next_day() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), 2 * ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
    let tomorrow = NOW_MS + MS_PER_DAY;
    ctx(vault_id(), tomorrow);
    let mut v = verdict(merchant(), 2 * ONE_NEAR, Decision::Allow, 2);
    v.expires_at_ms = U64(tomorrow + 60_000);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
    assert_eq!(c.get_spent_today(NEAR_ASSET.into()).0, 2 * ONE_NEAR);
}

#[test]
fn warn_parks_until_owner_approves() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Warn, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::PendingApproval);
    assert_eq!(c.get_spent_today(NEAR_ASSET.into()).0, 0);

    ctx(owner(), NOW_MS + 5_000);
    c.approve(id);
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Executing);
    assert_eq!(c.get_spent_today(NEAR_ASSET.into()).0, ONE_NEAR);
}

#[test]
#[should_panic(expected = "Only the owner can do this")]
fn agent_cannot_approve_its_own_warn() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Warn, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    c.approve(id);
}

#[test]
fn owner_can_reject_warn() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Warn, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    ctx(owner(), NOW_MS);
    c.reject(id);
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Rejected);
}

#[test]
fn stale_pending_payment_expires_instead_of_paying() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Warn, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    ctx(owner(), NOW_MS + MS_PER_DAY + 1);
    c.approve(id);
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Expired);
}

#[test]
#[should_panic(expected = "Only the owner can do this")]
fn agent_cannot_raise_caps() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    c.set_cap(NEAR_ASSET.into(), U128(1_000 * ONE_NEAR), U128(1_000 * ONE_NEAR));
}

#[test]
#[should_panic(expected = "Only the owner can do this")]
fn agent_cannot_swap_signer_key() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    c.set_signer_public_key(public_key(&other_key()));
}

#[test]
#[should_panic(expected = "Vault is paused")]
fn paused_vault_refuses_payments() {
    let mut c = setup();
    ctx(owner(), NOW_MS);
    c.set_paused(true);
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
#[should_panic(expected = "No cap configured for this asset")]
fn unknown_token_refused() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let mut v = verdict(merchant(), 10, Decision::Allow, 1);
    v.asset = "usdc.fakes.testnet".into();
    let s = sign(&v, &signing_key());
    pay(&mut c, v, s);
}

#[test]
fn ft_payment_allowed_when_cap_set() {
    let mut c = setup();
    ctx(owner(), NOW_MS);
    c.set_cap("usdc.fakes.testnet".into(), U128(100), U128(500));
    ctx(vault_id(), NOW_MS);
    let mut v = verdict(merchant(), 50, Decision::Allow, 1);
    v.asset = "usdc.fakes.testnet".into();
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    assert_eq!(c.get_payment(id).unwrap().asset, "usdc.fakes.testnet");
    assert_eq!(c.get_spent_today("usdc.fakes.testnet".into()).0, 50);
}

#[test]
fn failed_payout_releases_daily_reservation() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);

    testing_env!(
        VMContextBuilder::new()
            .current_account_id(vault_id())
            .predecessor_account_id(vault_id())
            .block_timestamp(NOW_MS * 1_000_000)
            .build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        vec![PromiseResult::Failed],
    );
    assert!(!c.on_payout(id));
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Failed);
    assert_eq!(c.get_spent_today(NEAR_ASSET.into()).0, 0);
}

#[test]
fn typescript_signature_verifies_on_chain() {
    // Signature produced by passport/src/verdict.ts (see passport/test/verdict.test.ts, TS_SIGNATURE)
    // with the same seed [7u8; 32]. Proves the off-chain signer and the contract agree.
    use near_sdk::base64::Engine;
    let sig = near_sdk::base64::engine::general_purpose::STANDARD
        .decode("IZ0D7vHRyEazW0PpLB2SEMUNQNPqet9t92NLfCyb0FV729FYg6KRc5nHIohDH/Awa2gCbwS1fo32XZGzdd4ACw==")
        .unwrap();
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 42);
    let id = pay(&mut c, v, Base64VecU8(sig));
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Executing);
}

#[test]
fn signing_message_is_stable() {
    // The Passport (TypeScript) signer has a matching test that must produce this exact string.
    let v = verdict(merchant(), ONE_NEAR, Decision::Allow, 42);
    assert_eq!(
        v.signing_message(),
        format!(
            "agentspend-passport/v1\nvault.testnet\nmerchant.testnet\n{}\nNEAR\nALLOW\n42\n{}\n{}",
            ONE_NEAR,
            NOW_MS + 60_000,
            "ab".repeat(32)
        )
    );
}

#[test]
fn ownership_handover_two_step() {
    let mut c = setup();
    let wallet = acc("human-wallet.testnet");
    ctx(owner(), NOW_MS);
    c.propose_owner(wallet.clone());
    assert_eq!(c.get_pending_owner(), Some(wallet.clone()));
    // Old owner still in charge until accepted.
    assert_eq!(c.get_config().owner, owner());
    ctx(wallet.clone(), NOW_MS);
    c.accept_owner();
    assert_eq!(c.get_config().owner, wallet);
    assert_eq!(c.get_pending_owner(), None);
    // New owner can approve; old owner can't.
    ctx(vault_id(), NOW_MS);
    let v = verdict(merchant(), ONE_NEAR, Decision::Warn, 1);
    let s = sign(&v, &signing_key());
    let id = pay(&mut c, v, s);
    ctx(wallet, NOW_MS);
    c.approve(id);
    assert_eq!(c.get_payment(id).unwrap().status, PaymentStatus::Executing);
}

#[test]
#[should_panic(expected = "Only the proposed owner can accept")]
fn stranger_cannot_accept_ownership() {
    let mut c = setup();
    ctx(owner(), NOW_MS);
    c.propose_owner(acc("human-wallet.testnet"));
    ctx(attacker(), NOW_MS);
    c.accept_owner();
}

#[test]
#[should_panic(expected = "Only the owner can do this")]
fn agent_cannot_propose_owner() {
    let mut c = setup();
    ctx(vault_id(), NOW_MS);
    c.propose_owner(attacker());
}

#[test]
// In this deployment the agent acts as the vault account itself, so the vault check fires first.
#[should_panic(expected = "The vault cannot own itself")]
fn agent_cannot_be_proposed_as_owner() {
    let mut c = setup();
    ctx(owner(), NOW_MS);
    c.propose_owner(vault_id());
}
