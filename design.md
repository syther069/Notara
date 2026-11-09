# Notara: Website Design

Status: v1 · 2026-11-04. Companion to `PRD.md` (what), `Architecture.md` (how) and `rules.md` (rules).
Scope: the website in `web/`. Pages: Home, Check, Attack demo, Vault, Invoices (merchant), About.

---

## 1. Design goals

1. **Understood in 10 seconds.** Every screen answers one question. The decision (ALLOW / WARN / BLOCK) is always the biggest thing on the screen.
2. **Show the evidence, not just the verdict.** Every result shows *why* and *where the data came from*. That is the product.
3. **Honest by design.** Live data, demo fixtures and unavailable data look visibly different. We never show "safe"; we show "no policy violation found".
4. **Calm security, not hacker movie.** Trustworthy like a bank statement, with one dramatic moment: the blocked attack.
5. **Demo-ready.** Every page looks good in a 1080p screen recording and works on a phone.

## 2. Personality and tone

| We are | We are not |
|---|---|
| Clear, calm, precise | Scary, flashy, "cyber" |
| Plain language with exact numbers | Jargon without an explanation |
| Confident about what we checked | Overclaiming what we didn't |

**Voice examples**
- ✅ "Blocked. This account has a verified scam report. Nothing was signed."
- ✅ "We couldn't reach the transaction index, so we can't confirm this account's history. A human should approve."
- ❌ "Threat neutralized!" ❌ "This account is safe." ❌ "AI-powered fraud detection."

## 3. Visual language

### 3.0 Theme: "Notary Seal" (redesign, 2026-11-09)

A calm, paper-and-ink look: cream surfaces like a signed document, evergreen ink, and a notary-seal mark. Light theme first, with a deep-green dark theme. Tokens live in `web/src/styles/tokens.css`.

| Hex | Name | Role |
|---|---|---|
| `#F3EEE3` | Cream | page background (about 60% of the screen) |
| `#FBFADA` | Pale cream | text on dark bands; cards use a near-white tint of it |
| `#ADBC9F` | Sage | supporting fills, selection, dark-theme primary |
| `#436850` | Green | secondary text on cream, icons, progress |
| `#12372A` | Deep green | primary buttons, the top strip, the trust band, the footer (about 10%) |
| `#111111` | Near-black | body text |

Decision colors stay apart from the brand greens and always come with an icon and a word: ALLOW `#146B4A`, WARN `#8A5A00`, BLOCK `#A8321E`, demo fixture purple `#6B4FB0` (lighter versions in dark mode). Mainnet tags are solid deep green, testnet tags dashed.

### 3.2 Typography

One family, **Manrope** (variable 200–800, self-hosted from `web/public/fonts`): 800 with tight tracking for headlines, 450–700 for body and UI. **JetBrains Mono** only for account ids, hashes and logs. Amounts and tables use tabular numbers. Headlines use `text-wrap: balance`.

### 3.3 Spacing, shape, elevation

- 4px grid. Radius scale: 6 · 10 · 16 · 24 · pill. Inner radius = outer radius minus padding.
- Buttons are pills in three sizes (36 / 44 / 52) and five variants (primary, secondary, tonal, ghost, danger), each with hover, pressed (scale 0.97), focus ring, loading (Orbit spinner, same width) and disabled states.
- Borders for structure; one soft shadow for raised or hovered items.
- Max width 1200px; 24px gutters, 16px on phones.

### 3.4 Icons

Iconoir, one stroke weight (1.7), imported only through `web/src/components/icons.tsx`. Loading uses the Orbit spinner from the same file.

### 3.5 Motion

Subtle and purposeful only.
- Decision reveal: fade + 8px rise, 200ms.
- BLOCK in the attack demo: one 300ms red pulse on the card border. No shaking.
- Log lines: append with a 120ms fade.
- Honor `prefers-reduced-motion`: no animation at all.

## 4. Core components

### 4.1 Decision badge
```
[🛡✓ ALLOW]   [🛡! WARN]   [🛡✕ BLOCK]
```
Pill with icon + word, tinted background, colored text. Sizes: `sm` in tables, `lg` in result cards.

### 4.2 Decision card (main result)
```
┌───────────────────────────────────────────────────────────────┐
│ 🛡✕  BLOCK                                   testnet · 0.5 NEAR│
│ attacker.notara.testnet                                   │
│ "A serious policy rule applies. The payment is refused."      │
│ ─────────────────────────────────────────────────────────────│
│ Evidence coverage  ■■■■■□  5 of 6 signals checked             │
└───────────────────────────────────────────────────────────────┘
```
- Left border 4px in the decision color.
- Subtitle per decision:
  - **ALLOW:** "No configured policy rule was broken. This is not a guarantee."
  - **WARN:** "Something is missing or unusual. A human must approve."
  - **BLOCK:** "A serious policy rule applies. The payment is refused."
- The coverage bar shows checked vs unavailable signals, never a "safety score".

### 4.3 Reason row
```
⛔ VERIFIED REPORT   [DEMO FIXTURE]
   Report #0 (Scam) was verified by verifier.notara.testnet: "Sends fake…"
   Evidence: registry#0 · fixture://scripts/setup-testnet.ts
```
Severity icon, short title (code turned into words), the plain message, evidence links. Ordered block, then warn, then info. Info rows are collapsed under "Other facts we found (n)".

### 4.4 Source tag
Small pill on every signal and piece of evidence:

| Tag | Style |
|---|---|
| `LIVE · CHAIN` | accent outline |
| `LIVE · INDEXER` | accent outline |
| `OUR CONTRACT` | neutral outline |
| `LOCAL CONFIG` | neutral outline |
| `DEMO FIXTURE` | solid purple. Always visible, never hidden behind hover |
| `UNAVAILABLE` | dashed outline, muted |

### 4.5 Evidence table (signals)

| Signal | Status | Source | Fetched | Notes |
|---|---|---|---|---|
| Account state | ● ok | LIVE · CHAIN | 12:04:31 | exists, not a contract |

On phone this becomes stacked cards. Each row expands to show caveats ("Earliest observed activity, not the creation date") and the endpoint URL.

### 4.6 Log console (attack demo)
- Monospace on `--surface-2`, auto-scrolls, with a "pause scroll" toggle.
- Prefixes are color-coded: `[agent]` muted, `[wrapper]` accent, `[notify human]` warn, `REFUSED` allow-green (refusing is the good outcome here), `NOT AS EXPECTED` block-red.
- Transaction hashes become explorer links.
- Copy button and "Download log".

### 4.7 Scenario card (attack demo)
```
┌ 2 · Prompt-injected invoice ───────────────────────────┐
│ Expected  BLOCK → refused, nothing signed              │
│ Actual    [🛡✕ BLOCK] refused                  ✓ PASS   │
│ Evidence  no transaction (refused before signing)      │
└────────────────────────────────────────────────────────┘
```
States: idle (grey), running (spinner + accent border), pass (green check), fail (red cross + reason).

### 4.8 Payment row (vault)
`#4 · newshop.notara.testnet · 0.3 NEAR · [WARN] · Waiting for approval · 2 min ago · [Approve] [Reject]`
Approve is a primary button and Reject is secondary. Both need a confirm step that shows the reasons again.

### 4.9 Invoice card (merchant)
Invoice number, description, amount + asset, status pill (Unpaid · Waiting for approval · Paid · Refused), payment link with a copy button, and a transaction link when paid.

### 4.10 Other components
- **Inputs:** account id input with live format validation, a ".testnet / .near" hint, amount input with an asset selector, and a network toggle (Testnet | Mainnet read-only).
- **Buttons:** Primary (accent fill), Secondary (outline), Danger (block color, only for Reject/Pause), Ghost (links).
- **Banners:**
  - top-of-site "Testnet prototype · not audited · no real funds" (dismissible per session)
  - "Testnet not set up" (warn style, with the setup command)
- **Toasts:** bottom-right, used for copy, approve and errors.
- **Empty states:** one sentence plus one action ("No payments yet. Run the attack demo to create some.").

## 5. Page layouts

### 5.1 Global frame
```
┌────────────────────────────────────────────────────────────────┐
│ ◆ Notara   Home  Check  Attack demo  Vault        │
│                         Invoices  About          [testnet ●]   │
├────────────────────────────────────────────────────────────────┤
│ ⚠ Testnet prototype · not audited · no real funds         [×]  │
├────────────────────────────────────────────────────────────────┤
│                         page content                           │
├────────────────────────────────────────────────────────────────┤
│ Built for the NEAR Hackathon · Data: NEAR RPC, FastNear ·       │
│ GitHub · How it works                                          │
└────────────────────────────────────────────────────────────────┘
```
The network pill shows whether a testnet deployment is connected (green dot) or missing (grey). On phone the nav becomes a menu button.

### 5.2 Home `/`
```
HERO
  Stop AI agents from paying scammers.
  A counterparty check and an on-chain vault for agent payments on NEAR.
  [Check an account]  [Watch the attack demo]

THE PROBLEM (3 cards)
  📩 Agents read untrusted text   🧠 Hidden instructions redirect payments   🔑 Safety code inside the agent can be skipped

INVOICE VISUAL
  Side-by-side: what the human sees  |  what the AI reads (hidden text highlighted red)

HOW IT WORKS (horizontal flow, vertical on phone)
  Agent → Notara check → Signed verdict → Vault contract → Recipient
  Caption under each step

FOUR STORIES (2×2 grid of scenario cards with outcome badges)

WHY ON-CHAIN (short): "If the agent is hacked, the vault still says no."  [See the bypass attempts]

HONEST LIMITS strip + link to About
```

### 5.3 Check `/check`
```
H1 Check a NEAR account
[ account id ............ ] [ amount ] [NEAR ▾] [Testnet | Mainnet read-only]  [Check]
Try: aurora (mainnet) · attacker.… (testnet demo) · a made-up name

─ result (after submit) ─
Decision card
Why this decision        (reason rows)
Evidence                 (evidence table)
What we could not check  (unavailable signals + caveats)
Disclaimer
[Copy JSON report] [Copy report hash]
```
Loading shows a skeleton plus a per-signal checklist that ticks as signals return (a real wait is about 1–10 s).

### 5.4 Attack demo `/demo`
```
H1 Watch a prompt-injected agent get stopped
Intro sentence + agent mode chip ([Scripted agent] or [LLM: model-name])

LEFT (60%)                              RIGHT (40%)
Scenario cards 1–4 (+ 3a–3f grouped)    The injected invoice (hidden text highlighted)
[Run all] [Run one ▾]                   Live log console

Summary bar: "9 of 9 checks behaved as expected" + Download log
```
- If testnet isn't set up: replace the Run buttons with the "Testnet not set up" banner and the setup steps. Saved logs stay viewable.
- Scenario 4 pauses with "Waiting for human approval" and a link to the Vault page.

### 5.5 Vault `/vault`
```
H1 Vault
Stat row: Balance · Per-payment cap · Daily cap · Spent today (progress bar)
Waiting for your approval (highlighted section, hidden when empty)
All payments (table, newest first, filter by status)
Footer note: "Owner console runs locally with the owner key. Phase 2: approve with your NEAR wallet."
```

### 5.6 Invoices `/invoices` (merchant, Real-World Money track)
```
H1 Invoices
[+ New invoice]  (amount, asset NEAR/USDC-test, description)
Table: # · description · amount · status · created · paid tx · [copy link]
[Export CSV]
Invoice detail /invoices/:id → shareable page the customer's agent pays from
```

### 5.7 About `/about`
Long-form reading page (720px wide):
1. Data sources and limits (table)
2. What function-call keys do and don't protect
3. How the vault enforces decisions
4. Implemented vs planned
5. Honest limits

## 6. States checklist (every page)

| State | Treatment |
|---|---|
| Loading | Skeletons, never a blank screen. Spinner only inside buttons |
| Empty | One sentence + one action |
| Error (server down) | Inline banner: what failed + how to fix (`npm run serve`) |
| Partial data | Shown as WARN with the unavailable signals listed, never hidden |
| Not deployed | Warn banner + setup command, read-only features still work |
| Success | Toast + updated data, with the explorer link where relevant |

## 7. Accessibility

- Keyboard reachable everything; visible 2px accent focus ring.
- Decision badges have text and icons; the log console has `aria-live="polite"`.
- Buttons have labels ("Approve payment #4", not just "Approve").
- Minimum touch target 44×44px.
- Semantic HTML: real `<table>`, `<button>`, `<nav>`, headings in order.
- Contrast: AA in both themes (to be checked with an audit before submission).

## 8. Responsive breakpoints

| Width | Layout |
|---|---|
| < 640px | single column, nav in menu, tables become cards |
| 640–1024px | two-column where useful, demo log under the scenarios |
| > 1024px | full layouts as drawn above |

## 9. Copy glossary (use these words everywhere)

| Term | Meaning shown to users |
|---|---|
| Notara check | Looking up a recipient before paying |
| Verdict | The signed ALLOW / WARN / BLOCK answer |
| Vault | The smart contract that holds the agent's money |
| Agent key | The limited key the AI uses; it can only ask the vault to pay |
| Owner | The human who approves WARN payments |
| Evidence coverage | How many checks returned data (not a safety score) |
| Demo fixture | Fake data we seeded for the demo |
| First observed activity | Earliest transaction we can see (not the creation date) |

## 10. Implementation notes

- Vite + React + TypeScript, plain CSS with the tokens above in `web/src/styles/tokens.css`. No UI framework. Theme: Notary Seal (section 3.0). Motion (`motion`) only for the landing list and the expanding questions.
- Fonts: Manrope (self-hosted) and JetBrains Mono (Google Fonts). Icons: `iconoir-react` through `components/icons.tsx`.
- One shared component per section 4 item in `web/src/components/`.
- Theme follows the system setting, with a manual toggle (stored in `localStorage`).
- Before calling a page done, check it at 375px and 1440px, in both themes and with keyboard only.
