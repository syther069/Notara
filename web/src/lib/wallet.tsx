// NEAR wallet connection via @hot-labs/near-connect (the connector recommended in NEAR's hackathon docs).
// Wallets run in sandboxed iframes; we only ask for testnet-capable wallets.
// The site never sees private keys: the wallet signs and sends the transaction itself.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NearConnector } from "@hot-labs/near-connect";
import { sign } from "near-sign-verify";

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
        await connector.whenManifestLoaded;
        // Restore a previous session, if any.
        const existing = await connector.getConnectedWallet().catch(() => null);
        if (!cancelled && existing?.accounts?.[0]) setAccountId(existing.accounts[0].accountId);
      } catch (e: any) {
        if (!cancelled) setError(`Wallet connector failed to load: ${e?.message ?? e}`);
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
      throw new Error(`${(wallet as any).manifest?.name ?? "This wallet"} can't sign messages, so it can't sign a payment link. Use Meteor, HOT, Intear, MyNearWallet or another NEAR wallet, or create the link without signing.`);
    const account = (existing?.accounts ?? (await wallet.getAccounts({ network: net })))[0]?.accountId;
    if (!account) throw new Error(`No ${net} account in this wallet`);
    setAccountId(account);
    const token = await sign(await message(account), {
      signer: { signMessage: (p: any) => wallet.signMessage({ ...p, network: net, signerId: account }) },
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
      const fc = (methodName: string, args: object, deposit: string) => ({ type: "FunctionCall" as const, params: { methodName, args, gas: "30000000000000", deposit } });
      const out: any = await wallet.signAndSendTransaction({
        network: net,
        signerId,
        receiverId: token,
        // Registers the merchant for USDC if needed (refunded if already registered), then pays.
        actions: [fc("storage_deposit", { account_id: receiver, registration_only: true }, "1250000000000000000000"), fc("ft_transfer", { receiver_id: receiver, amount, memo }, "1")],
      });
      if (out?.status?.Failure) throw new Error("The payment failed on-chain");
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
      const out: any = await wallet.signAndSendTransaction({ network: net, signerId, receiverId: receiver, actions: [{ type: "Transfer", params: { deposit: yocto } }] });
      if (out?.status?.Failure) throw new Error("The transfer failed on-chain");
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
      const out: any = await wallet.signAndSendTransaction({
        network: net,
        signerId,
        receiverId: contractId,
        actions: [{ type: "FunctionCall", params: { methodName, args, gas: String(BigInt(gasTgas) * 10n ** 12n), deposit: opts.deposit ?? "0" } }],
      });
      const failure = out?.status?.Failure;
      if (failure) {
        const panic = JSON.stringify(failure).match(/Smart contract panicked: ([^"\\]+)/)?.[1];
        throw new Error(panic ?? "Transaction failed on-chain");
      }
      return out?.transaction?.hash ?? out?.transaction_outcome?.id ?? "";
    },
    [accountId, switchTo],
  );

  const value = useMemo(
    () => ({ accountId, network, ready, busy, error, connect, disconnect, signLink, call, payUsdc, sendNear }),
    [accountId, network, ready, busy, error, connect, disconnect, signLink, call, payUsdc, sendNear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Payment links are signed on mainnet; the vault lives on testnet. Returns true if it had to switch. */
async function ensureNetwork(c: NearConnector, network: "mainnet" | "testnet"): Promise<boolean> {
  if (c.network === network) return false;
  await c.disconnect().catch(() => {});
  c.features = FEATURES;
  c.network = network;
  return true;
}
