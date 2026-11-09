# Graph Report - near  (2026-11-10)

## Corpus Check
- 114 files · ~147,182 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .wasm 2, .zip 1)

## Summary
- 1451 nodes · 3434 edges · 98 communities (89 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bdb5907c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- wallet.tsx
- 4. Core components
- package.json
- web/package.json
- setup-testnet.ts
- 17. Source and evidence register
- linkKey.ts
- main.tsx
- Notara: Architecture
- icons.tsx
- Phase B: build for real use
- demo.ts
- check.ts
- server/index.ts
- 6. Understanding, confidence and trust
- Notara: Product Requirements (PRD)
- api.ts
- Vault.tsx
- merchants.ts
- signals/index.ts
- scripts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- sends.ts
- dependencies
- vaults.ts
- dependencies
- Notara
- near-sign-verify
- Notara: Project Rules
- types.ts
- config.ts
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- icons.tsx
- agentspend-registry
- agentspend-vault
- assets.ts
- evm.ts
- vercel.json
- Memeora Skiper-based components
- UX Guide: Universal Principles for Interface Behavior, Feedback and Trust
- deploy-contracts.sh
- 2. Laws and principles, precisely
- Layout.tsx
- UI Guide: Universal Principles for Visual Composition, Components and Motion
- 7. Interaction feedback, errors, forms and reversibility
- invoices.ts
- 17. Iconography, motion and interaction polish
- 1. Foundations: UX versus UI, task-first thinking, contextual principles, complete-state thinking
- 16. Component states and visible feedback
- 11. Speed, stability and resilience
- 19. Semantic tokens and component contracts
- 3. Grid, alignment, spacing and density
- 18. Image, font and layout performance
- 20. Surface-level visual reference by screen type
- 25. Component sourcing, library evaluation, implementation craft and browser review
- 10. Accessibility and mobile usability
- 3. Discovery: navigation, search, filtering and sorting
- 4. Decision support and choice architecture
- 11. Navigation, search and listings
- 14. Responsive composition and mobile robustness
- 15. Overlays, tabs and accordions
- 24. Design libraries and a coherent original direction
- 2. Visual hierarchy and original identity
- 4. Typography and reading comfort
- 5. Color, contrast, surfaces and themes
- 6. Numbers, currency, units and locale
- 9. Detail views, galleries and option selection
- 13. Truthful interfaces: what a UI can and cannot claim
- 14. Measurement and evaluation
- 10. Ratings, social proof, promotional and third-party content
- 12. Filters, sorting and comparison
- 13. Summaries, multi-step flows and irreversible actions
- 23. From reference to original interface
- 7. Imagery, media and art direction
- 8. Cards, list items and collections
- 12. Surface archetypes: a UX reference by screen type
- 5. First impressions, visual identity and perceived quality
- db.ts
- 22. Visual review checklist
- 15. UX review checklist
- 8. Engagement and return loops without compulsion
- guard.ts
- near.ts
- scripts
- Pay.tsx
- checkout.ts
- 9. Dark patterns, honest persuasion and regulatory context

## God Nodes (most connected - your core abstractions)
1. `handle()` - 52 edges
2. `Vault` - 37 edges
3. `setup()` - 35 edges
4. `ctx()` - 31 edges
5. `vault_id()` - 31 edges
6. `verdict()` - 31 edges
7. `UI Guide: Universal Principles for Visual Composition, Components and Motion` - 30 edges
8. `17. Source and evidence register` - 30 edges
9. `near-api-js` - 27 edges
10. `PayPage()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `1. First real payment through a link [S] 💰` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `6. Database instead of JSON files [M] 🗄️` --references--> `updateInvoice()`  [INFERRED]
  IMPLEMENTATION.md → server/invoices.ts
- `Nice-to-have build sequence (items 12–20)` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `6. Database instead of JSON files [M] 🗄️` --references--> `load()`  [INFERRED]
  IMPLEMENTATION.md → passport/src/signals/codeHashCache.ts
- `6. Database instead of JSON files [M] 🗄️` --references--> `createInvoice()`  [INFERRED]
  IMPLEMENTATION.md → server/invoices.ts

## Import Cycles
- None detected.

## Communities (98 total, 9 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.06
Nodes (27): AssetCap, CALLBACK_GAS, Config, Decision, Allow, Block, Warn, DOMAIN (+19 more)

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.09
Nodes (32): acc(), bond_required(), cannot_self_report(), Category, Impersonation, MaliciousContract, Other, Phishing (+24 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "wallet.tsx"
Cohesion: 0.16
Nodes (14): Ctx, EXCLUDED, failureReason(), FEATURES, ftBalance(), Net, NETWORK, RPC (+6 more)

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (33): 10. Implementation notes, 1. Design goals, 2. Personality and tone, 3.0 Theme: "Notary Seal" (redesign, 2026-11-09), 3.2 Typography, 3.3 Spacing, shape, elevation, 3.4 Icons, 3.5 Motion (+25 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.28.2, tsx@4.23.15, @types/node@^22.15.0, typescript@5.9.3, engines, node (+9 more)

### Community 6 - "web/package.json"
Cohesion: 0.20
Nodes (10): @types/react, @types/react-dom, vite, @vitejs/plugin-react, devDependencies, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@5.9.3 (+2 more)

### Community 7 - "setup-testnet.ts"
Cohesion: 0.27
Nodes (19): accountFromKey(), hasKey(), keyPath(), readKey(), writeKey(), nearAmount(), viewAccount(), topUpFromFaucet() (+11 more)

### Community 8 - "17. Source and evidence register"
Cohesion: 0.07
Nodes (30): 10. The Role of Animation and Motion in UX: Nielsen Norman Group, 11. Response Times: The Three Important Limits: Nielsen Norman Group, 12. Product Page UX: Provide at Least One In-Scale Image: Baymard, 13. Use Delivery Date, Not Shipping Speed: Baymard, 14. The Effect of Electronic Word of Mouth on Sales: A Meta-Analytic Review, 15. Final Rule Banning Fake Reviews and Testimonials: FTC Announcement, 16. WCAG 2.2 SC 2.5.8: Target Size (Minimum): W3C, 17. Source and evidence register (+22 more)

### Community 9 - "linkKey.ts"
Cohesion: 0.22
Nodes (13): usdc(), fromFragment(), fromSecret(), isValidNewName(), LinkKey, newLinkKey(), toFragment(), toHex() (+5 more)

### Community 10 - "main.tsx"
Cohesion: 0.11
Nodes (26): react, react-router-dom, LoaderCircle(), Plus, useDeployment(), QrCode(), MainnetBadge(), StepBar() (+18 more)

### Community 11 - "Notara: Architecture"
Cohesion: 0.08
Nodes (23): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.4 Agent (`agent/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built) (+15 more)

### Community 12 - "icons.tsx"
Cohesion: 0.13
Nodes (29): ArrowLeft, ArrowRight, BadgeCheck, Bot, Globe, Link2, Lock, RefreshCw (+21 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.11
Nodes (18): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, 8. New home page [M] (+10 more)

### Community 14 - "demo.ts"
Cohesion: 0.15
Nodes (29): AgentRun, callPay(), chat(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent() (+21 more)

### Community 15 - "check.ts"
Cohesion: 0.15
Nodes (21): buildReport(), check(), validateRequest(), withDeploymentLists(), arg(), main(), DISCLAIMER, loadPolicy() (+13 more)

### Community 16 - "server/index.ts"
Cohesion: 0.12
Nodes (38): 7. Public mode: no admin keys on a public server [M], toUnits(), viewFunction(), app(), explorerTx(), handle(), HttpError, latestRun() (+30 more)

### Community 17 - "6. Understanding, confidence and trust"
Cohesion: 0.33
Nodes (6): 6. Understanding, confidence and trust, Imagery, context and scale, Questions an item, record or offer must answer, Ratings, reviews and social proof, Time and date commitments, Trust is consistency plus honest limits

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "api.ts"
Cohesion: 0.13
Nodes (25): CircleCheck, Download, ExternalLink, Pause, Play, Wallet, MyVault(), near() (+17 more)

### Community 20 - "Vault.tsx"
Cohesion: 0.14
Nodes (20): DecisionCard(), Badge(), Payment, VaultSummary, ASSETS, assetSymbol(), DECISION_TEXT, formatAsset() (+12 more)

### Community 21 - "merchants.ts"
Cohesion: 0.23
Nodes (11): docs(), checkWebsite(), freshNonce(), isPrivateAddress(), linkMessage(), Merchant, normalizeWebsite(), SIGN_RECIPIENT (+3 more)

### Community 22 - "signals/index.ts"
Cohesion: 0.13
Nodes (37): loadDeployment(), Policy, accountTxs(), daysSince(), nsToIso(), postJson(), transactions(), evaluate() (+29 more)

### Community 23 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, agent, check, demo, owner, passport, serve, setup:testnet (+6 more)

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
Cohesion: 0.13
Nodes (23): 6. Database instead of JSON files [M] 🗄️, activateSend(), claimSend(), clearInvoiceFlag(), getInvoice(), setInvoiceFlag(), createName(), ensureUsdcStorage() (+15 more)

### Community 28 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, borsh@2.0.0, near-api-js@7.4.0, near-sign-verify@0.4.5, @neondatabase/serverless@1.2.0, borsh, @neondatabase/serverless

### Community 29 - "vaults.ts"
Cohesion: 0.19
Nodes (19): agent(), createVisitorVault(), factory(), getVisitorVault(), isAccountId(), isVisitorVault(), keyed(), MAX_VAULTS_PER_DAY (+11 more)

### Community 30 - "dependencies"
Cohesion: 0.12
Nodes (20): @hot-labs/near-connect, iconoir-react, motion, qrcode, react-dom, @types/qrcode, dependencies, @hot-labs/near-connect@0.12.0 (+12 more)

### Community 31 - "Notara"
Cohesion: 0.17
Nodes (11): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Live site (Vercel), Notara, Run it, Try it free on testnet (for judges) (+3 more)

### Community 32 - "near-sign-verify"
Cohesion: 0.13
Nodes (10): near-sign-verify, LOCAL, results, checkSignature(), implicit, kp, opts, token() (+2 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "types.ts"
Cohesion: 0.23
Nodes (6): GuardedPayments, WrapperOptions, wallet(), Deployment, CheckResponse, Network

### Community 35 - "config.ts"
Cohesion: 0.11
Nodes (14): KEY_DIR, KeyFile, NETWORKS, ROOT, FILE, load(), Store, acct() (+6 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

### Community 39 - "icons.tsx"
Cohesion: 0.11
Nodes (33): CheckResult(), Evidence(), EvidenceTable(), ReasonList(), ReasonRow(), SevIcon(), signalSummary(), Check (+25 more)

### Community 45 - "assets.ts"
Cohesion: 0.12
Nodes (18): AssetInfo, formatUnits(), linkNetwork(), USDC_MAINNET, USDC_TESTNET, usdcFor(), cases, healthy() (+10 more)

### Community 46 - "evm.ts"
Cohesion: 0.50
Nodes (6): erc20TransferData(), eth(), evmAccount(), evmPay(), hasEvmWallet(), pad()

### Community 47 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 48 - "Memeora Skiper-based components"
Cohesion: 0.12
Nodes (16): Also needed, Memeora Skiper-based components, Packages, src/components/landing/card-stack.tsx, src/components/landing/expand-cards.tsx, src/components/landing/frame-zoom.tsx, src/components/landing/parallax-gallery.tsx, src/components/landing/preloader.tsx (+8 more)

### Community 49 - "UX Guide: Universal Principles for Interface Behavior, Feedback and Trust"
Cohesion: 0.12
Nodes (15): 16. Evidence gaps and open questions, 18. Provenance and method, About this guide, Claims that remain unresolved, Consolidation method, Contents, Context-dependent product questions, Evidence coverage limits (+7 more)

### Community 52 - "2. Laws and principles, precisely"
Cohesion: 0.13
Nodes (15): 2. Laws and principles, precisely, Autonomy, competence and intrinsic motivation, Fitts's Law: target acquisition in context, Gamification: element-specific and context-specific, Habit formation and voluntary return cues, Hick-Hyman Law: response uncertainty, not a universal item limit, Jakob's Law: familiarity without cloning, Labor illusion: visible genuine effort can affect perceived value (+7 more)

### Community 53 - "Layout.tsx"
Cohesion: 0.13
Nodes (22): ChevronDown, FileCode, LogOut, Menu, Moon, Sun, TriangleAlert, X (+14 more)

### Community 54 - "UI Guide: Universal Principles for Visual Composition, Components and Motion"
Cohesion: 0.15
Nodes (12): 1. The role of UI and its relationship with UX.md, 21. Standards and adjustable starting points, 26. Evidence coverage and remaining choices, 27. Sources, About this guide, Accessibility reference, Choices that remain product-specific, Contents (+4 more)

### Community 55 - "7. Interaction feedback, errors, forms and reversibility"
Cohesion: 0.15
Nodes (13): 7. Interaction feedback, errors, forms and reversibility, Button and control states, Central hypothesis, Complete state coverage, Disabled controls and the validation contradiction, Feedback placement by scope and consequence, Forms: clear before, patient during, helpful after, Interaction-state reference (+5 more)

### Community 56 - "invoices.ts"
Cohesion: 0.18
Nodes (16): formatAmount(), getAsset(), listAssets(), resolveAsset(), merchantProfile(), createInvoice(), csvCell(), Invoice (+8 more)

### Community 57 - "17. Iconography, motion and interaction polish"
Cohesion: 0.17
Nodes (12): 17. Iconography, motion and interaction polish, Choose easing and springs by purpose and frequency, Constrain three-dimensional and immersive effects, Design hover intent and direct manipulation, Keep pressed feedback geometrically honest, Make motion geometry explain origin and destination, Protect the attention budget, Provide meaningful reduced-motion alternatives (+4 more)

### Community 58 - "1. Foundations: UX versus UI, task-first thinking, contextual principles, complete-state thinking"
Cohesion: 0.17
Nodes (12): 1. Foundations: UX versus UI, task-first thinking, contextual principles, complete-state thinking, Begin with the task, not the screen, Core takeaways, Define scope and truth boundaries, Independence belongs to the task, Reversibility and consequence shape feedback, Simplicity means reducing useful effort, Standards are floors, not complete comfort targets (+4 more)

### Community 59 - "16. Component states and visible feedback"
Cohesion: 0.18
Nodes (11): 16. Component states and visible feedback, Confirmation versus Undo, Disabled, pending, cancellation and repeated activation, Empty, error and success feedback, Field anatomy: instruction, format, validation and recovery, Forced colors must preserve behavioral truth, Give every state a distinct meaning, Loading without invented waiting (+3 more)

### Community 60 - "11. Speed, stability and resilience"
Cohesion: 0.20
Nodes (10): 11. Speed, stability and resilience, Cached content and refresh, Choose feedback by the kind of wait, Core Web Vitals, Immediate state and optimistic UI, Partial loading and meaningful failure boundaries, Recovery is part of the experience, Stable layout and honest progress (+2 more)

### Community 61 - "19. Semantic tokens and component contracts"
Cohesion: 0.22
Nodes (9): 19. Semantic tokens and component contracts, Add motion and visual performance to the contract, Define contracts beyond screenshots, Give reusable components an implementation contract, Include visual grammar in each component contract, Keep primitive, semantic and component tokens in three layers, Make the visual-direction specification descriptive, Separate meaning from raw values (+1 more)

### Community 62 - "3. Grid, alignment, spacing and density"
Cohesion: 0.22
Nodes (9): 3. Grid, alignment, spacing and density, Align optically after aligning mathematically, Define density as information per decision, Make spacing express hierarchy, Preserve scanning during responsive change, Review structure systematically, Start with an illustrative grid, then tune it, Use a coherent shape grammar (+1 more)

### Community 63 - "18. Image, font and layout performance"
Cohesion: 0.25
Nodes (8): 18. Image, font and layout performance, Batch measurement, event and scroll work, Do not assume transforms are free, Make font loading a visible contract, Reserve media space before content arrives, Reveal progressively without destabilizing the surface, Skip rendering in long collections carefully, Treat image reservation, decoding and fallback as one contract

### Community 64 - "20. Surface-level visual reference by screen type"
Cohesion: 0.25
Nodes (8): 20. Surface-level visual reference by screen type, Browse or listing surface, Comparison surface, Detail view, Entry or overview surface, Review-and-confirm step, Saved collection, Search results surface

### Community 65 - "25. Component sourcing, library evaluation, implementation craft and browser review"
Cohesion: 0.25
Nodes (8): 25. Component sourcing, library evaluation, implementation craft and browser review, A universal component-library evaluation framework, Apply utility-first adoption rules, Build components as semantic contracts, Classify findings and make the smallest credible fix, Make browser review deterministic, Treat catalogs and generators as candidate sources, Verify behavior alongside screenshots

### Community 66 - "10. Accessibility and mobile usability"
Cohesion: 0.25
Nodes (8): 10. Accessibility and mobile usability, Contrast, focus and motion, Device, input, viewport and locale, Fitts's Law in context, Keyboard, screen readers and status messages, Operability across interaction modes, Target size and spacing, Whole-card activation, nested targets and pointer cancellation

### Community 67 - "3. Discovery: navigation, search, filtering and sorting"
Cohesion: 0.25
Nodes (8): 3. Discovery: navigation, search, filtering and sorting, Breadth, loading and result integrity, Comparable item information, Filtering and sorting as shared state, Match entry routes to starting intent, Navigation structure, No results and relaxed results, Search behavior and query support

### Community 68 - "4. Decision support and choice architecture"
Cohesion: 0.25
Nodes (8): 4. Decision support and choice architecture, Allocate complexity without removing informed choice, Defaults, preselection and user control, Design for confidence, not only action, Preserve autonomy and reversibility, Progressive disclosure by surface, Support different levels of expertise and certainty, Treat overload as conditional

### Community 69 - "11. Navigation, search and listings"
Cohesion: 0.29
Nodes (7): 11. Navigation, search and listings, A familiar global frame, Enter, input composition and request timing, Links, buttons and card interaction, Listing composition and complete states, Make exploration state readable, Search field and suggestions

### Community 70 - "14. Responsive composition and mobile robustness"
Cohesion: 0.29
Nodes (7): 14. Responsive composition and mobile robustness, Change composition in response to content pressure, Focus and scroll ownership are part of responsive layout, Keep scroll affordances truthful, Reflow, resize and long copy, Safe areas, browser controls and the software keyboard, Touch, mouse and hybrid input

### Community 71 - "15. Overlays, tabs and accordions"
Cohesion: 0.29
Nodes (7): 15. Overlays, tabs and accordions, Autocomplete and gallery overlays, Backdrops communicate but do not implement modality, Choose a surface by its role, Modal and non-modal state grammar, Tabs and accordions use different interaction grammars, Tooltips provide supplementary help

### Community 72 - "24. Design libraries and a coherent original direction"
Cohesion: 0.29
Nodes (7): 24. Design libraries and a coherent original direction, Adapt a template by taking its grammar, not its shell, Compare axes before naming styles, Compare directions with representative content, Declare theme scope and migrate deliberately, Use a reference corpus as a possibility space, Use visual families as comparison vocabulary

### Community 73 - "2. Visual hierarchy and original identity"
Cohesion: 0.29
Nodes (7): 2. Visual hierarchy and original identity, Balance images and text, Budget novelty and visual tension, Define the attention contract, Group by relationship, not by decoration, Preserve familiarity while building identity, Treat bold and quiet as relational qualities

### Community 74 - "4. Typography and reading comfort"
Cohesion: 0.29
Nodes (7): 4. Typography and reading comfort, Build hierarchy with more than size, Control measure, wrapping and text growth, Define roles by purpose, Load fonts without destabilizing content, Select by glyphs and metrics, Tune leading and tracking for the rendered role

### Community 75 - "5. Color, contrast, surfaces and themes"
Cohesion: 0.29
Nodes (7): 5. Color, contrast, surfaces and themes, Build perceptual ramps and semantic tokens, Define semantic color before pigments, Establish a complete theme policy, Give surfaces distinct jobs, Test rendered contrast pairs, Use color to support, not replace, action hierarchy

### Community 76 - "6. Numbers, currency, units and locale"
Cohesion: 0.29
Nodes (7): 6. Numbers, currency, units and locale, Choose numeral styles for the task, Format values through locale data, Make numeric layouts resilient, Preserve meaning in columns and speech, Space numeric relationships deliberately, Treat a number as a semantic statement

### Community 77 - "9. Detail views, galleries and option selection"
Cohesion: 0.29
Nodes (7): 9. Detail views, galleries and option selection, Gallery navigation and visual inspection, Information order in the first view, Media order and cardinality, One connected state for option-dependent content, Option controls and discoverable ranges, Specifications and secondary sections

### Community 78 - "13. Truthful interfaces: what a UI can and cannot claim"
Cohesion: 0.29
Nodes (7): 13. Truthful interfaces: what a UI can and cannot claim, Capability boundaries must be structural, Confirmation, arithmetic and dependent state must agree, Disclose limitations where users encounter them, Label sample, fictional and provisional content, Persistence and personal data must be described accurately, Truth is an interaction-wide requirement

### Community 79 - "14. Measurement and evaluation"
Cohesion: 0.29
Nodes (7): 14. Measurement and evaluation, Combine quantitative and qualitative review, Define questions before treating observations as results, Evaluate experiments as experiments, HEART is a set of categories, not a universal score, Observe beyond the happy path, Preserve distinctions between signals and outcomes

### Community 80 - "10. Ratings, social proof, promotional and third-party content"
Cohesion: 0.33
Nodes (6): 10. Ratings, social proof, promotional and third-party content, Availability without false urgency, Honest ratings and social proof, Promotional content as explanation, Review and endorsement integrity, Third-party and provider hierarchy

### Community 81 - "12. Filters, sorting and comparison"
Cohesion: 0.33
Nodes (6): 12. Filters, sorting and comparison, Comparison on narrow screens, Comparison table composition, Context-aware filters, Honest overflow, Persistent comparison selection

### Community 82 - "13. Summaries, multi-step flows and irreversible actions"
Cohesion: 0.33
Nodes (6): 13. Summaries, multi-step flows and irreversible actions, A running summary is a reconciled state, Quantity, value editing and pending arithmetic, Reversible removal and irreversible commitment, Review and confirmation in multi-step flows, Summary layout and state coverage

### Community 83 - "23. From reference to original interface"
Cohesion: 0.33
Nodes (6): 23. From reference to original interface, Be honest about assets and fonts, Decompose from macro to micro, Record responsive behavior as hypotheses, Transfer the DNA, not the dress, Treat a reference as evidence, not as a picture

### Community 84 - "7. Imagery, media and art direction"
Cohesion: 0.33
Nodes (6): 7. Imagery, media and art direction, Alternative text and accessible media controls, Coherence without forced sameness, Generated and altered imagery, Responsive frames, loading and failure, Type-aware framing, crop and background

### Community 85 - "8. Cards, list items and collections"
Cohesion: 0.33
Nodes (6): 8. Cards, list items and collections, Fixed slots with type-aware information, Grid, list and collection rhythm, Key values, options and pending state, The visual job of a card, Truncation, density and badge restraint

### Community 86 - "12. Surface archetypes: a UX reference by screen type"
Cohesion: 0.33
Nodes (6): 12. Surface archetypes: a UX reference by screen type, Detail and conditional-rule surfaces, Entry, browse and search surfaces, Guided discovery and comparison, Review, read-only history and reset surfaces, Saved items, local history and pending selections

### Community 87 - "5. First impressions, visual identity and perceived quality"
Cohesion: 0.33
Nodes (6): 5. First impressions, visual identity and perceived quality, A coherent and original identity, Control states as a quality signal, Evaluate appearance and usability separately, Motion should explain change, Perceived responsiveness

### Community 88 - "db.ts"
Cohesion: 0.19
Nodes (7): Engine, getEngine(), migrate(), postgres(), Row, sqlite(), Table

### Community 89 - "22. Visual review checklist"
Cohesion: 0.40
Nodes (5): 22. Visual review checklist, Components and behavior, Composition and identity, Content and capability truth, Responsive and readable

### Community 90 - "15. UX review checklist"
Cohesion: 0.40
Nodes (5): 15. UX review checklist, Act and understand, Find and decide, Use comfortably and trust, Wait and recover

### Community 91 - "8. Engagement and return loops without compulsion"
Cohesion: 0.40
Nodes (5): 8. Engagement and return loops without compulsion, Habit support without coercion, Notifications and re-engagement, Saved state and continuity, Separate useful engagement from compulsion

### Community 93 - "guard.ts"
Cohesion: 0.27
Nodes (7): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, refuseReason(), runOnce(), local

### Community 94 - "near.ts"
Cohesion: 0.21
Nodes (10): AccountTx, AccountTxPage, AccountView, RpcError, rpcQuery(), TIMEOUT_MS, PAYLOAD, SPKI_ED25519 (+2 more)

### Community 95 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 96 - "Pay.tsx"
Cohesion: 0.12
Nodes (25): Flag, useToast(), HEADLINE, plain(), ReportForm(), SafetyPanel(), AccountLink(), NetworkTag() (+17 more)

### Community 97 - "checkout.ts"
Cohesion: 0.17
Nodes (12): createCheckout(), DONE, EVM_CHAIN_IDS, isDone(), oneClick(), overallStatus(), PayToken, payTokens() (+4 more)

### Community 103 - "9. Dark patterns, honest persuasion and regulatory context"
Cohesion: 0.50
Nodes (4): 9. Dark patterns, honest persuasion and regulatory context, A practical taxonomy and honest alternatives, Regulatory context across jurisdictions, What the evidence does and does not establish

## Knowledge Gaps
- **20 isolated node(s):** `Allow`, `Block`, `Warn`, `Executed`, `Executing` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 687 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `check.ts` to `near-sign-verify`, `types.ts`, `config.ts`, `package.json`, `setup-testnet.ts`, `linkKey.ts`, `main.tsx`, `assets.ts`, `demo.ts`, `merchants.ts`, `dependencies`, `sends.ts`, `dependencies`, `vaults.ts`, `near.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Vault` (e.g. with `pay()` and `setup()`) actually correct?**
  _`Vault` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Allow`, `Block`, `Warn` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.0625694187338023 - nodes in this community are weakly interconnected._
- **Why does `Signals, data sources and their limits` connect `signals/index.ts` to `Notara`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `registry/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.09398496240601503 - nodes in this community are weakly interconnected._
- **Why does `Notara` connect `Notara` to `signals/index.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._