export function AboutPage() {
  return (
    <div className="reading">
      <div className="page-head">
        <h1>How it works, and its limits</h1>
        <p>What the Passport checks, where the data comes from, what NEAR function-call keys do and don't protect, and what is still missing.</p>
      </div>

      <section>
        <h2>Where the evidence comes from</h2>
        <div className="table-wrap stack-mobile">
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Source</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Check">Account state</td>
                <td data-label="Source">NEAR RPC (FastNear), live</td>
                <td data-label="Limits">Current state only. Says nothing about who controls the account.</td>
              </tr>
              <tr>
                <td data-label="Check">Activity history</td>
                <td data-label="Source">FastNear transaction index, live</td>
                <td data-label="Limits">Earliest observed activity, not the creation date. The index can have gaps, and old accounts can be bought.</td>
              </tr>
              <tr>
                <td data-label="Check">Contract deployments</td>
                <td data-label="Source">FastNear index + our code-hash snapshots</td>
                <td data-label="Limits">Scans only the latest 100 transactions. A redeploy is a risk signal, not proof of bad code.</td>
              </tr>
              <tr>
                <td data-label="Check">Prior payments</td>
                <td data-label="Source">Vault contract history + shared indexed transactions</td>
                <td data-label="Limits">The vault's own history is exact; the index scan is capped and can miss older history.</td>
              </tr>
              <tr>
                <td data-label="Check">Shared reports</td>
                <td data-label="Source">AgentSpend registry contract (testnet)</td>
                <td data-label="Limits">Young, with few reporters. No report doesn't mean safe. Only verified reports can block.</td>
              </tr>
              <tr>
                <td data-label="Check">Allow / deny lists</td>
                <td data-label="Source">Operator policy file</td>
                <td data-label="Limits">Only as good as whoever maintains it.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          <strong>Fail closed:</strong> if any source can't be reached, the result is at least WARN. The Passport never answers ALLOW on missing evidence.
        </p>
      </section>

      <section>
        <h2>Live data vs. demo fixtures</h2>
        <p>
          The attacker account's "verified scam report" is <strong>seeded demo data</strong>. It is marked <code>is_fixture: true</code> on-chain, its
          evidence link starts with <code>fixture://</code>, and the site shows it with a purple <em>Demo fixture</em> tag. It is not evidence about any real
          account. Everything else in a testnet check is read live from NEAR at the time of the check.
        </p>
      </section>

      <section>
        <h2>What NEAR function-call keys protect</h2>
        <ul>
          <li>✅ The agent's key can call one contract (the vault) and one method (<code>request_payment</code>). NEAR enforces this, not our code.</li>
          <li>✅ It can't carry a deposit, so it can't send NEAR or tokens directly. Token transfers need 1 yoctoNEAR attached, so the vault attaches it.</li>
          <li>✅ Gas comes from a fixed allowance. When it runs out, the key stops working until the owner adds a new one.</li>
          <li>❌ The key doesn't judge the recipient. The safety comes from the vault's rules, not from the key alone.</li>
          <li>❌ Whoever holds the vault's full-access key can change or drain it. Delete that key (<code>npm run owner -- lock-vault</code>) for real use.</li>
          <li>❌ The Passport signing key is a local file in this prototype. Whoever holds it can sign any verdict. Moving it into a TEE is planned.</li>
        </ul>
      </section>

      <section>
        <h2>What the vault checks on every payment</h2>
        <ol>
          <li>The caller is the agent.</li>
          <li>The verdict is signed by the Passport key.</li>
          <li>The verdict is for this vault, this recipient, this amount and this asset.</li>
          <li>It hasn't expired (5 minutes, 10 at most) and its one-time number hasn't been used.</li>
          <li>It isn't BLOCK. WARN is held until the owner approves.</li>
          <li>The payment fits the per-payment and daily caps.</li>
        </ol>
      </section>

      <section>
        <h2>Built vs. planned</h2>
        <div className="grid-2">
          <div className="card">
            <h3>Built and tested</h3>
            <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>Vault and registry contracts on testnet</li>
              <li>Passport with six live checks and signed verdicts</li>
              <li>Agent wrapper and attack demo (9/9 checks passed on testnet)</li>
              <li>Owner approvals signed in your own NEAR wallet</li>
              <li>NEAR invoices with CSV export</li>
            </ul>
          </div>
          <div className="card">
            <h3>Planned</h3>
            <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>Stablecoin (NEP-141) invoices</li>
              <li>Passport signing key in a TEE</li>
              <li>NEAR Intents for paying from other chains</li>
              <li>Demo with a real LLM (NEAR AI Cloud)</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2>Honest limits</h2>
        <p>
          This is a hackathon prototype on testnet. It has not been audited, and its accuracy against real scams has not been measured. Don't put real funds
          in it. A verdict applies a policy to the evidence we could find; it is not proof that anyone is safe or malicious.
        </p>
      </section>
    </div>
  );
}
