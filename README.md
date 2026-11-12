<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/notara-logo-dark.svg">
  <img src="docs/assets/notara-logo-light.svg" alt="Notara" width="232" height="56">
</picture>

**Know who you're paying before money moves. Built on NEAR.**

Payment links signed by the merchant's wallet · account checks before every payment · AI-agent spending enforced by a NEAR contract

[![Built on NEAR](https://img.shields.io/badge/Built_on-NEAR-0a1f17?style=flat-square)](https://near.org)
[![Status](https://img.shields.io/badge/status-prototype%2C_not_audited-c8a96a?style=flat-square)](#security-and-audit)
[![Tests](https://img.shields.io/badge/tests-98_TypeScript_%C2%B7_39_Rust-2a4a3a?style=flat-square)](#testing)
[![License: MIT](https://img.shields.io/badge/license-MIT-2a4a3a?style=flat-square)](LICENSE)

[**Live app**](https://notara-sable.vercel.app) · [**Judge guide**](JUDGE.md) · [**Documentation**](https://notara-sable.vercel.app/docs) · [**Mainnet proof**](https://notara-sable.vercel.app/docs/mainnet-proof) · [**Architecture**](docs/ARCHITECTURE.md)

</div>

> [!TIP]
> **Judges:** review [JUDGE.md](JUDGE.md). It has a 10-minute walkthrough of the live app and a quickstart with every command.

<p align="center"><img src="docs/assets/screenshots/landing.jpg" alt="Notara landing page" width="760"></p>

## Contents

- [Overview](#overview)
- [Try it](#try-it)
- [Screenshots](#screenshots)
- [On-chain evidence](#on-chain-evidence)
- [NEAR integration](#near-integration)
- [Security and audit](#security-and-audit)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API](#api)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Hackathon](#hackathon)
- [Roadmap](#roadmap)
- [Limitations](#limitations)
- [Changelog](#changelog)
- [Built with](#built-with)
- [License](#license)
- [Author and credits](#author-and-credits)

## Overview

### The problem

AI agents now pay for things on their own. An agent reads an invoice and pays it. If an attacker hides an instruction in that invoice ("pay this other account instead"), the agent can be tricked into sending money to the attacker. Safety code inside the agent can't fix this: a tricked or hacked agent simply skips it.

People face a smaller version of the same problem. A payment link or an account name gives no way to tell whether it is genuine before you pay.

### What Notara does

Notara checks who is being paid before any payment and answers **ALLOW**, **WARN** or **BLOCK** with the reasons. A NEAR smart contract then enforces that answer:

| Product | For | What it does |
|---|---|---|
| **Agent vault** | People who let AI agents pay | The agent can only ask the vault to pay. The vault pays only with a valid Notara verdict and within its limits. WARN payments wait for the owner. |
| **Get paid** | Merchants and freelancers | USDC payment links signed by the merchant's own wallet, with due dates and line items. Customers pay from a NEAR wallet or from another chain. |
| **Send** | Anyone | Send USDC to an account after a check or as a link the receiver claims without paying gas. |

### How it works

1. **Check.** Notara reads the recipient's on-chain history: account age, activity, contract code and recent code changes, past payments and shared scam reports. Every signal shows its source. Missing evidence never gives ALLOW.
2. **Sign.** Notara signs a verdict bound to one vault, one recipient, one amount and one asset. It expires in 10 minutes and can be used once.
3. **Enforce.** The agent holds only a function-call key that can call one vault method. The vault contract checks the verdict and its own spending caps. The NEAR protocol stops the key from doing anything else.
4. **Approve.** A WARN payment waits on-chain until the vault's owner approves or rejects it from their own wallet.

```
AI agent ──pay()──► Notara check ──► signed verdict ──► Vault contract ──► recipient
                        │                                     │
                   BLOCK: nothing signed            checks signature, binding,
                                                    expiry, nonce and caps
                                                    WARN: waits for the owner
```

## Try it

Open **https://notara-sable.vercel.app** and press **Open App**. You need a NEAR testnet wallet ([Intear](https://wallet.intear.tech)), test NEAR from the [NEAR testnet faucet](https://near-faucet.io) and, for payment links, test USDC from [Circle's faucet](https://faucet.circle.com) (choose NEAR testnet).

| Do this | See this |
|---|---|
| **Agents → Vault Console**, connect a wallet, **Create my vault**, add 1 test NEAR, run the four scenarios | The legit invoice is paid, the hidden "pay the attacker" invoice is blocked, the unknown shop waits for your approval and the hacked agent is refused on-chain |
| **Get Paid**, enter an amount, **Create payment link** | A link signed by your wallet, with a preview of the customer's page |
| Open the link as a customer | The account check, the signature status and a pay button |
| **Agents → Check an Account**, enter `aurora` on mainnet | A verdict with reasons and the source of every signal |
| **Send → As a link**, fund it, claim it in another browser | The USDC arrives with no gas paid by the receiver |

Full steps are in [JUDGE.md](JUDGE.md).

## Screenshots

| | |
|---|---|
| <img src="docs/assets/screenshots/vault-console.jpg" alt="Vault Console" width="380"> | <img src="docs/assets/screenshots/mainnet-paid-link.jpg" alt="A paid mainnet payment link" width="380"> |
| **Vault Console.** Create your own vault and watch an agent get stopped | **Mainnet payment link,** paid with ETH on Arbitrum through NEAR Intents |
| <img src="docs/assets/screenshots/attack-tests.jpg" alt="Attack tests documentation" width="380"> | <img src="docs/assets/screenshots/landing.jpg" alt="Landing page" width="380"> |
| **Attack tests.** Every refusal links to its transaction | **Landing page** |

## On-chain evidence

### Contracts (NEAR testnet)

| Contract | Account | Code hash |
|---|---|---|
| Vault (locked) | [`spend-vault.agentspend-1104-p6zw.testnet`](https://testnet.nearblocks.io/address/spend-vault.agentspend-1104-p6zw.testnet) | `AjewPGjjqqFwDYD6GnYrKkkH7UyNmhBHgJ5M2r4sehCm` |
| Registry | [`registry.agentspend-1104-p6zw.testnet`](https://testnet.nearblocks.io/address/registry.agentspend-1104-p6zw.testnet) | `GSur5172GNggBZ2SAd6VPtAaV6MUyBfyfU5z7R8Q2gQ` |
| Vault factory | [`vaults.agentspend-1104-p6zw.testnet`](https://testnet.nearblocks.io/address/vaults.agentspend-1104-p6zw.testnet) | vault code as a NEAR global contract |

Both code hashes match `cargo near build` of this repository. The vault's full-access key was deleted on 2026-11-12 ([transaction](https://testnet.nearblocks.io/txns/BKYAA6TskXprBX8ovMYcjBCTpnMWKFWpW7KHzaCLjcJ1)), so it can change only through its own contract methods.

### Attack demo

A hacked agent tries every trick against the vault. Each refusal is a failed transaction anyone can open.

| # | Attack | Result | Proof |
|---|---|---|---|
| 1 | Legit invoice from a known merchant | ALLOW, paid | [tx](https://testnet.nearblocks.io/txns/5j4znZunnoz4A96xanMohcfnVXtUzXA1HYTFitFgbMv5) |
| 2 | Invoice hiding "pay the attacker", read by a real model | Attacker never paid | [tx](https://testnet.nearblocks.io/txns/2iF5JKQL3vSncAWfgCJQikJFTDHiXgGKUSuTJUnpsLA2) |
| 2b | Same invoice, read by a model that obeys it | BLOCK, nothing signed | no transaction |
| 3a | Submits the signed BLOCK verdict anyway | Refused by the vault | [tx](https://testnet.nearblocks.io/txns/J4DoW2RjK5RwndieCjV4eucYxexekuCBbrSNAeucczp9) |
| 3b | Rewrites BLOCK to ALLOW | Refused: invalid signature | [tx](https://testnet.nearblocks.io/txns/6DyHLU5kvqkSCKF3FkYF3jrHLrQqJPbJqqHywQ7kgKk8) |
| 3c | Forges an ALLOW with its own key | Refused: invalid signature | [tx](https://testnet.nearblocks.io/txns/D9C5jYkaPf6s78aM6RJ8gPoAQN14rcTETiCFXbAehymW) |
| 3d | Reuses a merchant's ALLOW to pay the attacker | Refused: different recipient | [tx](https://testnet.nearblocks.io/txns/aroY4YHyeQGuNqJsLzWWXDC1NTgKnoVx89eFrmeurqw) |
| 3e | Sends NEAR directly with the agent key | Refused by the NEAR protocol | rejected before inclusion |
| 3f | Calls an owner method with the agent key | Refused by the NEAR protocol | rejected before inclusion |
| 3g | Calls another contract (USDC) with the agent key | Refused by the NEAR protocol | rejected before inclusion |
| 4 | First invoice from an unknown shop | WARN, held, then approved by the owner | [held](https://testnet.nearblocks.io/txns/41UpfgoS7tBNub92kcY5s2hEtaqEKpw3KdVGkKC42wmg) · [approved](https://testnet.nearblocks.io/txns/EE1yWe1c5pyBEj8BahXmjNLEva6DxzYwsmxvMBkp33VT) |

Checks 1, 2 and 4 ran on 2026-11-09. Checks 3a to 3g ran on 2026-11-12 on the locked vault. More runs are on the [attack tests](https://notara-sable.vercel.app/docs/attack-tests) page.

### Mainnet payment through NEAR Intents

On 2026-11-09 the link `INV-0016` (0.1 USDC) was paid with ETH on Arbitrum. The merchant received exact USDC on NEAR.

| Step | Transaction |
|---|---|
| Deposit on Arbitrum | [0x0df6ead6…6bab](https://arbiscan.io/tx/0x0df6ead66cb171ca58fd0353c629fb6b8aee038c43d1bac177e123734c8a6bab) · [0xdcca9b40…9f4d](https://arbiscan.io/tx/0xdcca9b40cb0a7b9db0f47bf89bb77928343bf54af7a4b56c115a557d9a789f4d) |
| Delivery on NEAR (0.1 USDC) | [BX4uoqWg…5WxPb](https://nearblocks.io/txns/BX4uoqWgo1SGJXrEuuba7qvq8rgDGw8rvdx7Gy95WxPb) |
| Refund of the excess on Arbitrum | [0x6efb289b…5e33](https://arbiscan.io/tx/0x6efb289bf30377a24518ab5affc5d3d0f3a43ca0b173d39944c2fc37c6875e33) |
| The paid link | [notara-sable.vercel.app/pay/INV-0016](https://notara-sable.vercel.app/pay/INV-0016) |

### AI model attestation

The demo agent's model, `Qwen/Qwen3.8-27B` on NEAR AI Cloud, passed TEE attestation on 2026-11-12: a fresh nonce was echoed by every TEE node and NVIDIA verified the GPU evidence. Every reply's signature recovered to the attested address `0x835ab53d20294ef795906dff21ae4c045336aa26`. Run it yourself with `npm run attest`.

## NEAR integration

| NEAR feature | How Notara uses it |
|---|---|
| Function-call access keys | The agent's only key can call `request_payment` on the vault and nothing else |
| Smart contracts (Rust, near-sdk 5.30) | The vault enforces verdicts and caps; the registry holds bonded scam reports |
| Global contracts | One copy of the vault code; each visitor vault is created from it in one transaction |
| NEP-413 signed messages | Merchants sign payment links; owners prove they own a vault |
| NEP-366 meta transactions | Send-link claims are relayed by a sponsor that pays the gas |
| NEP-141 tokens | USDC payouts and payment matching by the token's own transfer event |
| NEAR Intents (1Click API) | Customers pay from other chains; the merchant receives USDC on NEAR |
| NEAR AI Cloud | The demo agent's model, with TEE attestation checked |
| NEAR Connect | Wallet connection on testnet and mainnet |
| FastNear RPC and indexer | Account state and history for the checks |

## Security and audit

### How funds are protected

- The agent never holds a full-access key. Its key can call one vault method; the NEAR protocol rejects transfers, deposits, owner methods and calls to other contracts.
- The vault pays only with a verdict signed by Notara and bound to the exact vault, recipient, amount and asset, within 10 minutes and once.
- Per-payment and daily caps hold even for payments the owner approves.
- The demo vault has no full-access key; visitor vaults never have one.
- Payment links are signed by the merchant's wallet, including the due date and line items. A paid link can never return to an earlier status.
- A NEAR-wallet payment counts only when the USDC contract's transfer event shows the full amount and the link's id, net of refunds.

### Reviews done

| Review | Result |
|---|---|
| Full repository audits (2026-11-12) | Every finding fixed and verified on the live site |
| Security review against a secure-coding checklist | Server-side validation, ownership checks, rate limits, safe error messages and secrets handling checked; all findings fixed |
| Dependency audit (`npm audit`) | 0 known vulnerabilities in the backend and the website |
| Live endpoint tests | Link lists and CSV exports return 401 without the merchant's signature; owner and demo routes are off on the public site |
| Web hardening | HSTS, Content Security Policy, `X-Content-Type-Options`, referrer and permissions policies served |

> [!WARNING]
> These are the team's own reviews. Notara has **not** had an independent security audit. Don't use it with meaningful funds.

### Known gaps

- On the public deploy the verdict-signing key is a server environment variable. Moving it into a TEE is planned.
- For the agent's model, the Intel TDX quote and the event log are not verified yet.

## Architecture

| Part | Folder | Role |
|---|---|---|
| Vault contract | `contracts/vault` | Holds agent funds and enforces verdicts and caps |
| Registry contract | `contracts/registry` | Bonded scam reports, verifiers and disputes |
| Checking service | `passport/` | Collects signals, applies the policy and signs verdicts |
| Agent | `agent/` | The demo AI agent, its payment wrapper and the attack demo |
| Backend | `server/` | API for the website, run locally or as one Vercel function |
| Website | `web/` | Landing page, app, customer pages and documentation |

Details, flows and the verdict format: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting started

### Requirements

| Tool | Version | Needed for |
|---|---|---|
| [Node.js](https://nodejs.org) | 22.13 or later | Everything (uses Node's built-in SQLite) |
| npm | 10 or later (ships with Node.js) | Installing and running |
| [Git](https://git-scm.com) | any | Getting the code |
| Rust, [cargo-near](https://github.com/near/cargo-near/releases), [near-cli-rs](https://github.com/near/near-cli-rs/releases) | stable | Only to rebuild and deploy the contracts |

Check your versions with `node -v` and `npm -v`.

### Install and run

```bash
git clone https://github.com/syther069/Notara.git
cd Notara
npm install
npm run web:install
npm run web:build
npm run serve
```

Open http://127.0.0.1:8787. Account checks work with no keys:

```bash
npm run check -- aurora --network mainnet --amount 0.1
```

For live editing of the website, run `npm run web:dev` next to `npm run serve` and open http://localhost:5173.

### Testing

```bash
npm test
cargo test
```

`npm test` runs 98 TypeScript tests and `cargo test` runs 39 contract tests (29 vault, 10 registry). On Windows, set `AWS_LC_SYS_PREBUILT_NASM=1` before `cargo test`.

### Deploy your own contracts (optional)

About 7.5 test NEAR, once:

```bash
bash scripts/deploy-contracts.sh --build
NEAR_OWNER_ACCOUNT=you.testnet NEAR_OWNER_PRIVATE_KEY=ed25519:... npm run setup:testnet
npm run demo
```

`npm run demo` needs `npm run serve` running in another terminal. Owner commands such as `approve`, `pause` and `lock-vault` run with `npm run owner -- <command>`.

## Configuration

All settings are optional for a local run. Put them in a `.env` file (git ignores it).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres (Neon). Without it, a local SQLite file is used |
| `NOTARA_PUBLIC`, `NOTARA_PUBLIC_HOST` | Public mode: turns off owner and demo routes |
| `PASSPORT_SIGNER_KEY` | The verdict-signing key |
| `NEAR_OWNER_ACCOUNT`, `NEAR_OWNER_PRIVATE_KEY` | Testnet contract setup |
| `TESTNET_SPONSOR_ACCOUNT`, `TESTNET_SPONSOR_PRIVATE_KEY` | Pays gas for testnet send-link claims |
| `AGENT_LLM_API_KEY`, `AGENT_LLM_MODEL` | The demo agent's model on NEAR AI Cloud |
| `ONECLICK_JWT` | Optional NEAR Intents key (avoids the 0.2% fee) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional alert when a link is paid |

## API

| Endpoint | Purpose |
|---|---|
| `POST /v1/check` | Check a recipient and get ALLOW, WARN or BLOCK |
| `POST /api/invoices` · `GET /api/invoices/:id` | Create or read a payment link |
| `GET /api/invoices.csv?merchant=` | A merchant's CSV export (needs their wallet signature) |
| `POST /api/invoices/:id/quote` | A NEAR Intents deposit address for paying from another chain |
| `POST /api/sends` · `GET /api/sends/:id` | Send links |
| `GET /api/vault` · `GET /api/vault/payments` | Vault state and payments |

Full reference: [API docs](https://notara-sable.vercel.app/docs/api). Agents can read [`/llms.txt`](https://notara-sable.vercel.app/llms.txt).

## Project structure

```
contracts/   vault and registry contracts (Rust)
passport/    checking service: signals, policy, verdict signing
agent/       demo AI agent, payment wrapper, attack demo
server/      backend API
web/         website and documentation
scripts/     contract build, testnet setup, owner commands
demo/inbox/  demo invoices, one with a hidden injection
docs/        architecture, logo and screenshots
```

## Deployment

| Part | Where |
|---|---|
| Website and API | [notara-sable.vercel.app](https://notara-sable.vercel.app) on Vercel, in public mode |
| Database | Neon Postgres |
| Contracts | NEAR testnet (no Notara contract on mainnet) |
| Mainnet | USDC payment links and read-only account checks |

## Hackathon

Notara is entered in **AI Security & Defense** (primary), **Real-World Money** and **Open Innovation**. Every track requirement and where it is met: [Hackathon tracks](https://notara-sable.vercel.app/docs/hackathon).

All code was written during the hackathon: the first commit is dated 2026-11-04. There is no pre-hackathon code.

## Roadmap

- Verdict-signing key inside a TEE
- Full TDX quote verification for the agent's model
- NEAR Intents as the vault's payout path
- Contract integration tests in `near-sandbox`
- A mainnet report registry
- Gas-allowance monitoring for the agent key

## Limitations

- Prototype, not audited by a third party.
- A verdict reflects the policy and the evidence found. It is not proof that an account is safe or malicious.
- Account age can be bought and reports start empty. The protection comes from the vault enforcing the decision and the caps.
- Profiles, preferences and watched accounts are stored in your browser only.

## Changelog

| Date | Changes |
|---|---|
| 2026-11-12 | Vault locked; TEE attestation for the agent's model; attack 3g; due dates and line items; accountant-ready CSV exports; security review fixes |
| 2026-11-09 | Mainnet payment through NEAR Intents; visitor vaults; send links; attack demo with a real model |
| 2026-11-04 | Vault and registry contracts on testnet; account checks; first attack demo |

## Built with

- **Libraries:** React, Vite, Tailwind CSS, Motion, near-api-js, near-sign-verify, @hot-labs/near-connect, @neondatabase/serverless, @noble/curves and @noble/hashes. The full list is in `package.json` and `web/package.json`.
- **Adapted UI components:** HeroUI, SmoothUI, Vengeance UI and Skiper UI. Each adapted file notes its source.
- **Icons:** Iconoir.
- **AI-generated code:** parts of the code, tests and documentation were written with an AI coding assistant and reviewed by the author.

## License

Released under the [MIT License](LICENSE). You may use, copy, modify and distribute the code, including commercially, as long as the copyright notice is kept. The software comes with no warranty.

## Author and credits

Built by [**Syther**](https://x.com/SYther069).

Thanks to [NEAR](https://near.org), [NEAR Intents](https://docs.near-intents.org), [NEAR AI Cloud](https://docs.near.ai), [FastNear](https://fastnear.com), [Circle](https://www.circle.com/usdc) for USDC on NEAR, [HOT Labs](https://www.npmjs.com/package/@hot-labs/near-connect) for NEAR Connect and the authors of the UI libraries above.
