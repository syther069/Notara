# AgentSpend Passport: Project Rules

These rules apply to everyone working on this repo, people and AI assistants alike. If a rule blocks you, ask the owner; don't work around it.

---

## 1. Safety and approvals (hard rules)

1. **Never** deploy to mainnet, spend real funds, push to GitHub, publish the website, post on social media, or submit to the hackathon **without explicit approval from the project owner**. Approval for one action does not cover the next one.
2. **Testnet only** for contracts and payments. Mainnet is **read-only** (lookups).
3. **Never commit keys.** `keys/`, `.env` and `deployment.*.json` secrets stay local. Never print a secret key in logs, the website, screenshots or chat.
4. The **agent process loads only** `keys/agent-fc.json`. It must never load the owner, vault-admin or Passport signer keys.
5. Server endpoints that sign or spend (demo runner, owner console) bind to `127.0.0.1` only. Never expose them publicly without authentication.

## 2. Honesty rules (what we claim)

1. **Never present demo data as live evidence.** Fixtures must be labeled everywhere:
   - on-chain: `is_fixture: true`
   - API: `is_fixture` field
   - website and logs: a visible **DEMO FIXTURE** tag
   - evidence links: `fixture://…`
2. A report is **a claim, not proof**. Only a **Verified** report in a blocking category may cause BLOCK.
3. Use careful words: "no policy violation found", not "safe". Say "first observed activity", not "account created".
4. **Don't claim** security, accuracy, adoption or real-world results we have not tested. Unknowns go in the "Honest limits" section.
5. Every result shows its **sources and caveats** and the disclaimer.
6. The **README must match what actually runs.** The judges' AI screening checks this. Update the README in the same change as the feature.

## 3. Security design rules

1. **Fail closed.** If a data source fails, the decision is at least **WARN**, never ALLOW.
2. **The vault is the final authority.** Every money rule that matters (signature, binding, expiry, nonce, BLOCK refusal, caps, owner-only approval) must be enforced **on-chain**, not only in the wrapper or website.
3. The agent key is a **function-call key** limited to `vault.request_payment`. Never give the agent a full-access key. Never widen its method list without owner approval.
4. Verdicts are **short-lived** (5 min by policy, 10 min maximum in the vault) and **single-use** (nonce).
5. The verdict message format is shared by TypeScript and Rust. **Changing it means changing both, plus the shared test vector**, in one change.
6. Validate all input at the boundary: account ids, amounts (integer strings), asset names, body size.
7. No `eval`, no shell string building with user input, no secrets in URLs.

## 4. Code rules

1. **Keep it simple.** Build the smallest thing that works for the demo journey before adding extras. No new frameworks or services without a clear reason.
2. **Languages:** Rust (near-sdk 5.30) for contracts, TypeScript for Passport, agent and website.
3. The policy engine (`passport/src/policy.ts`) stays a **pure function**: no network, no files.
4. Each signal returns `{ status, source, endpoint, fetchedAt, data, caveats }`. New signals follow the same shape.
5. Errors are shown, not swallowed: return a clear message and keep the decision fail-closed.
6. Small, focused files. Names say what things do.
7. Website copy is plain language. Short sentences, no jargon without an explanation, and every decision is explained.

## 5. Testing rules

1. **Before calling anything done, run:**
   ```bash
   npm test
   ```
   ```bash
   cargo test
   ```
   ```bash
   npm run typecheck
   ```
2. Every new **contract rule** gets a unit test, including the failure case (`should_panic`).
3. Every new **policy rule** gets a row in `passport/test/policy.test.ts`, including what happens when its signal is unavailable.
4. Website changes are checked in a real browser (desktop and phone width) before being called done.
5. Live testnet runs: save the log in `demo/runs/` and link the transactions in the explorer.
6. Report results honestly: if a test fails or a step was skipped, say so.

## 6. Git and workflow rules

1. Commit only when the owner asks. Never force-push. Never rewrite shared history.
2. One change = one purpose. Commit messages say what changed and why.
3. Update the related docs (`README.md`, `PRD.md`, `Architecture.md`) in the same change when behavior changes.
4. Check `HACKATHON.md` for the deadline and rules before planning work. Development ends **14 Nov 2026, 23:59 UTC**.

## 7. Priority order when time is short

1. The core protection works: BLOCK stops the payment, and the vault refuses bypasses.
2. The website shows it clearly (Check page + Attack demo).
3. The README is accurate and the project runs from a fresh clone.
4. Polish (Vault page, About page, design).
5. Stretch goals (wallet approval, TEE signer, NEAR Intents).
