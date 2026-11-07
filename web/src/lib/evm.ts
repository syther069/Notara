// One-click pay from a browser EVM wallet (MetaMask, Rabby, Coinbase...) via window.ethereum (EIP-1193).
// No library: we only switch network and send one transfer to the 1Click deposit address.

const eth = () => (window as any).ethereum as { request(a: { method: string; params?: unknown[] }): Promise<any> } | undefined;

export const hasEvmWallet = () => !!eth();

/** Asks the wallet for its address (also used to fill the refund address). */
export async function evmAccount(): Promise<string> {
  const w = eth();
  if (!w) throw new Error("No browser wallet found. Install MetaMask or Rabby, or send from any wallet using the address below.");
  const [addr] = await w.request({ method: "eth_requestAccounts" });
  return addr;
}

const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** ERC-20 transfer(to, amount) call data. */
export const erc20TransferData = (to: string, units: string) => `0xa9059cbb${pad(to)}${pad(BigInt(units).toString(16))}`;

/** Sends `units` of the token (or the native coin when `contract` is missing) to `to`. Returns the tx hash. */
export async function evmPay(p: { chainId: number; contract?: string; to: string; units: string }): Promise<string> {
  const w = eth()!;
  const from = await evmAccount();
  await w.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${p.chainId.toString(16)}` }] });
  const tx = p.contract
    ? { from, to: p.contract, data: erc20TransferData(p.to, p.units), value: "0x0" }
    : { from, to: p.to, value: `0x${BigInt(p.units).toString(16)}` };
  return w.request({ method: "eth_sendTransaction", params: [tx] });
}
