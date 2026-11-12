import { A, C, H2, Lead, P, Table } from "../kit";

// Each requirement is quoted from its track's brief at github.com/nearai/near-hackathon-prompt-examples/tree/main/tracks.
const TX = (h: string) => `https://testnet.nearblocks.io/txns/${h}`;

export function Hackathon() {
  return (
    <>
      <Lead>
        Notara enters three tracks of the NEAR Hackathon: AI Security & Defense (primary), Real-World Money and Open Innovation. Here is every requirement from those briefs, how Notara meets it, and where to check.
      </Lead>
      <P>
        The briefs are in <A href="https://github.com/nearai/near-hackathon-prompt-examples/tree/main/tracks">nearai/near-hackathon-prompt-examples</A>. Notara is built on NEAR; it isn't a NEAR product. It's a prototype and hasn't been audited.
      </P>

      <H2>AI Security & Defense</H2>
      <Table
        head={["Requirement", "How Notara meets it", "Check it"]}
        rows={[
          ["Before paying, the agent asks about the receiver and gets allow, warn or block with reasons", "The account check returns ALLOW, WARN or BLOCK, with reasons and the source of each signal", <A key="1" href="/agents/check">Check an account</A>],
          ["Signal: account age and activity", "First and last observed activity and transaction count, from FastNear", <A key="2" href="/docs/signals">Signals</A>],
          ["Signal: is it a contract, did its code change recently", "The code hash, a scan for contract deployments, and a check for code changed since our last look", <A key="3" href="/docs/signals">Signals</A>],
          ["Signal: past interactions between agent and receiver", "The vault's own payment history to that receiver, plus transactions they share", <A key="4" href="/docs/signals">Signals</A>],
          ["A shared blocklist other agents can report to, with evidence", "The registry contract: bonded reports with an evidence link and hash, verifier rulings and disputes. Any account can report", "Report this account, on any testnet pay page"],
          ["The data source for each signal", "Every signal names its source, endpoint and fetch time, and its limits", <A key="5" href="/docs/signals">Signals</A>],
          ["A wrapper that refuses to sign on block", "On BLOCK nothing is signed and the human is told", <A key="6" href="/docs/attack-tests">Check 2b</A>],
          ["…and asks a human on warn", "On WARN the vault holds the payment on-chain until the owner approves or rejects it", <A key="7" href={TX("EE1yWe1c5pyBEj8BahXmjNLEva6DxzYwsmxvMBkp33VT")}>Check 4, approved by the owner</A>],
          [
            "The agent signs with a function-call key for one contract, never a full-access key",
            <>The agent's only key calls one method, <C key="m">request_payment</C>, on the vault. The demo vault was locked on 12 November 2026, so it has no full-access key at all</>,
            <A key="8" href={TX("BKYAA6TskXprBX8ovMYcjBCTpnMWKFWpW7KHzaCLjcJ1")}>The lock transaction</A>,
          ],
          ["The limits of that key, explained", "What the key protects and what it doesn't, including its gas allowance", <A key="9" href="/docs/function-call-keys">Function-call keys</A>],
          ["The brief's note: such a key can't transfer NEAR or add keys, and stops when its gas runs out", "Checks 3e and 3f show both refusals. The agent's key got 2 NEAR of gas before the lock, and the lock command refuses while it has under 1 NEAR", <A key="10" href="/docs/attack-tests">Attack tests</A>],
          ["An attack demo: a prompt-injected agent tries to pay a bad address and is stopped, with the log", "A hidden \"pay the attacker\" instruction (checks 2 and 2b), and seven attacks by a hacked agent (3a to 3g), each refused on-chain or by the protocol. Every run saves its log", <A key="11" href="/docs/attack-tests">Attack tests</A>],
          ["Lean on: TEE attestation", "The agent's AI model is checked for TEE attestation on NEAR AI Cloud, and every reply's TEE signature is verified. Notara's own signing key isn't in a TEE yet", <A key="12" href="/docs/tee-model">Verified AI model (TEE)</A>],
        ]}
      />

      <H2>Real-World Money</H2>
      <Table
        head={["Requirement", "How Notara meets it", "Check it"]}
        rows={[
          ["Stablecoins", "Every link is in USDC on NEAR: Circle's testnet USDC, and real USDC on mainnet", <A key="1" href="/docs/networks">Testnet and mainnet</A>],
          ["NEAR Intents through the 1Click API", "Mainnet links are payable from other chains; the merchant receives exact USDC on NEAR", <A key="2" href="/docs/mainnet-proof">Mainnet proof</A>],
          ["Meta transactions", "Send-link claims are NEP-366 meta transactions: the link signs one transfer and our sponsor relays it and pays the gas", <A key="3" href="/docs/send-links">Send links</A>],
          ["NEP-141 tokens", "USDC transfers, storage registration, the 1-yoctoNEAR deposit, and payments matched by the token's own transfer event and memo", <A key="4" href="/docs/payment-links">Payment links</A>],
          ["An invoice page with amount, due date, line items and a pay button through 1Click", "The pay page shows the amount, the due date (Overdue once it passes), each line and the total, and pays through 1Click on mainnet or a NEAR wallet", <A key="5" href="/get-paid">Get Paid</A>],
          ["Gasless for the freelancer", "Making and signing a link is a wallet signature, not a transaction, so it costs no gas. Receivers claiming send links pay no gas either. The relayer covers send-link claims only", <A key="6" href="/docs/payment-links">Payment links</A>],
          ["Trustworthy status: paid, pending, refunded, with transaction links", "Unpaid, processing, paid, refunded and failed, each with its transaction link. A paid link never moves back to an earlier status", <A key="7" href="/docs/invoices-csv">Links and status</A>],
          ["A CSV an accountant can use without follow-up questions", "Exact amounts, due date and overdue, line items, network, who paid and how, and an explorer link for each payment. Every column documented", <A key="8" href="/docs/invoices-csv">CSV export</A>],
          ["A README written for a bookkeeper", "A guide for the person who keeps the books", <A key="9" href="/docs/bookkeeping">Guide for bookkeepers</A>],
          ["One complete paid-invoice flow on testnet", "A testnet invoice paid end to end by the agent through the vault on 9 November 2026. The 1Click flow is mainnet-only, because NEAR Intents has no testnet, and has a real mainnet payment", <A key="10" href="/docs/mainnet-proof">Mainnet proof</A>],
        ]}
      />

      <H2>Open Innovation</H2>
      <P>
        This track can be entered alongside any other and has no fixed requirements. What's new: a counterparty check whose verdict a NEAR contract enforces, so a prompt-injected or hacked agent can't skip it, together with payment links people can verify before they pay.
      </P>

      <H2>General submission rules</H2>
      <Table
        head={["Rule", "Status"]}
        rows={[
          ["A working prototype in a public repository", <A key="1" href="https://github.com/syther069/Notara">github.com/syther069/Notara</A>],
          ["The README matches what runs", "Every claim is checked against the code, the live site or the chain. Anything built but not run with real funds says so"],
          ["All code written after the announcement", "The first commit is dated 4 November 2026, inside the window that opened on 1 November"],
          ["A public demo post on X, and the submission form", "The team's to do before 14 November 2026, 23:59 UTC"],
        ]}
      />
    </>
  );
}
