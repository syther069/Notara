import { A, Account, C, Callout, Code, Facts, H2, H3, Lead, NetBadge, OL, P, Proof, Step, Steps, Table, UL } from "../kit";

const MSG = `Notara payment link
Pay to: studio.near
Amount: 120 USDC
For: Logo design, November`;

export function PaymentLinks() {
  return (
    <>
      <Lead>A Notara payment link names who gets paid, how much, and what for. The merchant's NEAR wallet signs those exact words, so a customer can check the link really came from that account.</Lead>

      <H2>What gets signed</H2>
      <P>
        When you press <strong>Create payment link</strong>, your wallet signs this text with NEP-413, NEAR's standard for signing a message without sending a transaction. It costs nothing and moves no money.
      </P>
      <Code title="The message your wallet signs (example values)">{MSG}</Code>
      <P>
        The signature is made for the recipient <C>notara</C> and carries a NEP-413 nonce that starts with the signing time, so an old signature can't be passed off as new.
      </P>

      <H2>How a link is checked</H2>
      <P>Notara's server checks a signature in four steps before it saves a link, and again whenever the link is shown:</P>
      <OL>
        <li>The signed text matches the link's payee, amount, asset and description exactly.</li>
        <li>The ed25519 signature is valid for the public key that signed it.</li>
        <li>That key is a full-access key of the merchant's account, read live from NEAR on the link's own network.</li>
        <li>The account that signed is the payee. A link signed by anyone else is refused.</li>
      </OL>
      <P>
        When a link is first created, the signature must be less than 10 minutes old. The customer's page then shows <strong>Signed by the merchant's wallet</strong>.
      </P>

      <H2>What the customer sees</H2>
      <UL>
        <li>The amount, what it's for and the merchant's account.</li>
        <li>Whether the link is signed, and the merchant's proven website if there is one.</li>
        <li>
          An <A href="/docs/signals">account check</A> on the merchant before paying. On BLOCK, Notara won't create a payment address.
        </li>
      </UL>

      <H2>Ways to pay a link</H2>
      <Table
        head={["Method", "Network", "How it settles"]}
        rows={[
          ["Pay with a NEAR wallet", "Testnet and mainnet", "The customer's wallet sends USDC with ft_transfer, memo set to the link id."],
          [<>Pay from another chain <NetBadge key="m" net="mainnet" className="ml-1" /></>, "Mainnet", <><A key="a" href="/docs/any-chain">NEAR Intents</A> turns the customer's token into exact USDC on NEAR.</>],
        ]}
      />
      <H3>How a NEAR wallet payment is confirmed</H3>
      <P>
        The server reads the finished transaction from NEAR RPC. It marks the link paid only if the USDC contract's own <C>ft_transfer</C> event shows the full amount reaching the merchant, with the link's id as the memo. Merchant accounts are public,
        so an unrelated transfer to the same merchant can't mark a link paid, and one transfer can't pay two links.
      </P>
    </>
  );
}

export function AnyChain() {
  return (
    <>
      <Lead>On mainnet, a customer can pay a Notara link from the chain they already use. NEAR Intents converts what they send into the exact USDC amount on NEAR, delivered straight to the merchant.</Lead>
      <Callout kind="warning" title="Mainnet only">
        <p>NEAR Intents has no testnet, so every payment here uses real funds. Keep amounts small.</p>
      </Callout>

      <H2>How it works</H2>
      <Steps>
        <Step title="The customer picks a token">
          <p>The pay page lists common tokens from the NEAR Intents 1Click API: USDC, USDT, ETH, BTC, SOL, NEAR, BNB, AVAX, POL and ZEC, across the chains 1Click supports. The list is cached for 5 minutes.</p>
        </Step>
        <Step title="Notara asks 1Click for a quote">
          <p>
            The quote is <C>EXACT_OUTPUT</C>: the merchant receives exactly the link's amount in USDC on NEAR. Slippage tolerance is 1%. The customer gives a refund address on their own chain.
          </p>
        </Step>
        <Step title="The customer sends to a one-time address">
          <p>1Click returns a deposit address for this payment only, and the amount to send. The quote is valid for 30 minutes.</p>
        </Step>
        <Step title="NEAR Intents delivers the USDC">
          <p>
            <C>intents.near</C> transfers the USDC to the merchant. Anything sent above what the swap used is refunded to the customer's address on their chain.
          </p>
        </Step>
        <Step title="The link shows Paid">
          <p>Notara follows the deposit's status. Any successful deposit marks the link paid; a refunded or failed one is shown as such.</p>
        </Step>
      </Steps>

      <H2>Custody</H2>
      <P>Notara never holds the money. The deposit address belongs to NEAR Intents, and the USDC goes from NEAR Intents to the merchant's account. Notara adds no fee; the swap's own costs are part of the quote.</P>

      <H2>See it done on mainnet</H2>
      <P>
        One real payment has been made end to end, from ETH on Arbitrum to USDC on NEAR. Every leg is linked on the <A href="/docs/mainnet-proof">Mainnet proof</A> page.
      </P>
    </>
  );
}

export function MainnetProof() {
  return (
    <>
      <Lead>
        On 9 November 2026, a customer paid a Notara payment link with ETH on Arbitrum. Through NEAR Intents, exactly 0.1 USDC arrived in the merchant's NEAR account. Every leg is checked on its own chain, not only in Notara's database.
      </Lead>
      <Callout kind="success" title="Checked on-chain on 11 November 2026">
        <p>Each transaction below was looked up on its chain and matches what this page says. You can confirm it yourself without spending anything.</p>
      </Callout>

      <H2>The payment link</H2>
      <Facts
        rows={[
          ["Link", <><A key="l" href="https://notara-sable.vercel.app/pay/INV-0016">notara-sable.vercel.app/pay/INV-0016</A></>],
          ["Merchant", <Account key="m" id="sythertestnet.near" net="mainnet" />],
          ["Amount", "0.1 USDC on NEAR (100000 units, 6 decimals)"],
          ["Signed", "Yes. The merchant's wallet signed the link (NEP-413), and the signature checks out."],
          ["Paid with", "ETH on Arbitrum, through NEAR Intents"],
          ["Status", "Paid, 9 November 2026, 19:15 UTC"],
          [<NetBadge key="n" net="mainnet" />, "Real money"],
        ]}
      />

      <H2>Every transaction</H2>
      <Proof
        title="INV-0016, in order"
        items={[
          { net: "arbitrum", hash: "0x0df6ead66cb171ca58fd0353c629fb6b8aee038c43d1bac177e123734c8a6bab", label: "Deposit 1", result: "ok", shows: <>0.000047 ETH from the customer to the link's one-time deposit address <C>0x1C28…14f7</C>.</> },
          { net: "arbitrum", hash: "0xdcca9b40cb0a7b9db0f47bf89bb77928343bf54af7a4b56c115a557d9a789f4d", label: "Deposit 2", result: "ok", shows: <>0.00003 ETH more to the same deposit address.</> },
          { net: "mainnet", hash: "BX4uoqWgo1SGJXrEuuba7qvq8rgDGw8rvdx7Gy95WxPb", label: "Delivery on NEAR", result: "ok", shows: <><C>intents.near</C> runs the intent and transfers exactly 100000 units (0.1 USDC) to <C>sythertestnet.near</C>. No failed receipts.</> },
          { net: "arbitrum", hash: "0x6efb289bf30377a24518ab5affc5d3d0f3a43ca0b173d39944c2fc37c6875e33", label: "Refund", result: "ok", shows: <>0.0000285 ETH the swap didn't use, returned to the customer's refund address.</> },
        ]}
        note={<>The NEAR transaction hash stored on the Notara link is the same <C>BX4uoqWg…5WxPb</C> shown under Delivery. That's how you know they're the same payment.</>}
      />

      <H2>Check it yourself in a minute</H2>
      <OL>
        <li>
          Open the <A href="https://notara-sable.vercel.app/pay/INV-0016">payment link</A>. It shows <strong>Paid</strong> and that it's signed by the merchant's wallet.
        </li>
        <li>
          Open the <A href="https://nearblocks.io/txns/BX4uoqWgo1SGJXrEuuba7qvq8rgDGw8rvdx7Gy95WxPb">Delivery transaction</A> on NearBlocks. Find the USDC <C>ft_transfer</C> of 0.1 USDC from <C>intents.near</C> to{" "}
          <C>sythertestnet.near</C>.
        </li>
        <li>
          Optional: open the two deposits on Arbiscan. Both go to <C>0x1C28168bbA4516E97aeF48682BBe1aeC563c14f7</C>, the deposit address recorded on the link.
        </li>
      </OL>
      <P>
        The same record is readable as JSON at <C>GET /api/invoices/INV-0016</C>: status <C>paid</C>, <C>txHash</C> equal to the Delivery hash, and the checkout's status <C>SUCCESS</C>.
      </P>

      <H2>What this run did not show</H2>
      <UL>
        <li>One-click pay from MetaMask: the two deposits were sent separately.</li>
        <li>A larger amount. This was 0.1 USDC on purpose.</li>
        <li>A refund after a failed swap. The refund above returned unused ETH from a swap that succeeded.</li>
      </UL>
      <Callout kind="note" title="Why mainnet">
        <p>NEAR Intents has no testnet. Proving the cross-chain flow means real money, so the amount was kept small.</p>
      </Callout>
    </>
  );
}

export function WebsiteProof() {
  return (
    <>
      <Lead>Prove you own a website by publishing your NEAR account on it. A proven website shows on your payment pages for every customer.</Lead>

      <H2>Publish the file</H2>
      <P>
        Put a plain text file at <C>https://your-site.com/.well-known/near.txt</C> that contains your NEAR account. Other words in the file are ignored; your account must appear on its own, separated by spaces or new lines.
      </P>
      <Code title=".well-known/near.txt">{`studio.near`}</Code>

      <H2>Ask Notara to check it</H2>
      <P>Open your public page from the Dashboard and enter your website. Notara fetches the file over HTTPS and confirms your account is in it.</P>
      <Facts
        rows={[
          ["Protocol", "HTTPS only. Redirects are not followed."],
          ["Timeout", "5 seconds"],
          ["Read", "The first 2,000 characters of the file"],
          ["Refused", "Hosts that resolve to private or local network addresses"],
          ["Saved", "Only confirmed proofs, plus re-checks of a website already saved. Nobody can attach an unconfirmed site to someone else's profile."],
        ]}
      />
      <Callout kind="limit">
        <p>The proof shows that whoever controls the website listed your account when it was checked. It is not an identity check of the business behind it.</p>
      </Callout>
    </>
  );
}

export function InvoicesCsv() {
  return (
    <>
      <Lead>Every link has a status, and the Transactions page exports exactly the rows you're looking at as a CSV for your accountant.</Lead>

      <H2>Link statuses</H2>
      <Table
        head={["Status", "Meaning"]}
        rows={[
          [<C key="u">unpaid</C>, "Nobody has paid yet."],
          [<C key="p">processing</C>, "A deposit from another chain was seen and NEAR Intents is working on it."],
          [<C key="pa">paid</C>, "The full amount reached the merchant."],
          [<C key="pe">pending_approval</C>, "An agent payment the vault parked for the owner (WARN)."],
          [<C key="r">refused</C>, "The payment was refused, for example on a BLOCK."],
          [<C key="rf">refunded</C>, "NEAR Intents returned the deposit to the customer."],
          [<C key="f">failed</C>, "The payment didn't complete."],
        ]}
      />

      <H2>Export from the Transactions page</H2>
      <P>
        <strong>Export CSV</strong> on the <A href="/transactions">Transactions</A> page saves the rows you're looking at, after your filters, with dates in the timezone set in your Profile preferences.
      </P>
      <Table
        head={["Column", "Contains"]}
        rows={[
          ["Date", "When it happened, in your timezone"],
          ["Direction", "In or Out"],
          ["Type", "Payment link, Send link, Direct send or Agent invoice"],
          ["Counterparty", "The other account"],
          ["Amount", "In USDC with two decimals; other assets in their smallest unit"],
          ["Asset", "USDC, or the asset id"],
          ["Memo", "What it was for"],
          ["Status", "The payment's status"],
          ["Network", "mainnet or testnet"],
          ["Transaction", "The NEAR transaction hash"],
          ["Id", "The link or payment id"],
        ]}
      />

      <H3>For accounting tools: the API export</H3>
      <P>
        <C>GET /api/invoices.csv?merchant=you.near</C>, signed by the merchant's wallet (see the <A href="/docs/api">API reference</A>), returns their links with these columns: <C>invoice_id</C>, <C>created_at</C>, <C>description</C>, <C>amount</C> (in the asset's own unit), <C>currency</C>,{" "}
        <C>asset_contract</C>, <C>merchant</C>, <C>status</C>, <C>decision</C>, <C>vault_payment_id</C>, <C>tx_hash</C>, <C>explorer_url</C> and <C>paid_at</C>.
      </P>
      <Callout kind="note" title="Safe to open in a spreadsheet">
        <p>
          In both exports, a cell that starts with <C>=</C>, <C>+</C>, <C>-</C> or <C>@</C> gets an apostrophe in front, so a description or memo can't run as a formula when the file is opened.
        </p>
      </Callout>
    </>
  );
}
