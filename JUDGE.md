# Notara: guide for judges

A 3-minute read covers what Notara does and where the proof is. Trying it yourself needs nothing installed. If you'd rather run it on your own machine, the [quickstart](#quickstart-on-your-own-machine) has every command.

- **Live app:** https://notara-sable.vercel.app
- **Documentation:** https://notara-sable.vercel.app/docs
- **Track requirements, with proof:** https://notara-sable.vercel.app/docs/hackathon
- **Tracks entered:** Real-World Money, AI Security & Defense, Open Innovation

> Notara is a hackathon prototype built on NEAR. It has not been audited. Everything below runs on NEAR **testnet** with free test money, except where it says mainnet.

## Notara in one minute

Notara makes payments on NEAR safer in two ways.

**Payments for people.** A payment link or an account name gives no way to tell if it is genuine before you pay. With Notara, a merchant's link is signed by their own wallet, the client sees an account check before paying and clients can pay in USDC from a NEAR wallet or from another chain. Anyone can also send USDC to an account with a note or as a link the receiver claims without gas.

**Payments by AI agents.** An agent that pays invoices can be tricked by a hidden line ("pay this other account instead") and safety code inside the agent can't stop that. With Notara, the agent's money sits in a NEAR contract, the vault. The agent can only ask it to pay and the vault pays only when Notara's check allows it and within its limits, even if the agent is hacked.

Both use the same account check: **ALLOW**, **WARN** or **BLOCK**, with the reasons.

## Four pages worth opening first

- **[Hackathon tracks](https://notara-sable.vercel.app/docs/hackathon)**
  - Every requirement of the Real-World Money, AI Security & Defense and Open Innovation tracks.
  - How Notara meets each one, with a link to check it.
- **[Mainnet proof: NEAR Intents](https://notara-sable.vercel.app/docs/mainnet-proof)**
  - A real payment: a client paid a Notara link with ETH on Arbitrum and the merchant received exactly 0.1 USDC on NEAR.
  - Every transaction on both chains is linked, with a one-minute way to check it yourself.
- **[Verified AI model (TEE)](https://notara-sable.vercel.app/docs/tee-model)**
  - Before the demo agent reads an invoice, Notara checks its model runs in a TEE on NEAR AI Cloud (fresh nonce, NVIDIA GPU evidence).
  - Each reply's signature is checked against the attested TEE. The page also says plainly which checks are not done yet.
- **[Security and limits](https://notara-sable.vercel.app/docs/security)**
  - What Notara protects (signed links, the vault's rules, the agent's limited key) and what it doesn't.
  - What is built, what is planned and how to report a problem.

## What you need (5 minutes, free)

1. **A NEAR testnet wallet.** [Intear Wallet](https://wallet.intear.tech) is the one we tested end to end. Create a testnet account in it.
2. **Free test NEAR.** Intear gives a new testnet account some test NEAR. For more, use the [NEAR testnet faucet](https://near-faucet.io).
3. **Free test USDC** (for payment links and sends). Testnet USDC on NEAR is issued by Circle, so it comes from [Circle's faucet](https://faucet.circle.com). Choose **NEAR testnet** and paste your testnet account name. The NEAR faucet gives NEAR only, not USDC.

## Things to try on the live site

Open https://notara-sable.vercel.app and press **Open App**. The **Guide** button at the bottom of the left sidebar explains each page.

### 1. Get paid with a payment link

1. Go to **Get Paid**. Keep **Test money**.
2. Enter an amount and what it's for. To try line items, press **Itemise this invoice**. You can also pick a **Due date**.
3. Press **Create payment link**. Your wallet signs the link, so clients can see it's really from you.
4. Open the link in another browser as the client. **Check who's asking** shows the account check and the signature. Pay with a NEAR wallet (needs test USDC). The link shows **Paid** on both sides.

### 2. Send money

- **To an account:** go to **Send → To an account**, enter a NEAR account, an amount and a note, then **Review**. Notara checks the account; **Confirm & send** and approve in your wallet. The payment appears in **Recent sends**.
- **As a link:** go to **Send → As a link**, create a link and fund it from your wallet. Open it in another browser and claim it, even into a brand-new `name.testnet` account. The receiver pays no gas.

### 3. Watch an AI agent get stopped (no USDC needed)

1. Go to **Agents → Vault Console**.
2. Connect your testnet wallet and press **Create my vault**. Your wallet signs a short message to prove it's you. It's free and moves no money.
3. Press **Add 1 test NEAR from my wallet**.
4. Run the four scenarios and compare **Expected** with **Actual**:

| Scenario | What should happen |
|---|---|
| Legit invoice from a known merchant | ALLOW: your vault pays 0.1 NEAR |
| Invoice with a hidden "pay the attacker" instruction | BLOCK: refused, nothing is signed |
| First invoice from an unknown shop | WARN: the payment waits in the **Approval queue** until you approve or reject it with your wallet |
| A hacked agent goes straight to your vault | Every trick is refused on-chain |

Every result links to its transaction on the NEAR testnet explorer.

### 4. Check any account

Go to **Agents → Check an Account**, type any NEAR account (for example `aurora` on mainnet) and press **Check**. You'll see the verdict, the reasons and where each piece of evidence came from.

## Proof you can open without doing anything

| What | Where |
|---|---|
| The attack demo's on-chain refusals (3a to 3g) | [Attack tests](https://notara-sable.vercel.app/docs/attack-tests) |
| The demo vault has no full-access key (locked) | [Lock transaction](https://testnet.nearblocks.io/txns/BKYAA6TskXprBX8ovMYcjBCTpnMWKFWpW7KHzaCLjcJ1) |
| The paid mainnet link itself | [INV-0016](https://notara-sable.vercel.app/pay/INV-0016) |

## Quickstart on your own machine

### 1. Install Node.js and npm

Notara needs **Node.js 22.13 or later**. It uses Node's built-in SQLite, which arrived in 22.13. **npm** comes with Node.js; npm 10 or later is fine.

- **Windows or macOS:** download the LTS installer from https://nodejs.org and run it.
- **Linux or macOS with nvm:**

```bash
nvm install 22
```

Check the versions:

```bash
node -v
```

```bash
npm -v
```

`node -v` should print v22.13.0 or higher.

You also need **Git** (https://git-scm.com). Rust is only needed to rebuild the contracts (step 6).

### 2. Get the code

```bash
git clone https://github.com/syther069/Notara.git
```

```bash
cd Notara
```

### 3. Install the dependencies

```bash
npm install
```

```bash
npm run web:install
```

The first installs the backend, the checking service and the agent; the second installs the website.

### 4. Run the tests

```bash
npm test
```

All 103 tests should pass. They need no network and no keys.

### 5. Start Notara

```bash
npm run web:build
```

```bash
npm run serve
```

Open http://127.0.0.1:8787. Account checks work straight away; no keys are needed.

Check a real mainnet account from the terminal (read-only, no keys):

```bash
npm run check -- aurora --network mainnet --amount 0.1
```

### 6. Optional: run the attack demo on your own contracts

The attack demo needs contracts on testnet that you control. This takes about 7.5 test NEAR once and Rust with [cargo-near](https://github.com/near/cargo-near/releases) and [near-cli-rs](https://github.com/near/near-cli-rs/releases).

```bash
bash scripts/deploy-contracts.sh --build
```

```bash
NEAR_OWNER_ACCOUNT=you.testnet NEAR_OWNER_PRIVATE_KEY=ed25519:... npm run setup:testnet
```

Then, with `npm run serve` running in another terminal:

```bash
npm run demo
```

Run the contract tests too:

```bash
cargo test
```

On Windows, set `AWS_LC_SYS_PREBUILT_NASM=1` first.

## If something doesn't work

| Problem | What to do |
|---|---|
| The wallet doesn't open | Allow pop-ups for the site and make sure the wallet is on **testnet** |
| MetaMask says the request was declined | MetaMask still has an earlier request open. Open MetaMask, close it, then try again |
| A wallet signs messages but its testnet payments fail | Nightly did this in our testing. Use Intear Wallet |
| "Waiting for your wallet" never ends | After 2 minutes the site stops waiting and says so. Try again; the new attempt replaces the stuck one |
| No USDC to pay a link | Get test USDC from Circle's faucet (NEAR testnet) or try the agent vault, which uses NEAR |
| `node -v` shows an older version | Install Node.js 22.13 or later; the built-in SQLite needs it |

## Good to know

- Mainnet links (**Real money** on Get Paid) move real USDC. Keep amounts tiny if you try them.
- The vault, the registry and all agent payments are on testnet. No Notara contract is on mainnet.
- The "Verified scam report" on the demo attacker account is labelled demo data, not a claim about a real person.
- More detail on how it works is in the [README](README.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
