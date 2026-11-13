<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/notara-logo-dark.svg">
  <img src="docs/assets/notara-logo-light.svg" alt="Notara" width="232" height="56">
</picture>

**Payments on NEAR you can trust.**

Payment links and send links for people · A spending vault for AI agents · Built on NEAR

[![Built on NEAR](https://img.shields.io/badge/Built_on-NEAR-0a1f17?style=flat-square)](https://near.org)
[![Status](https://img.shields.io/badge/status-prototype%2C_not_audited-c8a96a?style=flat-square)](#security)
[![Tests](https://img.shields.io/badge/tests-103_TypeScript_%C2%B7_39_Rust-2a4a3a?style=flat-square)](#getting-started)
[![License: MIT](https://img.shields.io/badge/license-MIT-2a4a3a?style=flat-square)](LICENSE)

[**Live app**](https://notara-sable.vercel.app) · [**Judge guide**](JUDGE.md) · [**Documentation**](https://notara-sable.vercel.app/docs) · [**Architecture**](docs/ARCHITECTURE.md)

</div>

> [!TIP]
> **Judges:** start with [JUDGE.md](JUDGE.md). It is a 3-minute read with the proof links, then a hands-on walkthrough of the live app and a quickstart with every command.

## Overview

Notara makes payments on NEAR safer in two ways: for **people** who pay and get paid and for **AI agents** that pay on someone's behalf.

### The problem

- **People:** a payment link or an account name gives no way to tell if it is genuine before you pay. Sending money to someone without a wallet is hard.
- **AI agents:** an agent that pays invoices can be tricked by a hidden line ("pay this other account instead"). Safety code inside the agent can't stop that, because a tricked agent simply skips it.

### What Notara does

| | Payments for people | Payments by AI agents |
|---|---|---|
| **Who** | Freelancers, merchants and anyone sending money | People who let an AI agent spend for them |
| **Features** | **Get paid:** USDC payment links signed by your wallet, with line items and a due date. Clients pay from a NEAR wallet or from another chain. **Send:** pay an account directly with a note or send USDC as a link the receiver claims without gas | **Agent vault:** a NEAR contract that holds the agent's money. The agent can only ask it to pay. Unusual payments wait for the owner |
| **Protection** | The client sees the link is signed by the merchant and gets an account check before paying | Notara checks every recipient and the vault enforces the answer on-chain, even if the agent is hacked |
| **Proof** | [Mainnet proof](https://notara-sable.vercel.app/docs/mainnet-proof): a real payment from ETH on Arbitrum to 0.1 USDC on NEAR through NEAR Intents | [Verified AI model (TEE)](https://notara-sable.vercel.app/docs/tee-model): the agent's model is checked to run in a TEE and every reply's signature is verified |

Both sides use the same **account check**: Notara reads the recipient's on-chain history (age, activity, contract code, past payments, shared scam reports) and answers **ALLOW**, **WARN** or **BLOCK** with the reasons.

What Notara protects and its known limits are on [Security and limits](https://notara-sable.vercel.app/docs/security). Every hackathon requirement and where it is met is on [Hackathon tracks](https://notara-sable.vercel.app/docs/hackathon).

## How it works

### Payments for people

1. **Get paid.** The merchant creates a link. Their NEAR wallet signs the amount, purpose, line items and due date, so nobody can change them.
2. **Pay.** The client opens the link, sees the signature and an account check, then pays in USDC from a NEAR wallet. On mainnet they can also pay from another chain: NEAR Intents converts it and the merchant receives exact USDC on NEAR.
3. **Send.** Pay an account directly from your wallet with a note or create a send link. The receiver claims it with no gas: a sponsor relays it as a NEAR meta transaction.

### Payments by AI agents

1. **Check.** Before paying, the agent asks Notara about the recipient and gets a signed verdict.
2. **Enforce.** The agent's key can only ask the vault to pay. The vault checks the verdict, its expiry and its own spending limits. The NEAR protocol stops the key from doing anything else.
3. **Approve.** A WARN payment waits on-chain until the owner approves or rejects it from their own wallet.

## Try it

Open **https://notara-sable.vercel.app** and press **Open App**. You need a NEAR testnet wallet ([Intear Wallet](https://wallet.intear.tech) is recommended), test NEAR from the [NEAR testnet faucet](https://near-faucet.io) and test USDC from [Circle's faucet](https://faucet.circle.com) (choose NEAR testnet).

| Do this | See this |
|---|---|
| **Get Paid**: enter an amount, press **Create payment link** | A link signed by your wallet, ready to share |
| Open the link in another browser and pay it | The account check, the signature, then **Paid** on both sides |
| **Send → To an account**: enter an account, amount and note | An account check, then the payment in Recent sends |
| **Send → As a link**: create and fund it, claim it in another browser | The USDC arrives with no gas paid by the receiver |
| **Agents → Vault Console**: create a vault, add 1 test NEAR, run the scenarios | ALLOW pays, the hidden "pay the attacker" invoice is blocked, a hacked agent is refused on-chain |
| **Agents → Check an Account**: enter any account | A verdict with the reason and source of every signal |

## Proof on-chain

| What | Evidence |
|---|---|
| A real payment from another chain: ETH on Arbitrum to 0.1 USDC on NEAR, through NEAR Intents | [Deposit](https://arbiscan.io/tx/0x0df6ead66cb171ca58fd0353c629fb6b8aee038c43d1bac177e123734c8a6bab) · [Delivery on NEAR](https://nearblocks.io/txns/BX4uoqWgo1SGJXrEuuba7qvq8rgDGw8rvdx7Gy95WxPb) · [Paid link](https://notara-sable.vercel.app/pay/INV-0016) |
| A tricked or hacked agent refused by the vault contract | [Forged verdict refused](https://testnet.nearblocks.io/txns/D9C5jYkaPf6s78aM6RJ8gPoAQN14rcTETiCFXbAehymW) · [Redirected verdict refused](https://testnet.nearblocks.io/txns/aroY4YHyeQGuNqJsLzWWXDC1NTgKnoVx89eFrmeurqw) · [all attack tests](https://notara-sable.vercel.app/docs/attack-tests) |
| A WARN payment held, then approved by the owner | [Held](https://testnet.nearblocks.io/txns/41UpfgoS7tBNub92kcY5s2hEtaqEKpw3KdVGkKC42wmg) · [Approved](https://testnet.nearblocks.io/txns/EE1yWe1c5pyBEj8BahXmjNLEva6DxzYwsmxvMBkp33VT) |
| The demo vault has no full-access key | [Lock transaction](https://testnet.nearblocks.io/txns/BKYAA6TskXprBX8ovMYcjBCTpnMWKFWpW7KHzaCLjcJ1) |

Contracts on NEAR testnet: vault [`spend-vault.agentspend-1104-p6zw.testnet`](https://testnet.nearblocks.io/address/spend-vault.agentspend-1104-p6zw.testnet) and registry [`registry.agentspend-1104-p6zw.testnet`](https://testnet.nearblocks.io/address/registry.agentspend-1104-p6zw.testnet). Both code hashes match `cargo near build` of this repository.

## NEAR integration

| NEAR feature | Used for |
|---|---|
| NEP-413 signed messages | Merchants sign payment links; owners prove they own a vault |
| NEAR Intents (1Click API) | Clients pay from other chains; merchants receive USDC on NEAR |
| NEP-366 meta transactions | Send-link claims with no gas for the receiver |
| NEP-141 tokens | USDC payments, matched by the token's own transfer event |
| Smart contracts (Rust) | The vault enforces verdicts and limits; the registry holds scam reports |
| Function-call access keys | The agent's key can call one vault method and nothing else |
| Global contracts | One copy of the vault code for every visitor vault |
| NEAR AI Cloud | The demo agent's model, with its TEE attestation checked |
| NEAR Connect and FastNear | Wallet connection; account data for the checks |

## Security

- Payment links are signed by the merchant's wallet. A paid link can never go back to an earlier status.
- A NEAR-wallet payment counts only when the USDC transfer event shows the full amount and the link's id.
- The agent never holds a full-access key and the vault's limits hold even for approved payments.
- Reviews done: two full repository audits and a security review, `npm audit` with 0 known vulnerabilities and live tests of every protected endpoint.

> [!WARNING]
> Notara is a hackathon prototype and has **not** had an independent security audit. Don't use it with meaningful funds.

## Getting started

Requires **Node.js 22.13 or later** (npm comes with it) and Git. Rust is only needed to rebuild the contracts.

```bash
git clone https://github.com/syther069/Notara.git
cd Notara
npm install
npm run web:install
npm run web:build
npm run serve
```

Open http://127.0.0.1:8787. Run the tests with `npm test` (103 tests) and `cargo test` (39 contract tests; on Windows set `AWS_LC_SYS_PREBUILT_NASM=1` first). [JUDGE.md](JUDGE.md) has the full quickstart and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the design.

## Project structure

```
web/         website and documentation
server/      backend API
passport/    account checks and verdict signing
contracts/   vault and registry contracts (Rust)
agent/       demo AI agent and attack demo
scripts/     contract build, testnet setup, owner commands
docs/        architecture and logo
```

## Hackathon

Entered in **Real-World Money**, **AI Security & Defense** and **Open Innovation**. Every track requirement and where it is met: [Hackathon tracks](https://notara-sable.vercel.app/docs/hackathon). All code was written during the hackathon; the first commit is dated 2026-11-04.

## Limitations

- Prototype, not independently audited.
- A verdict reflects the evidence found. It is not proof that an account is safe or malicious.
- Profiles and preferences are stored in your browser only.

## Built with

React, Vite, Tailwind CSS, near-api-js, near-sign-verify, NEAR Connect and Neon Postgres. UI components adapted from HeroUI, SmoothUI, Vengeance UI and Skiper UI; icons from Iconoir. Parts of the code, tests and documentation were written with an AI coding assistant and reviewed by the author.

## License

[MIT](LICENSE). Use, copy, modify and share it freely, including commercially, as long as the copyright notice stays. No warranty.

## Author

Built by [**Syther**](https://x.com/SYther069). Thanks to [NEAR](https://near.org), [NEAR Intents](https://docs.near-intents.org), [NEAR AI Cloud](https://docs.near.ai), [FastNear](https://fastnear.com) and [Circle](https://www.circle.com/usdc).
