# Notara: build sequence for items 1–11

> **Status 2026-11-07:**
> - **Built:** 1 (fallback: sponsored USDC registration for new merchants), 2 (network shown in the wallet chip), 3, 5 (script + report button), 6, 7, 8, 9, 10.
> - **Waiting on funds or approval to test:** 1, 2, 3 (live), 4, 5 (deploy).
> - **Not started:** 11, which runs last.

Written 2026-11-07. Deadline **14 Nov 23:59 UTC**. Run one step at a time; wait for "go" between steps.
Files were mapped with `graphify query` against `graphify-out/graph.json`.

Every step ends with the same baseline check, plus its own check:

```
npm test && npm run typecheck && npm --prefix web run build
```

Legend: **[S]** under 1 hour · **[M]** 1–3 hours · **[L]** half a day. 💰 needs your funds or approval · 🧩 new dependency · 🗄️ data migration.
Riskiest unknowns come first, so a bad surprise changes the plan early, not on Nov 13.

---

## Phase A: prove the risky parts (unknowns first)

### 1. First real payment through a link [S] 💰
- **Unknown it settles:** does 1Click deliver USDC to an account that isn't registered for USDC? This decides step 4's design.
- **Files:** none, unless it fails. If it fails: `server/sends.ts` (reuse `ensureUsdcStorage()`) and `server/index.ts` (call it when a mainnet link is created).
- **You:** pay INV-0005 (about 0.51 USDC from Arbitrum or Base).
- **Verify:** `/pay/INV-0005` shows **Paid** with a NEAR explorer link. `npm run owner -- balances`-style check shows `sythertestnet.near` received 0.5 USDC.
- **If it fails and is refunded:** add sponsored USDC registration for merchants when a link is created (needs the sponsor from step 5).

### 2. Real wallet signature on a payment link + smoother network switch [S] 💰
- **Unknown:** mainnet signing through `near-connect`, and whether switching testnet ↔ mainnet disconnects the wallet in practice.
- **Files:** `web/src/lib/wallet.tsx` (`signLink`, `ensureNetwork`), `web/src/pages/Vault.tsx` (label it "testnet vault").
- **Change:** keep one connection per network by remembering the last mainnet wallet. If that isn't possible, show a clear "switching to mainnet" notice instead of a silent disconnect.
- **You:** create a link with **Sign with my NEAR wallet and create**.
- **Verify:** the Pay page says "signed by your-account's own wallet". Changing the stored amount in `data/invoices.json` by hand flips it to "signature no longer checks out".

### 3. Pay directly from a NEAR wallet [M]
- **Gap:** people who already hold USDC on NEAR can't pay. 1Click doesn't route NEAR USDC → NEAR USDC, which is why the checkout hides that option.
- **Files:**
  - `web/src/pages/Pay.tsx`: a "Pay with NEAR wallet" button
  - `web/src/lib/wallet.tsx`: `transferUsdc(to, amount)` through `signAndSendTransaction`, mainnet, `ft_transfer` with 1 yoctoNEAR
  - `server/index.ts`: new `POST /api/invoices/:id/near-tx {txHash}`
  - `server/checkout.ts`: `verifyNearTransfer()` built on `passport/src/near.ts`, which reads the transaction and checks receiver, amount, token and success
  - one test with a recorded transaction result
- **Unknown:** the exact shape of the RPC response for the transfer event. It's read from the `ft_transfer` NEP-141 event log, which has a standard format.
- **Verify:**
  - Unit test: a correct transfer marks the invoice paid; wrong amount, wrong receiver or a failed transaction are refused; the same transaction can't pay two invoices.
  - Live (💰 optional): a 0.1 USDC link paid from a NEAR wallet shows Paid.

### 4. Real Send-by-link test [S] 💰
- **Needs:** a small mainnet sponsor account with about 0.1 NEAR, set as `SPONSOR_ACCOUNT` and `SPONSOR_PRIVATE_KEY` in `.env`.
- **Files:** none unless a bug shows up (`server/sends.ts`, `web/src/pages/Claim.tsx`).
- **Verify:**
  - Create a 0.5 USDC send link and fund it. The Claim page shows "0.5 USDC is waiting".
  - Claim it to a second account. The explorer shows `storage_deposit` and `ft_transfer`, and the link then shows "Claimed".
  - The sponsor spends about 0.004 NEAR.

### 5. Mainnet report registry + "Report this link" [M] 💰
- **Needs:** your approval, and about 2–3 NEAR. The registry is about 185 KB of contract storage.
- **Files:**
  - `scripts/setup-mainnet-registry.ts` (new, owner-signed, registry only, no vault)
  - `deployment.mainnet.json` (new, registry only)
  - `passport/src/config.ts` (`loadDeployment("mainnet")` already works once the file exists)
  - `web/src/components/SafetyPanel.tsx` (report button, through the merchant's own wallet with the 0.01 NEAR bond)
- **Verify:** mainnet checks go from "unavailable reports" to "no reports" (`/check?network=mainnet`), and a test report shows up as Unverified (WARN), never BLOCK.
- **Flag:** this puts a contract on mainnet. Nothing is deployed until you say go.

## Phase B: build for real use

### 6. Database instead of JSON files [M] 🗄️
- **No new dependency:** uses Node's built-in `node:sqlite`, which I confirmed works on your Node v24.15. Raises `engines.node` to `>=22.13`.
- **Files:**
  - `server/db.ts` (new): one table each for invoices and merchants, stored as JSON text by id
  - `server/invoices.ts`: `load()`, `save()`, `getInvoice()`, `updateInvoice()`, `createInvoice()` call the database
  - `server/merchants.ts`: `load()` and `save()`
  - `server/test/*.test.ts` (use `:memory:`)
- **Migration:** on first start, if `data/invoices.json` or `data/merchants.json` exist and the database is empty, they're imported once and renamed to `*.imported`.
- **Also fixes:** two requests could each read, change and write the whole file at the same time and lose one write. Row updates remove that.
- **Verify:** existing INV-0001…0005 still show on `/invoices`, tests pass, and a restart keeps the data.

### 7. Public mode: no admin keys on a public server [M]
- **Files:**
  - `server/index.ts`: `NOTARA_PUBLIC=1` turns off the owner console, demo runner and agent invoice payment routes (`ownerAction`, `proposeOwner`, `runDemo`, `payInvoice`), and never loads `keys/owner.json`
  - `server/guard.ts`: allowed hosts come from `NOTARA_PUBLIC_HOST` instead of only localhost
  - `web/src/pages/Vault.tsx` and the demo page: "runs locally" note in public mode
  - `README.md`
- **Keeps:** checks, payment links, quotes, send links (sponsor key with small funds only), Merchant Passport.
- **Verify:**
  - With `NOTARA_PUBLIC=1 NOTARA_PUBLIC_HOST=localhost:8787`, `POST /api/owner/approve` returns 404 while `/pay/…` works.
  - Unit test for the host allowlist.

### 8. New home page [M]
- **Files:**
  - `web/src/pages/Home.tsx`: rewrite the `STORIES` and `STEPS` sections
  - `web/src/components/Layout.tsx` (`LINKS`): nav becomes Home · Get paid · Send · Check · Security · About
- **Content:** "Payment links people can trust", the Priya example, two buttons (**Create a payment link** / **Send money**), 3 trust points (signed / verified website / safety check), any-chain logos as text, and an honest-limits line.
- **Verify:** first screen at 375 px and 1440 px, no sideways scroll, both themes, buttons go to `/invoices` and `/send`.

### 9. Merchant dashboard [M]
- **Files:**
  - `web/src/pages/Invoices.tsx` becomes **Get paid**: "My links" for the connected mainnet wallet, plus status and refund info from `checkouts`
  - `server/index.ts`: `GET /api/invoices?merchant=…` filter and per-merchant CSV `/api/invoices.csv?merchant=…`
  - Testnet demo invoices move under a "Test invoices" tab
- **Verify:** a connected wallet sees only its links, the CSV contains only them, and a refunded checkout shows "Refunded" with the reason.

### 10. Security page [S]
- **Files:**
  - `web/src/main.tsx`: `/security` route
  - `web/src/pages/Demo.tsx` moves under it with the vault approvals link
  - `Layout.tsx` nav
  - `Home.tsx`: one short "Safe for AI agents too" section linking there
- **Verify:** the old `/demo` URL redirects to `/security`, and a demo run still works (backend running).

### 11. Lock, fresh-clone test, docs [S] 💰
- **Files:** `README.md` (quick start for the new flows, honest status table), `PLAN.md`, `Architecture.md`.
- **Steps:**
  - Hand the vault to your wallet, or run `npm run owner -- lock-vault` (can't be undone).
  - `git clone` into a temp folder, then `npm ci`, `npm --prefix web ci`, `npm test`, `npm run web:build`, `npm run serve`, and open the main pages.
  - Rebuild the graph with `graphify update .`.
- **Verify:** every README command works from the clean clone, and the README status table matches what was actually tested.

---

## Summary
| # | Step | Size | Flags |
|---|---|---|---|
| 1 | First real payment | S | 💰 |
| 2 | Real wallet signature + network switch | S | 💰 |
| 3 | Pay from a NEAR wallet | M | |
| 4 | Real Send-by-link test | S | 💰 |
| 5 | Mainnet registry + report button | M | 💰 |
| 6 | SQLite database | M | 🗄️ (no new dependency) |
| 7 | Public mode, no admin keys | M | |
| 8 | New home page | M | |
| 9 | Merchant dashboard | M | |
| 10 | Security page | S | |
| 11 | Lock, fresh-clone test, docs | S | 💰 |

Steps 1, 2, 4 and 5 wait on your funds or approval. When they're blocked, I'll do 3 and 6–10 in between, since none of those need money.

---

# Nice-to-have build sequence (items 12–20)

Written 2026-11-07. Same rule: compiles, tests pass and site builds after every step.

| # | Step | Size | Files | How to verify | Flags |
|---|---|---|---|---|---|
| 16 | **New NEAR name when claiming.** Link account calls `near.create_account({new_account_id, new_public_key: link key})`, then moves the USDC to the new name. Sponsor gas raised to cover it | M | `server/sends.ts`, `web/src/pages/Claim.tsx` | Testnet probe: `create_account` gave the new account our key as full access (tx 7ZytigBy…). Unit check for name rules | 💰 live test later  ✅ built, not yet tested on mainnet |
| 14 | **One-click pay with MetaMask / any EVM wallet.** EIP-1193 (`window.ethereum`): switch chain, send ERC-20 `transfer` to the 1Click deposit address. No new dependency. Phantom/Solana left out (needs Solana libraries) | M | `web/src/lib/evm.ts` (new), `web/src/pages/Pay.tsx` | Unit test of ERC-20 call encoding and token parsing | 💰 live test later  ✅ built, not yet tested with a real wallet |
| 12 | **QR codes** for the deposit address and for payment and send links | S | `web/src/components/QrCode.tsx`, Pay, Send | Scan with a phone camera | 🧩 `qrcode`  ✅ built (Pay and Send pages) |
| 15 | **Embeddable "Pay with Notara" button**: `<script src=".../embed.js" data-invoice="INV-…">` | S | `web/public/embed.js`, Invoices (copy embed code) | Test page with the snippet opens `/pay/<id>` |  ✅ built, checked in browser |
| 13 | **Send-link expiry (soft)**: links show an expiry date (7 days); after it, the claim page shows "return to sender" first. It can't be enforced, since whoever holds the key controls the money, and the page says so | S | `server/index.ts`, Send, Claim | Expired link shows the return option |  ✅ built |
| 18 | **Telegram "You got paid"**: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `.env`, sent once when a link becomes paid | S | `server/notify.ts` (new), `server/index.ts` | Unit test of message text; live with your bot |  ✅ built, needs a bot token to try |
| 19 | **Agent API docs**: `/agents` page with curl and JS examples for `/v1/check`, plus `/llms.txt` | S | `web/src/pages/Agents.tsx`, `web/public/llms.txt` | Page renders; examples run against the local server |  ✅ built, curl example checked |
| 17 | Sponsored USDC setup for new merchants | - | already built (`ensureUsdcStorage` on link creation) | - | |
| 20 | X account proof | - | **skipped**: needs X API access | - | |
| C | **Cleanup**: graphify hooks moved to the uncommitted `.claude/settings.local.json`, backup file removed, duplicate pay tokens labeled | S | `.claude/*`, `server/checkout.ts` | `git ls-files .claude` has no machine paths |  ✅ done |

---

## Phase C: everything that can run on testnet, runs on testnet

Goal: a judge can try every flow with free testnet NEAR and Circle testnet USDC (faucet.circle.com), with no real money. Mainnet stays for the parts that only exist there.

| # | Step | Size | Files | How to verify | Status |
|---|---|---|---|---|---|
| T1 | **Contracts via the official toolchain**: install near-cli-rs and cargo-near (official installers), `cargo near build` both contracts, redeploy to the existing testnet accounts with `near deploy` (state is kept), check with `near view`. Record wasm hashes in `deployment.testnet.json`; README deploy steps use the official commands | M | `scripts/build-contracts.sh`, `README.md`, `deployment.testnet.json` | `near view spend-vault... get_config` and `registry... get_verifiers` answer; 37 `cargo test` pass | ✅ done: cargo-near 0.23 + near-cli-rs 0.31, redeployed (txs 3i9eFyT5…, hYu97c9g…), on-chain hashes match the builds, state kept |
| T2 | **Payment links on testnet**: a link's network comes from its asset (testnet USDC → testnet). Create form gets "USDC (testnet, free)" next to "USDC (mainnet, any chain)". Pay page, Merchant Passport, safety check, signed links (testnet wallet), "Pay from NEAR wallet", CSV, QR, embed and Telegram all follow the link's network | M | `server/index.ts`, `server/nearpay.ts`, `server/merchants.ts`, Invoices, Pay, Merchant, SafetyPanel | Make a testnet link, sign it with a testnet wallet, pay it with testnet USDC from the wallet, see Paid and the NearBlocks testnet link | ✅ built; testnet link INV-0006 paid by the agent via the vault. A wallet-signed, wallet-paid testnet link not yet clicked through by a person |
| T3 | **Scam reports on testnet**: the "Report this link" form uses the testnet registry (already deployed), so shared reports show up in the safety check | S | SafetyPanel, `server/index.ts` | Report a test account, re-check it, see the report | ✅ built (report form uses the testnet registry); not yet filed from a wallet |
| T4 | **Send by link on testnet**: testnet sponsor account (`sponsor.agentspend-1104-p6zw.testnet`, funded with testnet NEAR from the owner). Fund the link from a NEAR testnet wallet; claim to an existing `.testnet` account or a new `name.testnet` (via the `testnet` account contract, already probed) | M | `server/sends.ts`, `server/index.ts`, Send, Claim, Pay | Make, fund, and claim a testnet link into a brand-new name | ✅ tested end to end on testnet (INV-0010 → notara-e2e-mw8w313o.testnet). Found and fixed: claim gas too low for NEAR's up-front gas reservation (now 0.06 NEAR, leftover goes to the receiver) |
| T5 | **Defaults and docs**: website defaults to testnet; mainnet-only parts are labelled; README "Try it on testnet" walk-through for judges; this page lists what can't be on testnet | S | Layout, Home, README, About | Fresh clone, follow README with testnet only | ✅ done |

### Not possible on testnet
- **Pay from another chain (NEAR Intents 1Click)**: 1Click has no testnet, so any-chain checkout and the one-click MetaMask pay stay mainnet-only. On a testnet link the page says so and offers "Pay from NEAR wallet" instead.
- **Real money**: testnet USDC and NEAR are free and worthless. That's the point for judges, but it proves the flow, not real settlement.
- **Mainnet reputation for real merchants**: account age and history of real `.near` accounts only exist on mainnet. The Check page keeps a read-only mainnet mode.
- **Some wallets**: a few wallets in NEAR Connect only support mainnet; Meteor and MyNearWallet-style testnet wallets work.
- **`.near` names**: on testnet the new name is `name.testnet`.
