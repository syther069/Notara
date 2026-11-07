# Graph Report - near  (2026-11-07)

## Corpus Check
- 89 files · ~53,466 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .wasm 2, .graphify-bak 1, (none) 1)

## Summary
- 865 nodes · 2274 edges · 41 communities (33 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7538ae81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- signals/index.ts
- 4. Core components
- package.json
- web/package.json
- setup-testnet.ts
- Vault.tsx
- api.ts
- checkout.ts
- Notara: Architecture
- main.tsx
- Phase B: build for real use
- demo.ts
- assets.ts
- server/index.ts
- nearpay.ts
- Notara: Product Requirements (PRD)
- Banner
- invoices.ts
- merchants.ts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- CheckResult.tsx
- assets.ts
- Invoices.tsx
- Notara
- ref_node_assert
- Notara: Project Rules
- Layout.tsx
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- build-contracts.sh
- agentspend-registry
- agentspend-vault

## God Nodes (most connected - your core abstractions)
1. `handle()` - 44 edges
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
- `6. Database instead of JSON files [M] 🗄️` --references--> `updateInvoice()`  [INFERRED]
  IMPLEMENTATION.md → server/invoices.ts
- `2. Real wallet signature on a payment link + smoother network switch [S] 💰` --references--> `ensureNetwork()`  [INFERRED]
  IMPLEMENTATION.md → web/src/lib/wallet.tsx
- `6. Database instead of JSON files [M] 🗄️` --references--> `load()`  [INFERRED]
  IMPLEMENTATION.md → passport/src/signals/codeHashCache.ts
- `7. Public mode: no admin keys on a public server [M]` --references--> `proposeOwner()`  [INFERRED]
  IMPLEMENTATION.md → server/index.ts

## Import Cycles
- None detected.

## Communities (41 total, 8 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.06
Nodes (27): AssetCap, CALLBACK_GAS, Config, Decision, Allow, Block, Warn, DOMAIN (+19 more)

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.09
Nodes (32): acc(), bond_required(), cannot_self_report(), Category, Impersonation, MaliciousContract, Other, Phishing (+24 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "signals/index.ts"
Cohesion: 0.06
Nodes (72): WrapperOptions, buildReport(), check(), validateRequest(), withDeploymentLists(), arg(), main(), Deployment (+64 more)

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (34): 10. Implementation notes, 1. Design goals, 2. Personality and tone, 3.0 Theme: "Evergreen Ledger", 3.1 Color tokens, 3.2 Typography (Google Fonts), 3.3 Spacing, shape, elevation, 3.4 Icons (+26 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (29): description, devDependencies, tsx@4.23.15, @types/node@^22.15.0, typescript@5.9.3, engines, node, license (+21 more)

### Community 6 - "web/package.json"
Cohesion: 0.08
Nodes (30): react-dom, @types/react, @types/react-dom, vite, @vitejs/plugin-react, dependencies, @hot-labs/near-connect@0.12.0, lucide-react@1.68.0 (+22 more)

### Community 7 - "setup-testnet.ts"
Cohesion: 0.13
Nodes (30): accountFromKey(), hasKey(), KEY_DIR, KeyFile, keyPath(), readKey(), writeKey(), NETWORKS (+22 more)

### Community 8 - "Vault.tsx"
Cohesion: 0.13
Nodes (22): useToast(), AccountLink(), Skeleton(), Payment, VaultSummary, assetSymbol(), formatAsset(), nearAmount() (+14 more)

### Community 9 - "api.ts"
Cohesion: 0.18
Nodes (16): Fact(), HEADLINE, plain(), ReportForm(), SafetyPanel(), api, ApiError, Checkout (+8 more)

### Community 10 - "checkout.ts"
Cohesion: 0.24
Nodes (11): createCheckout(), DONE, isDone(), oneClick(), overallStatus(), PayToken, payTokens(), readCheckout() (+3 more)

### Community 11 - "Notara: Architecture"
Cohesion: 0.09
Nodes (22): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built), 2. Components (+14 more)

### Community 12 - "main.tsx"
Cohesion: 0.17
Nodes (12): lucide-react, react, react-router-dom, Invoice, SendState, ClaimPage, SendPage, AboutPage() (+4 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.14
Nodes (13): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, 8. New home page [M] (+5 more)

### Community 14 - "demo.ts"
Cohesion: 0.12
Nodes (32): AgentRun, callPay(), chat(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent() (+24 more)

### Community 15 - "assets.ts"
Cohesion: 0.24
Nodes (13): AssetInfo, formatAmount(), formatUnits(), getAsset(), listAssets(), resolveAsset(), toUnits(), USDC_MAINNET (+5 more)

### Community 16 - "server/index.ts"
Cohesion: 0.15
Nodes (31): 7. Public mode: no admin keys on a public server [M], refuseReason(), runOnce(), explorerTx(), handle(), HttpError, latestRun(), listRuns() (+23 more)

### Community 17 - "nearpay.ts"
Cohesion: 0.47
Nodes (4): fetchTx(), receivedInTx(), rpc(), tx

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "Banner"
Cohesion: 0.18
Nodes (13): NotDeployed(), useDeployment(), Banner(), CheckPage(), DemoPage(), InjectedInvoice(), lineClass(), Linkified() (+5 more)

### Community 20 - "invoices.ts"
Cohesion: 0.13
Nodes (16): 6. Database instead of JSON files [M] 🗄️, docs(), migrate(), open(), merchantProfile(), createInvoice(), csvCell(), getInvoice() (+8 more)

### Community 23 - "merchants.ts"
Cohesion: 0.18
Nodes (13): dependencies, near-api-js@7.4.0, near-sign-verify@0.4.5, near-sign-verify, checkWebsite(), isPrivateAddress(), linkMessage(), Merchant (+5 more)

### Community 24 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noUnusedLocals (+6 more)

### Community 25 - "Build plan: trusted payment links on NEAR"
Cohesion: 0.14
Nodes (13): Build plan: trusted payment links on NEAR, Honesty rules for the pitch, Merchant experience, Not doing, Owner tasks, P0: must ship, P1: in this order, if time allows, Payment (+5 more)

### Community 26 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 27 - "CheckResult.tsx"
Cohesion: 0.17
Nodes (20): CheckResult(), DecisionCard(), Evidence(), EvidenceTable(), ReasonList(), ReasonRow(), SevIcon(), signalSummary() (+12 more)

### Community 28 - "assets.ts"
Cohesion: 0.33
Nodes (8): viewFunction(), CLAIM_GAS_NEAR, ensureClaimGas(), ensureUsdcStorage(), isImplicit(), MAX_SENDS_PER_DAY, sponsor(), usdcBalance()

### Community 30 - "Invoices.tsx"
Cohesion: 0.31
Nodes (6): ASSETS, DECISION_TEXT, SIGNAL_LABELS, USDC_MAINNET, USDC_TESTNET, INVOICE_STATUS

### Community 31 - "Notara"
Cohesion: 0.20
Nodes (9): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Notara, Run it, What the demo shows (testnet, real transactions), Why the enforcement is on-chain (+1 more)

### Community 32 - "ref_node_assert"
Cohesion: 0.14
Nodes (13): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, local, fromFragment(), fromSecret(), LinkKey (+5 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "Layout.tsx"
Cohesion: 0.14
Nodes (16): @hot-labs/near-connect, DeploymentCtx, Layout(), LINKS, storedTheme(), Toast, ToastCtx, WalletButton() (+8 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

## Knowledge Gaps
- **20 isolated node(s):** `Allow`, `Block`, `Warn`, `Executed`, `Executing` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 311 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `signals/index.ts` to `ref_node_assert`, `package.json`, `setup-testnet.ts`, `main.tsx`, `demo.ts`, `merchants.ts`, `assets.ts`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Vault` (e.g. with `pay()` and `setup()`) actually correct?**
  _`Vault` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Allow`, `Block`, `Warn` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.0649452269170579 - nodes in this community are weakly interconnected._
- **Why does `near-sign-verify` connect `merchants.ts` to `Layout.tsx`, `package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `registry/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08883693746347165 - nodes in this community are weakly interconnected._
- **Should `signals/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055921855921855924 - nodes in this community are weakly interconnected._