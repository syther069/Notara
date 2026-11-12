# Architecture

How Notara is put together: the contracts, the checking service, the agent, the backend and the website, and how money and decisions flow between them. For a guided tour with every on-chain proof, see the [documentation site](https://notara-sable.vercel.app/docs).

## Overview

```
┌──────────────────────────────── Browser ─────────────────────────────────┐
│  Website (web/): landing · app · customer pages · docs                   │
│  Wallets through NEAR Connect: signs messages (NEP-413) and transactions │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ JSON over HTTPS
┌───────────────▼──────────────── Backend (server/) ───────────────────────┐
│  One Node request handler: a local server, or one Vercel function        │
│   ├─ Account check: signals → policy → report → signed verdict           │
│   ├─ Payment links, send links, Merchant Passport, CSV exports           │
│   ├─ Visitor vaults: create, fund, run scenarios                         │
│   └─ Local only: owner console, attack-demo runner                       │
│  Storage: Neon Postgres (DATABASE_URL), or SQLite locally                │
└───────┬──────────────────────┬───────────────────────┬───────────────────┘
        │ read                 │ quotes and status     │ read and write
┌───────▼────────┐   ┌─────────▼─────────┐   ┌─────────▼────────────────────┐
│ NEAR RPC and   │   │ NEAR Intents      │   │ NEAR testnet                 │
│ FastNear index │   │ 1Click API        │   │  Vault contract (the money)  │
│ mainnet+testnet│   │ (mainnet)         │   │  Registry contract (reports) │
└────────────────┘   └───────────────────┘   └─────────▲────────────────────┘
                                                       │ function-call key
                                          ┌────────────┴────────────┐
                                          │ AI agent + wrapper      │
                                          │ (agent/)                │
                                          └─────────────────────────┘
```

**The central idea:** the website and the checking service advise; the **vault contract decides**. If the agent, the wrapper or the website is bypassed, the vault still pays only with a valid signed verdict and within its own caps.

## Components

### Vault contract (`contracts/vault`)

Rust, near-sdk 5.30. Holds an agent's spending money and enforces every rule on-chain.

| Method | Who can call | What it does |
|---|---|---|
| `request_payment(recipient, amount, asset, verdict, signature, memo)` | the agent's function-call key | Checks the signature, the binding to vault, recipient, amount and asset, expiry, nonce, decision and caps. ALLOW pays now, WARN parks the payment, BLOCK is refused. |
| `approve(id)`, `reject(id)` | owner | Decides a parked payment. Caps are checked again. Unanswered payments expire after 24 hours. |
| `set_cap`, `set_signer_public_key`, `set_agent`, `set_ttls`, `set_paused`, `withdraw` | owner | Administration. |
| `propose_owner`, `accept_owner` | owner, then the new owner | Two-step handover, so a typo can't lock the vault. |
| `on_payout` | the vault itself | Marks a payout Executed or Failed, and releases the cap reservation on failure. |
| `get_config`, `get_payment(s)`, `get_payments_to`, `get_spent_today`, `is_nonce_used` | anyone | Views. |

Payment states: `PendingApproval → Executing → Executed | Failed`, or `PendingApproval → Rejected | Expired`. NEP-141 payouts attach the required 1 yoctoNEAR from the vault's own balance, because a function-call key can't attach a deposit.

The vault code is also published once as a NEAR **global contract**. The factory `vaults.agentspend-1104-p6zw.testnet` creates each visitor vault in one transaction, with the visitor's wallet as owner and no access key at all.

### Registry contract (`contracts/registry`)

Shared reports about accounts.

- `submit_report` (anyone, 0.01 NEAR bond), `dispute` (anyone, with a bond), `set_status` (verifiers only), `add_verifier` (owner).
- Statuses: `Unverified`, `Verified`, `Rejected`, `Disputed`. Only Verified reports can lead to BLOCK.
- At most 50 open reports per account; rejected reports free their slot.
- `is_fixture: true` marks seeded demo data, which the checker labels `[DEMO FIXTURE]`.

### Checking service (`passport/`)

Reads chain data and holds one signing key.

```
request ─► collect signals ─► evaluate policy ─► build report ─► sign verdict
           (in parallel)       (pure, fail-closed) (sha256 hash)   (ed25519)
```

| File | Job |
|---|---|
| `src/signals/index.ts` | Signal collectors: account state, activity history, contract deployments, code changes, prior interactions, shared reports, allow and deny lists, and token registration for NEP-141 assets. Each returns its status, source, endpoint, fetch time, data and caveats. |
| `src/policy.ts` | Rules to ALLOW, WARN or BLOCK. No I/O; a missing signal means at least WARN. |
| `src/check.ts` | Runs one check and signs the verdict when asked. |
| `src/verdict.ts` | The canonical verdict text, the report hash and the signer key. |
| `src/near.ts` | `fetch` wrappers for NEAR RPC and FastNear, with timeouts. |
| `src/assets.ts`, `assets.json` | Supported assets and unit conversion. |
| `policy.json` | Thresholds per asset, allow and deny lists, verdict lifetime. |
| `src/cli.ts` | `npm run check`. |

### Agent (`agent/`)

| File | Job |
|---|---|
| `src/wrapper.ts` | `GuardedPayments.pay()`, the agent's only path to money. BLOCK stops with nothing signed; WARN submits (the vault parks it) and notifies the human; ALLOW submits and confirms the payout. |
| `src/agent.ts` | An accounts-payable agent on any OpenAI-compatible API. On NEAR AI Cloud it defaults to a TEE-hosted model. Without an API key it runs a scripted stand-in that obeys injected text, the worst case. |
| `src/attest.ts` | Checks the model's TEE attestation on NEAR AI Cloud (fresh nonce, NVIDIA GPU evidence) and the TEE signature on each reply. |
| `src/demo.ts` | The attack demo: scenarios 1, 2, 2b, 3a to 3g and 4 against the deployed contracts. Each run saves its log to `demo/runs/`. |
| `src/keys.ts` | Loads local key files. The agent loads only its function-call key. |

### Backend (`server/`)

One request handler, used both by `npm run serve` and by the Vercel function (`server/vercel.ts`).

| File | Job |
|---|---|
| `index.ts` | Routing, input checks, the public-mode switch and the error handler. |
| `db.ts` | Document storage. Every write is one atomic statement: merge, insert-if-new, set-once flags, and merge-unless-paid. |
| `invoices.ts` | Payment links: creation and validation, the status flow (a paid link never moves back), the unsigned-link cap and the CSV export. |
| `merchants.ts`, `nep413.ts` | The text a merchant's wallet signs for a link, NEP-413 verification on the right network, website proof. |
| `nearpay.ts` | Confirms a NEAR-wallet payment from the USDC contract's own transfer event and memo, net of refunds. |
| `checkout.ts` | NEAR Intents 1Click: tokens, quotes, deposit addresses and status. |
| `sends.ts` | Send links: the signed message, daily limits, and checking and relaying the NEP-366 claim. |
| `vaults.ts` | Visitor vaults: creation through the factory, scenario runs, owner proof. |
| `notify.ts` | Optional Telegram alert when a link is paid. |
| `guard.ts`, `errors.ts` | Request guards for the local server, and safe error messages for the public deploy. |

Shared invoice rules (line totals, Overdue, how a link was paid) live in `web/src/lib/invoice-rules.ts`, a file with no imports that the server and the website both use.

### Website (`web/`)

Vite, React 19 and Tailwind CSS v4. Wallets connect through NEAR Connect (`@hot-labs/near-connect`).

| Area | Routes |
|---|---|
| Landing | `/` |
| App | `/dashboard`, `/get-paid`, `/send`, `/agents/vault`, `/agents/check`, `/transactions`, `/profile` |
| Customer pages | `/pay/:id`, `/claim/:id`, `/m/:account`, `/invoices/:id` |
| Documentation | `/docs` and its pages |

In development, Vite proxies `/api` and `/v1` to the backend. In production the backend, or Vercel, serves the built files.

## Main flows

**Check an account.** The browser posts to `/v1/check`. The service collects the signals in parallel, the policy returns a decision with reasons, and the page shows the verdict, the evidence with its sources, and the caveats.

**An agent pays an invoice.** The agent reads an invoice and calls `pay(recipient, amount)`. The wrapper asks for a signed verdict. On BLOCK nothing is signed. On ALLOW or WARN the wrapper calls `request_payment` with the function-call key, and the vault verifies everything again: ALLOW pays, WARN parks.

**The owner approves a parked payment.** The owner's own NEAR wallet signs `approve(id)` or `reject(id)` from the Vault Console. The site never holds the owner's key.

**A hacked agent bypasses the wrapper.** The agent's key can call only `request_payment` on the vault. The vault refuses BLOCK, edited, forged, reused or redirected verdicts. The NEAR protocol refuses direct transfers, owner-method calls and calls to any other contract made with that key.

**A customer pays a payment link.** The pay page shows the merchant's signature status and an account check. The customer pays from a NEAR wallet, and the server confirms the transfer from the token's own event. On mainnet they can also pay from another chain through a one-time 1Click deposit address, and the merchant receives exact USDC on NEAR.

**Someone claims a send link.** The link's key lives only in the URL fragment, which never reaches the server. The browser signs one USDC transfer as a NEP-366 delegate action; the server checks it is exactly that transfer and relays it through the sponsor, which pays the gas.

## Signed verdict format

The service signs this exact text (UTF-8, `\n`-separated) with ed25519:

```
agentspend-passport/v1
<vault>
<recipient>
<amount in the smallest unit>
<asset: NEAR or the token contract>
<ALLOW|WARN|BLOCK>
<nonce u64>
<expires_at_ms>
<report_hash: sha256 hex of the canonical report JSON>
```

The vault rebuilds the same text and checks it with `env::ed25519_verify`. A shared test vector keeps the TypeScript signer and the Rust contract in agreement (`passport/test/verdict.test.ts` and `contracts/vault/src/tests.rs`). The first line keeps an early project name because the deployed vault checks against it.

## Keys and trust

| Key | Held by | Can do | Cannot do |
|---|---|---|---|
| Agent function-call key | the agent process | call `request_payment` on the vault, paying gas from its allowance | transfer NEAR, attach a deposit, call owner methods or any other contract |
| Vault owner | a person's wallet (or a local key for the demo vault) | approve and reject, caps, pause, withdraw | |
| Vault full-access key | setup only | deploy and upgrade the vault | deleted on the demo vault on 2026-11-12; visitor vaults never have one |
| Checking-service signer key | the backend | sign verdicts | move money by itself |
| Send-link sponsor | the backend | pay gas and storage for send-link claims | move a link's USDC (only the link's key signs that) |

Trust assumptions:

- The signer key is not stolen. On the public deploy it is an environment variable; keeping it in a TEE is planned.
- The vault owner is a person, not the agent.
- NEAR RPC and FastNear return correct data. When they don't answer, the decision is at least WARN.

## Data sources

| Source | Network | Used for | Limit |
|---|---|---|---|
| NEAR RPC (`rpc.*.fastnear.com`) | both | account state, contract views, transactions | current state only |
| FastNear Transactions API | both | history, deployments, shared transactions | index gaps; scans are capped |
| Registry contract | testnet | reports | few reporters so far |
| Vault contract | testnet | payment history | only payments through that vault |
| NEAR Intents 1Click | mainnet | quotes, deposit addresses, status | no testnet |
| NEAR AI Cloud | — | the agent's model and its TEE attestation | relayed models have no attestation |

## Deployment

| Part | Where |
|---|---|
| Contracts | NEAR testnet, as subaccounts of the owner account (`npm run setup:testnet`). No contract on mainnet. |
| Website and backend | Vercel, in public mode (`NOTARA_PUBLIC=1`): the owner console and the local demo runner are off, and `/v1/check` never returns a signed verdict. |
| Storage | Neon Postgres on Vercel; SQLite locally. |
| Mainnet | USDC payment links (NEAR wallet or NEAR Intents) and read-only account checks. |
