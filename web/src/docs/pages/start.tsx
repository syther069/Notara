import { A, C, Callout, CardGrid, DocCard, Facts, H2, H3, Lead, NetBadge, OL, P, Step, Steps, Table, UL } from "../kit";

export function Overview() {
  return (
    <>
      <Lead>
        Notara is a payments layer built on NEAR. A merchant's wallet signs every payment link, so customers can see who they're paying. An account check reads the recipient before money moves. An on-chain vault lets an AI agent pay
        only what a signed verdict allows.
      </Lead>

      <H2>Three products, one network</H2>
      <CardGrid>
        <DocCard to="/docs/payment-links" title="Get paid">
          Payment links in USDC, signed by your NEAR wallet with NEP-413. Customers can pay from other chains through NEAR Intents.
        </DocCard>
        <DocCard to="/docs/send-links" title="Send money">
          Pay a NEAR account directly, or send a link anyone can claim, even without a wallet.
        </DocCard>
        <DocCard to="/docs/vault" title="AI agent vault">
          A contract that holds an agent's money and pays only with a fresh, signed ALLOW. Caps and a human approval queue are enforced on-chain.
        </DocCard>
        <DocCard to="/docs/signals" title="Account check">
          Six live signals about any NEAR account, turned into ALLOW, WARN or BLOCK, with every source listed.
        </DocCard>
      </CardGrid>

      <H2>Verified on-chain</H2>
      <P>Every claim in these docs about something that happened on a chain links to the transaction. Two places to start:</P>
      <CardGrid>
        <DocCard to="/docs/mainnet-proof" title="NEAR Intents payment" badge={<NetBadge net="mainnet" />}>
          ETH on Arbitrum in, exactly 0.1 USDC out on NEAR, on 9 November 2026. All four transactions are linked.
        </DocCard>
        <DocCard to="/docs/attack-tests" title="Vault attack tests" badge={<NetBadge net="testnet" />}>
          Ten checks against the live testnet vault, on 9 November 2026. Each refusal is a failed transaction you can open.
        </DocCard>
      </CardGrid>

      <H2>Key facts</H2>
      <Facts
        rows={[
          ["Network", <>NEAR. Contracts and funds on testnet; mainnet for NEAR Intents payment links and read-only account checks.</>],
          ["Settlement", "USDC on NEAR. Notara never holds a customer's money: a payment goes straight to the merchant."],
          ["Fees", "Notara adds no fee. Network fees and, for other chains, the NEAR Intents swap still apply."],
          ["Verdicts", "Signed with ed25519, valid for 5 minutes. The vault refuses any verdict older than 10 minutes."],
          ["Status", <>A hackathon prototype. It has not been audited. See <A href="/docs/security">Security and limits</A>.</>],
        ]}
      />

      <H2>Where to go next</H2>
      <UL>
        <li>
          New here? Start with the <A href="/docs/quickstart">Quickstart</A>. It uses free test money.
        </li>
        <li>
          Building with it? Read the <A href="/docs/architecture">Architecture</A> and the <A href="/docs/api">API reference</A>.
        </li>
        <li>
          Judging it? The <A href="/docs/mainnet-proof">mainnet proof</A> and the <A href="/docs/attack-tests">attack tests</A> let you check the claims without spending anything.
        </li>
      </UL>
    </>
  );
}

export function Quickstart() {
  return (
    <>
      <Lead>Make a payment link and watch it get paid, using free test money on NEAR testnet. It takes about five minutes and moves nothing of value.</Lead>

      <H2>Before you start</H2>
      <UL>
        <li>A browser with a NEAR wallet. On testnet, Notara recommends Intear Wallet; any wallet in the connect list works.</li>
        <li>
          Test USDC from <A href="https://faucet.circle.com">faucet.circle.com</A>. Choose <strong>NEAR testnet</strong> and paste your account.
        </li>
      </UL>

      <H2>Make your first link</H2>
      <Steps>
        <Step title="Open the app and connect">
          <p>
            Go to <A href="/get-paid">Get Paid</A> and press <strong>Connect NEAR wallet</strong>. Pick <strong>Testnet</strong>, then your wallet. Connecting only signs you in; nothing is sent.
          </p>
        </Step>
        <Step title="Describe the payment">
          <p>Enter an amount in USDC and what it's for. The preview on the right is exactly what your customer will see.</p>
        </Step>
        <Step title="Sign the link">
          <p>
            Press <strong>Create payment link</strong>. Your wallet asks you to sign a short message that names the payee, the amount and what it's for. Signing is free and moves no money. See <A href="/docs/payment-links">Payment links</A>{" "}
            for the exact text.
          </p>
        </Step>
        <Step title="Share it">
          <p>Copy the link, show the QR code, or share it to email or a chat. The link opens a public page anyone can read.</p>
        </Step>
        <Step title="Get paid">
          <p>
            Open the link with a second NEAR testnet account, which needs test USDC and a little test NEAR for gas. Press <strong>Pay … with NEAR wallet</strong>. When the USDC transfer reaches you with the link's id as its
            memo, the link shows <strong>Paid</strong>.
          </p>
        </Step>
      </Steps>

      <Callout kind="note" title="Try the agent vault next">
        <p>
          The <A href="/agents/vault">Vault Console</A> runs an AI agent against a testnet vault with a tampered invoice, so you can see what the vault refuses and the transaction that proves it. Background:{" "}
          <A href="/docs/vault">How the vault works</A>.
        </p>
      </Callout>
    </>
  );
}

export function Networks() {
  return (
    <>
      <Lead>Notara runs on NEAR testnet and NEAR mainnet. Anything marked Mainnet moves real money.</Lead>

      <H2>What runs where</H2>
      <Table
        head={["Feature", "Testnet", "Mainnet"]}
        rows={[
          ["Payment links in USDC", "Yes, Circle test USDC", "Yes, native USDC on NEAR"],
          ["Pay from other chains (NEAR Intents)", "No: NEAR Intents has no testnet", <NetBadge key="m" net="mainnet" />],
          ["Pay from a NEAR wallet", "Yes", "Yes"],
          ["Send links", "Yes", "No"],
          ["AI agent vault and attack tests", "Yes", "No mainnet vault is deployed"],
          ["Account check", "Yes, with the report registry", "Yes, read-only. No mainnet registry, so shared reports read as unavailable and the result is at least WARN"],
        ]}
      />

      <H2>USDC on each network</H2>
      <Facts
        rows={[
          [<NetBadge key="t" net="testnet" />, <><C>3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af</C> · USDC (Circle, NEAR testnet), 6 decimals</>],
          [<NetBadge key="m" net="mainnet" />, <><C>17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1</C> · USDC on NEAR, 6 decimals</>],
        ]}
      />

      <H3>Real money</H3>
      <Callout kind="warning" title="Mainnet moves real funds">
        <p>Notara is a hackathon prototype and has not been audited. On mainnet, keep amounts small. The app shows a warning banner whenever you're connected to mainnet.</p>
      </Callout>

      <H2>Switching networks</H2>
      <OL>
        <li>Open the wallet picker from the top bar.</li>
        <li>Choose Testnet or Mainnet. The list shows the wallets available for that network.</li>
        <li>Connect. The app follows the network your wallet signed in on.</li>
      </OL>
    </>
  );
}
