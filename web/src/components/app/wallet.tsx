// Connecting a wallet, and the chip that replaces the Connect button once it's connected.
import { useMemo, useState } from "react";
import { Modal } from "@heroui/react";
import { useWallet, type WalletInfo } from "@/lib/wallet";
import { useBalances } from "@/components/Layout";
import { EMPTY_PROFILE, profileKey, useLocal, type Profile } from "@/lib/local";
import { nearAmount, usdcFigure } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ChevronRight, Wallet } from "@/components/icons";
import { Button, Hint, Segmented, Shimmer } from "./ui";

/** The profile saved on this device for an account (display name, avatar, About, links). */
export function useProfile(account: string | null) {
  return useLocal<Profile>(profileKey(account ?? "-"), EMPTY_PROFILE);
}

/** A picture made from the account id: the same account always gets the same one. */
export function Identicon({ id, size = 28, className }: { id: string; size?: number; className?: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    const out: boolean[] = [];
    for (let i = 0; i < 15; i++) {
      h = Math.imul(h ^ (h >>> 13), 16777619);
      out.push(((h >>> 7) & 1) === 1);
    }
    return out;
  }, [id]);
  return (
    <svg viewBox="0 0 5 5" width={size} height={size} className={cn("shrink-0 rounded-full bg-accent-soft text-moss dark:text-mint", className)} aria-hidden shapeRendering="crispEdges" style={{ padding: size * 0.18 }}>
      {cells.map((on, i) => {
        if (!on) return null;
        const x = Math.floor(i / 5);
        const y = i % 5;
        return (
          <g key={i} fill="currentColor">
            <rect x={x} y={y} width={1} height={1} />
            {x < 2 && <rect x={4 - x} y={y} width={1} height={1} />}
          </g>
        );
      })}
    </svg>
  );
}

export function Avatar({ account, size = 28, className }: { account: string; size?: number; className?: string }) {
  const [profile] = useProfile(account);
  if (profile.avatar) return <img src={profile.avatar} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  return <Identicon id={account} size={size} className={className} />;
}

/** "alice.testnet" stays; a 64-character implicit account becomes "3f2a…9c1e". */
export const handle = (id: string) => (id.length > 28 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

/**
 * Connect button before, wallet chip after: picture, account, USDC balance. Hover explains the account
 * and network; a click opens the profile sheet.
 */
export function WalletChip({ onOpenProfile, onConnect, compact }: { onOpenProfile: () => void; onConnect: () => void; compact?: boolean }) {
  const w = useWallet();
  const { usdc } = useBalances();
  if (!w.accountId)
    return (
      <Button size="sm" onClick={onConnect} disabled={!w.ready} aria-label={!w.ready ? "Loading wallets" : "Connect NEAR wallet"}>
        <Wallet size={15} aria-hidden />
        <span className={cn(compact && "max-sm:hidden")}>{!w.ready ? "Loading wallets…" : w.busy ? "Waiting for your wallet…" : "Connect NEAR wallet"}</span>
      </Button>
    );
  return (
    <Hint
      text={
        <>
          <span className="block break-all font-mono text-[12px]">{w.accountId}</span>
          <span className="block">
            NEAR {w.network}
            {w.network === "testnet" ? ": test money, nothing of value" : ": real money"}. Click for your profile.
          </span>
        </>
      }
    >
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label={`Open your profile, ${w.accountId}`}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5 text-[13.5px] font-semibold shadow-card transition-[transform,background-color] duration-200 hover:bg-surface-secondary active:scale-[0.98]"
      >
        <Avatar account={w.accountId} size={30} />
        <span className={cn("max-w-[150px] truncate", compact && "max-md:hidden")}>{handle(w.accountId)}</span>
        <span className="tnum text-muted max-sm:hidden">
          {usdc === undefined ? <Shimmer className="h-3.5 w-12" /> : usdc === null ? "USDC unavailable" : `$${usdcFigure(usdc)}`}
        </span>
      </button>
    </Hint>
  );
}

/** The wallets people ask for first, when the live wallet list has them. */
const FIRST = ["mynearwallet", "my-near-wallet", "meteor", "meteor-wallet", "here", "hot", "hot-wallet", "ledger", "intear"];
const matches = (w: WalletInfo, k: string) => w.id.toLowerCase().includes(k) || w.name.toLowerCase().replace(/\s/g, "").includes(k);
const order = (w: WalletInfo) => {
  const i = FIRST.findIndex((k) => matches(w, k));
  return i < 0 ? FIRST.length : i;
};
/** The one wallet suggested per network; it goes to the top with a badge. */
const RECOMMENDED = { testnet: { key: "intear", label: "Recommended for testnet" }, mainnet: { key: "hot", label: "Recommended" } } as const;

/**
 * The wallet picker (HeroUI Modal; a bottom sheet on a phone). It lists the wallets NEAR Connect offers
 * for the chosen network, read live, and hands the chosen one to its own sign-in.
 */
export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const w = useWallet();
  const [net, setNet] = useState<"mainnet" | "testnet">(w.network);
  const [waiting, setWaiting] = useState<WalletInfo | null>(null);
  const rec = RECOMMENDED[net];
  const isRec = (x: WalletInfo) => matches(x, rec.key);
  const list = useMemo(() => {
    const top = (x: WalletInfo) => Number(matches(x, RECOMMENDED[net].key));
    return [...w.walletsFor(net)].sort((a, b) => top(b) - top(a) || order(a) - order(b) || a.name.localeCompare(b.name));
  }, [w, net]);

  async function pick(info: WalletInfo) {
    setWaiting(info);
    await w.connect(info.id, net); // resolves when the wallet answers, is closed, or fails (the error shows below)
    setWaiting(null);
  }
  // Closes itself once the wallet is connected.
  if (open && w.accountId && waiting === null && w.network === net) queueMicrotask(onClose);

  return (
    <Modal>
      {/* Hidden while the wallet's own sign-in is up: an open modal makes the rest of the page inert,
          which would block a wallet that shows its popup inside this page (Intear does). */}
      <Modal.Backdrop isOpen={open && !waiting} onOpenChange={(o) => !o && onClose()} className="nt z-[80]" variant="blur">
        <Modal.Container placement="auto" size="md">
          <Modal.Dialog className="nt rounded-3xl border border-border bg-background p-0 text-foreground shadow-pop" aria-label="Connect a NEAR wallet">
            <div className="flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">Connect a NEAR wallet</h2>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">Your wallet signs in and approves each payment. Notara never sees your keys.</p>
                </div>
                <Modal.CloseTrigger aria-label="Close" className="shrink-0" />
              </div>

              {waiting ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center" role="status">
                  <img src={waiting.icon} alt="" width={56} height={56} className="size-14 rounded-2xl" />
                  <div>
                    <p className="text-[17px] font-bold">Waiting for your wallet…</p>
                    <p className="mt-1 text-[14px] text-muted">Approve the sign-in in {waiting.name}. It may have opened in a new tab or window.</p>
                  </div>
                  <div className="shimmer h-1 w-40 rounded-full" />
                  <button type="button" className="text-[14px] font-semibold text-muted underline underline-offset-4 hover:text-foreground" onClick={() => setWaiting(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-muted">Network</span>
                    <Segmented
                      label="Network"
                      value={net}
                      onChange={setNet}
                      options={[
                        { value: "testnet", label: "Testnet" },
                        { value: "mainnet", label: "Mainnet" },
                      ]}
                    />
                  </div>
                  <p className="-mt-2 text-[13px] text-muted">{net === "testnet" ? "Free test money. Nothing of value moves." : "Real money. Notara is a prototype and isn't audited: keep amounts small."}</p>
                  {!w.ready ? (
                    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading wallets">
                      {[0, 1, 2].map((i) => (
                        <Shimmer key={i} className="h-[68px] w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : list.length === 0 ? (
                    <p className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-[14px] text-muted">
                      The list of wallets didn't load. An ad blocker can stop it. Reload the page to try again.
                    </p>
                  ) : (
                    <ul className="-mx-1 flex max-h-[46vh] flex-col gap-1 overflow-y-auto px-1 pb-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
                      {list.map((info) => (
                        <li key={info.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => pick(info)}
                            disabled={w.busy}
                            className={cn(
                              "flex w-full items-center gap-3.5 rounded-2xl border p-3 text-left transition-colors duration-200 hover:border-border hover:bg-surface",
                              isRec(info) ? "border-border/70 bg-surface" : "border-transparent",
                            )}
                          >
                            <img src={info.icon} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl bg-surface-secondary" />
                            <span className={cn("min-w-0 flex-1", info.website && "pr-9")}>
                              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="truncate text-[15.5px] font-bold leading-tight">{info.name}</span>
                                {isRec(info) && (
                                  <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-accent-soft px-2 text-[11px] font-bold leading-none text-foreground">{rec.label}</span>
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-[13px] leading-snug text-muted">{info.description}</span>
                            </span>
                            <ChevronRight size={18} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                          </button>
                          {info.website && (
                            <a
                              href={info.website}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${info.name} website (opens a new tab)`}
                              title={`${info.name} website`}
                              className="absolute right-10 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted opacity-0 transition-[opacity,background-color] duration-200 hover:bg-default hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              <ArrowUpRight size={15} aria-hidden />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {w.error && (
                    <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[14px] font-semibold text-danger">
                      {w.error}
                    </p>
                  )}
                  <p className="text-[13px] text-muted">New to NEAR? Any wallet above can make a free account in about a minute.</p>
                </>
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** "12.5 NEAR" from yoctoNEAR, to at most four decimals. */
export const nearFigure = (yocto: bigint) => {
  const s = nearAmount(yocto.toString());
  const [a, b = ""] = s.split(".");
  return b ? `${a}.${b.slice(0, 4)}` : a;
};
