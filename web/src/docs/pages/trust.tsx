import type { ReactNode } from "react";
import { A, Callout, H2, H3, Lead, P, Table, UL } from "../kit";

export function Security() {
  return (
    <>
      <Lead>What Notara protects against, what it doesn't, and what is still planned.</Lead>
      <Callout kind="warning" title="Not audited">
        <p>Notara is a hackathon prototype. Its contracts and services have not been audited. On mainnet, keep amounts small.</p>
      </Callout>

      <H2>What it protects</H2>
      <UL>
        <li>
          <strong>A fooled or compromised agent can't pay outside the rules.</strong> The vault checks the verdict's signature, its binding to this payment, its age, its nonce and the caps on-chain. See the{" "}
          <A href="/docs/attack-tests">attack tests</A>.
        </li>
        <li>
          <strong>A link can't be forged for someone else's account.</strong> Each link carries a NEP-413 signature made by a full-access key of the payee.
        </li>
        <li>
          <strong>One transfer can't pay two links</strong>, and an unrelated transfer to the merchant can't mark a link paid.
        </li>
        <li>
          <strong>No custody.</strong> Payments go to the merchant directly, or through NEAR Intents. Notara never holds them.
        </li>
        <li>
          <strong>Exports are safe to open</strong> in a spreadsheet: formula-like cells are neutralised.
        </li>
      </UL>

      <H2>What it doesn't</H2>
      <UL>
        <li>A verdict reflects the configured policy and the evidence collected. It is not proof that anyone is malicious or safe, and its accuracy against real scams hasn't been measured.</li>
        <li>The heuristics can be gamed on their own: account age can be bought and reports start empty. The design's value is that the vault enforces the decision and the caps even when the agent is compromised.</li>
        <li>The Notara signer key is a local file when you run Notara yourself, and an environment variable on the public deploy, where the server also holds the shared visitor-vault agent key and signs verdicts for visitor vaults. Whoever holds the key can sign any verdict.</li>
        <li>Whoever holds a vault's full-access key can change it, until that key is deleted with lock-vault. Visitor vaults never have one.</li>
        <li>A send link is like cash: anyone holding it can claim it.</li>
        <li>A website proof shows control of a domain when it was checked, not who the business is.</li>
      </UL>

      <H2>Built and planned</H2>
      <Table
        head={["Area", "Status"]}
        rows={[
          ["Vault: verdict checks, caps, WARN parking, pause, NEAR and NEP-141 payouts, failure callback", "Built, testnet"],
          ["Registry: bonded reports, verifier rulings, disputes", "Built, testnet; redeployed 12 November 2026 with the open-report limit fix"],
          ["Agent with a real LLM through NEAR AI Cloud", "Built; ran on testnet on 9 November 2026"],
          ["Payment links with NEP-413 signatures", "Built, testnet and mainnet"],
          ["Pay from another chain through NEAR Intents", "Built; one real mainnet payment on 9 November 2026"],
          ["Pay a link from a NEAR wallet on mainnet", "Built and tested against a recorded transfer; not yet run with real funds"],
          ["Mainnet report registry", "Script written, not run"],
          ["Signer key in a TEE", "Planned"],
          ["Contract integration tests in near-sandbox", "Planned; unit tests today"],
          ["Gas-allowance monitoring for the agent key", "Planned"],
          ["Security audit", "Not done"],
        ]}
      />

      <H3>Report a problem</H3>
      <P>
        Open an issue on <A href="https://github.com/syther069/Notara/issues">GitHub</A>. Please don't include private keys or seed phrases.
      </P>
    </>
  );
}

const QA: [string, ReactNode][] = [
  ["Is Notara a NEAR product?", "No. Notara is an independent project built on NEAR."],
  ["Does Notara hold my money?", "No. A payment goes straight to the merchant's account, or through NEAR Intents to it. An agent's money sits in its own vault contract, which only its rules can move."],
  ["Does Notara charge a fee?", "Notara adds no fee. NEAR network fees still apply, and a payment from another chain includes the NEAR Intents swap costs in its quote."],
  ["Which currency do merchants receive?", "USDC on NEAR. On mainnet that's native USDC; on testnet it's Circle's test USDC."],
  ["Can customers pay from Ethereum, Solana or Bitcoin?", <>On mainnet, yes, through NEAR Intents. The list of tokens comes live from the 1Click API. See <A key="a" href="/docs/any-chain">Pay from any chain</A>.</>],
  ["Is there a testnet for cross-chain payments?", <>No. NEAR Intents has no testnet, so the <A key="a" href="/docs/mainnet-proof">mainnet proof</A> page links a real, small payment instead.</>],
  ["What does ALLOW guarantee?", "Nothing beyond 'no configured rule was triggered by the evidence collected'. It is not a guarantee that a recipient is safe."],
  ["What happens if Notara's data sources are down?", "The affected signal is marked unavailable and the result is at least WARN. Missing data is never treated as good news."],
  ["Can the agent change its own limits?", "No. Caps, pausing and approvals are owner methods, and the agent's key can only call request_payment."],
  ["Where are my profile details stored?", "Your name, picture, About and links are kept in this browser. A proven website is stored by Notara and shows to every customer."],
];

export function Faq() {
  return (
    <>
      <Lead>Short answers to the questions people ask first.</Lead>
      <div className="mt-8 divide-y divide-border/70 rounded-xl border border-border bg-surface">
        {QA.map(([q, a]) => (
          <details key={q} className="group px-4 py-1 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15.5px] font-bold">
              {q}
              <span aria-hidden className="text-[20px] font-normal text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="pb-4 text-[15px] leading-[1.7] text-foreground/85">{a}</div>
          </details>
        ))}
      </div>
      <P>
        Not answered here? Read <A href="/docs/security">Security and limits</A>, or open an issue on <A href="https://github.com/syther069/Notara/issues">GitHub</A>.
      </P>
    </>
  );
}
