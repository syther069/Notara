// NEAR wallet connection via @hot-labs/near-connect (the connector recommended in NEAR's hackathon docs).
// Wallets run in sandboxed iframes; we only ask for testnet-capable wallets.
// The site never sees private keys: the wallet signs and sends the transaction itself.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NearConnector } from "@hot-labs/near-connect";
import { sign } from "near-sign-verify";

const NETWORK = "testnet" as const;
/** near-connect manifest id of the EVM option: MetaMask / WalletConnect sign NEAR transactions via evm-on-near.dev. */
export const EVM_WALLET_ID = "ethereum-wallets";

type WalletState = {
  accountId: string | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** Open the wallet picker, or go straight to one wallet (e.g. "ethereum-wallets" for MetaMask & other EVM wallets). */
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /**
   * Sign a payment link with a NEAR mainnet wallet (NEP-413). `message` gets the signer's account and
   * returns the exact text to sign. Returns the token for the backend and the signer.
   */
  signLink: (message: (accountId: string) => Promise<string>) => Promise<{ token: string; accountId: string }>;
  /** Sign and send one function call (no deposit) with the connected wallet. Returns the tx hash. */
  call: (contractId: string, methodName: string, args: object, gasTgas?: number) => Promise<string>;
};

const Ctx = createContext<WalletState>({
  accountId: null,
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
});

export const useWallet = () => useContext(Ctx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const connectorRef = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Loaded lazily so pages that never touch the wallet stay fast.
        const { NearConnector } = await import("@hot-labs/near-connect");
        const connector = new NearConnector({ network: NETWORK, features: { testnet: true, signAndSendTransaction: true } });
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

  const connect = useCallback(async (walletId?: string) => {
    const c = connectorRef.current;
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      await ensureNetwork(c, NETWORK);
      const wallet = await c.connect(walletId ? { walletId } : undefined);
      const accounts = await wallet.getAccounts({ network: NETWORK });
      setAccountId(accounts[0]?.accountId ?? null);
    } catch (e: any) {
      // Closing the picker is not an error worth shouting about.
      const msg = String(e?.message ?? e);
      if (!/reject|cancel|closed/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await connectorRef.current?.disconnect().catch(() => {});
    setAccountId(null);
  }, []);

  const signLink = useCallback(async (message: (accountId: string) => Promise<string>) => {
    const c = connectorRef.current;
    if (!c) throw new Error("Wallet not ready");
    const switched = await ensureNetwork(c, "mainnet");
    const existing = switched ? null : await c.getConnectedWallet().catch(() => null);
    const wallet = existing?.wallet ?? (await c.connect());
    const account = (existing?.accounts ?? (await wallet.getAccounts({ network: "mainnet" })))[0]?.accountId;
    if (!account) throw new Error("No mainnet account in this wallet");
    setAccountId(account);
    const token = await sign(await message(account), {
      signer: { signMessage: (p: any) => wallet.signMessage({ ...p, network: "mainnet", signerId: account }) },
      recipient: "notara",
    });
    return { token, accountId: account };
  }, []);

  const call = useCallback(
    async (contractId: string, methodName: string, args: object, gasTgas = 100) => {
      const c = connectorRef.current;
      if (!c || !accountId) throw new Error("Connect a wallet first");
      const wallet = await c.wallet();
      const out: any = await wallet.signAndSendTransaction({
        network: NETWORK,
        signerId: accountId,
        receiverId: contractId,
        actions: [{ type: "FunctionCall", params: { methodName, args, gas: String(BigInt(gasTgas) * 10n ** 12n), deposit: "0" } }],
      });
      const failure = out?.status?.Failure;
      if (failure) {
        const panic = JSON.stringify(failure).match(/Smart contract panicked: ([^"\\]+)/)?.[1];
        throw new Error(panic ?? "Transaction failed on-chain");
      }
      return out?.transaction?.hash ?? out?.transaction_outcome?.id ?? "";
    },
    [accountId],
  );

  const value = useMemo(
    () => ({ accountId, ready, busy, error, connect, disconnect, signLink, call }),
    [accountId, ready, busy, error, connect, disconnect, signLink, call],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Payment links are signed on mainnet; the vault lives on testnet. Returns true if it had to switch. */
async function ensureNetwork(c: NearConnector, network: "mainnet" | "testnet"): Promise<boolean> {
  if (c.network === network) return false;
  await c.disconnect().catch(() => {});
  c.features = network === "mainnet" ? { mainnet: true, signMessage: true } : { testnet: true, signAndSendTransaction: true };
  c.network = network;
  return true;
}
