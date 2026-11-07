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
