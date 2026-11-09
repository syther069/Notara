// NEAR wallet connection via @hot-labs/near-connect (the connector recommended in NEAR's hackathon docs).
// Wallets run in sandboxed iframes; we only ask for testnet-capable wallets.
// The site never sees private keys: the wallet signs and sends the transaction itself.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NearConnector } from "@hot-labs/near-connect";
import { sign } from "near-sign-verify";
import { EXPLORER, formatAsset } from "./format";

const NETWORK = "testnet" as const;
type Net = "mainnet" | "testnet";
/** The network the visitor picked last time (header switch). Testnet by default. */
const savedNetwork = (): Net => {
  try {
    return localStorage.getItem("notara-network") === "mainnet" ? "mainnet" : NETWORK;
  } catch {
    return NETWORK;
  }
};
// NEAR Connect itself hides wallets without testnet support while on testnet. We add no network filter of our
// own: the manifest's "mainnet" flag is set by only a few wallets, so filtering on it hid HOT, MyNearWallet,
// OKX, Nightly and others. Every wallet in the manifest can send transactions.
const FEATURES = { signAndSendTransaction: true };
// WalletConnect needs a project id from cloud.reown.com, which this app doesn't have yet.
const EXCLUDED = ["wallet-connect"];
/** near-connect manifest id of the EVM option: MetaMask / WalletConnect sign NEAR transactions via evm-on-near.dev. */
export const EVM_WALLET_ID = "ethereum-wallets";

type WalletState = {
  accountId: string | null;
  /** Which network the connected wallet is on. Payment links use mainnet; the vault demo uses testnet. */
  network: "mainnet" | "testnet";
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** Open the wallet picker, or go straight to one wallet (e.g. "ethereum-wallets" for MetaMask & other EVM wallets). */
  /** Opens the wallet picker for that network (testnet by default), or goes straight to one wallet. */
  connect: (walletId?: string, network?: Net) => Promise<void>;
  disconnect: () => Promise<void>;
  /** Hides the last wallet error (after the person has read it). */
  clearError: () => void;
  /**
   * Sign a payment link with a NEAR mainnet wallet (NEP-413). `message` gets the signer's account and
   * returns the exact text to sign. Returns the token for the backend and the signer.
   */
  signLink: (message: (accountId: string) => Promise<string>, network?: "mainnet" | "testnet") => Promise<{ token: string; accountId: string }>;
  /** Sign and send one function call with the connected wallet. Returns the tx hash. */
  call: (contractId: string, methodName: string, args: object, gasTgas?: number, opts?: { network?: "mainnet" | "testnet"; deposit?: string }) => Promise<string>;
  /** Pay USDC on NEAR (mainnet by default) straight from the user's wallet. Returns the tx hash and payer. */
  /** Send NEAR (yocto) from the connected wallet, e.g. to fund your own vault. Returns the tx hash. */
  sendNear: (receiver: string, yocto: string, network?: "mainnet" | "testnet") => Promise<string>;
  /** `memo` must be the invoice id: the server only counts a transfer whose memo names the link it pays. */
  payUsdc: (token: string, receiver: string, amount: string, memo: string, network?: "mainnet" | "testnet") => Promise<{ txHash: string; signerId: string }>;
};

const Ctx = createContext<WalletState>({
  accountId: null,
  network: NETWORK,
  ready: false,
  busy: false,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  clearError: () => {},
  signLink: async () => {
    throw new Error("Wallet not ready");
  },
  call: async () => {
    throw new Error("Wallet not ready");
  },
  payUsdc: async () => {
    throw new Error("Wallet not ready");
  },
  sendNear: async () => {
    throw new Error("Wallet not ready");
  },
});

export const useWallet = () => useContext(Ctx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const connectorRef = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<Net>(savedNetwork);
  const switchTo = useCallback(async (c: NearConnector, n: "mainnet" | "testnet") => {
    const switched = await ensureNetwork(c, n);
    if (switched) {
      setAccountId(null);
      setNetwork(n);
      // Remembered so a reload restores the session on the network the wallet is now connected to.
      try {
        localStorage.setItem("notara-network", n);
      } catch {}
    }
    return switched;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Loaded lazily so pages that never touch the wallet stay fast.
        const { NearConnector } = await import("@hot-labs/near-connect");
        const connector = new NearConnector({ network: savedNetwork(), features: FEATURES, excludedWallets: EXCLUDED });
        connectorRef.current = connector;
        connector.on("wallet:signIn", (t) => setAccountId(t.accounts[0]?.accountId ?? null));
        connector.on("wallet:signOut", () => setAccountId(null));
        // The wallet list is fetched from a CDN. If it never arrives, say so instead of leaving every
        // Connect button disabled with no reason.
        await Promise.race([
          connector.whenManifestLoaded,
          new Promise((_, reject) => setTimeout(() => reject(new Error("the list of wallets didn't load (network or ad blocker?)")), 15_000)),
        ]);
        // Restore a previous session, if any.
        const existing = await connector.getConnectedWallet().catch(() => null);
        const restored = existing?.accounts?.[0]?.accountId;
        if (!cancelled && restored) {
          // A named account tells its network; follow it rather than show a .near account as "testnet".
          const own: Net | null = restored.endsWith(".testnet") ? "testnet" : restored.endsWith(".near") ? "mainnet" : null;
          if (own && own !== connector.network) {
            connector.network = own;
            setNetwork(own);
            try {
              localStorage.setItem("notara-network", own);
            } catch {}
          }
          setAccountId(restored);
        }
      } catch (e: any) {
        if (!cancelled) setError(`Wallets couldn't load: ${e?.message ?? e}. Reload the page to try again.`);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (walletId?: string, net: Net = network) => {
    const c = connectorRef.current;
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      await switchTo(c, net);
      try {
        localStorage.setItem("notara-network", net);
      } catch {}
      const wallet = await c.connect(walletId ? { walletId } : undefined);
      const accounts = await wallet.getAccounts({ network: net });
      setAccountId(accounts[0]?.accountId ?? null);
    } catch (e: any) {
      // Closing the picker is not an error worth shouting about.
      const msg = String(e?.message ?? e);
      if (!/reject|cancel|closed/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  }, [network, switchTo]);

  const disconnect = useCallback(async () => {
    await connectorRef.current?.disconnect().catch(() => {});
    setAccountId(null);
  }, []);

  const signLink = useCallback(async (message: (accountId: string) => Promise<string>, net: "mainnet" | "testnet" = "mainnet") => {
    const c = connectorRef.current;
    if (!c) throw new Error("Wallet not ready");
    const switched = await switchTo(c, net);
    const existing = switched ? null : await c.getConnectedWallet().catch(() => null);
    const wallet = existing?.wallet ?? (await c.connect());
    if (!(wallet as any).manifest?.features?.signMessage)
      throw new Error(
        `${(wallet as any).manifest?.name ?? "This wallet"} can't sign messages, which this step needs (signed payment links, your own vault). ${net === "testnet" ? "On testnet, use Intear Wallet." : "Use HOT, Meteor, Intear or another NEAR wallet."}`,
      );
    const account = (existing?.accounts ?? (await wallet.getAccounts({ network: net })))[0]?.accountId;
    if (!account) throw new Error(`No ${net} account in this wallet`);
    setAccountId(account);
    const token = await sign(await message(account), {
      signer: { signMessage: (p: any) => walletAnswer(wallet.signMessage({ ...p, network: net, signerId: account }), false) },
      recipient: "notara",
    });
    return { token, accountId: account };
  }, [switchTo]);

  const payUsdc = useCallback(
    async (token: string, receiver: string, amount: string, memo: string, net: "mainnet" | "testnet" = "mainnet") => {
      const c = connectorRef.current;
      if (!c) throw new Error("Wallet not ready");
      const switched = await switchTo(c, net);
      const existing = switched ? null : await c.getConnectedWallet().catch(() => null);
      const wallet = existing?.wallet ?? (await c.connect());
      const signerId = (existing?.accounts ?? (await wallet.getAccounts({ network: net })))[0]?.accountId;
      if (!signerId) throw new Error(`No ${net} account in this wallet`);
      setAccountId(signerId);
      // Say it before the wallet opens, instead of letting the chain refuse it.
      const have = await ftBalance(net, token, signerId);
      if (have !== null && have < BigInt(amount))
        throw new Error(
          `${signerId} has ${formatAsset(have.toString(), token)}, and this needs ${formatAsset(amount, token)}.${net === "testnet" ? " Get free test USDC at faucet.circle.com (choose NEAR testnet)." : ""} Nothing was sent.`,
        );
      const fc = (methodName: string, args: object, deposit: string) => ({ type: "FunctionCall" as const, params: { methodName, args, gas: "30000000000000", deposit } });
      const out: any = await walletAnswer(
        wallet.signAndSendTransaction({
          network: net,
          signerId,
          receiverId: token,
          // Registers the merchant for USDC if needed (refunded if already registered), then pays.
          actions: [fc("storage_deposit", { account_id: receiver, registration_only: true }, "1250000000000000000000"), fc("ft_transfer", { receiver_id: receiver, amount, memo }, "1")],
        }),
        true,
      );
      if (out?.status?.Failure) throw txFailed(out, net, "The payment failed: ", "the network refused it");
      return { txHash: out?.transaction?.hash ?? out?.transaction_outcome?.id ?? "", signerId };
    },
    [switchTo],
  );

  const sendNear = useCallback(
    async (receiver: string, yocto: string, net: "mainnet" | "testnet" = NETWORK) => {
      const c = connectorRef.current;
      if (!c) throw new Error("Wallet not ready");
      const switched = await switchTo(c, net);
      const existing = switched || !accountId ? null : await c.getConnectedWallet().catch(() => null);
      const wallet = existing?.wallet ?? (await c.connect());
      const signerId = existing?.accounts?.[0]?.accountId ?? (await wallet.getAccounts({ network: net }))[0]?.accountId;
      if (!signerId) throw new Error("Connect a wallet first");
      setAccountId(signerId);
      const out: any = await walletAnswer(wallet.signAndSendTransaction({ network: net, signerId, receiverId: receiver, actions: [{ type: "Transfer", params: { deposit: yocto } }] }), true);
      if (out?.status?.Failure) throw txFailed(out, net, "The transfer failed: ", "the network refused it");
      return out?.transaction?.hash ?? out?.transaction_outcome?.id ?? "";
    },
    [accountId, switchTo],
  );

  const call = useCallback(
    async (contractId: string, methodName: string, args: object, gasTgas = 100, opts: { network?: "mainnet" | "testnet"; deposit?: string } = {}) => {
      const c = connectorRef.current;
      if (!c) throw new Error("Wallet not ready");
      const net = opts.network ?? NETWORK;
      const switched = await switchTo(c, net);
      const existing = switched || !accountId ? null : await c.getConnectedWallet().catch(() => null);
      const wallet = existing?.wallet ?? (await c.connect());
      const signerId = existing?.accounts?.[0]?.accountId ?? (await wallet.getAccounts({ network: net }))[0]?.accountId;
      if (!signerId) throw new Error("Connect a wallet first");
      setAccountId(signerId);
      const out: any = await walletAnswer(
        wallet.signAndSendTransaction({
          network: net,
          signerId,
          receiverId: contractId,
          actions: [{ type: "FunctionCall", params: { methodName, args, gas: String(BigInt(gasTgas) * 10n ** 12n), deposit: opts.deposit ?? "0" } }],
        }),
        true,
      );
      if (out?.status?.Failure) throw txFailed(out, net, "", "Transaction failed on-chain");
      return out?.transaction?.hash ?? out?.transaction_outcome?.id ?? "";
    },
    [accountId, switchTo],
  );

  const clearError = useCallback(() => setError(null), []);
  const value = useMemo(
    () => ({ accountId, network, ready, busy, error, connect, disconnect, clearError, signLink, call, payUsdc, sendNear }),
    [accountId, network, ready, busy, error, connect, disconnect, clearError, signLink, call, payUsdc, sendNear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const RPC = { mainnet: "https://rpc.mainnet.fastnear.com", testnet: "https://rpc.testnet.fastnear.com" } as const;
const WALLET_WAIT_MS = 120_000;
const TRY_OTHER = "On testnet, Intear Wallet works well.";

/**
 * Some wallets never answer: Nightly on testnet loses a failed send inside its extension, so the promise
 * never settles and the button would spin forever. Stop waiting after 2 minutes and say what to do.
 */
/** The wallet never answered: the outcome is unknown (it may still have sent the transaction). */
export class WalletTimeoutError extends Error {}

function walletAnswer<T>(p: Promise<T>, sends: boolean): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(
      () =>
        reject(
          new WalletTimeoutError(
            sends
              ? `Your wallet didn't answer within 2 minutes. Check your wallet's activity before you try again, in case it went through. ${TRY_OTHER}`
              : `Your wallet didn't answer within 2 minutes. If it shows a request, approve or reject it there, then try again. ${TRY_OTHER}`,
          ),
        ),
      WALLET_WAIT_MS,
    );
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/** A transaction that reached NEAR and failed there: the plain reason, plus the tx and NEAR's raw error for details. */
export class TxFailedError extends Error {
  constructor(message: string, readonly txUrl: string | null, readonly raw: string) {
    super(message);
  }
}
function txFailed(out: any, net: Net, prefix: string, fallback: string): TxFailedError {
  const hash = out?.transaction?.hash ?? out?.transaction_outcome?.id;
  const raw = JSON.stringify(out.status.Failure, null, 1);
  return new TxFailedError(`${prefix}${failureReason(out.status.Failure, net, fallback)}`, hash ? `${EXPLORER[net]}/txns/${hash}` : null, raw);
}

/** Plain-language reason for a failed transaction (the contract's panic text, or NEAR's error kind). */
function failureReason(failure: unknown, net: Net, fallback: string): string {
  const s = JSON.stringify(failure);
  const faucet = net === "testnet" ? " Get free test USDC at faucet.circle.com (choose NEAR testnet)." : "";
  if (/is not registered/.test(s)) return `Your account has no USDC yet.${faucet}`;
  if (/doesn't have enough balance/.test(s)) return `Your account doesn't have enough USDC.${faucet}`;
  if (/NotEnoughBalance|LackBalanceForState/.test(s)) return "Your account doesn't have enough NEAR for this and its gas.";
  return s.match(/Smart contract panicked: ([^"\\]+)/)?.[1] ?? fallback;
}

/** The payer's token balance, or null if it can't be read (then the wallet and chain decide). */
export async function ftBalance(net: Net, token: string, account: string): Promise<bigint | null> {
  try {
    const args = btoa(JSON.stringify({ account_id: account }));
    const r = await fetch(RPC[net], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "call_function", finality: "optimistic", account_id: token, method_name: "ft_balance_of", args_base64: args } }),
    }).then((x) => x.json());
    if (!r.result) return null;
    return BigInt(JSON.parse(new TextDecoder().decode(new Uint8Array(r.result.result))));
  } catch {
    return null;
  }
}

/** Payment links are signed on mainnet; the vault lives on testnet. Returns true if it had to switch. */
async function ensureNetwork(c: NearConnector, network: "mainnet" | "testnet"): Promise<boolean> {
  if (c.network === network) return false;
  await c.disconnect().catch(() => {});
  c.features = FEATURES;
  c.network = network;
  return true;
}
