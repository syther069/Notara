# AgentSpend Passport: Website Design

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

### 3.0 Theme: "Evergreen Ledger"

A deep-forest, calm, private-bank look: dark evergreen surfaces, sage and olive mid-tones, warm parchment text, and a soft lime glow as the one bright accent. It says *steady and trustworthy*, not *hacker terminal*, and it stands out from the usual blue/purple crypto sites.

Brand palette (owner's choice, 2026-11-04):

| Swatch | Hex | Name | Role |
|---|---|---|---|
| ■ | `#0F1F17` | Forest Night | page background (dark) |
| ■ | `#1E3A2E` | Evergreen | cards, nav |
| ■ | `#3E5A3F` | Moss | raised surfaces, borders, primary button hover |
| ■ | `#6B7F67` | Sage | muted text, icons, dividers |
| ■ | `#C7CBB8` | Parchment | main text on dark, page background in light mode |
| ■ | `#3D4337` | Graphite Olive | inputs, tables, code and log blocks |
| ✦ | `#B8D26A` | Lime Glow | accent: links, focus ring, primary CTA, hero glow (taken from the photo's background light) |

### 3.1 Color tokens

Dark theme first (it records well and fits security), with a light theme. All colors are CSS variables on `:root`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0F1F17` | `#EEF0E6` | page background |
| `--surface` | `#1E3A2E` | `#FFFFFF` | cards |
| `--surface-2` | `#3D4337` | `#E3E6D8` | inputs, table stripes, log console |
| `--border` | `#3E5A3F` | `#C7CBB8` | dividers, card borders |
| `--text` | `#E4E7D9` | `#0F1F17` | body text (a lighter Parchment for AA contrast) |
| `--text-muted` | `#A3AE9C` | `#3E5A3F` | secondary text (Sage lifted for contrast on dark) |
| `--accent` | `#B8D26A` | `#4E6B1F` | links, focus ring, primary button |
| `--accent-ink` | `#0F1F17` | `#FFFFFF` | text on accent buttons |
| `--allow` | `#5FD4A0` | `#137A52` | ALLOW (mint, kept distinct from the olive brand greens) |
| `--warn` | `#E8B04B` | `#965F00` | WARN (amber) |
| `--block` | `#E5674F` | `#B53A24` | BLOCK (rust red) |
| `--fixture` | `#B9A3E3` | `#6B4FB0` | DEMO FIXTURE tag only (lavender) |
| `--allow-bg`, `--warn-bg`, `--block-bg` | color at 14% opacity | color at 10% opacity | badge and card backgrounds |

Background treatment: a soft radial **lime glow** (`#B8D26A` at 10–18% opacity, large blur) behind the hero and behind the decision card, like the light in the palette photo. Nowhere else.

Rules:
- Brand greens (Evergreen, Moss, Sage) are for surfaces only. **Mint, amber and rust are used only for decisions.**
- Lavender is reserved for **DEMO FIXTURE**, so fixtures can't be mistaken for live data.
- Color is never the only signal: every decision also has an icon and a word.
- Text contrast is at least WCAG AA (4.5:1) in both themes. Raw `#6B7F67` on `#0F1F17` is too low for body text, which is why `--text-muted` is lifted.

### 3.2 Typography (Google Fonts)

| Role | Font | Size / weight |
|---|---|---|
| Display (hero), H1, H2 | **Space Grotesk** | 52 / 700 hero (34 on phone), 34 / 700 H1, 22 / 600 H2 |
| Body, UI, buttons | **Manrope** | 16 / 400–600, line-height 1.6 |
| Small / caption | Manrope | 13 / 600 |
| Code, account ids, hashes, logs | **JetBrains Mono** | 14 / 400 |
| Decision word on a badge | Space Grotesk | 14 / 700, letter-spacing 0.08em, uppercase |

Why: Space Grotesk has a technical, slightly engineered feel for a security product without looking cold. Manrope is warm and very readable for long explanations. JetBrains Mono keeps account ids and hashes unambiguous.

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Account ids, transaction hashes and amounts always use the monospace font. Long hashes are shortened in the middle (`7NnkTE…BmfhBk`) with copy-on-click.

### 3.3 Spacing, shape, elevation

- 4px base grid. Common steps: 8, 12, 16, 24, 32, 48, 64.
- Radius: 12px for cards, 8px for inputs and buttons, 999px for tags.
- Elevation: borders instead of heavy shadows. One soft shadow for the hovered or active card.
- Max content width 1120px; reading width 720px.
- Phone: 16px side gutter, single column, no horizontal scroll.

### 3.4 Icons

Lucide icons, 20px, 1.75 stroke.

| Meaning | Icon |
|---|---|
| ALLOW | `shield-check` |
| WARN | `shield-alert` |
| BLOCK | `shield-x` |
| Live data | `radio` |
| Our contract | `file-code` |
| Unavailable | `cloud-off` |
| Fixture | `flask-conical` |
| Explorer link | `external-link` |

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
│ attacker.agentspend.testnet                                   │
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
   Report #0 (Scam) was verified by verifier.agentspend.testnet: "Sends fake…"
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
`#4 · newshop.agentspend.testnet · 0.3 NEAR · [WARN] · Waiting for approval · 2 min ago · [Approve] [Reject]`
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
│ ◆ AgentSpend Passport   Home  Check  Attack demo  Vault        │
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
  Agent → Passport check → Signed verdict → Vault contract → Recipient
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
| Passport check | Looking up a recipient before paying |
| Verdict | The signed ALLOW / WARN / BLOCK answer |
| Vault | The smart contract that holds the agent's money |
| Agent key | The limited key the AI uses; it can only ask the vault to pay |
| Owner | The human who approves WARN payments |
| Evidence coverage | How many checks returned data (not a safety score) |
| Demo fixture | Fake data we seeded for the demo |
| First observed activity | Earliest transaction we can see (not the creation date) |

## 10. Implementation notes

- Vite + React + TypeScript, plain CSS with the tokens above in `web/src/styles/tokens.css`. No UI framework. Theme: Evergreen Ledger (section 3.0).
- Fonts: Space Grotesk, Manrope and JetBrains Mono from Google Fonts. Icons: `lucide-react`.
- One shared component per section 4 item in `web/src/components/`.
- Theme follows the system setting, with a manual toggle (stored in `localStorage`).
- Before calling a page done, check it at 375px and 1440px, in both themes and with keyboard only.
