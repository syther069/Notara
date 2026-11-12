import { A, C, Callout, H2, H3, Lead, P, Table, UL } from "../kit";

export function Signals() {
  return (
    <>
      <Lead>Before you pay, Notara reads six live signals about the recipient. Each one records where its data came from and what it can't tell you.</Lead>

      <H2>The six signals</H2>
      <Table
        head={["Signal", "What it reads", "Source", "Limits"]}
        rows={[
          [<C key="1">account_state</C>, "Whether the account exists, and if it's a contract, its code hash", "NEAR RPC (FastNear) view_account", "Current state only"],
          [<C key="2">activity_history</C>, "Transaction count, first and last observed activity", "FastNear Transactions API", "First observed activity is not the creation date. The index can have gaps. Old accounts can be bought"],
          [<C key="3">contract_deployments</C>, "Recent code deployments, and code changes since Notara last checked", "FastNear, scanning DeployContract actions; Notara's own code-hash snapshots", "Scans the 100 most recent transactions. A redeploy is a risk signal, not proof"],
          [<C key="4">prior_interactions</C>, "Earlier payments to this recipient and shared transactions", "The vault's get_payments_to, plus the indexer", "The indexer scan is capped at 5 pages per account and may miss older history"],
          [<C key="5">shared_reports</C>, "Scam and phishing reports about the account", "Notara's registry contract, get_reports_for", "Few reporters so far. No report does not mean safe"],
          [<C key="6">policy_lists</C>, "Whether the operator allowlisted or denylisted the account", "Notara's policy config", "Only as good as whoever maintains it"],
        ]}
      />

      <H3>One more check for token payments</H3>
      <P>
        For USDC and other NEP-141 tokens, Notara also calls <C>storage_balance_of</C> on the token contract. A recipient who never registered with the token can't receive it, so the transfer would fail. This only says whether a payment can land;
        it isn't a trust signal.
      </P>

      <H2>Fail-closed</H2>
      <P>
        If a source doesn't answer, that signal is marked unavailable and the result is at least <strong>WARN</strong>. Notara never treats missing data as good news.
      </P>
      <Callout kind="note" title="On mainnet">
        <p>
          There is no mainnet report registry yet, so <C>shared_reports</C> reads as unavailable on mainnet and every mainnet check returns at least WARN. That's by design.
        </p>
      </Callout>

      <H2>Reports</H2>
      <P>Anyone can file a report in the registry by posting a bond of 0.01 NEAR with an evidence link and hash. A verifier then rules on it, and reports can be disputed.</P>
      <UL>
        <li>Only a Verified report in a blocking category (Scam, Phishing, MaliciousContract, Impersonation) can cause BLOCK.</li>
        <li>Unverified and Disputed reports are treated as leads and cause WARN at most.</li>
        <li>Rejected reports are listed for information only.</li>
        <li>An account can have at most 50 open reports. Rejected reports don't count, so the subject can't fill its own slots with junk to stop real reports.</li>
        <li>Demo reports seeded for testing are flagged as fixtures and are never presented as real incidents.</li>
      </UL>
      <P>
        To see a live result, use <A href="/agents/check">Account check</A> in the app, or call <A href="/docs/api">POST /v1/check</A>.
      </P>
    </>
  );
}

export function Verdicts() {
  return (
    <>
      <Lead>The policy is a pure function: the same evidence always gives the same decision. Each rule adds a reason, and the strongest reason sets the result.</Lead>

      <H2>The three results</H2>
      <Table
        head={["Result", "Means", "What to do"]}
        rows={[
          ["ALLOW", "No configured rule was triggered by the evidence collected", "Pay. It is not a guarantee the recipient is safe"],
          ["WARN", "Something is new, unusual, large or couldn't be checked", "A person should decide. In the vault, the payment waits for the owner"],
          ["BLOCK", "A serious rule applies", "Don't pay. The vault refuses on-chain"],
        ]}
      />

      <H2>Thresholds</H2>
      <P>
        From <C>passport/policy.json</C>, version <C>2026-11-05.1</C>:
      </P>
      <Table
        head={["Rule", "USDC", "NEAR"]}
        rows={[
          ["WARN above", "25 USDC", "2 NEAR"],
          ["BLOCK above", "200 USDC", "10 NEAR"],
          ["WARN on a first payment to a recipient above", "5 USDC", "0.5 NEAR"],
          ["WARN if fewer indexed transactions than", "5", "5"],
          ["WARN if first observed less than … ago", "30 days", "30 days"],
          ["WARN if contract code was deployed within", "7 days", "7 days"],
          ["Verdict lifetime", "5 minutes", "5 minutes"],
        ]}
      />

      <H2>Every rule</H2>
      <Table
        head={["Code", "Result", "When"]}
        rows={[
          [<C key="a">DENYLISTED</C>, "BLOCK", "The operator denylisted the recipient"],
          [<C key="b">VERIFIED_REPORT</C>, "BLOCK", "A verified report in a blocking category"],
          [<C key="c">AMOUNT_OVER_BLOCK_LIMIT</C>, "BLOCK", "The amount is above the hard limit"],
          [<C key="d">ACCOUNT_NOT_FOUND</C>, "BLOCK", "The account doesn't exist, often a typo or a look-alike name"],
          [<C key="e">SIGNAL_UNAVAILABLE</C>, "WARN", "A source couldn't be checked"],
          [<C key="f">NO_ASSET_POLICY</C>, "WARN", "No thresholds are configured for this asset"],
          [<C key="g">AMOUNT_OVER_WARN_LIMIT</C>, "WARN", "The amount is above the human-approval threshold"],
          [<C key="h">IMPLICIT_ACCOUNT_UNUSED</C>, "WARN", "An implicit account that has never been used on-chain"],
          [<C key="i">CODE_CHANGED_SINCE_LAST_CHECK</C>, "WARN", "The contract's code changed since Notara last checked it"],
          [<C key="j">RECENT_CODE_DEPLOY</C>, "WARN", "Code was deployed within the policy window"],
          [<C key="k">LOW_ACTIVITY</C>, "WARN", "Fewer indexed transactions than the minimum"],
          [<C key="l">NEW_ACCOUNT</C>, "WARN", "First observed activity is more recent than the minimum age"],
          [<C key="m">FIRST_PAYMENT_TO_RECIPIENT</C>, "WARN", "No earlier payments or shared transactions, and the amount is above the first-payment threshold"],
          [<C key="n">RECIPIENT_NOT_REGISTERED_FOR_TOKEN</C>, "WARN", "The recipient can't receive this token yet"],
          [<C key="o">UNVERIFIED_REPORT / DISPUTED_REPORT</C>, "WARN", "A report that isn't verified, or is in dispute"],
          [<C key="p">ALLOWLISTED, HISTORY, PRIOR_INTERACTIONS, RECIPIENT_IS_CONTRACT, REJECTED_REPORT</C>, "Info", "Context only; these never raise the result"],
          [<C key="q">NO_POLICY_VIOLATION</C>, "Info", "Added when the result is ALLOW"],
        ]}
      />
      <Callout kind="note" title="The allowlist relaxes, it doesn't excuse">
        <p>An allowlisted recipient skips the age, activity and first-payment checks. Reports, code changes, amount limits and the denylist still apply.</p>
      </Callout>
      <Callout kind="limit">
        <p>A verdict applies the configured policy to the evidence listed. It is not proof that a recipient is malicious or safe. Indexer data can be incomplete, reports can be wrong, and account age can be bought.</p>
      </Callout>
    </>
  );
}
