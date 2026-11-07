//! Notara vault.
//!
//! The vault holds the agent's spending money. The agent never holds a full-access key:
//! it holds a function-call access key on this account, restricted to `request_payment`
//! with no allowance for attached deposits (function-call keys cannot attach deposits).
//!
//! A payment leaves the vault only when ALL of these hold, checked on-chain:
//! - the caller is the configured agent;
//! - a verdict signed by the configured Notara signer key is supplied;
//! - the verdict is bound to this vault, this recipient, this amount and this asset;
//! - the verdict has not expired and is not too long-lived;
//! - the verdict's nonce has never been used;
//! - the verdict decision is ALLOW (executed now) or WARN (parked until the owner approves);
//! - the payment fits the per-transaction and daily caps for that asset.
//!
//! A BLOCK verdict is rejected on-chain too, so an agent that skips its own wrapper
//! still cannot move funds.

use near_sdk::json_types::{Base64VecU8, U128, U64};
use near_sdk::store::{LookupSet, Vector};
use near_sdk::{
    env, ext_contract, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise,
    PromiseError, PublicKey,
};
use std::collections::BTreeMap;

pub const NEAR_ASSET: &str = "NEAR";
pub const DOMAIN: &str = "agentspend-passport/v1";
const MS_PER_DAY: u64 = 86_400_000;
const FT_TRANSFER_GAS: Gas = Gas::from_tgas(15);
const CALLBACK_GAS: Gas = Gas::from_tgas(10);
const PENDING_OWNER_KEY: &[u8] = b"pending_owner";

#[ext_contract(ext_ft)]
#[allow(dead_code)]
trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Decision {
    #[serde(rename = "ALLOW")]
    Allow,
    #[serde(rename = "WARN")]
    Warn,
    #[serde(rename = "BLOCK")]
    Block,
}

impl Decision {
    pub fn as_str(&self) -> &'static str {
        match self {
            Decision::Allow => "ALLOW",
            Decision::Warn => "WARN",
            Decision::Block => "BLOCK",
        }
    }
}

/// The verdict as signed off-chain by Notara service.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Verdict {
    pub vault: AccountId,
    pub recipient: AccountId,
    pub amount: U128,
    /// "NEAR" or the NEP-141 token contract account id.
    pub asset: String,
    pub decision: Decision,
    pub nonce: U64,
    pub expires_at_ms: U64,
    /// sha256 (hex) of the full off-chain report, so the on-chain record points at the evidence.
    pub report_hash: String,
}

impl Verdict {
    /// Canonical byte string that Notara signs. Kept as plain text so any language can
    /// reproduce it exactly. Newline is not a legal character in any field.
    pub fn signing_message(&self) -> String {
        format!(
            "{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}",
            DOMAIN,
            self.vault,
            self.recipient,
            self.amount.0,
            self.asset,
            self.decision.as_str(),
            self.nonce.0,
            self.expires_at_ms.0,
            self.report_hash
        )
    }
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    PendingApproval,
    Executing,
    Executed,
    Failed,
    Rejected,
    Expired,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Payment {
    pub id: U64,
    pub recipient: AccountId,
    pub amount: U128,
    pub asset: String,
    pub decision: Decision,
    pub report_hash: String,
    pub memo: Option<String>,
    pub status: PaymentStatus,
    pub created_at_ms: U64,
    pub updated_at_ms: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct AssetCap {
    pub per_tx: U128,
    pub daily: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct Spent {
    pub day: u64,
    pub amount: u128,
}

#[near(serializers = [json])]
pub struct Config {
    pub owner: AccountId,
    pub agent: AccountId,
    pub signer_public_key: PublicKey,
    pub max_verdict_ttl_ms: U64,
    pub pending_ttl_ms: U64,
    pub paused: bool,
    pub caps: BTreeMap<String, AssetCap>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Vault {
    owner: AccountId,
    agent: AccountId,
    signer_public_key: PublicKey,
    max_verdict_ttl_ms: u64,
    pending_ttl_ms: u64,
    paused: bool,
    caps: BTreeMap<String, AssetCap>,
    spent: BTreeMap<String, Spent>,
    used_nonces: LookupSet<u64>,
    payments: Vector<Payment>,
}

fn event(name: &str, data: String) {
    env::log_str(&format!(
        "EVENT_JSON:{{\"standard\":\"agentspend_vault\",\"version\":\"1.0.0\",\"event\":\"{}\",\"data\":[{}]}}",
        name, data
    ));
}

fn ed25519_bytes(pk: &PublicKey) -> [u8; 32] {
    let raw = pk.as_bytes();
    require!(raw.len() == 33 && raw[0] == 0, "Signer key must be ed25519");
    raw[1..].try_into().unwrap()
}

fn validate_asset(asset: &str) {
    if asset != NEAR_ASSET {
        require!(
            asset.parse::<AccountId>().is_ok(),
            "Asset must be NEAR or a token contract account id"
        );
    }
}

#[near]
impl Vault {
    #[init]
    pub fn new(
        owner: AccountId,
        agent: AccountId,
        signer_public_key: PublicKey,
        near_per_tx_cap: U128,
        near_daily_cap: U128,
    ) -> Self {
        require!(
            owner != env::current_account_id(),
            "Owner must be a separate account from the vault"
        );
        let _ = ed25519_bytes(&signer_public_key);
        let mut caps = BTreeMap::new();
        caps.insert(
            NEAR_ASSET.to_string(),
            AssetCap {
                per_tx: near_per_tx_cap,
                daily: near_daily_cap,
            },
        );
        Self {
            owner,
            agent,
            signer_public_key,
            max_verdict_ttl_ms: 10 * 60 * 1000,
            pending_ttl_ms: MS_PER_DAY,
            paused: false,
            caps,
            spent: BTreeMap::new(),
            used_nonces: LookupSet::new(b"n"),
            payments: Vector::new(b"p"),
        }
    }

    // ------------------------------------------------------------------ agent path

    /// Called by the agent (through its function-call key). Returns the payment id.
    pub fn request_payment(
        &mut self,
        recipient: AccountId,
        amount: U128,
        asset: String,
        verdict: Verdict,
        signature: Base64VecU8,
        memo: Option<String>,
    ) -> U64 {
        require!(!self.paused, "Vault is paused");
        require!(
            env::predecessor_account_id() == self.agent,
            "Only the configured agent can request payments"
        );
        require!(amount.0 > 0, "Amount must be positive");
        validate_asset(&asset);
        if let Some(m) = &memo {
            require!(m.len() <= 256, "Memo too long");
        }

        // 1. Signature from the configured Notara signer.
        let sig: [u8; 64] = signature
            .0
            .as_slice()
            .try_into()
            .unwrap_or_else(|_| env::panic_str("Signature must be 64 bytes"));
        let message = verdict.signing_message();
        require!(
            env::ed25519_verify(
                &sig,
                message.as_bytes(),
                &ed25519_bytes(&self.signer_public_key)
            ),
            "Invalid verdict signature"
        );

        // 2. The verdict is bound to exactly this payment.
        require!(
            verdict.vault == env::current_account_id(),
            "Verdict is for a different vault"
        );
        require!(
            verdict.recipient == recipient,
            "Verdict is for a different recipient"
        );
        require!(verdict.amount == amount, "Verdict is for a different amount");
        require!(verdict.asset == asset, "Verdict is for a different asset");

        // 3. Freshness and replay protection.
        let now = env::block_timestamp_ms();
        require!(verdict.expires_at_ms.0 > now, "Verdict expired");
        require!(
            verdict.expires_at_ms.0 - now <= self.max_verdict_ttl_ms,
            "Verdict lifetime exceeds vault maximum"
        );
        require!(
            self.used_nonces.insert(verdict.nonce.0),
            "Verdict nonce already used"
        );

        // 4. Decision.
        require!(
            verdict.decision != Decision::Block,
            "Notara verdict is BLOCK: payment refused"
        );

        // 5. Per-transaction cap is checked up front for both ALLOW and WARN.
        let cap = self
            .caps
            .get(&asset)
            .cloned()
            .unwrap_or_else(|| env::panic_str("No cap configured for this asset"));
        require!(amount.0 <= cap.per_tx.0, "Amount exceeds per-transaction cap");

        let id = self.payments.len() as u64;
        let mut payment = Payment {
            id: U64(id),
            recipient,
            amount,
            asset,
            decision: verdict.decision,
            report_hash: verdict.report_hash,
            memo,
            status: PaymentStatus::PendingApproval,
            created_at_ms: U64(now),
            updated_at_ms: U64(now),
        };

        match verdict.decision {
            Decision::Allow => {
                self.reserve_daily(&payment.asset, payment.amount.0);
                payment.status = PaymentStatus::Executing;
                self.payments.push(payment.clone());
                event("payment_executing", self.payment_json(id));
                self.payout(&payment);
            }
            Decision::Warn => {
                self.payments.push(payment);
                event("payment_pending_approval", self.payment_json(id));
            }
            Decision::Block => unreachable!(),
        }
        U64(id)
    }

    // ------------------------------------------------------------------ owner path

    /// Owner approves a WARN payment. Caps are re-checked at execution time.
    pub fn approve(&mut self, payment_id: U64) {
        self.assert_owner();
        require!(!self.paused, "Vault is paused");
        let mut p = self.get_payment_mut(payment_id.0);
        require!(
            p.status == PaymentStatus::PendingApproval,
            "Payment is not pending approval"
        );
        let now = env::block_timestamp_ms();
        if now > p.created_at_ms.0 + self.pending_ttl_ms {
            p.status = PaymentStatus::Expired;
            p.updated_at_ms = U64(now);
            self.payments[payment_id.0 as u32] = p;
            event("payment_expired", self.payment_json(payment_id.0));
            return;
        }
        self.reserve_daily(&p.asset, p.amount.0);
        p.status = PaymentStatus::Executing;
        p.updated_at_ms = U64(now);
        self.payments[payment_id.0 as u32] = p.clone();
        event("payment_approved", self.payment_json(payment_id.0));
        self.payout(&p);
    }

    pub fn reject(&mut self, payment_id: U64) {
        self.assert_owner();
        let mut p = self.get_payment_mut(payment_id.0);
        require!(
            p.status == PaymentStatus::PendingApproval,
            "Payment is not pending approval"
        );
        p.status = PaymentStatus::Rejected;
        p.updated_at_ms = U64(env::block_timestamp_ms());
        self.payments[payment_id.0 as u32] = p;
        event("payment_rejected", self.payment_json(payment_id.0));
    }

    pub fn set_cap(&mut self, asset: String, per_tx: U128, daily: U128) {
        self.assert_owner();
        validate_asset(&asset);
        require!(per_tx.0 <= daily.0, "per_tx cap cannot exceed daily cap");
        self.caps.insert(asset, AssetCap { per_tx, daily });
    }

    pub fn set_signer_public_key(&mut self, signer_public_key: PublicKey) {
        self.assert_owner();
        let _ = ed25519_bytes(&signer_public_key);
        self.signer_public_key = signer_public_key;
    }

    pub fn set_agent(&mut self, agent: AccountId) {
        self.assert_owner();
        self.agent = agent;
    }

    /// Step 1 of an ownership handover (e.g. to the human's own wallet). The new owner must
    /// call `accept_owner` from that account, so a typo can never lock the vault.
    /// Stored outside the main state struct so existing deployments upgrade without migration.
    pub fn propose_owner(&mut self, new_owner: AccountId) {
        self.assert_owner();
        require!(new_owner != env::current_account_id(), "The vault cannot own itself");
        require!(new_owner != self.agent, "The agent cannot become the owner");
        env::storage_write(PENDING_OWNER_KEY, new_owner.as_bytes());
        event("owner_proposed", format!("{{\"new_owner\":\"{}\"}}", new_owner));
    }

    /// Step 2: called by the proposed owner.
    pub fn accept_owner(&mut self) {
        let pending = self
            .get_pending_owner()
            .unwrap_or_else(|| env::panic_str("No ownership handover in progress"));
        require!(
            env::predecessor_account_id() == pending,
            "Only the proposed owner can accept"
        );
        let previous = std::mem::replace(&mut self.owner, pending);
        env::storage_remove(PENDING_OWNER_KEY);
        event(
            "owner_changed",
            format!("{{\"previous\":\"{}\",\"owner\":\"{}\"}}", previous, self.owner),
        );
    }

    pub fn cancel_owner_proposal(&mut self) {
        self.assert_owner();
        env::storage_remove(PENDING_OWNER_KEY);
    }

    pub fn get_pending_owner(&self) -> Option<AccountId> {
        env::storage_read(PENDING_OWNER_KEY)
            .and_then(|b| String::from_utf8(b).ok())
            .and_then(|s| s.parse().ok())
    }

    pub fn set_ttls(&mut self, max_verdict_ttl_ms: U64, pending_ttl_ms: U64) {
        self.assert_owner();
        self.max_verdict_ttl_ms = max_verdict_ttl_ms.0;
        self.pending_ttl_ms = pending_ttl_ms.0;
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
        event("paused", format!("{{\"paused\":{}}}", paused));
    }

    /// Owner withdraws funds. Not subject to agent caps.
    pub fn withdraw(&mut self, asset: String, amount: U128) -> Promise {
        self.assert_owner();
        validate_asset(&asset);
        if asset == NEAR_ASSET {
            Promise::new(self.owner.clone()).transfer(NearToken::from_yoctonear(amount.0))
        } else {
            ext_ft::ext(asset.parse().unwrap())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(FT_TRANSFER_GAS)
                .ft_transfer(self.owner.clone(), amount, Some("owner withdraw".into()))
        }
    }

    // ------------------------------------------------------------------ callback

    #[private]
    pub fn on_payout(&mut self, payment_id: U64) -> bool {
        // Transfers and ft_transfer return no value; only success vs failure matters here.
        let ok = !matches!(
            env::promise_result_checked(0, 64),
            Err(PromiseError::Failed)
        );
        let mut p = self.get_payment_mut(payment_id.0);
        p.updated_at_ms = U64(env::block_timestamp_ms());
        if ok {
            p.status = PaymentStatus::Executed;
            self.payments[payment_id.0 as u32] = p;
            event("payment_executed", self.payment_json(payment_id.0));
        } else {
            p.status = PaymentStatus::Failed;
            let (asset, amount) = (p.asset.clone(), p.amount.0);
            self.payments[payment_id.0 as u32] = p;
            self.release_daily(&asset, amount);
            event("payment_failed", self.payment_json(payment_id.0));
        }
        ok
    }

    // ------------------------------------------------------------------ views

    pub fn get_config(&self) -> Config {
        Config {
            owner: self.owner.clone(),
            agent: self.agent.clone(),
            signer_public_key: self.signer_public_key.clone(),
            max_verdict_ttl_ms: U64(self.max_verdict_ttl_ms),
            pending_ttl_ms: U64(self.pending_ttl_ms),
            paused: self.paused,
            caps: self.caps.clone(),
        }
    }

    pub fn get_payment(&self, payment_id: U64) -> Option<Payment> {
        self.payments.get(payment_id.0 as u32).cloned()
    }

    pub fn get_payments(&self, from_index: Option<U64>, limit: Option<U64>) -> Vec<Payment> {
        let from = from_index.map(|x| x.0).unwrap_or(0) as u32;
        let limit = limit.map(|x| x.0).unwrap_or(50).min(100) as u32;
        (from..self.payments.len().min(from.saturating_add(limit)))
            .filter_map(|i| self.payments.get(i).cloned())
            .collect()
    }

    pub fn get_payments_to(&self, recipient: AccountId) -> Vec<Payment> {
        self.payments
            .iter()
            .filter(|p| p.recipient == recipient)
            .cloned()
            .collect()
    }

    pub fn get_spent_today(&self, asset: String) -> U128 {
        let today = env::block_timestamp_ms() / MS_PER_DAY;
        U128(
            self.spent
                .get(&asset)
                .filter(|s| s.day == today)
                .map(|s| s.amount)
                .unwrap_or(0),
        )
    }

    pub fn is_nonce_used(&self, nonce: U64) -> bool {
        self.used_nonces.contains(&nonce.0)
    }

    // ------------------------------------------------------------------ internal

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only the owner can do this"
        );
    }

    fn get_payment_mut(&self, id: u64) -> Payment {
        self.payments
            .get(id as u32)
            .cloned()
            .unwrap_or_else(|| env::panic_str("Unknown payment id"))
    }

    fn reserve_daily(&mut self, asset: &str, amount: u128) {
        let cap = self
            .caps
            .get(asset)
            .cloned()
            .unwrap_or_else(|| env::panic_str("No cap configured for this asset"));
        require!(amount <= cap.per_tx.0, "Amount exceeds per-transaction cap");
        let today = env::block_timestamp_ms() / MS_PER_DAY;
        let entry = self.spent.entry(asset.to_string()).or_default();
        if entry.day != today {
            entry.day = today;
            entry.amount = 0;
        }
        let new_total = entry
            .amount
            .checked_add(amount)
            .unwrap_or_else(|| env::panic_str("Overflow"));
        require!(new_total <= cap.daily.0, "Amount exceeds daily cap");
        entry.amount = new_total;
    }

    fn release_daily(&mut self, asset: &str, amount: u128) {
        let today = env::block_timestamp_ms() / MS_PER_DAY;
        if let Some(entry) = self.spent.get_mut(asset) {
            if entry.day == today {
                entry.amount = entry.amount.saturating_sub(amount);
            }
        }
    }

    fn payout(&self, p: &Payment) {
        let transfer = if p.asset == NEAR_ASSET {
            Promise::new(p.recipient.clone()).transfer(NearToken::from_yoctonear(p.amount.0))
        } else {
            // NEP-141 requires exactly 1 yoctoNEAR attached. A function-call access key
            // cannot attach deposits, which is why the agent cannot call ft_transfer itself
            // and the vault attaches it from its own balance here.
            ext_ft::ext(p.asset.parse().unwrap())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(FT_TRANSFER_GAS)
                .ft_transfer(p.recipient.clone(), p.amount, p.memo.clone())
        };
        transfer
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_payout(p.id),
            )
            .detach();
    }

    fn payment_json(&self, id: u64) -> String {
        near_sdk::serde_json::to_string(&self.payments[id as u32]).unwrap()
    }
}

#[cfg(test)]
mod tests;
