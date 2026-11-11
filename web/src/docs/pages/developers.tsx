import { A, Account, C, Callout, Code, Endpoint, Facts, H2, H3, Lead, NetBadge, P, Table, UL } from "../kit";

const BASE = "https://notara-sable.vercel.app";

export function Architecture() {
  return (
    <>
      <Lead>Notara is two NEAR contracts, a TypeScript service that checks accounts and signs verdicts, an agent wrapper, a backend for links and sends, and the website.</Lead>

      <H2>Components</H2>
      <Table
        head={["Component", "Where", "What it does"]}
        rows={[
          ["Vault contract", <C key="1">contracts/vault</C>, "Holds an agent's money. Pays only with a valid signed verdict, inside per-payment and daily caps. Parks WARN payments for the owner. Rust, near-sdk 5.30."],
          ["Registry contract", <C key="2">contracts/registry</C>, "Shared reports about accounts: a bond, an evidence link and hash, verifier rulings and disputes. Rust."],
          ["Notara service", <C key="3">passport/src</C>, "Reads the six signals, applies the policy, hashes the report and signs the verdict with ed25519. CLI and HTTP API."],
          ["Agent wrapper", <C key="4">agent/src</C>, "Sits between an LLM agent and the vault. BLOCK stops, WARN parks and tells the human, ALLOW pays. Includes the demo."],
          ["Backend", <C key="5">server/</C>, "Payment links, NEP-413 link signatures, NEAR Intents checkout, send links, merchant website proofs and the public API."],
          ["Website", <C key="6">web/</C>, "React and Vite. The landing page, the app, the customer pages and these docs."],
        ]}
      />

      <H2>Keys and trust</H2>
      <Table
        head={["Key", "Held by", "Can", "Cannot"]}
        rows={[
          ["Agent function-call key", "The agent process", "Call vault.request_payment, paying gas from a 0.5 NEAR allowance", "Transfer NEAR, attach deposits, call owner methods"],
          ["Owner key", "A human", "Approve or reject, set caps, pause, withdraw, hand over the vault", "Nothing outside the vault's own methods"],
          ["Vault full-access key", "Setup only", "Deploy or upgrade the vault", "Deleted by lock-vault for production"],
          ["Notara signer key", "The Notara service", "Sign verdicts", "Move money by itself"],
        ]}
      />
      <H3>Trust assumptions</H3>
      <UL>
        <li>The Notara signer key isn't stolen. In this prototype it's a local file; keeping it in a TEE is planned.</li>
        <li>A human holds the vault owner key, not the agent.</li>
        <li>FastNear and NEAR RPC return correct data. When they don't answer, the result is WARN.</li>
      </UL>

      <H2>Data sources</H2>
      <Table
        head={["Source", "Used for", "Limit"]}
        rows={[
          ["NEAR RPC at rpc.testnet.fastnear.com and rpc.mainnet.fastnear.com", "Account state, contract views", "Current state only"],
          ["FastNear Transactions API at tx.test.fastnear.com and tx.main.fastnear.com", "History, deploys, shared transactions", "Index gaps; scans are capped"],
          ["Notara registry contract (testnet)", "Reports", "Young, few reporters"],
          ["Notara vault contract (testnet)", "Payment history", "Only payments through this vault"],
          ["NEAR Intents 1Click API", "Cross-chain quotes, deposit addresses and status", "Mainnet only"],
        ]}
      />
    </>
  );
}

const MESSAGE = `agentspend-passport/v1
<vault>
<recipient>
<amount in the asset's smallest unit>
<asset: NEAR or the token contract>
<ALLOW | WARN | BLOCK>
<nonce, u64>
<expires_at_ms>
<report_hash: sha256 hex of the canonical report JSON>`;

const VERDICT_JSON = `{
  "vault": "spend-vault.agentspend-1104-p6zw.testnet",
  "recipient": "merchant.agentspend-1104-p6zw.testnet",
  "amount": "100000000000000000000000",
  "asset": "NEAR",
  "decision": "ALLOW",
  "nonce": "<random u64, as a string>",
  "expires_at_ms": "<now + 300000, as a string>",
  "report_hash": "<64 hex characters>"
}`;

export function VerdictFormat() {
  return (
    <>
      <Lead>A verdict is a short text that Notara signs with ed25519. The vault rebuilds the same text from the values it's given and checks the signature with env::ed25519_verify.</Lead>

      <H2>The signed text</H2>
      <P>Nine fields, UTF-8, joined with a newline. A field may never contain a newline.</P>
      <Code title="Signing message">{MESSAGE}</Code>
      <P>
        The first line is a fixed domain tag. It keeps an early project name, <C>agentspend-passport/v1</C>, because the deployed vault checks against it. The signature covers the raw bytes of this text; there is no separate hash step.
      </P>

      <H2>The verdict object</H2>
      <P>
        The agent passes the verdict to <C>request_payment</C> as JSON, with the signature in base64. Amounts, nonces and times are strings, because they don't fit in a JavaScript number.
      </P>
      <Code title="Verdict (example shape)" lang="json">{VERDICT_JSON}</Code>

      <H2>Field rules</H2>
      <Table
        head={["Field", "Rule"]}
        rows={[
          [<C key="1">vault</C>, "Must be the vault being called"],
          [<C key="2">recipient, amount, asset</C>, "Must equal the payment's own values"],
          [<C key="3">decision</C>, "ALLOW pays, WARN parks, BLOCK is refused"],
          [<C key="4">nonce</C>, "Random u64. The vault stores every nonce it has used and refuses a repeat"],
          [<C key="5">expires_at_ms</C>, "Notara sets it 5 minutes ahead. The vault refuses it once passed, or if it's further ahead than the vault's maximum of 10 minutes"],
          [<C key="6">report_hash</C>, "sha256 of the full report as canonical JSON (keys sorted), so the on-chain record points at the evidence"],
        ]}
      />
      <Callout kind="note" title="Kept in sync by a shared test">
        <p>
          A test vector checks that the TypeScript signer and the Rust contract agree: <C>passport/test/verdict.test.ts</C> and <C>contracts/vault/src/tests.rs</C>. One vault test verifies a signature made by the TypeScript signer.
        </p>
      </Callout>
    </>
  );
}

export function Api() {
  return (
    <>
      <Lead>The public API takes and returns JSON. There's no API key. All examples below run against the live site.</Lead>
      <Facts
        rows={[
          ["Base URL", <C key="b">{BASE}</C>],
          ["Errors", <>JSON <C key="e">{"{ error }"}</C> with 400 for bad input, 404, 409 when something is already done or not set up, 429 for a rate limit, or 500</>],
          ["Writes", "POST bodies must be sent as application/json. Browser requests from other websites are refused; scripts and servers are fine."],
          ["Also as text", <><A key="l" href="/llms.txt">/llms.txt</A>, a short version written for people and for AI agents</>],
        ]}
      />

      <H2>Account check</H2>
      <Endpoint method="POST" path="/v1/check">
        <p>
          Checks a recipient before you pay. Send <C>network</C>, <C>recipient</C>, and an amount: <C>amountNear</C> for NEAR, or <C>amountDecimal</C> with <C>asset</C> for a token.
        </p>
        <p>
          Returns <C>{"{ report }"}</C> with <C>decision</C>, <C>reasons</C> and every signal with its source. The public site doesn't sign verdicts; signing runs only where a vault is operated.
        </p>
      </Endpoint>
      <Code title="curl" lang="bash">{`curl -s -X POST ${BASE}/v1/check \\
  -H 'content-type: application/json' \\
  -d '{"network":"testnet","recipient":"merchant.agentspend-1104-p6zw.testnet","amountNear":"0.1"}'`}</Code>
      <Endpoint method="GET" path="/v1/health">
        <p>
          The service's status and the Notara signer's public key: <C>{"{ ok, public, signerPublicKey, deployed, agentMode }"}</C>.
        </p>
      </Endpoint>

      <H2>Payment links</H2>
      <Endpoint method="GET" path="/api/invoices/{id}">
        <p>
          One link: merchant, amount in the smallest unit, asset, description, status, <C>txHash</C> once paid, and <C>signed</C> with <C>signature</C> (<C>valid</C> when the merchant's wallet signed this exact link). Links paid from another
          chain list their <C>checkouts</C>.
        </p>
      </Endpoint>
      <Code title="curl: the mainnet proof link" lang="bash">{`curl -s ${BASE}/api/invoices/INV-0016`}</Code>
      <Endpoint method="GET" path="/api/invoices?merchant={account}">
        <p>A merchant's links. The merchant is required on the public site.</p>
      </Endpoint>
      <Endpoint method="GET" path="/api/invoices.csv?merchant={account}">
        <p>
          The same as CSV. See <A href="/docs/invoices-csv">the columns</A>.
        </p>
      </Endpoint>
      <Endpoint method="POST" path="/api/links/message">
        <p>
          Returns the exact text a merchant's wallet signs for a link, and the NEP-413 recipient: <C>{"{ recipient, message }"}</C>. Body: <C>merchant</C>, <C>description</C>, <C>amountDecimal</C>, <C>asset</C>.
        </p>
      </Endpoint>
      <Endpoint method="GET" path="/api/merchants/{account}">
        <p>
          A merchant's public profile: proven website, and link and payment counts. <C>POST /api/merchants/{"{account}"}/website</C> with <C>{"{ website }"}</C> runs the <A href="/docs/website-proof">website proof</A>.
        </p>
      </Endpoint>

      <H2 id="pay-from-another-chain">Pay from another chain <NetBadge net="mainnet" className="ml-2 align-middle" /></H2>
      <Endpoint method="GET" path="/api/checkout/tokens">
        <p>Tokens a customer can pay with, from the NEAR Intents 1Click API. Cached for 5 minutes.</p>
      </Endpoint>
      <Endpoint method="POST" path="/api/invoices/{id}/quote">
        <p>
          Body: <C>{"{ originAsset, refundTo }"}</C>. Returns the link with a new checkout: a one-time <C>depositAddress</C>, the <C>amountIn</C> to send and a <C>deadline</C>. Refused when the check on the merchant is BLOCK. Then poll{" "}
          <C>GET /api/invoices/{"{id}"}</C> until the status is <C>paid</C>.
        </p>
      </Endpoint>
      <Callout kind="warning" title="Real money">
        <p>A quote is a real NEAR Intents deposit address on mainnet. Anything sent to it is spent.</p>
      </Callout>

      <H2>Network and vault</H2>
      <Endpoint method="GET" path="/api/assets">
        <p>Supported assets with their id, symbol, decimals and network.</p>
      </Endpoint>
      <Endpoint method="GET" path="/api/deployment">
        <p>The testnet vault, registry and demo accounts.</p>
      </Endpoint>
      <Endpoint method="GET" path="/api/vault">
        <p>The testnet vault's config, balances, caps and what it spent today.</p>
      </Endpoint>
      <Endpoint method="GET" path="/api/vault/payments">
        <p>The vault's payments, newest first, each with its decision and report hash.</p>
      </Endpoint>

      <H2>Local only</H2>
      <P>
        These routes sign with the owner key or run the agent demo. They work when you run Notara yourself, and return 404 on the public site.
      </P>
      <Endpoint method="POST" path="/api/owner/approve" local>
        <p>
          And <C>/api/owner/reject</C>, <C>/api/owner/propose</C>. Owner actions with the local owner key.
        </p>
      </Endpoint>
      <Endpoint method="GET" path="/api/demo/run" local>
        <p>Runs the attack demo and streams its log as Server-Sent Events.</p>
      </Endpoint>
      <Endpoint method="POST" path="/api/invoices/{id}/pay" local>
        <p>The demo customer's agent pays an invoice through the wrapper and the vault.</p>
      </Endpoint>
    </>
  );
}

export function Contracts() {
  const T = "testnet" as const;
  return (
    <>
      <Lead>Both contracts are deployed on NEAR testnet. Their code hashes match a build of this repository, so you can compare what's deployed with the source.</Lead>

      <H2>Deployed accounts</H2>
      <Table
        head={["Role", "Account"]}
        rows={[
          ["Vault", <Account key="v" id="spend-vault.agentspend-1104-p6zw.testnet" net={T} />],
          ["Registry", <Account key="r" id="registry.agentspend-1104-p6zw.testnet" net={T} />],
          ["Owner", <Account key="o" id="agentspend-1104-p6zw.testnet" net={T} />],
          ["Verifier", <Account key="ve" id="verifier.agentspend-1104-p6zw.testnet" net={T} />],
          ["Demo merchant (allowlisted)", <Account key="m" id="merchant.agentspend-1104-p6zw.testnet" net={T} />],
          ["Demo new shop", <Account key="n" id="newshop.agentspend-1104-p6zw.testnet" net={T} />],
          ["Demo attacker", <Account key="a" id="attacker.agentspend-1104-p6zw.testnet" net={T} />],
        ]}
      />
      <Facts
        rows={[
          ["Vault code hash", <C key="1">AjewPGjjqqFwDYD6GnYrKkkH7UyNmhBHgJ5M2r4sehCm</C>],
          ["Registry code hash", <C key="2">8Upc4cEhHbLSiTYJ5UDiRSZ9Kkd3xfvS7JstwKNGy5T8</C>],
          ["Notara signer public key", <C key="3">ed25519:37ANNUiF39w3dKqppw2jU5EeHPVD7LdXnGTPvFnqugqr</C>],
          ["Checked", "On-chain with view_account and get_config, 11 November 2026"],
        ]}
      />

      <H2>Vault methods</H2>
      <Table
        head={["Method", "Who", "Does"]}
        rows={[
          [<C key="1">request_payment(recipient, amount, asset, verdict, signature, memo?)</C>, "Agent", "Pays, parks or refuses, after every check"],
          [<C key="2">approve(payment_id) · reject(payment_id)</C>, "Owner", "Decides a parked WARN payment"],
          [<C key="3">set_cap · set_ttls · set_paused</C>, "Owner", "Limits, verdict and pending lifetimes, pause"],
          [<C key="4">set_signer_public_key · set_agent</C>, "Owner", "Which Notara key and which agent the vault trusts"],
          [<C key="5">propose_owner · accept_owner · cancel_owner_proposal</C>, "Owner, then the new owner", "Two-step handover"],
          [<C key="6">withdraw(asset, amount)</C>, "Owner", "Takes money out to the owner"],
          [<C key="7">get_config · get_payment · get_payments · get_payments_to · get_spent_today · is_nonce_used · get_pending_owner</C>, "Anyone", "Views"],
        ]}
      />

      <H2>Registry methods</H2>
      <Table
        head={["Method", "Who", "Does"]}
        rows={[
          [<C key="1">submit_report(subject, category, description, evidence_uri, evidence_hash?, is_fixture?)</C>, "Anyone, with a 0.01 NEAR bond", "Files a report"],
          [<C key="2">dispute(report_id, reason, evidence_uri?)</C>, "Anyone, with a bond", "Disputes a report"],
          [<C key="3">set_status(report_id, status, note?)</C>, "A verifier", "Rules a report Verified or Rejected"],
          [<C key="4">add_verifier · remove_verifier</C>, "Owner", "Manages verifiers"],
          [<C key="5">get_report · get_reports_for · get_report_count · get_report_bond · is_verifier · get_owner</C>, "Anyone", "Views"],
        ]}
      />
    </>
  );
}

export function RunLocally() {
  return (
    <>
      <Lead>Run the website, the API and the contracts' tests on your own machine. Testnet setup is optional and costs about 7.5 testnet NEAR.</Lead>
      <Facts
        rows={[
          ["Requires", "Node 20 or later. Rust with the wasm32-unknown-unknown target, only to rebuild the contracts."],
          ["Repository", <A key="r" href="https://github.com/syther069/Notara">github.com/syther069/Notara</A>],
        ]}
      />

      <H2>The website and API</H2>
      <Code title="Install, build and serve" lang="bash">{`npm install
npm run web:install
npm run web:build
npm run serve`}</Code>
      <P>
        Open <C>http://127.0.0.1:8787</C>. For live editing, run <C>npm run web:dev</C> while <C>npm run serve</C> is running, and open <C>http://localhost:5173</C>. By default the server listens on 127.0.0.1 only.
      </P>

      <H2>Tests</H2>
      <Code title="No network, no keys" lang="bash">{`npm test
cargo test`}</Code>
      <P>
        <C>npm test</C> covers the policy table, the signing format, the wrapper, the backend guards, link signing, send-link keys and more. <C>cargo test</C> runs the contract unit tests for the vault and the registry.
      </P>

      <H2>Check a real mainnet account</H2>
      <Code lang="bash">{`npm run check -- aurora --network mainnet --amount 0.1`}</Code>
      <P>Read-only, no keys. With no mainnet registry, the result is at least WARN.</P>

      <H2>Deploy to testnet</H2>
      <Code title="Build the contracts (cargo-near), then set up" lang="bash">{`bash scripts/deploy-contracts.sh --build
NEAR_OWNER_ACCOUNT=you.testnet NEAR_OWNER_PRIVATE_KEY=ed25519:... npm run setup:testnet`}</Code>
      <UL>
        <li>
          No testnet account yet? <C>npm run setup:testnet -- --create-owner yourname.testnet</C> creates one with the testnet faucet.
        </li>
        <li>Setup creates the vault, registry, verifier, merchant, newshop and attacker subaccounts, deploys both contracts, adds the agent's function-call key and seeds one labelled fixture report.</li>
        <li>
          Keys are written to <C>./keys</C>, which git ignores. Never commit them.
        </li>
        <li>
          With Docker and a clean git tree, <C>REPRO=1 bash scripts/deploy-contracts.sh --build</C> makes a reproducible build, so anyone can match the deployed code hash.
        </li>
      </UL>

      <H2>Run the attack demo</H2>
      <Code lang="bash">{`npm run serve   # in one terminal
npm run demo    # in another`}</Code>
      <P>
        The agent runs scripted by default: a stand-in that obeys injected text, the worst case. To use a real model through NEAR AI Cloud or any OpenAI-compatible API, set <C>AGENT_LLM_API_KEY</C> and <C>AGENT_LLM_MODEL</C>.{" "}
        <C>-- --yes</C> approves the WARN step; <C>-- --only 2</C> runs one scenario.
      </P>
    </>
  );
}
