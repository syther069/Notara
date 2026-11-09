# Graph Report - near  (2026-11-09)

## Corpus Check
- 96 files · ~60,078 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .wasm 2, (none) 1, .css 1)

## Summary
- 920 nodes · 2463 edges · 50 communities (41 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbeff8f9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- assets.ts
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
- ref_node_assert
- server/index.ts
- guard.ts
- Notara: Product Requirements (PRD)
- Layout.tsx
- config.ts
- check.ts
- signals/index.ts
- merchants.ts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- sends.ts
- invoices.ts
- agent.ts
- ui.tsx
- Notara
- Claim.tsx
- Notara: Project Rules
- Phase A: prove the risky parts (unknowns first)
- scripts
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- checkout.ts
- agentspend-registry
- agentspend-vault
- dependencies
- evm.ts
- scripts
- deploy-contracts.sh

## God Nodes (most connected - your core abstractions)
1. `handle()` - 47 edges
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
- `6. Database instead of JSON files [M] 🗄️` --references--> `load()`  [INFERRED]
  IMPLEMENTATION.md → passport/src/signals/codeHashCache.ts
- `7. Public mode: no admin keys on a public server [M]` --references--> `proposeOwner()`  [INFERRED]
  IMPLEMENTATION.md → server/index.ts
- `7. Public mode: no admin keys on a public server [M]` --references--> `ownerAction()`  [INFERRED]
  IMPLEMENTATION.md → server/index.ts

## Import Cycles
- None detected.

## Communities (50 total, 9 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.06
Nodes (27): AssetCap, CALLBACK_GAS, Config, Decision, Allow, Block, Warn, DOMAIN (+19 more)

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.09
Nodes (32): acc(), bond_required(), cannot_self_report(), Category, Impersonation, MaliciousContract, Other, Phishing (+24 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "assets.ts"
Cohesion: 0.17
Nodes (11): AssetInfo, linkNetwork(), toUnits(), USDC_MAINNET, USDC_TESTNET, cases, healthy(), policy (+3 more)

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (34): 10. Implementation notes, 1. Design goals, 2. Personality and tone, 3.0 Theme: "Evergreen Ledger", 3.1 Color tokens, 3.2 Typography (Google Fonts), 3.3 Spacing, shape, elevation, 3.4 Icons (+26 more)

### Community 5 - "package.json"
Cohesion: 0.11
Nodes (21): dependencies, borsh@2.0.0, near-api-js@7.4.0, near-sign-verify@0.4.5, description, devDependencies, tsx@4.23.15, @types/node@^22.15.0 (+13 more)

### Community 6 - "web/package.json"
Cohesion: 0.16
Nodes (15): @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, devDependencies, @types/react@19.3.0, @types/react-dom@19.3.0 (+7 more)

### Community 7 - "setup-testnet.ts"
Cohesion: 0.20
Nodes (24): accountFromKey(), hasKey(), KEY_DIR, KeyFile, keyPath(), readKey(), writeKey(), NETWORKS (+16 more)

### Community 8 - "Vault.tsx"
Cohesion: 0.17
Nodes (17): AccountLink(), Badge(), nearAmount(), timeAgo(), unitsToDecimal(), Ctx, EVM_WALLET_ID, NETWORK (+9 more)

### Community 9 - "api.ts"
Cohesion: 0.14
Nodes (18): react, QrCode(), api, ApiError, Checkout, CheckResponse, MerchantProfile, Payment (+10 more)

### Community 10 - "Invoices.tsx"
Cohesion: 0.15
Nodes (18): useToast(), Skeleton(), TxLink(), Invoice, hasEvmWallet(), ASSETS, assetSymbol(), formatAsset() (+10 more)

### Community 11 - "Notara: Architecture"
Cohesion: 0.09
Nodes (22): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built), 2. Components (+14 more)

### Community 12 - "main.tsx"
Cohesion: 0.11
Nodes (18): lucide-react, react-router-dom, DeploymentCtx, Layout(), LINKS, storedTheme(), Toast, ToastCtx (+10 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.17
Nodes (11): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 8. New home page [M], 9. Merchant dashboard [M], Audit fixes (2026-11-09), Nice-to-have build sequence (items 12–20), Not possible on testnet, Notara: build sequence for items 1–11 (+3 more)

### Community 14 - "demo.ts"
Cohesion: 0.22
Nodes (19): buildWallet(), deployment(), explorerTx(), main(), network, renderDoc(), Row, { wallet } (+11 more)

### Community 15 - "ref_node_assert"
Cohesion: 0.15
Nodes (10): formatUnits(), NEAR(), merchantProfile(), listInvoices(), getMerchant(), fetchTx(), receivedInTx(), rpc() (+2 more)

### Community 16 - "server/index.ts"
Cohesion: 0.13
Nodes (37): 6. Database instead of JSON files [M] 🗄️, 7. Public mode: no admin keys on a public server [M], listAssets(), resolveAsset(), activateSend(), explorerTx(), handle(), HttpError (+29 more)

### Community 17 - "guard.ts"
Cohesion: 0.27
Nodes (7): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, refuseReason(), runOnce(), local

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "Layout.tsx"
Cohesion: 0.18
Nodes (14): NotDeployed(), useDeployment(), Banner(), netOfAccount(), CheckPage(), DemoPage(), InjectedInvoice(), lineClass() (+6 more)

### Community 20 - "config.ts"
Cohesion: 0.16
Nodes (9): Deployment, DISCLAIMER, Policy, DIR, FILE, load(), Store, migrate() (+1 more)

### Community 21 - "check.ts"
Cohesion: 0.10
Nodes (34): buildReport(), check(), validateRequest(), withDeploymentLists(), arg(), main(), loadDeployment(), loadPolicy() (+26 more)

### Community 22 - "signals/index.ts"
Cohesion: 0.17
Nodes (28): AccountTx, AccountTxPage, accountTxs(), AccountView, daysSince(), nsToIso(), postJson(), RpcError (+20 more)

### Community 23 - "merchants.ts"
Cohesion: 0.26
Nodes (9): checkWebsite(), isPrivateAddress(), linkMessage(), Merchant, normalizeWebsite(), SIGN_RECIPIENT, store, verifyLinkToken() (+1 more)

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
Cohesion: 0.16
Nodes (22): usdcFor(), claimSend(), checkClaimDelegate(), createName(), decodeSignedDelegate(), ensureUsdcStorage(), fundLinkAccount(), fundRefusal() (+14 more)

### Community 28 - "invoices.ts"
Cohesion: 0.22
Nodes (12): formatAmount(), getAsset(), docs(), Checkout, csvCell(), Invoice, InvoiceStatus, statusFromVault() (+4 more)

### Community 29 - "agent.ts"
Cohesion: 0.14
Nodes (17): AgentRun, callPay(), chat(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent() (+9 more)

### Community 30 - "ui.tsx"
Cohesion: 0.16
Nodes (22): CheckResult(), DecisionCard(), Evidence(), EvidenceTable(), ReasonList(), ReasonRow(), SevIcon(), signalSummary() (+14 more)

### Community 31 - "Notara"
Cohesion: 0.18
Nodes (10): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Notara, Run it, Try it free on testnet (for judges), What the demo shows (testnet, real transactions) (+2 more)

### Community 32 - "Claim.tsx"
Cohesion: 0.20
Nodes (19): CopyButton(), SendState, usdcFor(), fromFragment(), fromSecret(), isValidNewName(), LinkKey, newLinkKey() (+11 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "Phase A: prove the risky parts (unknowns first)"
Cohesion: 0.20
Nodes (10): 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, Phase A: prove the risky parts (unknowns first), @hot-labs/near-connect, @hot-labs/near-connect@0.12.0 (+2 more)

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, agent, check, demo, owner, passport, serve, setup:testnet (+6 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

### Community 39 - "checkout.ts"
Cohesion: 0.24
Nodes (11): createCheckout(), DONE, EVM_CHAIN_IDS, isDone(), oneClick(), overallStatus(), PayToken, payTokens() (+3 more)

### Community 45 - "dependencies"
Cohesion: 0.18
Nodes (11): qrcode, react-dom, @types/qrcode, dependencies, lucide-react@1.68.0, near-api-js@7.4.0, qrcode@^1.5.4, react@19.3.1 (+3 more)

### Community 46 - "evm.ts"
Cohesion: 0.57
Nodes (5): erc20TransferData(), eth(), evmAccount(), evmPay(), pad()

### Community 49 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

## Knowledge Gaps
- **20 isolated node(s):** `agentspend-registry`, `agentspend-vault`, `Allow`, `Block`, `Warn` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 316 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `setup-testnet.ts` to `Claim.tsx`, `package.json`, `web/package.json`, `dependencies`, `demo.ts`, `check.ts`, `merchants.ts`, `sends.ts`, `agent.ts`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Vault` (e.g. with `pay()` and `setup()`) actually correct?**
  _`Vault` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `agentspend-registry`, `agentspend-vault`, `Allow` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.0625694187338023 - nodes in this community are weakly interconnected._
- **Why does `near-sign-verify` connect `package.json` to `Vault.tsx`, `web/package.json`, `merchants.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `registry/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.09398496240601503 - nodes in this community are weakly interconnected._
- **Should `4. Core components` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._