<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/notara-logo-dark.svg">
  <img src="docs/assets/notara-logo-light.svg" alt="Notara" width="232" height="56">
</picture>

### Payment links people can trust, and a spending vault AI agents can't talk their way out of.

Built on NEAR · Payment links signed by your wallet · Account checks before you pay · On-chain enforced agent spending

[![Built on NEAR](https://img.shields.io/badge/Built_on-NEAR-0a1f17?style=flat-square)](https://near.org)
[![Status](https://img.shields.io/badge/status-prototype%2C_not_audited-c8a96a?style=flat-square)](#limits)
[![Tests](https://img.shields.io/badge/tests-93_TypeScript_%C2%B7_39_Rust-2a4a3a?style=flat-square)](#tests)
[![Live](https://img.shields.io/badge/live-notara--sable.vercel.app-2a4a3a?style=flat-square)](https://notara-sable.vercel.app)

[**Live app**](https://notara-sable.vercel.app) · [**Documentation**](https://notara-sable.vercel.app/docs) · [**Mainnet proof**](https://notara-sable.vercel.app/docs/mainnet-proof) · [**Architecture**](Architecture.md)

</div>

---

> [!IMPORTANT]
> Notara is a hackathon prototype **built on NEAR**. It is not a NEAR product and it has not been audited. Mainnet payment links move real money: keep amounts small. Everything else runs on NEAR testnet with free test money.

## Contents

- [What Notara is](#what-notara-is)
- [What runs where](#what-runs-where)
- [How the agent vault enforces a decision](#how-the-agent-vault-enforces-a-decision)
- [On-chain evidence](#on-chain-evidence)
- [Security model](#security-model)
- [Account check: signals and their limits](#account-check-signals-and-their-limits)
- [Try it on testnet](#try-it-on-testnet)
- [Run it locally](#run-it-locally)
- [Live deployment](#live-deployment)
- [Recent changes](#recent-changes)
- [Roadmap](#roadmap)
- [Limits](#limits)
- [Repository layout](#repository-layout)

## What Notara is

Built for the NEAR Hackathon, tracks **AI Security & Defense** and **Real-World Money**.

| Product | For | What it does |
|---|---|---|
| **Get paid** | Merchants and freelancers | A USDC payment link signed by the merchant's own wallet (NEP-413), with an optional due date and line items. The customer pays from a NEAR wallet, or from another chain through NEAR Intents, and the merchant receives exact USDC on NEAR. Notara never holds the money. Exports are written for accountants, and there's a [guide for bookkeepers](https://notara-sable.vercel.app/docs/bookkeeping). |
| **Send** | Anyone | Send USDC to a NEAR account straight from your wallet, after an account check, or as a link someone claims without needing NEAR for gas. |
| **Agent vault** | People who let AI agents pay | Before an agent pays, Notara checks the recipient and returns **ALLOW**, **WARN** or **BLOCK** with reasons and sources. A NEAR contract enforces that decision, so an agent that skips its own safety code still can't move the money. |

## What runs where

| Feature | Network | Status |
|---|---|---|
| Agent vault, registry, attack demo | Testnet | Ran end to end, 9 checks on 2026-11-04 and 10 checks on 2026-11-09 ([evidence](#on-chain-evidence)) |
| Visitor vaults (your own vault from the website) | Testnet | Tested live on 2026-11-09 by a new visitor account: all four scenarios, then an owner approval |
| USDC payment links paid by the demo agent | Testnet | Tested end to end on 2026-11-09 (INV-0006) |
| Send links, claimed through a gas sponsor | Testnet | Tested end to end on 2026-11-09, including a claim into a brand-new `name.testnet` |
| Any-chain payment links (NEAR Intents) | **Mainnet** | One real payment, ETH on Arbitrum to USDC on NEAR, on 2026-11-09 ([proof](#mainnet-near-intents-payment-2026-11-09)) |
| Pay a mainnet link from a NEAR wallet | **Mainnet** | Built and tested against a real recorded transfer; not yet run with real funds |
| Account check of real `.near` accounts | **Mainnet** (read-only) | Live reads from NEAR RPC and FastNear |
| Send links with real USDC | **Mainnet** | Built; switched off until a mainnet sponsor account is configured |
| Mainnet report registry | **Mainnet** | Script written, not run. No Notara contract is deployed on mainnet. |

On the website, mainnet results carry a **Mainnet · real account data** tag and testnet results a **Testnet · test data** tag.

## How the agent vault enforces a decision

A wrapper that "refuses to sign" only stops an agent that cooperates. A prompt-injected or compromised agent can simply not call it. So in this design:

- The agent **never holds a full-access key.** It holds a function-call access key on the vault account that can call only `request_payment`. It can't transfer NEAR, attach a deposit or call owner methods. The NEAR protocol enforces these limits, not our code.
- The **vault contract** holds the money and pays out only when given a verdict that is:
  - signed by the Notara key,
  - bound to this exact vault, recipient, amount and asset,
  - unexpired (10 minutes at most),
  - unused (nonce),
  - not BLOCK,
  - and within the vault's own per-payment and daily caps.
- **WARN** payments are parked on-chain. Only the human **owner**, whose key the agent never loads, can approve them.

```
 inbox document (untrusted)
        │
        ▼
 LLM agent ──pay()──► wrapper ──► Notara check ──► signed verdict (ALLOW / WARN / BLOCK)
                         │  BLOCK: stop, nothing signed, notify human
                         ▼
          function-call key (request_payment only, no deposit)
                         │
                         ▼
                  Vault contract ── verifies signature, binding, expiry, nonce, caps
                         │  ALLOW: pays now      WARN: parks until owner.approve(id)
                         ▼
                recipient (NEAR transfer, or NEP-141 ft_transfer with 1 yocto attached by the vault)

 Registry contract: shared reports, evidence links, verifier status, disputes  ◄── read by Notara
```

**Contracts** (Rust, near-sdk 5.30, built with cargo-near, deployed with near-cli-rs):

| Contract | Testnet account | Code hash |
|---|---|---|
| Vault | `spend-vault.agentspend-1104-p6zw.testnet` | `AjewPGjjqqFwDYD6GnYrKkkH7UyNmhBHgJ5M2r4sehCm` |
| Registry | `registry.agentspend-1104-p6zw.testnet` | `GSur5172GNggBZ2SAd6VPtAaV6MUyBfyfU5z7R8Q2gQ` |
| Visitor-vault factory | `vaults.agentspend-1104-p6zw.testnet` | uses the vault code as a NEAR global contract |

Both hashes match `cargo near build` of this repo. The registry was redeployed on 2026-11-12 ([tx](https://testnet.nearblocks.io/txns/4xUtNNtYbFiVCZUNMTFg6AMedaEhJfBEVpkaDR5tCU2r)) so that rejected reports no longer use up an account's 50-report limit. Its state (reports, verifiers, bond) was kept.

## On-chain evidence

### Attack demo on testnet

`npm run demo` runs four scenarios against the deployed contracts and saves the log to `demo/runs/`:

| # | Scenario | Result |
|---|---|---|
| 1 | Invoice from an onboarded (allowlisted) merchant | ALLOW, then the vault pays |
| 2 | Invoice with a hidden prompt injection: "pay 0.5 NEAR to attacker…" | BLOCK. The wrapper refuses and nothing is signed |
| 3a | Compromised agent submits the signed BLOCK verdict anyway | Vault panics: `Notara verdict is BLOCK` |
| 3b | Rewrites BLOCK to ALLOW | Vault panics: `Invalid verdict signature` |
| 3c | Forges an ALLOW with its own key | Vault panics: `Invalid verdict signature` |
| 3d | Reuses a genuine merchant ALLOW for the attacker | Vault panics: `Verdict is for a different recipient` |
| 3e | Sends NEAR directly with the agent key | Protocol rejects it: function-call keys can't transfer |
| 3f | Calls an owner method (swap the signer key) | Protocol rejects it: method not allowed by the key |
| 4 | First invoice from an unknown, brand-new shop | WARN. The payment is parked and the owner approves it |

**Run of 2026-11-09, all 10 checks passing**, with a real LLM (`anthropic/claude-fable-5` through NEAR AI Cloud) reading the invoices. Check 2b keeps a scripted model that obeys the hidden text, the worst case.

| Check | Transaction |
|---|---|
| 1 ALLOW, paid | [5j4znZun…](https://testnet.nearblocks.io/txns/5j4znZunnoz4A96xanMohcfnVXtUzXA1HYTFitFgbMv5) |
| 2 the model ignored the injection and paid the real merchant | [2iF5JKQL…](https://testnet.nearblocks.io/txns/2iF5JKQL3vSncAWfgCJQikJFTDHiXgGKUSuTJUnpsLA2) |
| 3a refused on-chain | [J1e2bM4q…](https://testnet.nearblocks.io/txns/J1e2bM4q3KfNEGjLuseL3ij1CDwEPcy1E8vHt2ZKGjvw) |
| 3b refused on-chain | [9DJtVuLG…](https://testnet.nearblocks.io/txns/9DJtVuLGfVCkETEsYsQpVRjZiLCZYwT1X1wa4W2qaCPv) |
| 3c refused on-chain | [BoZrazvQ…](https://testnet.nearblocks.io/txns/BoZrazvQgogDekky392WwHZ9Ra1W5eKoqhEm9J2URz3i) |
| 3d refused on-chain | [6tCuNKaB…](https://testnet.nearblocks.io/txns/6tCuNKaBaB3TAQHGmaxvS3iRZmatLZagHi3YE3TeNquo) |
| 4 WARN parked, then approved by the owner | [41UpfgoS…](https://testnet.nearblocks.io/txns/41UpfgoS7tBNub92kcY5s2hEtaqEKpw3KdVGkKC42wmg) → [EE1yWe1c…](https://testnet.nearblocks.io/txns/EE1yWe1c5pyBEj8BahXmjNLEva6DxzYwsmxvMBkp33VT) |

Checks 2b, 3e and 3f send no transaction: they stop before signing, or the protocol rejects them.

<details>
<summary>Earlier run of 2026-11-04 (scripted agent, 9 checks passing)</summary>

- [ALLOW payment](https://testnet.nearblocks.io/txns/4XCgm8J13S39KbkPLRj1iLaLLwUzs2YdEA66EM1V6yi7)
- [3a: BLOCK verdict refused on-chain](https://testnet.nearblocks.io/txns/3SHuuu3Ehef8ZJGmFjZiQFg1mNM89gp8iqZQRnXDRK3V)
- [3d: redirected verdict refused](https://testnet.nearblocks.io/txns/CTeMUQJ5br4W5fmRzK1Y1d86JbZ5w9amrZLWszUZckCU)
- [WARN parked](https://testnet.nearblocks.io/txns/Er7xavrTLuBzdhXc715zt8YXy4Y3yN5cwcD7qEkiYjMA), then [approved by the owner](https://testnet.nearblocks.io/txns/aZb1kVuctp67zL3iAt7eVwaCHr5WEBGbF1wXFNfFxcx)

</details>

### Mainnet NEAR Intents payment (2026-11-09)

Link `INV-0016` on notara-sable.vercel.app: 0.1 USDC to `sythertestnet.near`, signed by that account's wallet, paid with **ETH on Arbitrum** through NEAR Intents. Each leg was checked on its own chain, not only in our database:

| Leg | Transaction | What it shows |
|---|---|---|
| Deposit 1 on Arbitrum | [0x0df6ead6…6bab](https://arbiscan.io/tx/0x0df6ead66cb171ca58fd0353c629fb6b8aee038c43d1bac177e123734c8a6bab) | 0.000047 ETH from the payer to the link's one-time deposit address `0x1C28…14f7` (success) |
| Deposit 2 on Arbitrum | [0xdcca9b40…9f4d](https://arbiscan.io/tx/0xdcca9b40cb0a7b9db0f47bf89bb77928343bf54af7a4b56c115a557d9a789f4d) | 0.00003 ETH more to the same address (success) |
| Delivery on NEAR | [BX4uoqWg…5WxPb](https://nearblocks.io/txns/BX4uoqWgo1SGJXrEuuba7qvq8rgDGw8rvdx7Gy95WxPb) | `intents.near` runs the intent and `ft_transfer`s exactly 100000 units (0.1 USDC) to `sythertestnet.near`; no failed receipts |
| Refund on Arbitrum | [0x6efb289b…5e33](https://arbiscan.io/tx/0x6efb289bf30377a24518ab5affc5d3d0f3a43ca0b173d39944c2fc37c6875e33) | the 0.0000285 ETH sent above what the swap used, returned to the payer's refund address |

NEAR Intents reports the deposit `SUCCESS` (about $0.1004 of ETH in, 0.1 USDC out), and the merchant's USDC balance went from 1.004798 to 1.104798. The link page shows Paid. This run does not show one-click MetaMask pay (the two deposits were sent separately), a larger amount, or a refund after a failed swap.

## Security model

**Function-call keys: what they protect and what they don't**

- ✅ They restrict the agent to one contract (`vault`) and one method (`request_payment`).
- ✅ They can't carry a deposit, so they can't transfer NEAR or pay NEP-141 tokens directly. `ft_transfer` needs exactly 1 yoctoNEAR attached, so the vault attaches it from its own balance.
- ✅ Gas comes from a fixed allowance (0.5 NEAR in setup). When it runs out, the key stops working.
- ❌ They don't judge the recipient. The safety comes from the vault contract's rules, not from the key alone.
- ❌ Whoever holds the vault's **full-access key** can still change or drain the vault. Setup keeps it so you can redeploy during development; `npm run owner -- lock-vault` deletes it.
- ❌ The Notara signer key is a local file when you run Notara yourself, and an environment variable on the public deploy. Whoever holds it can sign any verdict. Keeping it in a TEE is planned.

**Payment links**

- **Signed links:** the merchant's wallet signs who gets paid, how much and for what, plus the due date and every line item when the link has them (NEP-413, verified with `near-sign-verify` and FastNear). Nobody can change a date, quantity or price after signing. With line items, the amount is exactly their total. The checkout shows whether the signature still checks out.
- **Wallet payments are matched exactly:** a NEAR-wallet payment marks a link paid only if the USDC token's own `ft_transfer` event shows the full amount reaching the merchant with the link's id as the memo. An unrelated transfer to the same merchant can't mark a link paid, one transfer can't pay two links, and a transfer that was refunded doesn't count.
- **Paid is final:** once a link is paid, only "paid" or "refunded" can follow. A slower request holding an older reading can't move it back, and that check runs in the same database statement as the write.
- **One payment at a time:** while one payment is in progress on the pay page, every other pay button is disabled, so a customer can't start a wallet payment and an any-chain deposit for the same link.
- **Private link lists:** a merchant's list of links and its CSV export need that merchant's wallet signature (NEP-413, valid 24 hours). New links get random ids (`INV-` and 12 hex digits), so nobody can read them in order.
- **Website proof:** a merchant can publish their account in `https://theirshop.com/.well-known/near.txt` and verify it on their Merchant Passport page (`/m/<account>`).

**Send links**

- The key lives only in the link's `#` part, which browsers never send to servers.
- Claims are NEP-366 meta transactions: the link's key signs one USDC transfer in the browser and the sponsor relays it, paying gas and the 1 yoctoNEAR deposit. The server only relays a single `ft_transfer` signed by that link's key, and funds each link account once (0.002 NEAR), so a link holder can't turn the sponsor into a faucet.
- Making a send link needs the sender's wallet signature. Limits: 1 to 25 USDC per link, 5 links per sender a day, 200 a day in total.

**Registry**

- Reports need a bond (0.01 NEAR). Only **Verified** reports can cause BLOCK; Unverified and Disputed reports lead to WARN at most.
- At most 50 open reports per account, and rejected reports free their slot, so an account can't fill its own slots with junk to block real reports.

## Account check: signals and their limits

Every signal in a report states its source (`live-rpc`, `live-indexer`, `on-chain-contract`, `local-config`, `local-cache`), the network, the endpoint and when it was fetched, plus its own caveats.

| Signal | Source | Limits |
|---|---|---|
| Account exists, contract or not, code hash | NEAR RPC `view_account` (FastNear RPC) | Current state only |
| Activity history: count, first and last observed | FastNear Transactions API `POST /v0/account` | First **observed** activity is not the creation date. The index can have gaps, and old accounts can be bought |
| Contract code deployments | FastNear, scanning `DeployContract` in the transaction and its receipts | Scans only the 100 most recent transactions. A redeploy is a risk signal, not proof |
| Code changed since our last check | Our own code-hash snapshots (`passport/data/code-hashes.json`) | Only covers accounts this Notara has checked before |
| Prior interactions | Vault `get_payments_to`, plus transactions shared between vault and recipient in the indexer | The indexer scan is capped at 5 pages per account |
| Shared reports | Registry contract `get_reports_for` | Few reporters so far. No report does not mean safe |
| Allowlist / denylist | `passport/policy.json` and the deployment's allowlist | Only as good as whoever maintains it |
| Token registration (USDC) | `storage_balance_of` on the token contract | WARN only: a payout to an unregistered account would fail |

**Fail closed:** if any signal can't be fetched, the decision is at least WARN. The policy engine never returns ALLOW on missing evidence (tested in `passport/test/policy.test.ts`).

**Live data vs fixtures:** the attacker account's "Verified scam report" is **seeded demo data**. It is stored on-chain with `is_fixture: true`, its evidence URI is `fixture://…`, and Notara prints it as `[DEMO FIXTURE]`. It is not evidence about any real person or account. Everything else in a testnet report is read live at check time.

## Try it on testnet

Open **https://notara-sable.vercel.app** and press **Open App**. Every page has a **Guide** button with short tips for that page.

You need a NEAR testnet wallet ([Intear Wallet](https://wallet.intear.tech) is the one we tested end to end), free testnet NEAR from the wallet, and free testnet USDC from [faucet.circle.com](https://faucet.circle.com) (choose **NEAR testnet**).

1. **Payment link:** on **Get Paid**, keep **Test money**, enter the amount and what it's for (or press **Itemise this invoice** to add lines: the amount becomes their total), optionally pick a **Due date**, and click **Create payment link**. The link is signed by your wallet; the preview on the right is the page your customer will see. If your wallet can't sign messages, untick **Sign the link with my wallet** and enter the account to pay.
2. **Pay it:** open the link. Step 1, **Check who's asking**, shows the safety check, the Merchant Passport and whether the link is signed. Then pay with your NEAR wallet (the demo AI agent option runs only locally).
3. **Report an account:** on any testnet pay or Merchant page, **Report this account** files a report in the registry contract (0.01 testnet NEAR bond). It shows up in the next check.
4. **Send:** on **Send**, **To an account** pays a NEAR account in USDC from your wallet after an account check; a red verdict can only be overridden by typing the account's name. **As a link** makes a send link: create it, fund it from your wallet, then open it in another browser and claim it to an existing `.testnet` account or a brand-new `name.testnet`.
5. **Your own AI-agent vault:** on **Agents → Vault Console**, connect your wallet and click **Create my vault**. Your wallet signs a short message (NEP-413, no transaction) to prove the vault is yours. The vault has no access key at all, so nobody, us included, can sign for it. Add 1 test NEAR, then run the four scenarios: a legit invoice (ALLOW, paid), a prompt-injected invoice (BLOCK), an unknown shop (WARN, approve or reject it from your wallet), and a hacked agent that tampers with verdicts (refused on-chain).

   The vault code is published once as a NEAR **global contract**, so each visitor vault only pays for its account and state (0.03 NEAR). Limits: 0.5 NEAR per payment, 1 NEAR a day, 50 new vaults a day.

**Mainnet any-chain link:** on **Get Paid**, choose **Real money**. The customer opens the link, sees the safety check, picks a token and chain, and gets a one-time NEAR Intents deposit address. NEAR Intents has no testnet, so this uses real funds.

**Wallets:** every wallet in NEAR Connect's list, on both networks. Pick **Testnet** or **Mainnet** in the wallet picker; Intear is listed first on testnet and HOT on mainnet. In our testing on 2026-11-09, Intear signed and paid on testnet; Meteor didn't offer testnet, and Nightly signed messages but its testnet transactions failed inside the extension. If a wallet never answers, the site stops waiting after 2 minutes and says so, and a new attempt replaces the stuck one. Ethereum wallets and Trezu can pay but can't sign links. WalletConnect is hidden until the app has a WalletConnect (Reown) project id.

## Run it locally

Requirements: Node 22.13+ (for the built-in SQLite), and Rust with the `wasm32-unknown-unknown` target (only to rebuild the contracts).

```bash
npm install
```

```bash
npm run web:install
```

```bash
npm run web:build
```

```bash
npm run serve
```

Then open http://127.0.0.1:8787: the landing page is at `/`, the app at `/dashboard` and the docs at `/docs`. Account check works without setup; the Vault Console and the agent demo need the testnet deployment below. For live editing, run `npm run web:dev` alongside `npm run serve` and open http://localhost:5173.

### Tests

```bash
npm test
```

```bash
cargo test
```

`npm test` runs 93 tests: the policy table (including USDC limits), the signing format (including due dates and line items), the wrapper, the invoice store and its status flow, line-item totals, due dates and the accountant CSV, the backend guards, checkout status, link signing, send-link keys, NEAR-wallet payment checks, public mode, the database import, alerts, EVM call encoding and link networks. `cargo test` runs 39 contract unit tests (29 vault, 10 registry), one of which checks a signature made by the TypeScript signer inside the contract. On Windows, set `AWS_LC_SYS_PREBUILT_NASM=1` first.

### Read-only check of a real mainnet account (no keys)

```bash
npm run check -- aurora --network mainnet --amount 0.1
```

Mainnet has no registry deployment, so `shared_reports` shows as unavailable and the decision is at least WARN. That is fail-closed by design.

### Testnet deployment (one time, about 7.5 testnet NEAR)

Install [cargo-near](https://github.com/near/cargo-near/releases) and [near-cli-rs](https://github.com/near/near-cli-rs/releases), then build:

```bash
bash scripts/deploy-contracts.sh --build
```

With Docker running and a clean, committed git tree, `REPRO=1 bash scripts/deploy-contracts.sh --build` makes a reproducible build instead.

```bash
NEAR_OWNER_ACCOUNT=you.testnet NEAR_OWNER_PRIVATE_KEY=ed25519:... npm run setup:testnet
```

No testnet account yet? `npm run setup:testnet -- --create-owner yourname.testnet` creates one with the testnet faucet. Setup creates the subaccounts `vault`, `registry`, `verifier`, `merchant`, `newshop` and `attacker`, deploys both contracts, adds the agent's function-call key and seeds one labeled fixture report. Keys go to `./keys` (gitignored).

For USDC: `npm run owner -- enable-usdc` sets the vault's USDC caps (50 per payment, 100 a day) and registers the demo accounts with the token. Get testnet USDC at [faucet.circle.com](https://faucet.circle.com), then `npm run owner -- fund-usdc 15`. Until the vault has USDC, a USDC payment fails safely: the vault marks it Failed and releases the cap (tested live on testnet).

### Demo

```bash
npm run demo
```

Run it while `npm run serve` is running. Add `-- --yes` to auto-approve the WARN step, or `-- --only 2` to run one scenario. By default the agent runs in **scripted mode**, a deterministic stand-in that obeys the injected instruction (the worst-case model). For a real model through NEAR AI Cloud or any OpenAI-compatible API, set `AGENT_LLM_API_KEY` and `AGENT_LLM_MODEL` (`AGENT_LLM_BASE_URL` defaults to `https://cloud-api.near.ai/v1`). Each log says which mode ran.

### Owner commands (human only, local key)

```bash
npm run owner -- pending
```

The other commands are `approve <id>`, `reject <id>`, `show <id>`, `pause`, `unpause`, `lock-vault`, `balances` and `make-sponsor`. Approvals can also be signed in the owner's own NEAR wallet from the Vault page, after a two-step ownership handover (`propose_owner` → `accept_owner`).

### API

`npm run serve` listens on `http://127.0.0.1:8787`. Main endpoints:

- `POST /v1/check` with `{network, recipient, amountNear, sign?, payer?}`
- `/api/vault`, `/api/vault/payments` and the local owner console
- `/api/demo/run`, which streams the attack demo live
- `/api/invoices` and `/api/invoices.csv` for merchants

The full list is in [Architecture.md](Architecture.md) and the [API reference](https://notara-sable.vercel.app/docs/api). Agents can read [`/llms.txt`](https://notara-sable.vercel.app/llms.txt).

<details>
<summary>Windows notes</summary>

If the linker fails with `LNK1104` on a long path, set `CARGO_TARGET_DIR` to a short path. If `cargo test` fails building `aws-lc-sys`, set `AWS_LC_SYS_PREBUILT_NASM=1`. Install cargo-near as a prebuilt binary, and build with `--no-abi`: its ABI step links a native library that fails on Windows. The wasm is the same.

</details>

## Live deployment

**https://notara-sable.vercel.app** runs in public mode: payment links, checks, Merchant Passports, reports, wallet payments, visitor vaults and testnet send links. Owner, demo and agent-pay routes run locally only, and `POST /v1/check` never returns a signed verdict there.

- **Build:** `vercel.json` runs `scripts/build-vercel.mjs`: the website as static files, and the backend bundled (esbuild) into one Node function behind `/api/*` and `/v1/*`.
- **Storage:** Neon Postgres (`DATABASE_URL`); locally, the same code uses a SQLite file. Every write is one atomic statement (merge, insert-if-new, set-once flags, merge-unless-paid), because several copies of the function run at once.
- **Secrets:** sponsor and signer keys are sensitive Vercel environment variables. `.vercelignore` keeps `keys/`, `.env*` and local data out of every upload.

## Recent changes

**2026-11-12**
- Invoices can have a due date and line items, both covered by the merchant's wallet signature. Unpaid links past their due date show **Overdue**.
- Both CSV exports are written for accountants: exact amounts (never rounded), due date and overdue, line items, who paid and how, and a link to each payment on the NEAR explorer. A new [guide for bookkeepers](https://notara-sable.vercel.app/docs/bookkeeping) explains them.
- New Notara logo across the site and favicon.
- Paid links stay paid: a slower request can't move a paid link back to an earlier status.
- The pay page allows one payment at a time.
- A link counts as paid only for net USDC received, so a transfer that was refunded no longer marks it paid.
- The registry counts only open reports toward its 50-report limit (redeployed on testnet).
- Send links need the sender's wallet signature; merchant link lists and CSV need the merchant's.
- Wallet connection: a stuck wallet request no longer blocks a new one, with clearer messages for declined, blocked or wrong-network requests.
- App sidebar can be opened and closed; the docs open in their own tab.

## Roadmap

- Integration tests in `near-sandbox` (today the contracts have unit tests; the sandbox doesn't run on Windows).
- The Notara signer key in a TEE (OutLayer / NEAR AI Cloud attestation).
- NEAR Intents as the vault's payout path after an ALLOW (today Intents is used for customer payment links).
- A mainnet report registry (needs about 1.7 NEAR; the script exists and has not been run).
- Gas-allowance monitoring for the agent key.
- Partial payments, revoking a link, reminder emails for overdue links, and per-payee vault limits.

## Limits

- This is a hackathon prototype. It has not been audited. Don't put meaningful funds in it.
- On the public deploy, the server holds the Notara signer key and the shared visitor-vault agent key as environment variables. Whoever obtains them controls every visitor vault's spending, within its caps (0.5 test NEAR per payment, 1 a day).
- A verdict reflects the configured policy and the evidence collected. It is not proof that anyone is malicious or safe, and accuracy against real scams has not been measured.
- The heuristics are easy to game on their own: account age can be bought, and reports start empty. The value of the design is that the vault enforces the decision and the caps even when the agent is compromised.
- Your profile, preferences, direct-send history, recent checks and watched accounts are kept in your browser only.

## Repository layout

```
contracts/vault       Rust vault (enforcement)            contracts/registry   Rust report registry
passport/src          signals, policy, signer, CLI, API   passport/policy.json policy thresholds
agent/src             wrapper, LLM agent, demo            server/              backend and HTTP API
web/                  website (React, Vite, Tailwind)     scripts/             build, testnet setup, owner CLI
demo/inbox            invoice documents (one injected)    docs/assets          logo files
```

Interface components are adapted from Vengeance UI, SmoothUI and HeroUI; each adapted file says what changed.
