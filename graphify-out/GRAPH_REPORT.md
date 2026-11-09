# Graph Report - near  (2026-11-09)

## Corpus Check
- 97 files · ~58,391 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .wasm 2, (none) 1, .zip 1)

## Summary
- 907 nodes · 2411 edges · 52 communities (42 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75cc88d6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- types.ts
- 4. Core components
- package.json
- web/package.json
- setup-testnet.ts
- Vault.tsx
- api.ts
- Invoices.tsx
- Notara: Architecture
- main.tsx
- Phase B: build for real use
- demo.ts
- assets.ts
- server/index.ts
- guard.ts
- Notara: Product Requirements (PRD)
- Layout.tsx
- codeHashCache.ts
- check.ts
- signals/index.ts
- merchants.ts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- Merchant.tsx
- near.ts
- types.ts
- ui.tsx
- Notara
- near-api-js
- Notara: Project Rules
- wallet.tsx
- scripts
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- build-contracts.sh
- agentspend-registry
- agentspend-vault
- dependencies
- ClaimPage
- nearpay.ts
- near-sign-verify
- scripts
- deploy-contracts.sh

## God Nodes (most connected - your core abstractions)
1. `handle()` - 46 edges
2. `Vault` - 37 edges
3. `setup()` - 35 edges
4. `ctx()` - 31 edges
5. `vault_id()` - 31 edges
6. `verdict()` - 31 edges
7. `pay()` - 26 edges
8. `sign()` - 26 edges
9. `Registry` - 24 edges
10. `signing_key()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `1. First real payment through a link [S] 💰` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `Nice-to-have build sequence (items 12–20)` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `2. Real wallet signature on a payment link + smoother network switch [S] 💰` --references--> `ensureNetwork()`  [INFERRED]
  IMPLEMENTATION.md → web/src/lib/wallet.tsx
- `6. Database instead of JSON files [M] 🗄️` --references--> `load()`  [INFERRED]
  IMPLEMENTATION.md → passport/src/signals/codeHashCache.ts
- `Signals, data sources and their limits` --references--> `recordCodeHash()`  [INFERRED]
  README.md → passport/src/signals/codeHashCache.ts

## Import Cycles
- None detected.

## Communities (52 total, 10 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.06
Nodes (27): AssetCap, CALLBACK_GAS, Config, Decision, Allow, Block, Warn, DOMAIN (+19 more)

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.09
Nodes (32): acc(), bond_required(), cannot_self_report(), Category, Impersonation, MaliciousContract, Other, Phishing (+24 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "types.ts"
Cohesion: 0.12
Nodes (17): Policy, evaluate(), fmt(), get(), rank, sevToDecision, RegistryReport, TokenRegistrationSignal (+9 more)

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (34): 10. Implementation notes, 1. Design goals, 2. Personality and tone, 3.0 Theme: "Evergreen Ledger", 3.1 Color tokens, 3.2 Typography (Google Fonts), 3.3 Spacing, shape, elevation, 3.4 Icons (+26 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (16): description, devDependencies, tsx@4.23.15, @types/node@^22.15.0, typescript@5.9.3, engines, node, license (+8 more)

### Community 6 - "web/package.json"
Cohesion: 0.18
Nodes (13): @types/react, @types/react-dom, vite, @vitejs/plugin-react, devDependencies, @types/react@19.3.0, @types/react-dom@19.3.0, vite@8.3.5 (+5 more)

### Community 7 - "setup-testnet.ts"
Cohesion: 0.13
Nodes (36): accountFromKey(), hasKey(), KEY_DIR, KeyFile, keyPath(), readKey(), writeKey(), toUnits() (+28 more)

### Community 8 - "Vault.tsx"
Cohesion: 0.26
Nodes (14): AccountLink(), Badge(), formatAsset(), nearAmount(), timeAgo(), unitsToDecimal(), useWallet(), NotDeployedPage() (+6 more)

### Community 9 - "api.ts"
Cohesion: 0.15
Nodes (19): api, ApiError, Checkout, CheckResponse, Invoice, MerchantProfile, Payment, PayToken (+11 more)

### Community 10 - "Invoices.tsx"
Cohesion: 0.23
Nodes (12): useToast(), Banner(), CopyButton(), Skeleton(), TxLink(), linkNetwork(), InvoicePage(), INVOICE_STATUS (+4 more)

### Community 11 - "Notara: Architecture"
Cohesion: 0.09
Nodes (22): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built), 2. Components (+14 more)

### Community 12 - "main.tsx"
Cohesion: 0.12
Nodes (17): lucide-react, react, react-router-dom, QrCode(), SendState, EXPLORER, SEND_LINK_DAYS, ClaimPage (+9 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.12
Nodes (16): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, 8. New home page [M] (+8 more)

### Community 14 - "demo.ts"
Cohesion: 0.12
Nodes (32): AgentRun, callPay(), chat(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent() (+24 more)

### Community 15 - "assets.ts"
Cohesion: 0.10
Nodes (26): AssetInfo, formatAmount(), formatUnits(), getAsset(), linkNetwork(), USDC_MAINNET, USDC_TESTNET, usdcFor() (+18 more)

### Community 16 - "server/index.ts"
Cohesion: 0.11
Nodes (43): 6. Database instead of JSON files [M] 🗄️, 7. Public mode: no admin keys on a public server [M], listAssets(), resolveAsset(), createCheckout(), isDone(), oneClick(), overallStatus() (+35 more)

### Community 17 - "guard.ts"
Cohesion: 0.27
Nodes (7): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, refuseReason(), runOnce(), local

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "Layout.tsx"
Cohesion: 0.15
Nodes (18): DeploymentCtx, Layout(), LINKS, NotDeployed(), storedTheme(), Toast, ToastCtx, useDeployment() (+10 more)

### Community 20 - "codeHashCache.ts"
Cohesion: 0.33
Nodes (6): DIR, FILE, load(), recordCodeHash(), Store, AccountSignal

### Community 21 - "check.ts"
Cohesion: 0.15
Nodes (20): buildReport(), check(), validateRequest(), withDeploymentLists(), arg(), main(), DISCLAIMER, loadPolicy() (+12 more)

### Community 22 - "signals/index.ts"
Cohesion: 0.29
Nodes (19): accountTxs(), daysSince(), nsToIso(), transactions(), accountSignal(), collectSignals(), DeploySignal, deploySignal() (+11 more)

### Community 23 - "merchants.ts"
Cohesion: 0.18
Nodes (12): docs(), migrate(), open(), checkWebsite(), isPrivateAddress(), linkMessage(), Merchant, normalizeWebsite() (+4 more)

### Community 24 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noUnusedLocals (+6 more)

### Community 25 - "Build plan: trusted payment links on NEAR"
Cohesion: 0.14
Nodes (13): Build plan: trusted payment links on NEAR, Honesty rules for the pitch, Merchant experience, Not doing, Owner tasks, P0: must ship, P1: in this order, if time allows, Payment (+5 more)

### Community 26 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 27 - "Merchant.tsx"
Cohesion: 0.24
Nodes (12): CheckResult(), DecisionCard(), ReasonList(), Fact(), HEADLINE, plain(), ReportForm(), SafetyPanel() (+4 more)

### Community 28 - "near.ts"
Cohesion: 0.28
Nodes (7): AccountTx, AccountTxPage, AccountView, postJson(), RpcError, rpcQuery(), TIMEOUT_MS

### Community 29 - "types.ts"
Cohesion: 0.26
Nodes (8): WrapperOptions, Deployment, CheckResponse, Decision, Network, PaymentRequest, Source, SourceKind

### Community 30 - "ui.tsx"
Cohesion: 0.13
Nodes (21): Evidence(), EvidenceTable(), ReasonRow(), SevIcon(), signalSummary(), DecisionIcon(), FixtureTag(), SOURCE (+13 more)

### Community 31 - "Notara"
Cohesion: 0.18
Nodes (10): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Notara, Run it, Try it free on testnet (for judges), What the demo shows (testnet, real transactions) (+2 more)

### Community 32 - "near-api-js"
Cohesion: 0.36
Nodes (9): near-api-js, fromFragment(), fromSecret(), LinkKey, newLinkKey(), toFragment(), toHex(), SendPage() (+1 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "wallet.tsx"
Cohesion: 0.28
Nodes (7): @hot-labs/near-connect, Ctx, ensureNetwork(), EVM_WALLET_ID, NETWORK, WalletProvider(), WalletState

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, agent, check, demo, owner, passport, serve, setup:testnet (+6 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

### Community 45 - "dependencies"
Cohesion: 0.17
Nodes (12): qrcode, react-dom, @types/qrcode, dependencies, @hot-labs/near-connect@0.12.0, lucide-react@1.68.0, near-api-js@7.4.0, qrcode@^1.5.4 (+4 more)

### Community 46 - "ClaimPage"
Cohesion: 0.67
Nodes (6): isValidNewName(), ClaimPage(), claim(), createName(), moveUsdc(), run()

### Community 47 - "nearpay.ts"
Cohesion: 0.67
Nodes (3): fetchTx(), receivedInTx(), rpc()

### Community 48 - "near-sign-verify"
Cohesion: 0.40
Nodes (5): dependencies, near-api-js@7.4.0, near-sign-verify@0.4.5, near-sign-verify, near-sign-verify@0.4.5

### Community 49 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

## Knowledge Gaps
- **20 isolated node(s):** `Allow`, `Block`, `Warn`, `Executed`, `Executing` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `near-api-js` to `package.json`, `web/package.json`, `setup-testnet.ts`, `main.tsx`, `dependencies`, `demo.ts`, `near-sign-verify`, `check.ts`, `merchants.ts`, `types.ts`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Vault` (e.g. with `pay()` and `setup()`) actually correct?**
  _`Vault` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Allow`, `Block`, `Warn` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.0649452269170579 - nodes in this community are weakly interconnected._
- **Why does `near-sign-verify` connect `near-sign-verify` to `wallet.tsx`, `package.json`, `web/package.json`, `merchants.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `registry/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08883693746347165 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._