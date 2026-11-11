// The docs' table of contents. It drives the sidebar, previous/next, search and the page titles.
// `file` is where the page's text lives, for the "Edit on GitHub" link.

export interface DocPage {
  slug: string; // "" is the docs home
  title: string;
  description: string;
  group: string;
  file: string;
  keywords?: string;
  mainnet?: boolean;
}

export const UPDATED = "11 November 2026";
export const REPO = "https://github.com/syther069/Notara";

export const DOCS: DocPage[] = [
  { slug: "", group: "Get started", title: "What is Notara", file: "start.tsx", description: "Payment links signed by your wallet, account checks before you pay, and a spending vault for AI agents. Built on NEAR.", keywords: "overview introduction about" },
  { slug: "quickstart", group: "Get started", title: "Quickstart", file: "start.tsx", description: "Connect a wallet, get free test USDC, make a payment link and see it paid, in about five minutes.", keywords: "start begin tutorial testnet faucet" },
  { slug: "networks", group: "Get started", title: "Testnet and mainnet", file: "start.tsx", description: "What runs on each network, what moves real money, and what this prototype does not promise.", keywords: "mainnet testnet real money network" },

  { slug: "payment-links", group: "Get paid", title: "Payment links", file: "getpaid.tsx", description: "How a link is signed by the merchant's wallet with NEP-413, and how a customer can check it.", keywords: "invoice link nep-413 signature sign" },
  { slug: "any-chain", group: "Get paid", title: "Pay from any chain", file: "getpaid.tsx", description: "Customers pay from the chain they already use; NEAR Intents delivers exact USDC on NEAR.", keywords: "near intents 1click cross-chain ethereum arbitrum bitcoin solana", mainnet: true },
  { slug: "mainnet-proof", group: "Get paid", title: "Mainnet proof: NEAR Intents", file: "getpaid.tsx", description: "A real payment from ETH on Arbitrum to USDC on NEAR, with every transaction linked.", keywords: "proof evidence transaction mainnet intents arbiscan nearblocks", mainnet: true },
  { slug: "website-proof", group: "Get paid", title: "Prove your website", file: "getpaid.tsx", description: "Tie your domain to your NEAR account with a .well-known/near.txt file.", keywords: "domain well-known near.txt verify" },
  { slug: "invoices-csv", group: "Get paid", title: "Links, status and CSV export", file: "getpaid.tsx", description: "What each link status means and every column in the export.", keywords: "csv export accounting status paid" },

  { slug: "send-links", group: "Send money", title: "Send links", file: "send.tsx", description: "Send USDC as a link someone can claim without a wallet. 1 to 25 USDC, 7 days to take it back.", keywords: "send claim link cash gift testnet" },

  { slug: "vault", group: "AI agents", title: "How the vault works", file: "agents.tsx", description: "An agent can only ask the vault to pay. The vault pays only with a fresh, signed verdict from Notara.", keywords: "agent vault contract verdict ai" },
  { slug: "caps", group: "AI agents", title: "Spending caps and approvals", file: "agents.tsx", description: "Per-payment and daily caps, the approval queue, pausing and withdrawing.", keywords: "limit cap daily approve reject pause" },
  { slug: "attack-tests", group: "AI agents", title: "Attack tests, on-chain", file: "agents.tsx", description: "Ten checks run against the live testnet vault, each linked to its transaction.", keywords: "attack prompt injection security test proof demo" },
  { slug: "function-call-keys", group: "AI agents", title: "Function-call keys", file: "agents.tsx", description: "What the agent's key can and cannot do, enforced by the NEAR protocol itself.", keywords: "access key permissions protocol" },

  { slug: "signals", group: "Account check", title: "The six signals", file: "check.tsx", description: "What Notara reads about an account before you pay, where it comes from, and its limits.", keywords: "signals history reports risk fastnear" },
  { slug: "verdicts", group: "Account check", title: "Allow, Warn, Block", file: "check.tsx", description: "How the policy turns evidence into a decision, with every threshold.", keywords: "policy threshold decision allow warn block" },

  { slug: "architecture", group: "Developers", title: "Architecture", file: "developers.tsx", description: "The contracts, the Notara service, the agent wrapper, the backend and the website.", keywords: "architecture design components system" },
  { slug: "verdict-format", group: "Developers", title: "Signed verdict format", file: "developers.tsx", description: "The exact text Notara signs with ed25519, and how the vault checks it.", keywords: "ed25519 signature verdict format nonce" },
  { slug: "api", group: "Developers", title: "API reference", file: "developers.tsx", description: "The public HTTP endpoints, with requests, responses and errors.", keywords: "api http endpoint rest curl json llms.txt" },
  { slug: "contracts", group: "Developers", title: "Contracts and accounts", file: "developers.tsx", description: "Vault and registry methods, deployed addresses and code hashes.", keywords: "contract rust methods address deployment" },
  { slug: "run-locally", group: "Developers", title: "Run it locally", file: "developers.tsx", description: "Set up the contracts, the server and the website on your own machine.", keywords: "install setup local run npm cargo" },

  { slug: "security", group: "Trust", title: "Security and limits", file: "trust.tsx", description: "What Notara protects, what it does not, and what is still planned.", keywords: "security audit limits honest risk" },
  { slug: "faq", group: "Trust", title: "FAQ", file: "trust.tsx", description: "Short answers to the questions people ask first.", keywords: "faq questions fees custody" },
];

export const GROUPS = [...new Set(DOCS.map((d) => d.group))];
export const docPath = (slug: string) => (slug ? `/docs/${slug}` : "/docs");
