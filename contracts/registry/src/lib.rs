//! AgentSpend Passport report registry.
//!
//! Anyone can file a report about an account by posting a small bond (anti-spam).
//! A report is only evidence to evaluate: it starts as `Unverified`. Only accounts the
//! owner has appointed as verifiers can mark it `Verified` or `Rejected`. Any account can
//! dispute a report, which moves it to `Disputed` until a verifier rules again.
//!
//! The Passport treats only `Verified` reports as grounds for BLOCK. `Unverified` and
//! `Disputed` reports lead to WARN at most.

use near_sdk::json_types::U64;
use near_sdk::store::{LookupMap, LookupSet, Vector};
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise};

const MAX_TEXT: usize = 500;
const MAX_URI: usize = 300;
const MAX_REPORTS_PER_SUBJECT: usize = 50;
const MAX_DISPUTES_PER_REPORT: usize = 10;

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Category {
    Scam,
    Phishing,
    MaliciousContract,
    Impersonation,
    Other,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Unverified,
    Verified,
    Rejected,
    Disputed,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub by: AccountId,
    pub reason: String,
    pub evidence_uri: Option<String>,
    pub at_ms: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Report {
    pub id: U64,
    pub subject: AccountId,
    pub reporter: AccountId,
    pub category: Category,
    pub description: String,
    /// Where the evidence lives (tx link, IPFS URI, web archive...).
    pub evidence_uri: String,
    /// Optional sha256 hex of the evidence document, so it can't be swapped later.
    pub evidence_hash: Option<String>,
    pub status: Status,
    pub status_note: Option<String>,
    pub status_by: Option<AccountId>,
    /// True for seeded demo data. Clients must label these as fixtures, never as live evidence.
    pub is_fixture: bool,
    pub created_at_ms: U64,
    pub updated_at_ms: U64,
    pub disputes: Vec<Dispute>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Registry {
    owner: AccountId,
    verifiers: LookupSet<AccountId>,
    report_bond: NearToken,
    reports: Vector<Report>,
    by_subject: LookupMap<AccountId, Vec<u64>>,
}

fn event(name: &str, data: String) {
    env::log_str(&format!(
        "EVENT_JSON:{{\"standard\":\"agentspend_registry\",\"version\":\"1.0.0\",\"event\":\"{}\",\"data\":[{}]}}",
        name, data
    ));
}

fn check_text(s: &str, max: usize, what: &str) {
    require!(!s.trim().is_empty(), format!("{} is required", what));
    require!(s.len() <= max, format!("{} is too long", what));
}

#[near]
impl Registry {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            verifiers: LookupSet::new(b"v"),
            report_bond: NearToken::from_millinear(10),
            reports: Vector::new(b"r"),
            by_subject: LookupMap::new(b"s"),
        }
    }

    /// File a report. Requires the report bond attached (kept by the registry to pay storage
    /// and discourage spam). Excess deposit is refunded.
    #[payable]
    pub fn submit_report(
        &mut self,
        subject: AccountId,
        category: Category,
        description: String,
        evidence_uri: String,
        evidence_hash: Option<String>,
        is_fixture: Option<bool>,
    ) -> U64 {
        let deposit = env::attached_deposit();
        require!(deposit >= self.report_bond, "Attach the report bond");
        check_text(&description, MAX_TEXT, "Description");
        check_text(&evidence_uri, MAX_URI, "Evidence URI");
        if let Some(h) = &evidence_hash {
            require!(
                h.len() == 64 && h.chars().all(|c| c.is_ascii_hexdigit()),
                "evidence_hash must be sha256 hex"
            );
        }
        let reporter = env::predecessor_account_id();
        require!(reporter != subject, "Cannot report yourself");

        let mut ids = self.by_subject.get(&subject).cloned().unwrap_or_default();
        require!(
            ids.len() < MAX_REPORTS_PER_SUBJECT,
            "Too many reports for this subject"
        );

        let now = U64(env::block_timestamp_ms());
        let id = self.reports.len() as u64;
        let report = Report {
            id: U64(id),
            subject: subject.clone(),
            reporter,
            category,
            description,
            evidence_uri,
            evidence_hash,
            status: Status::Unverified,
            status_note: None,
            status_by: None,
            is_fixture: is_fixture.unwrap_or(false),
            created_at_ms: now,
            updated_at_ms: now,
            disputes: vec![],
        };
        self.reports.push(report);
        ids.push(id);
        self.by_subject.insert(subject, ids);
        event("report_submitted", self.json(id));

        let excess = deposit.saturating_sub(self.report_bond);
        if !excess.is_zero() {
            Promise::new(env::predecessor_account_id())
                .transfer(excess)
                .detach();
        }
        U64(id)
    }

    /// Any account can dispute a report (typically its subject). Requires the bond.
    #[payable]
    pub fn dispute(&mut self, report_id: U64, reason: String, evidence_uri: Option<String>) {
        require!(
            env::attached_deposit() >= self.report_bond,
            "Attach the report bond"
        );
        check_text(&reason, MAX_TEXT, "Reason");
        if let Some(u) = &evidence_uri {
            check_text(u, MAX_URI, "Evidence URI");
        }
        let mut r = self.get(report_id.0);
        require!(r.status != Status::Rejected, "Report already rejected");
        require!(
            r.disputes.len() < MAX_DISPUTES_PER_REPORT,
            "Too many disputes on this report"
        );
        let now = U64(env::block_timestamp_ms());
        r.disputes.push(Dispute {
            by: env::predecessor_account_id(),
            reason,
            evidence_uri,
            at_ms: now,
        });
        // A verified report stays verified until a verifier rules again, or anyone could lift
        // their own BLOCK for the price of the bond.
        if r.status != Status::Verified {
            r.status = Status::Disputed;
        }
        r.updated_at_ms = now;
        self.reports[report_id.0 as u32] = r;
        event("report_disputed", self.json(report_id.0));
    }

    /// Verifiers rule on a report.
    pub fn set_status(&mut self, report_id: U64, status: Status, note: Option<String>) {
        let caller = env::predecessor_account_id();
        require!(
            self.verifiers.contains(&caller),
            "Only verifiers can set status"
        );
        require!(
            status != Status::Disputed,
            "Disputed is set by filing a dispute"
        );
        if let Some(n) = &note {
            check_text(n, MAX_TEXT, "Note");
        }
        let mut r = self.get(report_id.0);
        require!(r.reporter != caller, "Verifiers cannot rule on their own reports");
        r.status = status;
        r.status_note = note;
        r.status_by = Some(caller);
        r.updated_at_ms = U64(env::block_timestamp_ms());
        self.reports[report_id.0 as u32] = r;
        event("report_status_changed", self.json(report_id.0));
    }

    pub fn add_verifier(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.verifiers.insert(account_id);
    }

    pub fn remove_verifier(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.verifiers.remove(&account_id);
    }

    // ------------------------------------------------------------------ views

    pub fn get_report(&self, report_id: U64) -> Option<Report> {
        self.reports.get(report_id.0 as u32).cloned()
    }

    pub fn get_reports_for(&self, subject: AccountId) -> Vec<Report> {
        self.by_subject
            .get(&subject)
            .map(|ids| {
                ids.iter()
                    .filter_map(|i| self.reports.get(*i as u32).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn is_verifier(&self, account_id: AccountId) -> bool {
        self.verifiers.contains(&account_id)
    }

    pub fn get_report_bond(&self) -> NearToken {
        self.report_bond
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn get_report_count(&self) -> U64 {
        U64(self.reports.len() as u64)
    }

    // ------------------------------------------------------------------ internal

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only the owner can do this"
        );
    }

    fn get(&self, id: u64) -> Report {
        self.reports
            .get(id as u32)
            .cloned()
            .unwrap_or_else(|| env::panic_str("Unknown report id"))
    }

    fn json(&self, id: u64) -> String {
        near_sdk::serde_json::to_string(&self.reports[id as u32]).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn acc(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    fn ctx(pred: &str, deposit: NearToken) {
        testing_env!(VMContextBuilder::new()
            .current_account_id(acc("registry.testnet"))
            .predecessor_account_id(acc(pred))
            .attached_deposit(deposit)
            .block_timestamp(1_800_000_000_000_000_000)
            .build());
    }

    fn setup() -> Registry {
        ctx("owner.testnet", NearToken::from_yoctonear(0));
        let mut r = Registry::new(acc("owner.testnet"));
        r.add_verifier(acc("verifier.testnet"));
        r
    }

    fn file(r: &mut Registry) -> U64 {
        ctx("reporter.testnet", NearToken::from_millinear(10));
        r.submit_report(
            acc("attacker.testnet"),
            Category::Scam,
            "Requested payment via injected invoice".into(),
            "https://testnet.nearblocks.io/txns/abc".into(),
            Some("ab".repeat(32)),
            Some(true),
        )
    }

    #[test]
    fn new_report_is_unverified() {
        let mut r = setup();
        let id = file(&mut r);
        let rep = r.get_report(id).unwrap();
        assert_eq!(rep.status, Status::Unverified);
        assert!(rep.is_fixture);
        assert_eq!(r.get_reports_for(acc("attacker.testnet")).len(), 1);
    }

    #[test]
    #[should_panic(expected = "Attach the report bond")]
    fn bond_required() {
        let mut r = setup();
        ctx("reporter.testnet", NearToken::from_yoctonear(0));
        r.submit_report(
            acc("attacker.testnet"),
            Category::Scam,
            "x".into(),
            "https://e".into(),
            None,
            None,
        );
    }

    #[test]
    fn dispute_cannot_lift_a_verified_report() {
        let mut r = setup();
        let id = file(&mut r);
        ctx("verifier.testnet", NearToken::from_yoctonear(0));
        r.set_status(id, Status::Verified, Some("matched on-chain evidence".into()));

        ctx("attacker.testnet", NearToken::from_millinear(10));
        r.dispute(id, "This was a refund, not a scam".into(), None);
        let rep = r.get_report(id).unwrap();
        assert_eq!(rep.status, Status::Verified);
        assert_eq!(rep.disputes.len(), 1);

        // Only a verifier can change the outcome.
        ctx("verifier.testnet", NearToken::from_yoctonear(0));
        r.set_status(id, Status::Rejected, Some("refund confirmed".into()));
        assert_eq!(r.get_report(id).unwrap().status, Status::Rejected);
    }

    #[test]
    fn dispute_marks_an_unverified_report_disputed() {
        let mut r = setup();
        let id = file(&mut r);
        ctx("attacker.testnet", NearToken::from_millinear(10));
        r.dispute(id, "Not a scam".into(), None);
        assert_eq!(r.get_report(id).unwrap().status, Status::Disputed);
    }

    #[test]
    #[should_panic(expected = "Only verifiers can set status")]
    fn reporter_cannot_verify() {
        let mut r = setup();
        let id = file(&mut r);
        ctx("reporter.testnet", NearToken::from_yoctonear(0));
        r.set_status(id, Status::Verified, None);
    }

    #[test]
    #[should_panic(expected = "Verifiers cannot rule on their own reports")]
    fn verifier_cannot_verify_own_report() {
        let mut r = setup();
        ctx("verifier.testnet", NearToken::from_millinear(10));
        let id = r.submit_report(
            acc("attacker.testnet"),
            Category::Scam,
            "x".into(),
            "https://e".into(),
            None,
            None,
        );
        ctx("verifier.testnet", NearToken::from_yoctonear(0));
        r.set_status(id, Status::Verified, None);
    }

    #[test]
    #[should_panic(expected = "Only the owner can do this")]
    fn only_owner_adds_verifiers() {
        let mut r = setup();
        ctx("reporter.testnet", NearToken::from_yoctonear(0));
        r.add_verifier(acc("reporter.testnet"));
    }

    #[test]
    #[should_panic(expected = "Cannot report yourself")]
    fn cannot_self_report() {
        let mut r = setup();
        ctx("attacker.testnet", NearToken::from_millinear(10));
        r.submit_report(
            acc("attacker.testnet"),
            Category::Other,
            "x".into(),
            "https://e".into(),
            None,
            None,
        );
    }
}
