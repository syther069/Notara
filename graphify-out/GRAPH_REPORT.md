# Graph Report - near  (2026-11-09)

## Corpus Check
- 103 files · ~64,584 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .wasm 2, .css 1)

## Summary
- 972 nodes · 2612 edges · 52 communities (42 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc91db13`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- db.ts
- 4. Core components
- package.json
- web/package.json
- setup-testnet.ts
- Vault.tsx
- ui.tsx
- Invoices.tsx
- Notara: Architecture
- main.tsx
- Phase B: build for real use
- demo.ts
- check.ts
- server/index.ts
- ref_node_assert
- Notara: Product Requirements (PRD)
- Banner
- config.ts
- check.ts
- signals/index.ts
- merchants.ts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- sends.ts
- assets.ts
- vaults.ts
- Merchant.tsx
- Notara
- Claim.tsx
- Notara: Project Rules
- Pay.tsx
- scripts
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- dependencies
- agentspend-registry
- agentspend-vault
- checkout.ts
- evm.ts
- vercel.json
- Pay.tsx
- Engine
- deploy-contracts.sh

## God Nodes (most connected - your core abstractions)
1. `handle()` - 51 edges
2. `Vault` - 37 edges
3. `setup()` - 35 edges
4. `ctx()` - 31 edges
5. `vault_id()` - 31 edges
6. `verdict()` - 31 edges
7. `pay()` - 26 edges
8. `sign()` - 26 edges
9. `viewAccount()` - 24 edges
10. `Registry` - 24 edges

## Surprising Connections (you probably didn't know these)
- `1. First real payment through a link [S] 💰` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `7. Public mode: no admin keys on a public server [M]` --references--> `runDemo()`  [INFERRED]
  IMPLEMENTATION.md → server/index.ts
- `7. Public mode: no admin keys on a public server [M]` --references--> `payInvoice()`  [INFERRED]
  IMPLEMENTATION.md → server/index.ts
- `2. Real wallet signature on a payment link + smoother network switch [S] 💰` --references--> `ensureNetwork()`  [INFERRED]
  IMPLEMENTATION.md → web/src/lib/wallet.tsx
- `6. Database instead of JSON files [M] 🗄️` --references--> `updateInvoice()`  [INFERRED]
  IMPLEMENTATION.md → server/invoices.ts

## Import Cycles
- None detected.

## Communities (52 total, 10 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.07
Nodes (27): AssetCap, CALLBACK_GAS, Config, Decision, Allow, Block, Warn, DOMAIN (+19 more)

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.08
Nodes (32): acc(), bond_required(), cannot_self_report(), Category, Impersonation, MaliciousContract, Other, Phishing (+24 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "db.ts"
Cohesion: 0.24
Nodes (7): docs(), getEngine(), migrate(), postgres(), Row, sqlite(), Table

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (34): 10. Implementation notes, 1. Design goals, 2. Personality and tone, 3.0 Theme: "Evergreen Ledger", 3.1 Color tokens, 3.2 Typography (Google Fonts), 3.3 Spacing, shape, elevation, 3.4 Icons (+26 more)

### Community 5 - "package.json"
Cohesion: 0.15
Nodes (15): description, devDependencies, esbuild@0.28.2, tsx@4.23.15, @types/node@^22.15.0, engines, node, license (+7 more)

### Community 6 - "web/package.json"
Cohesion: 0.07
Nodes (33): typescript@5.9.3, qrcode, react-dom, @types/qrcode, @types/react, @types/react-dom, typescript, vite (+25 more)

### Community 7 - "setup-testnet.ts"
Cohesion: 0.17
Nodes (31): accountFromKey(), hasKey(), KEY_DIR, KeyFile, keyPath(), readKey(), writeKey(), 7. Public mode: no admin keys on a public server [M] (+23 more)

### Community 8 - "Vault.tsx"
Cohesion: 0.12
Nodes (22): ReportForm(), Payment, VaultSummary, ASSETS, assetSymbol(), DECISION_TEXT, formatAsset(), nearAmount() (+14 more)

### Community 9 - "ui.tsx"
Cohesion: 0.16
Nodes (23): CheckResult(), DecisionCard(), Evidence(), EvidenceTable(), ReasonList(), ReasonRow(), SevIcon(), signalSummary() (+15 more)

### Community 10 - "Invoices.tsx"
Cohesion: 0.22
Nodes (11): useToast(), Skeleton(), TxLink(), Invoice, linkNetwork(), InvoicePage(), INVOICE_STATUS, InvoicesPage() (+3 more)

### Community 11 - "Notara: Architecture"
Cohesion: 0.08
Nodes (23): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.4 Agent (`agent/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built) (+15 more)

### Community 12 - "main.tsx"
Cohesion: 0.11
Nodes (17): lucide-react, react-router-dom, DeploymentCtx, Layout(), LINKS, storedTheme(), Toast, ToastCtx (+9 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.11
Nodes (17): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, 8. New home page [M] (+9 more)

### Community 14 - "demo.ts"
Cohesion: 0.13
Nodes (30): AgentRun, callPay(), chat(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent() (+22 more)

### Community 15 - "check.ts"
Cohesion: 0.16
Nodes (20): buildReport(), check(), validateRequest(), withDeploymentLists(), arg(), main(), loadDeployment(), loadPolicy() (+12 more)

### Community 16 - "server/index.ts"
Cohesion: 0.15
Nodes (29): payTokens(), app(), handle(), HttpError, latestRun(), listRuns(), MIME, Net (+21 more)

### Community 17 - "ref_node_assert"
Cohesion: 0.15
Nodes (11): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, refuseReason(), runOnce(), fetchTx(), receivedInTx() (+3 more)

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "Banner"
Cohesion: 0.14
Nodes (19): NotDeployed(), useDeployment(), MyVault(), near(), RunResult(), SCENARIOS, TX(), Banner() (+11 more)

### Community 20 - "config.ts"
Cohesion: 0.17
Nodes (8): Deployment, DISCLAIMER, Policy, ROOT, FILE, load(), Store, fn

### Community 21 - "check.ts"
Cohesion: 0.10
Nodes (24): WrapperOptions, wallet(), evaluate(), fmt(), get(), rank, sevToDecision, RegistryReport (+16 more)

### Community 22 - "signals/index.ts"
Cohesion: 0.17
Nodes (28): AccountTx, AccountTxPage, accountTxs(), AccountView, daysSince(), nsToIso(), postJson(), RpcError (+20 more)

### Community 23 - "merchants.ts"
Cohesion: 0.24
Nodes (10): near-sign-verify, checkWebsite(), isPrivateAddress(), linkMessage(), Merchant, normalizeWebsite(), SIGN_RECIPIENT, store (+2 more)

### Community 24 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noUnusedLocals (+6 more)

### Community 25 - "Build plan: trusted payment links on NEAR"
Cohesion: 0.14
Nodes (13): Build plan: trusted payment links on NEAR, Honesty rules for the pitch, Merchant experience, Not doing, Owner tasks, P0: must ship, P1: in this order, if time allows, Payment (+5 more)

### Community 26 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 27 - "sends.ts"
Cohesion: 0.14
Nodes (25): usdcFor(), activateSend(), claimSend(), clearInvoiceFlag(), setInvoiceFlag(), checkClaimDelegate(), createName(), decodeSignedDelegate() (+17 more)

### Community 28 - "assets.ts"
Cohesion: 0.12
Nodes (24): 6. Database instead of JSON files [M] 🗄️, AssetInfo, formatAmount(), formatUnits(), getAsset(), linkNetwork(), listAssets(), resolveAsset() (+16 more)

### Community 29 - "vaults.ts"
Cohesion: 0.19
Nodes (15): agent(), createVisitorVault(), factory(), getVisitorVault(), isAccountId(), isVisitorVault(), MAX_VAULTS_PER_DAY, net (+7 more)

### Community 30 - "Merchant.tsx"
Cohesion: 0.53
Nodes (4): AccountLink(), netOfAccount(), usdcFor(), MerchantPage()

### Community 31 - "Notara"
Cohesion: 0.17
Nodes (11): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Live site (Vercel), Notara, Run it, Try it free on testnet (for judges) (+3 more)

### Community 32 - "Claim.tsx"
Cohesion: 0.17
Nodes (22): react, QrCode(), CopyButton(), SendState, EXPLORER, fromFragment(), fromSecret(), isValidNewName() (+14 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "Pay.tsx"
Cohesion: 0.28
Nodes (7): @hot-labs/near-connect, Ctx, ensureNetwork(), EVM_WALLET_ID, NETWORK, WalletProvider(), WalletState

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, agent, check, demo, owner, passport, serve, setup:testnet (+6 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

### Community 39 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, borsh@2.0.0, near-api-js@7.4.0, near-sign-verify@0.4.5, @neondatabase/serverless@1.2.0, borsh, @neondatabase/serverless

### Community 45 - "checkout.ts"
Cohesion: 0.18
Nodes (11): createCheckout(), DONE, EVM_CHAIN_IDS, isDone(), oneClick(), overallStatus(), PayToken, readCheckout() (+3 more)

### Community 46 - "evm.ts"
Cohesion: 0.50
Nodes (6): erc20TransferData(), eth(), evmAccount(), evmPay(), hasEvmWallet(), pad()

### Community 47 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 48 - "Pay.tsx"
Cohesion: 0.24
Nodes (10): api, ApiError, Checkout, CheckResponse, MerchantProfile, PayToken, post(), Report (+2 more)

## Knowledge Gaps
- **20 isolated node(s):** `Allow`, `Block`, `Warn`, `Executed`, `Executing` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `setup-testnet.ts` to `Claim.tsx`, `package.json`, `web/package.json`, `dependencies`, `demo.ts`, `check.ts`, `ref_node_assert`, `check.ts`, `merchants.ts`, `sends.ts`, `vaults.ts`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Vault` (e.g. with `pay()` and `setup()`) actually correct?**
  _`Vault` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Allow`, `Block`, `Warn` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.06832298136645963 - nodes in this community are weakly interconnected._
- **Why does `near-sign-verify` connect `merchants.ts` to `Pay.tsx`, `package.json`, `web/package.json`, `dependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `registry/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08415300546448087 - nodes in this community are weakly interconnected._
- **Should `4. Core components` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._