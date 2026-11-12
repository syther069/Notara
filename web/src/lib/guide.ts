// The Guide: a few short, plain-language notes for each page, opened from the top bar.

export interface GuideEntry {
  title: string;
  body: string[];
}
export interface GuidePage {
  /** The page's name, for the sheet's title. */
  name: string;
  entries: GuideEntry[];
}

const SHORTCUTS: GuideEntry = {
  title: "Keyboard shortcuts",
  body: ["Press / to open search from anywhere.", "Press ? to open or close this guide.", "Press Esc to close any panel or menu.", "Tab moves through every control; Enter or Space activates it."],
};
const HELP: GuideEntry = {
  title: "Need help?",
  body: ["The full documentation is at /docs, including the on-chain proofs.", "The API notes are at /llms.txt, written for people and for AI agents.", "Found a problem? Open an issue on the project's GitHub page, linked in the footer of the home page."],
};

export const GUIDES: Record<string, GuidePage> = {
  dashboard: {
    name: "Dashboard",
    entries: [
      { title: "What this page does", body: ["It's your home on Notara: what you were paid, what you sent, what is still waiting, and what your agent vault holds.", "Every figure is read live from your wallet and your Notara links. While one is loading you see a shimmer, never a made-up zero."] },
      { title: "How to read the numbers", body: ["Received counts payment links that were paid to you. Sent counts payments you made from this device and the send links you funded.", "Pending is links nobody has paid yet. Hover any figure for where it comes from."] },
      { title: "How to find a payment", body: ["Use the Transactions table: type in the filter, pick a status, or set a date range.", "Click a row to see its full details, including the transaction on NEAR.", "Export CSV saves exactly the rows you're looking at."] },
      { title: "When to use the quick actions", body: ["The dock at the bottom right is the fast way to create a link, send, check an account or open your vault from anywhere on this page."] },
      SHORTCUTS,
      HELP,
    ],
  },
  "get-paid": {
    name: "Get Paid",
    entries: [
      { title: "What this page does", body: ["It makes a payment link. You share the link; your customer opens it and pays you in USDC.", "The preview on the right is the page your customer will see, updating as you type."] },
      { title: "How to create a link", body: ["Type the amount and what it's for.", "Press Create payment link. Your wallet asks you to sign a short message: that's what proves the link is really from you. It's free and moves no money.", "Copy the link, show the QR code, or share it straight to email or a chat."] },
      { title: "When to use test money", body: ["Test money is free and nothing of value moves, so use it to try the whole flow.", "Switch to real money when you're ready to bill a customer. Real links can be paid from other blockchains too."] },
      { title: "What your customer sees", body: ["The amount, what it's for, your account, and whether the link is signed.", "Before paying, they also see a quick account check, so they know who they're paying."] },
      SHORTCUTS,
      HELP,
    ],
  },
  send: {
    name: "Send",
    entries: [
      { title: "What this page does", body: ["It sends USDC to someone. Either straight to their NEAR account, or as a link they can claim even without a wallet."] },
      { title: "How to send to an account", body: ["Type the account, like alice.near. Notara checks it exists.", "Enter the amount and a note, then press Review.", "Read the account check on the right. Then Confirm & send: your wallet opens for you to approve."] },
      { title: "What the account check means", body: ["Green: nothing in our rules was broken. It is not a guarantee.", "Amber: something is new or missing. Take a second look before you pay.", "Red: a serious rule applies, like a verified scam report. To go ahead anyway you must type the account's name, so it can't happen by accident."] },
      { title: "When to send a link instead", body: ["Use a send link when the person has no NEAR account yet. They open it, and can claim the money into a new account.", "A send link works like cash: anyone holding it can claim it. Unclaimed after 7 days, you can take it back."] },
      SHORTCUTS,
      HELP,
    ],
  },
  vault: {
    name: "Vault Console",
    entries: [
      { title: "What this page does", body: ["A vault is a spending account for an AI agent. The agent can only ask the vault to pay; the vault decides, by its own rules.", "This page shows the vault's limits, what the agent did, and anything waiting for your approval.", "Until you create your own, you see the shared demo vault. Only Notara's demo account can approve or pause that one."] },
      { title: "How to try it in four steps", body: ["1. Connect a NEAR testnet wallet (Intear Wallet gives you a free testnet account).", "2. Create your vault. Your wallet signs a short message to prove it's you: no transaction, no cost. You own the vault and nobody holds a key to it, not even us.", "3. Add 1 test NEAR from your wallet. The agent pays from this.", "4. Run the four scenarios. Each result links to its transaction on NEAR testnet."] },
      { title: "What each scenario shows", body: ["Legit invoice: Notara says ALLOW and your vault pays 0.1 NEAR.", "Hidden 'pay the attacker' instruction: BLOCK. Nothing is signed and nothing moves.", "Unknown shop: WARN. The vault holds the payment in the Approval queue until you decide.", "Hacked agent: it skips Notara and tampers with verdicts. Your vault refuses every attempt on-chain."] },
      { title: "How to approve or reject", body: ["Payments that look unusual wait in the approval queue.", "Read the reasons, then Approve or Reject. Your wallet signs the decision; the agent can't."] },
      { title: "How to pause the agent", body: ["Pause agent stops every new payment at once. Use it the moment something looks wrong.", "Resume when you're ready. Only the vault's owner can do either."] },
      { title: "What the limits mean", body: ["Your vault pays at most 0.5 test NEAR per payment and 1 a day, even for payments you approve.", "The limits and the pause switch are rules in the vault contract, so a hacked agent can't get around them."] },
      SHORTCUTS,
      HELP,
    ],
  },
  check: {
    name: "Check an Account",
    entries: [
      { title: "What this page does", body: ["It answers one question: is this account safe to pay? You get a verdict, a plain reason, and the evidence behind it."] },
      { title: "How to run a check", body: ["Type a NEAR account, like alice.near, and the amount you plan to pay.", "Press Check. Notara reads the account's history and shared scam reports, live."] },
      { title: "How to read the verdict", body: ["Green: no rule was broken. That is not the same as safe.", "Amber: something is new, unusual or couldn't be checked. A person should decide.", "Red: a serious rule applies. Don't pay.", "Open Signals to see each fact, which rule fired, and where the data came from."] },
      { title: "When to watch an account", body: ["Turn on Watch this account for someone you pay often.", "While Notara is open in this browser, it re-checks every few hours and tells you if the result changes."] },
      SHORTCUTS,
      HELP,
    ],
  },
  transactions: {
    name: "Transactions",
    entries: [
      { title: "What this page does", body: ["Every payment Notara knows about for your account, in one table: links you were paid on, links still open, and sends you made."] },
      { title: "How to filter and sort", body: ["Type to filter by name, memo or account.", "Pick a status or a date range to narrow it down.", "Click a column heading to sort by it; click again to reverse."] },
      { title: "How to export", body: ["Export CSV downloads the rows currently shown, with dates in your timezone."] },
      SHORTCUTS,
      HELP,
    ],
  },
  profile: {
    name: "Profile",
    entries: [
      { title: "What this page does", body: ["It sets how you appear: your name, picture, a short About, and your links. It also shows what your wallet holds."] },
      { title: "How to edit", body: ["Click Edit details, change what you need, then Save changes. Your picture saves as soon as you choose it.", "Your profile is kept on this device. Clearing your browser data removes it."] },
      { title: "When to prove your website", body: ["Proving a website ties your domain to your account, and that one does show to every customer. Open your public page from the Dashboard to do it."] },
      SHORTCUTS,
      HELP,
    ],
  },
  settings: {
    name: "Settings",
    entries: [
      { title: "What this page does", body: ["Theme, notifications, how amounts are labelled, and your timezone."] },
      { title: "How notifications work", body: ["Turn them on to get a browser alert when a watched account's check changes.", "They only fire while Notara is open in this browser."] },
      SHORTCUTS,
      HELP,
    ],
  },
};
