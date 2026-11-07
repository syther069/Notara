# Build plan: trusted payment links on NEAR

Updated 2026-11-07. Deadline: **14 Nov 2026, 23:59 UTC**. This file replaces the plan and timeline in `PRD.md` where they differ.

## The product
**Payment links people can trust. Get paid in USDC from any chain, and your customer can see it's really you.**

Example: Priya, a freelancer, creates a link for 50 USDC and sends it on WhatsApp. Her client sees who the link belongs to, pays from the wallet and chain they already use, and Priya receives USDC on NEAR.

Why trust is the focus: PingPay already offers hosted checkout links through NEAR Intents, so a plain link is not original.

Tracks: Real-World Money (primary), AI Security & Defense (attack demo). Agent Economy only if its guide fits.

The product has two actions:
- **Request money:** a trusted payment link.
- **Send money:** a claim link the receiver opens to get USDC and a new NEAR account.

**Send by link** was approved on 2026-11-07 because each claimed link can create a new NEAR user. Build it only after the first real any-chain checkout payment works. It is the first feature to cut if time runs out.

## P0: must ship
### Safety fixes (from the audit)
- [x] The agent stops loading Notara signer key. It calls Notara over HTTP as a separate process.
- [x] Backend blocks requests from other websites (Host, Origin, Sec-Fetch-Site and JSON content-type checks), including demo runs.
- [x] A dispute no longer downgrades a Verified report. Registry redeployed on testnet.
- [x] Stop double payment of one invoice.
- [x] Add tests for the last two backend fixes.

### Payment
- [x] Any-chain checkout with 1Click: `EXACT_OUTPUT` quote, one-time deposit address, status tracking, refund address. Tested up to the deposit address; no money sent yet.
- [ ] Prove it with one small real mainnet payment (no Intents testnet exists).
- [x] Merchant receives directly in their own account. We never hold funds, and public checkout does not use the vault.
- [x] USD pricing in USDC. Clear states: waiting, processing, paid, refunded, failed, expired.

### Trust
- [x] Merchant Passport page (`/m/<account>`): NEAR name, account age, payments received, reports.
- [x] Identity proof: website ownership via `https://<site>/.well-known/near.txt`. X accounts not done (needs X API access).
- [x] Signed links: the merchant's mainnet wallet signs recipient, amount and description (NEP-413, `near-sign-verify`, key checked via FastNear). Checkout shows signed / not signed / signature no longer valid. Not yet tested with a real wallet.
- [x] Checkout safety panel with plain facts ("Looks OK / Be careful / Blocked"). Never says "safe".
- [x] "Report this account" button, shown once the mainnet registry is deployed. Deploy script ready, not run.
- [ ] Mainnet report registry, so mainnet checks are not always WARN. Costs about 2-3 real NEAR. **Owner approval and signature required.**

### Merchant experience
- [x] First screen: "Payment links people can trust" with Create a payment link / Send money.
- [x] Dashboard on Get paid: "Only mine" for the connected mainnet wallet, refund reasons, per-merchant CSV.
- [x] Plain words for users: "Looks OK", "Be careful", "Blocked". Technical terms stay in the docs.
- [x] Attack demo moved to /security (old /demo redirects).

### Public launch
- [x] SQLite (built into Node) instead of JSON files, with a one-time import.
- [x] Public mode (`NOTARA_PUBLIC=1`): no owner key, no demo, no verdict signing on a public server.
- [ ] Run `lock-vault` and hand vault ownership to the wallet before submission.
- [ ] Fresh-clone test. README matches what runs.

## P1: in this order, if time allows
1. **Send by link**
   - [ ] Check Keypom and ask in the NEAR developer chat whether a current USDC claim-link product exists. If one does, focus the pitch on what differs.
   - [x] Built: the sender's browser makes a one-time key; the link's `#` part holds it (never sent to the server); 1Click funds its implicit account. Live funding and claim not tested yet (needs a sponsor account and real funds).
   - [x] Receiver opens the link and sends the USDC to their NEAR account, with gas and USDC setup paid by a sponsor account. Picking a brand-new NEAR name is not done.
   - [x] Sender can take back unclaimed money by opening their own link. No expiry yet.
   - [x] 25 USDC per link, 20 new links per day, and a clear "works like cash" warning.
   - [x] Receivers without a NEAR account can import the link's key into a wallet. No bank cash-out.
2. **Sponsored setup**: we pay the 0.00125 NEAR token registration for new merchants and receivers, and gas for claims, with limits to prevent abuse.
3. QR code and link expiry for payment links.
4. Embeddable checkout button, closest to the wishlist idea.
5. Telegram "You got paid" alert.
6. Agent-safe API: agents use the same check before paying.

## Not doing
Escrow, subscriptions, card payments, confidential payments, yield on balances. 1Click Earn vaults listed today are on Base, Ethereum and Solana, so they would move money away from NEAR.

## Owner tasks
- [ ] Get a 1Click JWT from the NEAR Intents partner portal and put it in `.env` (without one, an extra fee of about 0.2-0.25% applies).
- [ ] Keep about $2-5 of crypto in your own wallet for the real payment, plus NEAR for the mainnet registry.
- [ ] Find 2-3 real testers, ideally one real freelancer.
- [ ] Approve each of: push to public GitHub, public deploy, X post, submission.

## Timeline
| Date | Work |
|---|---|
| Nov 7 | Safety fixes, confirm 1Click API details |
| Nov 8 | First real any-chain payment end to end |
| Nov 9-10 | Checkout page, Merchant Passport, identity proof, signed invoices |
| Nov 11 | Dashboard, database, mainnet registry, new home page |
| Nov 12 | Send by link, public deploy after approval, real testers |
| Nov 13 | Fresh-clone test, README, demo video, X post draft |
| Nov 14 | Buffer, update the NEAR Builders idea, submit after approval |

If time runs short, cut in this order: all P1 items, then the dashboard extras. Any-chain checkout and the trust checks must ship.

## Honesty rules for the pitch
- Do not claim users, volume or accuracy we have not measured.
- Label what is live on mainnet and what is on testnet.
- Demo reports stay labeled as fixtures.
