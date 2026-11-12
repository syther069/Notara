# Notara: Architecture

Status: v1 · 2026-11-04. Companion to `PRD.md` (what and why) and `rules.md` (how we work).

---

## 1. The big picture

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│  Website (web/)   Home · Check · Attack demo · Vault · About            │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ HTTP (JSON + live log stream)
┌───────────────▼──────────────── Local server (Node) ────────────────────┐
│  Backend API (server/index.ts)                                          │
│   ├─ Check engine: signals → policy → report → signed verdict           │
│   ├─ Demo runner: starts the agent demo, streams its log                │
│   └─ Owner console: approve / reject WARN payments (owner key, local)   │
└───────┬──────────────────────┬───────────────────────┬──────────────────┘
        │ read                 │ read                  │ write (testnet)
┌───────▼───────┐   ┌──────────▼─────────┐   ┌─────────▼──────────────────┐
│ NEAR RPC      │   │ FastNear tx index  │   │ NEAR testnet               │
│ (FastNear)    │   │ (account history)  │   │  Vault contract  (money)   │
│ mainnet+test  │   │ mainnet+testnet    │   │  Registry contract(reports)│
└───────────────┘   └────────────────────┘   └─────────▲──────────────────┘
                                                       │ function-call key
                                          ┌────────────┴───────────┐
                                          │ AI agent + wrapper     │
                                          │ (agent/src)            │
                                          └────────────────────────┘
```

**The key idea:** the website and Notara *advise*; the **Vault contract decides**. Even if the agent, the wrapper or the website is bypassed, the vault only pays with a valid signed verdict and within its own caps.

## 2. Components

### 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30)
Holds the agent's spending money and enforces every rule on-chain.

| Method | Who can call | What it does |
|---|---|---|
| `request_payment(recipient, amount, asset, verdict, signature, memo)` | agent only (function-call key) | Checks signature, binding, expiry, nonce, decision and caps. ALLOW → pays now. WARN → parks as `PendingApproval`. BLOCK → panics. |
| `approve(id)` / `reject(id)` | owner | Decides a parked WARN payment. Caps are re-checked. Expires after 24 h. |
| `set_cap`, `set_signer_public_key`, `set_agent`, `set_ttls`, `set_paused`, `withdraw` | owner | Admin. |
| `on_payout` | vault itself (callback) | Marks Executed / Failed; releases the cap reservation on failure. |
| `get_config`, `get_payment(s)`, `get_payments_to`, `get_spent_today`, `is_nonce_used` | anyone (view) | Read state for the website and Notara. |

Payment states: `PendingApproval → Executing → Executed | Failed`, or `PendingApproval → Rejected | Expired`.

### 2.2 Registry contract (`contracts/registry`, Rust)
Shared reports about accounts.
- `submit_report` (anyone, 0.01 NEAR bond), `dispute` (anyone, bond), `set_status` (verifiers only), `add_verifier` (owner).
- Statuses: `Unverified`, `Verified`, `Rejected`, `Disputed`.
- `is_fixture: true` marks seeded demo data.
- At most 50 open reports per subject; `Rejected` reports don't count, so a subject can't fill its own slots with junk to block real reports (redeployed on testnet 2026-11-12, code hash `GSur5172GNggBZ2SAd6VPtAaV6MUyBfyfU5z7R8Q2gQ`).

### 2.3 Notara (`passport/src`, TypeScript)
The checker. Pure read access to chain data plus one signing key.

```
request ─► collectSignals ─► evaluate (policy) ─► buildReport ─► sign verdict
             6 signals         pure function        hash (sha256)   ed25519
```

| File | Job |
|---|---|
| `signals/index.ts` | Collectors: account state, activity history, contract deploys, prior interactions, shared reports, policy lists, and for tokens, NEP-145 token registration. Each returns status, source, endpoint, time, data, caveats. |
| `signals/codeHashCache.ts` | Remembers contract code hashes to detect changes. |
| `near.ts` | Plain `fetch` wrappers for NEAR RPC and FastNear (timeouts, error mapping). |
| `policy.ts` | Rules → ALLOW / WARN / BLOCK. No I/O. Fail-closed. |
| `check.ts` | Orchestrates one check; signs the verdict when asked. |
| `verdict.ts` | Canonical message, report hash, signer key. |
| (moved) | The HTTP API now lives in `server/index.ts` (see 2.6). |
| `cli.ts`, `format.ts` | Terminal output. |
| `policy.json` | Thresholds (per asset), allow/deny lists, verdict lifetime. |
| `assets.json`, `src/assets.ts` | Asset registry (NEAR, Circle testnet USDC) and unit conversion. |

### 2.4 Agent (`agent/src`, TypeScript)
| File | Job |
|---|---|
| `wrapper.ts` | `GuardedPayments.pay()`: the only money path for the agent. BLOCK → stop, nothing signed. WARN → submit (vault parks it) and notify the human. ALLOW → submit and confirm the payout. |
| `agent.ts` | Accounts-payable LLM agent (NEAR AI Cloud or any OpenAI-compatible API), with a labeled scripted fallback. |
| `demo.ts` | Runs the four scenarios on testnet and writes `demo/runs/*.log`. |
| `keys.ts` | Loads local key files; the agent loads only `keys/agent-fc.json`. |

### 2.6 Backend (`server/`, built)
| File | Job |
|---|---|
| `server/index.ts` | One local Node `http` server: Notara API, vault views, owner console, demo runner (spawns `agent/src/demo.ts --leave-pending` and streams its output), invoices, and serves `web/dist` once the website is built. |
| `server/invoices.ts` | Invoice store in `data/invoices.json` (gitignored, atomic writes), status mapping from the vault, CSV export. |

### 2.5 Website (`web/`, built)
Single-page app served next to Notara API.

| Page | Calls |
|---|---|
| Home `/` | static |
| Check `/check` | `POST /v1/check` |
| Attack demo `/demo` | `GET /api/deployment`, `GET /api/demo/run?only=n` (live log stream, Server-Sent Events) |
| Vault `/vault` | `GET /api/vault`, `GET /api/vault/payments`, `POST /api/owner/approve`, `POST /api/owner/reject` |
| About `/about` | static |

Stack choice: **Vite + React + TypeScript**, plain CSS. Reason: fast to build, easy for judges to run, no backend framework needed (Node's `http` module is enough). In development Vite proxies `/api` and `/v1` to Notara server; in the final build Notara server serves the built files, so one command starts everything.

## 3. API (server)

| Method & path | Body / query | Returns |
|---|---|---|
| `GET /v1/health` | – | `{ ok, signerPublicKey, deployed, agentMode }` |
| `POST /v1/check` | `{ network, recipient, amountNear \| amount (yocto), asset, payer?, sign? }` | `{ report, verdict?, signature?, signerPublicKey? }` |
| `GET /api/deployment` | – | testnet vault, registry, demo accounts, or `{ deployed: false }` |
| `GET /api/vault` | – | config, balance, today's spending |
| `GET /api/vault/payments` | – | payment list, newest first |
| `POST /api/owner/approve` | `{ id }` | tx hash, explorer link, updated payment (local owner console) |
| `POST /api/owner/reject` | `{ id }` | same |
| `POST /api/owner/propose` | `{ newOwner }` | step 1 of the handover to a wallet (local owner key; the account must exist) |
| `GET /api/demo/run` | `only=1..4` | Server-Sent Events: `start`, `log` lines, `done` (+ saved log name). One run at a time; WARN is left pending for the Vault page |
| `GET /api/demo/status` | – | `{ running }` |
| `GET /api/demo/logs`, `GET /api/demo/logs/:name` | – | saved run logs |
| `GET /api/demo/inbox` | – | the three invoice documents, with real account names filled in |
| `GET /api/invoices` | – | invoices (pending ones re-synced from the vault) |
| `POST /api/invoices` | `{ description, amountDecimal, asset, merchant?, signedToken?, dueDate?, items? }` | new invoice (merchant defaults to the demo merchant). `dueDate` is `YYYY-MM-DD`; `items` is up to 20 `{ description, quantity, unitDecimal }`, and the amount is then their total. Both are part of the signed link text |
| `GET /api/invoices/:id` | – | one invoice |
| `POST /api/invoices/:id/pay` | – | the customer's agent pays through wrapper → vault; returns invoice, Notara report, log |
| `GET /api/invoices.csv` | – | CSV for the accountant (formula-injection safe): exact decimal amounts, due date and overdue, line items, network, payer, how it was paid, payment transaction and link, refund reason. Columns are listed on the docs page "Links, status and CSV export" |
| `GET /api/checkout/tokens` | – | tokens a customer can pay with (from 1Click, cached 5 minutes) |
| `POST /api/invoices/:id/quote` | `{ originAsset, refundTo }` | one-time 1Click deposit address for a mainnet USDC payment link. Refused on BLOCK |
| `POST /api/links/message` | `{ merchant, description, amountDecimal, asset }` | the exact text the merchant's wallet signs (NEP-413) |
| `GET /api/merchants/:account` | – | Merchant Passport: confirmed website, link and payment counts |
| `POST /api/merchants/:account/website` | `{ website }` | checks `https://<site>/.well-known/near.txt` lists the account; only confirmed proofs are saved |
| `POST /api/sends` | `{ amountDecimal, implicitAccount, note? }` | new send link (sponsor registers its USDC storage). The key never reaches the server |
| `GET /api/sends/:id`, `POST /api/sends/:id/activate` | – | link state and balance; activate gives the funded link account a little NEAR for the claim's gas |
| `GET /api/assets` | – | supported assets (`passport/assets.json`): NEAR and Circle testnet USDC |

Errors are JSON `{ error }` with 400 (bad input), 404, 409 (testnet not set up, demo already running, invoice already paid) or 500.

The server binds to `127.0.0.1` only. Endpoints that sign or spend (demo, owner) are for the local demo and must never be exposed publicly without authentication.

## 4. Main flows

### 4.1 Check an account (website)
1. User enters an account and amount on `/check`.
2. Browser sends `POST /v1/check` (`sign: false`).
3. Notara collects signals in parallel (RPC, FastNear, registry, policy).
4. Policy engine returns the decision and reasons.
5. Website shows the badge, reasons, evidence table with source tags, and caveats.

### 4.2 Agent pays an invoice
1. Agent reads an invoice and calls `pay(recipient, amount)`.
2. Wrapper asks Notara for a **signed** verdict.
3. BLOCK → the wrapper returns "refused"; no transaction exists.
4. ALLOW / WARN → wrapper calls `vault.request_payment` with the agent's function-call key (no deposit).
5. Vault verifies everything again. ALLOW → transfer + callback. WARN → parked.

### 4.3 Human approves a WARN payment
1. The Vault page lists `PendingApproval` payments.
2. Owner clicks Approve. If their NEAR wallet is connected (via `@hot-labs/near-connect`) and is the vault owner, the **wallet** signs `vault.approve(id)` itself. The site never sees a key. Before ownership is handed to a wallet, the local demo owner key signs through the server instead.

### 4.3b Handing the vault to the human's wallet
1. On the Vault page, connect a testnet wallet.
2. Step 1: the current owner (local key, through `POST /api/owner/propose`) calls `vault.propose_owner(wallet)`.
3. Step 2: the wallet signs `vault.accept_owner()`. From then on only that wallet can approve. A typo can't lock the vault, because nothing changes until the proposed account accepts.
3. Vault re-checks caps and pays.

### 4.4 Attacker bypasses the wrapper
The agent key can only call `request_payment`. The vault rejects BLOCK, edited, forged, reused or mismatched verdicts. The protocol rejects direct transfers and owner-method calls by that key. Every rejection is shown on the demo page.

## 5. Signed verdict format

Notara signs this exact text (UTF-8, `\n` separated) with ed25519:

```
agentspend-passport/v1
<vault>
<recipient>
<amount in smallest unit>
<asset: NEAR or token contract>
<ALLOW|WARN|BLOCK>
<nonce u64>
<expires_at_ms>
<report_hash: sha256 hex of canonical report JSON>
```

The vault rebuilds the same text and checks it with `env::ed25519_verify`. A shared test vector keeps TypeScript and Rust in sync (`passport/test/verdict.test.ts` ↔ `contracts/vault/src/tests.rs`).

## 6. Keys and trust

| Key | Held by | Can do | Cannot do |
|---|---|---|---|
| Agent function-call key (`keys/agent-fc.json`) | agent process | call `vault.request_payment`, pay gas from 0.5 NEAR allowance | transfer NEAR, attach deposits, call owner methods |
| Owner key (`keys/owner.json`) | human / local owner console | approve/reject, caps, pause, withdraw | – (full control of vault rules) |
| Vault full-access key (`keys/vault-admin.json`) | setup only | deploy/upgrade the vault | – (delete with `lock-vault` for production) |
| Notara signer key (`keys/passport-signer.json`) | Notara server | sign verdicts | move money by itself |

Trust assumptions:
- Notara signer key is not stolen. (Stretch: keep it in a TEE.)
- The vault owner key is held by a human, not by the agent.
- Data sources (FastNear, RPC) return correct data; when they don't respond, we WARN.

## 7. Data sources

| Source | Network | Used for | Limit |
|---|---|---|---|
| NEAR RPC via `rpc.{testnet,mainnet}.fastnear.com` | both | account state, contract views | current state only |
| FastNear Transactions API `tx.{test,main}.fastnear.com` | both | history, deploys, shared transactions | index gaps; scans are capped |
| Our Registry contract | testnet | reports | young, few reporters |
| Our Vault contract | testnet | payment history | only payments through this vault |
| `passport/policy.json`, `deployment.testnet.json` | local | thresholds, allow/deny lists | operator-maintained |

## 8. Repository layout

```
contracts/vault/      Vault contract + tests
contracts/registry/   Registry contract + tests
contracts/res/        built .wasm files
passport/src/         checker, policy, signer, API
passport/test/        policy + signing tests
agent/src/            wrapper, LLM agent, demo
agent/test/           wrapper tests
web/                  website (Vite + React)
scripts/              build, testnet setup, owner CLI
demo/inbox/           invoices (one with injection)
demo/runs/            saved demo logs (gitignored)
keys/                 local keys (gitignored)
PRD.md · Architecture.md · rules.md · README.md · HACKATHON.md
```

## 9. Deployment

| Thing | Where | Notes |
|---|---|---|
| Contracts | NEAR **testnet**, subaccounts of the owner | `npm run setup:testnet` |
| Notara API + website | local machine (`npm run serve`) | Public hosting only with owner approval |
| Mainnet | **read-only** lookups only | No contract deployment, no funds |

## 10. Future work (not in v1)
- Notara signer inside a TEE with attestation (OutLayer / NEAR AI Cloud).
- NEAR Intents / 1Click as the payout path after ALLOW.
- Sandbox integration tests (`near-workspaces`, runs under WSL/Linux).
- Mainnet registry and multiple independent verifiers.
