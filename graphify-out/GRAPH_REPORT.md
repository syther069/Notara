# Graph Report - near  (2026-11-10)

## Corpus Check
- 255 files · ~772,876 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 255 file(s) not represented in the graph (top: (none) 177, .css 33, .binarypb 18)
- WARNING: 255 of 715 files seen (36%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 3804 nodes · 8944 edges · 209 communities (179 shown, 30 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 302 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b5ec16e3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vault
- registry/src/lib.rs
- tests.rs
- lib/wallet.tsx
- 4. Core components
- package.json
- web/package.json
- lib
- 17. Source and evidence register
- linkKey.ts
- evm.ts
- Notara: Architecture
- profile.tsx
- Phase B: build for real use
- demo.ts
- signals/index.ts
- server/index.ts
- assets/effects/fx.js
- Notara: Product Requirements (PRD)
- VaultConsole.tsx
- Send.tsx
- near-api-js
- Notara
- scripts
- compilerOptions
- Build plan: trusted payment links on NEAR
- compilerOptions
- icons.mjs
- photos.mjs
- vaults.ts
- web/package.json
- consistency.mjs
- build.js
- Notara: Project Rules
- start.mjs
- config.ts
- NEAR Hackathon: rules we build against
- CLAUDE.md
- .claude/CLAUDE.md
- icons.tsx
- agentspend-registry
- agentspend-vault
- assets.ts
- bake.mjs
- vercel.json
- Memeora Skiper-based components
- UX Guide: Universal Principles for Interface Behavior, Feedback and Trust
- deploy-contracts.sh
- 2. Laws and principles, precisely
- cn
- UI Guide: Universal Principles for Visual Composition, Components and Motion
- 7. Interaction feedback, errors, forms and reversibility
- copy-lint.mjs
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
- print3d.js
- 22. Visual review checklist
- 15. UX review checklist
- 8. Engagement and return loops without compulsion
- gate.mjs
- guard.ts
- photo.js
- scripts
- Layout.tsx
- moments.mjs
- _demo/shoot.mjs
- perf.mjs
- diagram.js
- split-reveal/object.js
- system.js
- effects.mjs
- ui.js
- scripts/shoot.mjs
- animation.ts
- kit.js
- mountPrint
- scenes/lib.js
- Diagram
- assets/moments/lib.js
- Registry
- check.mjs
- assets/motion/motion.js
- vault/src/lib.rs
- photoGL
- norm
- runWidth
- clamp
- make-posters.mjs
- sleep
- deal.mjs
- bakeDraw
- Copy registers
- share-sheet.tsx
- product-render/auto.js
- mountProduct
- pick.mjs
- auto
- layout.js
- stage
- ref_node_url
- Cards
- 4. Place
- System
- use-fluid-hover.ts
- .build
- pick.js
- Effects beyond backgrounds
- Photographs
- Copy moves
- die
- Features
- Motion
- readJson
- s
- Layout: one section per screen, equal edges, heroes, type
- PaymentStatus
- Big scenes
- Copy
- Copy voice
- Effects usage
- block
- refsOf
- Category
- r1
- Diagrams
- sections-library.md
- Photographs, rooms, services and people
- nearpay.ts
- guide.ts
- photo-dither/object.js
- scenes.js
- Copy tells
- check.ts
- Moments
- Sections for a kind of content
- browserChecks
- Effects
- _print-core/auto.js
- load
- Backgrounds
- applyFlags
- staticChecks
- opt
- lerp
- picture-develops/moment.js
- Price and questions
- Footers
- Page plans
- Navigation
- About this guide
- Performance budget
- Closes
- Status
- shaderLint
- manifest.json
- 18. Provenance and method
- photo-chapters/moment.js
- Decision
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }

## God Nodes (most connected - your core abstractions)
1. `lib()` - 148 edges
2. `cn()` - 97 edges
3. `handle()` - 52 edges
4. `react` - 51 edges
5. `sel()` - 48 edges
6. `GetPaidPage()` - 47 edges
7. `DirectMode()` - 46 edges
8. `useWallet()` - 45 edges
9. `shown()` - 45 edges
10. `inFixed()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `3.0 Theme: premium fintech, forest and cream (redesign, 2026-11-10)` --references--> `surface()`  [INFERRED]
  design.md → .claude/skills/design-taste-frontend/scripts/consistency.mjs
- `Software` --references--> `chat()`  [INFERRED]
  .claude/skills/design-taste-frontend/references/sections-library.md → agent/src/agent.ts
- `1. First real payment through a link [S] 💰` --references--> `ensureUsdcStorage()`  [INFERRED]
  IMPLEMENTATION.md → server/sends.ts
- `10. Implementation notes` --references--> `MarketingShell()`  [INFERRED]
  design.md → web/src/components/shell/MarketingShell.tsx
- `The fragment on it` --references--> `chat()`  [INFERRED]
  .claude/skills/design-taste-frontend/references/cards.md → agent/src/agent.ts

## Import Cycles
- None detected.

## Communities (209 total, 30 thin omitted)

### Community 0 - "Vault"
Cohesion: 0.14
Nodes (8): AssetCap, Config, event(), FungibleToken, Payment, validate_asset(), Vault, Verdict

### Community 1 - "registry/src/lib.rs"
Cohesion: 0.17
Nodes (16): acc(), bond_required(), cannot_self_report(), ctx(), dispute_cannot_lift_a_verified_report(), dispute_marks_an_unverified_report_disputed(), file(), MAX_DISPUTES_PER_REPORT (+8 more)

### Community 2 - "tests.rs"
Cohesion: 0.20
Nodes (44): acc(), agent_cannot_approve_its_own_warn(), agent_cannot_be_proposed_as_owner(), agent_cannot_propose_owner(), agent_cannot_raise_caps(), agent_cannot_swap_signer_key(), allow_executes_and_reserves_daily(), attacker() (+36 more)

### Community 3 - "lib/wallet.tsx"
Cohesion: 0.06
Nodes (33): AppProviders(), storedTheme(), systemDark(), Ctx, EVM_WALLET_ID, EXCLUDED, failureReason(), FEATURES (+25 more)

### Community 4 - "4. Core components"
Cohesion: 0.06
Nodes (32): 1. Design goals, 2. Personality and tone, 3.0 Theme: premium fintech, forest and cream (redesign, 2026-11-10), 3.2 Typography, 3.3 Spacing, shape, elevation, 3.4 Icons, 3.5 Motion, 3. Visual language (+24 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (19): description, devDependencies, esbuild@0.28.2, tsx@4.23.15, @types/node@^22.15.0, typescript@5.9.3, engines, node (+11 more)

### Community 6 - "web/package.json"
Cohesion: 0.18
Nodes (11): @tailwindcss/vite, @types/react, @types/react-dom, vite, @vitejs/plugin-react, @tailwindcss/vite@^4.3.5, devDependencies, @types/react@19.3.0 (+3 more)

### Community 7 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 8 - "17. Source and evidence register"
Cohesion: 0.07
Nodes (30): 10. The Role of Animation and Motion in UX: Nielsen Norman Group, 11. Response Times: The Three Important Limits: Nielsen Norman Group, 12. Product Page UX: Provide at Least One In-Scale Image: Baymard, 13. Use Delivery Date, Not Shipping Speed: Baymard, 14. The Effect of Electronic Word of Mouth on Sales: A Meta-Analytic Review, 15. Final Rule Banning Fake Reviews and Testimonials: FTC Announcement, 16. WCAG 2.2 SC 2.5.8: Target Size (Minimum): W3C, 17. Source and evidence register (+22 more)

### Community 9 - "linkKey.ts"
Cohesion: 0.20
Nodes (14): usdc(), fromFragment(), fromSecret(), isValidNewName(), LinkKey, newLinkKey(), SEND_LINK_DAYS, toFragment() (+6 more)

### Community 10 - "evm.ts"
Cohesion: 0.50
Nodes (6): erc20TransferData(), eth(), evmAccount(), evmPay(), hasEvmWallet(), pad()

### Community 11 - "Notara: Architecture"
Cohesion: 0.08
Nodes (23): 10. Future work (not in v1), 1. The big picture, 2.1 Vault contract (`contracts/vault`, Rust, near-sdk 5.30), 2.2 Registry contract (`contracts/registry`, Rust), 2.3 Notara (`passport/src`, TypeScript), 2.4 Agent (`agent/src`, TypeScript), 2.5 Website (`web/`, built), 2.6 Backend (`server/`, built) (+15 more)

### Community 12 - "profile.tsx"
Cohesion: 0.09
Nodes (47): FundsPanel(), LINK_ICON, LINK_PLACEHOLDER, LinkChip(), ProfileEditor(), SectionTitle(), squareImage(), Hint() (+39 more)

### Community 13 - "Phase B: build for real use"
Cohesion: 0.11
Nodes (18): 10. Security page [S], 11. Lock, fresh-clone test, docs [S] 💰, 1. First real payment through a link [S] 💰, 2. Real wallet signature on a payment link + smoother network switch [S] 💰, 3. Pay directly from a NEAR wallet [M], 4. Real Send-by-link test [S] 💰, 5. Mainnet report registry + "Report this link" [M] 💰, 8. New home page [M] (+10 more)

### Community 14 - "demo.ts"
Cohesion: 0.08
Nodes (45): AgentRun, callPay(), env(), ENV_FILE, llmConfigured(), pickModel(), runAgent(), toolResult() (+37 more)

### Community 15 - "signals/index.ts"
Cohesion: 0.16
Nodes (32): loadDeployment(), Policy, accountTxs(), daysSince(), nsToIso(), postJson(), transactions(), evaluate() (+24 more)

### Community 16 - "server/index.ts"
Cohesion: 0.06
Nodes (73): 6. Database instead of JSON files [M] 🗄️, 7. Public mode: no admin keys on a public server [M], usdcFor(), load(), createCheckout(), DONE, EVM_CHAIN_IDS, isDone() (+65 more)

### Community 17 - "assets/effects/fx.js"
Cohesion: 0.05
Nodes (72): BASE_UNIFORMS, CALM_SPOTS, clamp(), color, compile(), compose(), config, cssToHex() (+64 more)

### Community 18 - "Notara: Product Requirements (PRD)"
Cohesion: 0.11
Nodes (17): 10. Timeline, 1. One-line summary, 2. The problem, 3. Who it is for, 4. The solution, 5. Goals and non-goals, 6.1 Home (`/`), 6.2 Check an account (`/check`) (+9 more)

### Community 19 - "VaultConsole.tsx"
Cohesion: 0.08
Nodes (57): react-router-dom, Bot, Check, Download, ExternalLink, Pause, Play, Search (+49 more)

### Community 20 - "Send.tsx"
Cohesion: 0.08
Nodes (100): @heroui/react, AmountInput(), DeviceStage(), DrawnCheck(), useDebounced(), usePrefs(), EmptyArt(), STATUS_HINT (+92 more)

### Community 21 - "near-api-js"
Cohesion: 0.05
Nodes (36): dependencies, borsh@2.0.0, near-api-js@7.4.0, near-sign-verify@0.4.5, @neondatabase/serverless@1.2.0, borsh, near-sign-verify, @neondatabase/serverless (+28 more)

### Community 22 - "Notara"
Cohesion: 0.15
Nodes (12): Function-call keys: what they do and don't protect, Honest limits, Implemented vs planned, Layout, Live site (Vercel), Notara, Run it, The website (+4 more)

### Community 23 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, agent, check, demo, owner, passport, serve, setup:testnet (+6 more)

### Community 24 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 25 - "Build plan: trusted payment links on NEAR"
Cohesion: 0.14
Nodes (13): Build plan: trusted payment links on NEAR, Honesty rules for the pitch, Merchant experience, Not doing, Owner tasks, P0: must ship, P1: in this order, if time allows, Payment (+5 more)

### Community 26 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 27 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 28 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 29 - "vaults.ts"
Cohesion: 0.19
Nodes (18): agent(), createVisitorVault(), factory(), getVisitorVault(), isAccountId(), isVisitorVault(), MAX_VAULTS_PER_DAY, net (+10 more)

### Community 30 - "web/package.json"
Cohesion: 0.07
Nodes (38): class-variance-authority, clsx, cmdk, gsap, @heroui/styles, @hot-labs/near-connect, iconoir-react, qrcode (+30 more)

### Community 31 - "consistency.mjs"
Cohesion: 0.03
Nodes (58): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+50 more)

### Community 32 - "build.js"
Cohesion: 0.08
Nodes (50): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+42 more)

### Community 33 - "Notara: Project Rules"
Cohesion: 0.22
Nodes (8): 1. Safety and approvals (hard rules), 2. Honesty rules (what we claim), 3. Security design rules, 4. Code rules, 5. Testing rules, 6. Git and workflow rules, 7. Priority order when time is short, Notara: Project Rules

### Community 34 - "start.mjs"
Cohesion: 0.05
Nodes (46): Product, ALIAS, allTypes, args, axisOrder(), axisVal(), block(), buttonInk() (+38 more)

### Community 35 - "config.ts"
Cohesion: 0.11
Nodes (34): accountFromKey(), hasKey(), keyPath(), readKey(), writeKey(), toUnits(), nearAmount(), AccountTx (+26 more)

### Community 36 - "NEAR Hackathon: rules we build against"
Cohesion: 0.50
Nodes (3): NEAR Hackathon: rules we build against, Submission requirements, Team rules for this repo

### Community 39 - "icons.tsx"
Cohesion: 0.05
Nodes (58): 10. Implementation notes, IconButton(), Sheet(), order(), WalletChip(), WalletModal(), BadgeCheck, Bell (+50 more)

### Community 45 - "assets.ts"
Cohesion: 0.10
Nodes (29): AssetInfo, formatAmount(), formatUnits(), getAsset(), linkNetwork(), listAssets(), resolveAsset(), USDC_MAINNET (+21 more)

### Community 46 - "bake.mjs"
Cohesion: 0.05
Nodes (47): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+39 more)

### Community 47 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 48 - "Memeora Skiper-based components"
Cohesion: 0.12
Nodes (16): Also needed, Memeora Skiper-based components, Packages, src/components/landing/card-stack.tsx, src/components/landing/expand-cards.tsx, src/components/landing/frame-zoom.tsx, src/components/landing/parallax-gallery.tsx, src/components/landing/preloader.tsx (+8 more)

### Community 49 - "UX Guide: Universal Principles for Interface Behavior, Feedback and Trust"
Cohesion: 0.12
Nodes (16): 16. Evidence gaps and open questions, 6. Understanding, confidence and trust, 9. Dark patterns, honest persuasion and regulatory context, A practical taxonomy and honest alternatives, Claims that remain unresolved, Contents, Context-dependent product questions, Evidence coverage limits (+8 more)

### Community 52 - "2. Laws and principles, precisely"
Cohesion: 0.13
Nodes (15): 2. Laws and principles, precisely, Autonomy, competence and intrinsic motivation, Fitts's Law: target acquisition in context, Gamification: element-specific and context-specific, Habit formation and voluntary return cues, Hick-Hyman Law: response uncertainty, not a universal item limit, Jakob's Law: familiarity without cloning, Labor illusion: visible genuine effort can affect perceived value (+7 more)

### Community 53 - "cn"
Cohesion: 0.04
Nodes (114): @base-ui/react, motion, react, FlowChart(), money(), path(), Sparkline(), PagePreview() (+106 more)

### Community 54 - "UI Guide: Universal Principles for Visual Composition, Components and Motion"
Cohesion: 0.15
Nodes (12): 1. The role of UI and its relationship with UX.md, 21. Standards and adjustable starting points, 26. Evidence coverage and remaining choices, 27. Sources, About this guide, Accessibility reference, Choices that remain product-specific, Contents (+4 more)

### Community 55 - "7. Interaction feedback, errors, forms and reversibility"
Cohesion: 0.15
Nodes (13): 7. Interaction feedback, errors, forms and reversibility, Button and control states, Central hypothesis, Complete state coverage, Disabled controls and the validation contradiction, Feedback placement by scope and consequence, Forms: clear before, patient during, helpful after, Interaction-state reference (+5 more)

### Community 56 - "copy-lint.mjs"
Cohesion: 0.07
Nodes (47): APART, args, attrOf(), BLOCK, brandsOf(), CAST, CAST_CO, clip() (+39 more)

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

### Community 88 - "print3d.js"
Cohesion: 0.06
Nodes (40): acquire(), atlas, CELL, colMajor(), COMMON_PARAMS, config, cross(), DEFAULT_PALETTE (+32 more)

### Community 89 - "22. Visual review checklist"
Cohesion: 0.40
Nodes (5): 22. Visual review checklist, Components and behavior, Composition and identity, Content and capability truth, Responsive and readable

### Community 90 - "15. UX review checklist"
Cohesion: 0.40
Nodes (5): 15. UX review checklist, Act and understand, Find and decide, Use comfortably and trust, Wait and recover

### Community 91 - "8. Engagement and return loops without compulsion"
Cohesion: 0.40
Nodes (5): 8. Engagement and return loops without compulsion, Habit support without coercion, Notifications and re-engagement, Saved state and continuity, Separate useful engagement from compulsion

### Community 92 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 93 - "guard.ts"
Cohesion: 0.27
Nodes (7): busy, Headers, LOCAL_HOSTS, LOCAL_ONLY, refuseReason(), runOnce(), local

### Community 94 - "photo.js"
Cohesion: 0.07
Nodes (39): fx, analyse(), analyses, BASE, bestSrc(), clamp(), creditsBlock(), escHTML() (+31 more)

### Community 95 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 96 - "Layout.tsx"
Cohesion: 0.05
Nodes (91): coverageLine(), isFixture(), SignalRow(), SignalsPanel(), SOURCE, VERDICT, CheckResult(), DecisionCard() (+83 more)

### Community 97 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 98 - "_demo/shoot.mjs"
Cohesion: 0.11
Nodes (32): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+24 more)

### Community 99 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 100 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, CAPS, clamp(), cleanName(), ease(), h(), iconCache, iconMeta (+19 more)

### Community 101 - "split-reveal/object.js"
Cohesion: 0.19
Nodes (28): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+20 more)

### Community 102 - "system.js"
Cohesion: 0.11
Nodes (31): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+23 more)

### Community 103 - "effects.mjs"
Cohesion: 0.11
Nodes (24): args, buildIndex(), checkFilters(), commands, ENUMS, FX, gallery(), INDEX (+16 more)

### Community 104 - "ui.js"
Cohesion: 0.10
Nodes (26): addPause(), AGAIN, bakeQueue, BASE, boxes, boxOf(), cache, css (+18 more)

### Community 105 - "scripts/shoot.mjs"
Cohesion: 0.09
Nodes (22): tilesMod, args, call(), child, defaultProfile(), guard, HEIGHTS, jumpTo() (+14 more)

### Community 106 - "animation.ts"
Cohesion: 0.08
Nodes (23): DURATION, DURATION_INSTANT, EASE_IN_OUT, EASE_LINEAR, EASE_OUT, EasingCurve, FOCUS_RING_TRANSITION, LOOP_CLASS (+15 more)

### Community 107 - "kit.js"
Cohesion: 0.08
Nodes (22): baseURI(), config, credit(), creditEntry(), cssHex(), GLSL_BUILTINS, GLSL_FUTURE, GLSL_KEYWORDS (+14 more)

### Community 108 - "mountPrint"
Cohesion: 0.19
Nodes (25): isDarkPaper(), mountPrint(), adapt(), advance(), applyNarrow(), ensureGlyphs(), fit(), frameEmpty() (+17 more)

### Community 109 - "scenes/lib.js"
Cohesion: 0.09
Nodes (23): clamp(), coarse(), ease, fitLine(), fontsReady(), gl(), glBudget, glslCheck() (+15 more)

### Community 110 - "Diagram"
Cohesion: 0.15
Nodes (3): Diagram, normalise(), restFrame()

### Community 111 - "assets/moments/lib.js"
Cohesion: 0.11
Nodes (14): clamp(), ease, phone(), reduced(), scrub(), still(), stillWhy(), BASE (+6 more)

### Community 112 - "Registry"
Cohesion: 0.22
Nodes (5): check_text(), Dispute, event(), Registry, Report

### Community 113 - "check.mjs"
Cohesion: 0.09
Nodes (19): args, child, chrome, defaultProfile(), guard, here, { heroes }, kill() (+11 more)

### Community 114 - "assets/motion/motion.js"
Cohesion: 0.19
Nodes (19): boxOf(), counts(), enter(), enterSteps(), fontsIn(), hostOf(), init(), jump() (+11 more)

### Community 115 - "vault/src/lib.rs"
Cohesion: 0.12
Nodes (8): CALLBACK_GAS, DOMAIN, ed25519_bytes(), FT_TRANSFER_GAS, MS_PER_DAY, NEAR_ASSET, PENDING_OWNER_KEY, Spent

### Community 116 - "photoGL"
Cohesion: 0.19
Nodes (18): mount(), params, mount(), params, makeTexture(), photoGL(), adapt(), bindTextures() (+10 more)

### Community 117 - "norm"
Cohesion: 0.14
Nodes (19): addressMod, areaMod, basicsMod, CDP, copyChecks(), copyTerms(), holds(), holdsAny() (+11 more)

### Community 118 - "runWidth"
Cohesion: 0.12
Nodes (23): auditFindings(), bySev(), clean(), clusterLooks(), extrasFindings(), groupLike(), groupSame(), invertedLook() (+15 more)

### Community 119 - "clamp"
Cohesion: 0.19
Nodes (20): clamp(), cssHex(), filmicInv(), filmicJs(), fromOklab(), gam22(), groundPalette(), hexRgb() (+12 more)

### Community 120 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 121 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 122 - "deal.mjs"
Cohesion: 0.15
Nodes (16): args, darkIds(), dealOnce(), draw(), fits(), HAS, here, hero (+8 more)

### Community 123 - "bakeDraw"
Cohesion: 0.18
Nodes (16): bakeDpr(), bakeDraw(), bakeOne(), grounds(), groundSpec(), liveOn(), mountAt(), nextBake() (+8 more)

### Community 124 - "Copy registers"
Cohesion: 0.12
Nodes (15): 0. The model's default (the one to avoid), 10. Refusal and narrowness, 11. The product as the hero, 12. Hurried and conversational, 1. Facts only, 2. Technical and dry, with proof, 3. The founder's letter, 4. Self-aware and playful (+7 more)

### Community 125 - "share-sheet.tsx"
Cohesion: 0.18
Nodes (16): react-dom, react-dom@19.3.1, Brand(), channels, getClientMountSnapshot(), getServerMountSnapshot(), Icon(), IconName (+8 more)

### Community 126 - "product-render/auto.js"
Cohesion: 0.21
Nodes (14): apply(), ATTRS, cache, claimed, json(), mountAll(), optsOf(), placeOf() (+6 more)

### Community 127 - "mountProduct"
Cohesion: 0.31
Nodes (15): mountProduct(), clearInner(), done(), layout(), measureStill(), mountLive(), palette(), renderStill() (+7 more)

### Community 128 - "pick.mjs"
Cohesion: 0.19
Nodes (11): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+3 more)

### Community 129 - "auto"
Cohesion: 0.13
Nodes (14): auto(), fallbackList(), mount(), presets(), Mount, GPU cost, Limits, Mount (+6 more)

### Community 130 - "layout.js"
Cohesion: 0.34
Nodes (13): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+5 more)

### Community 131 - "stage"
Cohesion: 0.33
Nodes (13): renderScale(), hasWebGL(), reducedMotion(), stage(), draw(), fallBack(), fit(), flatFrame() (+5 more)

### Community 132 - "ref_node_url"
Cohesion: 0.14
Nodes (10): files, here, glslProblems(), A new object, Do and don't, It always shows a picture, Light on a laptop GPU, Objects (`assets/objects/print-*`) (+2 more)

### Community 133 - "Cards"
Cohesion: 0.15
Nodes (13): loadAll(), plan(), startAll(), Cards, Edges and fades, Effects that are not backgrounds, Grounds, Motion (+5 more)

### Community 134 - "4. Place"
Cohesion: 0.14
Nodes (13): 1. Plan in screens, 2. The deal, 3. The plans, 4. Place, 5. Visuals, Designed variety without effects, Look, Order by trade (+5 more)

### Community 135 - "System"
Cohesion: 0.14
Nodes (13): Access, Base, Cards, lists and forms, Colour, Footer, Forms, Head, Motion (+5 more)

### Community 136 - "use-fluid-hover.ts"
Cohesion: 0.22
Nodes (9): ACTIVE_ATTR, ACTIVE_INDEX_ATTR, ItemRect, pickNearest(), PickNearestInput, resolveActivator(), useFluidHover(), UseFluidHoverOptions (+1 more)

### Community 137 - ".build"
Cohesion: 0.17
Nodes (6): axesOf(), geo(), kindOf(), kindOther(), Program(), s()

### Community 138 - "pick.js"
Cohesion: 0.28
Nodes (12): clashes(), dealable(), filterEffects(), fitsKind(), kindOf(), KINDS, parseSlot(), pick() (+4 more)

### Community 139 - "Effects beyond backgrounds"
Cohesion: 0.15
Nodes (12): A photograph with copy (`fx-photo`), Colour, Cost: light enough for a laptop's integrated GPU, Effects beyond backgrounds, Feature cards with inset panels (`fx-feature-card`), Objects in dither (`fx-dither-object`), Picking the effect, Street map of the place (`fx-map`) (+4 more)

### Community 140 - "Photographs"
Cohesion: 0.18
Nodes (11): creditsLine(), credits(), A product without photographs (PH-04), Credits and words (PH-38, CO-22), Live search (stand-ins for what the library lacks), Never, Photographs, Pick and fetch (+3 more)

### Community 141 - "Copy moves"
Cohesion: 0.17
Nodes (11): About and story, Buttons and the close, Copy moves, Features and how it works, Microcopy: where a voice is most welcome, Numbers and humour, Prices, FAQ, booking: the plain zone, Proof (+3 more)

### Community 142 - "die"
Cohesion: 0.27
Nodes (9): CDP, die(), findChrome(), inProject(), launch(), perf(), serve(), shot() (+1 more)

### Community 143 - "Features"
Cohesion: 0.24
Nodes (11): chat(), The fragment on it, app-frame, bento, chapter, Features, features-2x2, product-statement (+3 more)

### Community 144 - "Motion"
Cohesion: 0.18
Nodes (10): Loops inside a card's visual (tech), Motion, Never, Reduced motion, no script, phones, Scroll, Tech budget, The hero's entrance (every kind), The hover layer (+2 more)

### Community 145 - "readJson"
Cohesion: 0.43
Nodes (7): activeIn(), below(), dotOf(), findProject(), lastTouch(), traceFile(), unarmedPage()

### Community 147 - "Layout: one section per screen, equal edges, heroes, type"
Cohesion: 0.20
Nodes (9): 1. What the good sites do, 2. One section per screen, 3. The hero, 4. Equal edges and the grid, 5. Type, 6. The check, Layout: one section per screen, equal edges, heroes, type, The eleven heroes (+1 more)

### Community 148 - "PaymentStatus"
Cohesion: 0.29
Nodes (7): PaymentStatus, Executed, Executing, Expired, Failed, PendingApproval, Rejected

### Community 149 - "Big scenes"
Cohesion: 0.28
Nodes (8): css(), hold(), Big scenes, Check it, Its height (rule 3), Put one on the page, Rules, Who gets one

### Community 150 - "Copy"
Cohesion: 0.22
Nodes (8): Banned, Contacts the brief does not give, Copy, Five rules, Headlines and text, Plain versions, The copy layer, What may be assumed

### Community 151 - "Copy voice"
Cohesion: 0.22
Nodes (8): 1. The fact sheet, from the brief, 2. The voice card, 3. Shape from the reader's questions, 4. Draft, 5. The device budget, per page, 6. Check, Copy voice, Why model copy reads as model copy

### Community 152 - "Effects usage"
Cohesion: 0.22
Nodes (8): Deal the effect, never by taste, Deal the moments and the scene, Effects usage, Never, Tech budget, The gate (house rule 8), What each kind gets, Where things sit

### Community 153 - "block"
Cohesion: 0.26
Nodes (12): allow(), applyWaivers(), block(), errorReason(), guard, readJson(), readLedger(), record() (+4 more)

### Community 154 - "refsOf"
Cohesion: 0.22
Nodes (9): attrs(), cssRefs(), jsRefs(), kindOf(), local(), metas(), refsOf(), stripRef() (+1 more)

### Community 155 - "Category"
Cohesion: 0.33
Nodes (6): Category, Impersonation, MaliciousContract, Other, Phishing, Scam

### Community 156 - "r1"
Cohesion: 0.54
Nodes (8): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1(), The spec

### Community 157 - "Diagrams"
Cohesion: 0.25
Nodes (7): Diagrams, Icons: one resolver, run it last, Labels plain, Motion: one cycle of 2.5 to 4 s, Pick a layout and a preset, The builder page (the tool for building one fast), When a diagram, when a UI fragment

### Community 158 - "sections-library.md"
Cohesion: 0.25
Nodes (7): customer-proof-row, Heroes, logo-row, Proof, quote-stat, Section library, What every recipe assumes

### Community 159 - "Photographs, rooms, services and people"
Cohesion: 0.25
Nodes (8): line-up, peek-list, people-row, photo-band, photo-pair, Photographs, rooms, services and people, rooms-list, services-list

### Community 160 - "nearpay.ts"
Cohesion: 0.47
Nodes (4): fetchTx(), receivedInTx(), rpc(), tx

### Community 161 - "guide.ts"
Cohesion: 0.33
Nodes (5): GuideEntry, GuidePage, GUIDES, HELP, SHORTCUTS

### Community 162 - "photo-dither/object.js"
Cohesion: 0.43
Nodes (6): FLAT, inks(), mount(), params, blueNoise(), photoPalette()

### Community 163 - "scenes.js"
Cohesion: 0.38
Nodes (5): BASE, linked, mount(), mountAll(), start()

### Community 164 - "Copy tells"
Cohesion: 0.29
Nodes (6): Copy tells, First generation: the old tells (mostly avoided now; still checked), Not tells (leave them alone), Over-correction: what the rules themselves produce, Second generation: the tells now, Why it happens

### Community 165 - "check.ts"
Cohesion: 0.10
Nodes (28): Commands, How they sit, Icons, The violet rule (a judgement, stated), Where they come from, Which one, buildReport(), check() (+20 more)

### Community 166 - "Moments"
Cohesion: 0.29
Nodes (6): Check it, Moments, Put one on the page, Rules, The still rule (every moment, no exception), Where each fits

### Community 167 - "Sections for a kind of content"
Cohesion: 0.29
Nodes (7): booking-form, calendar-frame, integrations-grid, menu-in-type, Sections for a kind of content, timeline-rail, visit-map

### Community 168 - "browserChecks"
Cohesion: 0.33
Nodes (7): client-slots, browserChecks(), copyChecks(), errLine(), left(), parseJson(), rmProfile()

### Community 169 - "Effects"
Cohesion: 0.25
Nodes (7): Adding an effect, Commands, Effects, Random pick, The list, publish(), walk()

### Community 170 - "_print-core/auto.js"
Cohesion: 0.47
Nodes (5): claimed, json(), mountAll(), placeOf(), prints

### Community 171 - "load"
Cohesion: 0.40
Nodes (6): fetchText(), link(), load(), script(), start(), uniqueIds()

### Community 172 - "Backgrounds"
Cohesion: 0.33
Nodes (5): Backgrounds, Other kinds stay flat, Tech: code-drawn grounds, how they look, Tech: the CSS grounds, The three tokens (every kind)

### Community 173 - "applyFlags"
Cohesion: 0.40
Nodes (6): applyFlags(), fileAt(), findPage(), isUrl(), kindArg(), slash()

### Community 174 - "staticChecks"
Cohesion: 0.40
Nodes (6): codeOnly(), hashOf(), kitIndex(), kitTwin(), norm(), staticChecks()

### Community 175 - "opt"
Cohesion: 0.33
Nodes (6): freshProfile(), inProject(), opt(), profileBase(), roundsArg(), str()

### Community 176 - "lerp"
Cohesion: 0.40
Nodes (4): destroy(), damp(), lerp(), track()

### Community 178 - "Price and questions"
Cohesion: 0.40
Nodes (5): comparison-table, faq, Price and questions, pricing-three, pricing-two

### Community 179 - "Footers"
Cohesion: 0.40
Nodes (5): footer-columns, footer-dark, footer-statement, footer-visit, Footers

### Community 180 - "Page plans"
Cohesion: 0.40
Nodes (5): Gaming, Page plans, Place, Service, Software

### Community 181 - "Navigation"
Cohesion: 0.40
Nodes (5): nav-cards, nav-centre, nav-mega, nav-split, Navigation

### Community 182 - "About this guide"
Cohesion: 0.40
Nodes (5): About this guide, Evidence labels, How to read and apply the guide, Purpose and scope, Relationship with UI.md

### Community 183 - "Performance budget"
Cohesion: 0.50
Nodes (3): Every visual renders, Performance budget, Usual fixes

### Community 184 - "Closes"
Cohesion: 0.50
Nodes (4): close-photo, close-type, close-word, Closes

### Community 185 - "Status"
Cohesion: 0.40
Nodes (5): Status, Disputed, Rejected, Unverified, Verified

### Community 186 - "shaderLint"
Cohesion: 0.50
Nodes (4): glslIn(), isGLSL(), lintGLSL(), shaderLint()

### Community 187 - "manifest.json"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 188 - "18. Provenance and method"
Cohesion: 0.50
Nodes (4): 18. Provenance and method, Consolidation method, How to interpret this edition, Research lineage

### Community 190 - "Decision"
Cohesion: 0.40
Nodes (4): Decision, Allow, Block, Warn

## Knowledge Gaps
- **21 isolated node(s):** `Allow`, `Block`, `Warn`, `Executed`, `Executing` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1570 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `near-api-js` connect `demo.ts` to `Layout.tsx`, `config.ts`, `package.json`, `check.ts`, `linkKey.ts`, `server/index.ts`, `near-api-js`, `vaults.ts`, `web/package.json`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Allow`, `Block`, `Warn` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vault` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._
- **Why does `react` connect `cn` to `Layout.tsx`, `lib/wallet.tsx`, `icons.tsx`, `use-fluid-hover.ts`, `animation.ts`, `profile.tsx`, `VaultConsole.tsx`, `Send.tsx`, `share-sheet.tsx`, `web/package.json`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `lib/wallet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05807200929152149 - nodes in this community are weakly interconnected._
- **Why does `chat()` connect `Features` to `Page plans`, `demo.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._