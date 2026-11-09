import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";
import { Account, actions, type KeyPairString } from "near-api-js";
import { api, type SendState } from "../lib/api";
import { EXPLORER, formatAsset, linkNetwork, usdcFor } from "../lib/format";
import { fromFragment, isValidNewName, SEND_LINK_DAYS, type LinkKey } from "../lib/linkKey";
import { Banner, CopyButton, Skeleton } from "../components/ui";

const RPC = { mainnet: "https://rpc.mainnet.fastnear.com", testnet: "https://rpc.testnet.fastnear.com" } as const;
const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function ClaimPage() {
  const { id = "" } = useParams();
  const { hash } = useLocation();
  const key = useMemo<LinkKey | null>(() => {
    try {
      return hash.length > 10 ? fromFragment(hash) : null;
    } catch {
      return null;
    }
  }, [hash]);
  const [state, setState] = useState<SendState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getSend(id).then(setState).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const inv = state?.invoice;
  const broken = !!inv && !!key && key.account !== inv.merchant;
  const funded = inv?.status === "paid";

  // Once funded, have the sponsor give the link account a little NEAR for gas (once).
  useEffect(() => {
    if (funded && state && !state.claimReady && !broken) api.activateSend(id).then(setState).catch((e) => setError(e.message));
  }, [funded, state?.claimReady, broken, id]);

  const net = linkNetwork(state?.invoice.asset) ?? "mainnet";
  const usdc = usdcFor(net);
  /** Top-level names: .near on mainnet, .testnet on testnet (each has its own account-creation contract). */
  const tla = net === "mainnet" ? "near" : "testnet";
  const accountExists = async (id: string) =>
    !!(await api.check({ network: net, recipient: id, amountDecimal: "0.01", asset: usdc })).report.signals.find((s) => s.name === "account_state")?.data?.exists;

  /** Signed here with the link's key: registers the receiver with USDC if needed, then moves everything. */
  async function moveUsdc(to: string) {
    const acct = new Account(key!.account, RPC[net], key!.secret as KeyPairString);
    const r: any = await acct.signAndSendTransaction({
      receiverId: usdc,
      actions: [
        actions.functionCall("storage_deposit", { account_id: to, registration_only: true }, 10_000_000_000_000n, 1_250_000_000_000_000_000_000n),
        actions.functionCall("ft_transfer", { receiver_id: to, amount: state!.balance, memo: "Notara send link" }, 10_000_000_000_000n, 1n),
      ],
    });
    if (r?.status?.Failure) throw new Error("The transfer failed on-chain. The money is still in this link.");
    setDone(r.transaction.hash);
    // Close the empty link account: its leftover NEAR goes to the receiver as gas money. Best effort.
    await new Promise((ok) => setTimeout(ok, 3000)); // let gas refunds land first
    await acct.deleteAccount(to).catch(() => {});
    load();
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function claim(e: FormEvent) {
    e.preventDefault();
    if (!key || !state) return;
    run(async () => {
      const to = target.trim().toLowerCase();
      if (!ACCOUNT_RE.test(to)) throw new Error(`Enter a NEAR account like yourname.${tla}`);
      if (!(await accountExists(to))) throw new Error(`${to} doesn't exist on NEAR ${net}`);
      await moveUsdc(to);
    });
  }

  /** Creates <name>.near controlled by this link's key (NEAR's account-creation contract), then moves the USDC there. */
  function createName(e: FormEvent) {
    e.preventDefault();
    if (!key || !state) return;
    run(async () => {
      const name = newName.trim().toLowerCase();
      if (!isValidNewName(name)) throw new Error("Use 2+ lowercase letters or digits, with - or _ only between them");
      const id = `${name}.${tla}`;
      if (await accountExists(id)) throw new Error(`${id} is taken. Try another name.`);
      const acct = new Account(key.account, RPC[net], key.secret as KeyPairString);
      await acct.signAndSendTransaction({
        receiverId: tla,
        actions: [actions.functionCall("create_account", { new_account_id: id, new_public_key: key.publicKey }, 30_000_000_000_000n, 2_000_000_000_000_000_000_000n)],
      });
      setCreated(id);
      await moveUsdc(id);
    });
  }

  if (!key)
    return (
      <Banner kind="error" title="This link is incomplete">
        <p>The part after # is missing, so the money can't be opened. Ask the sender for the full link.</p>
      </Banner>
    );
  if (error && !state)
    return (
      <Banner kind="error">
        <p>{error}</p>
      </Banner>
    );
  if (!state || !inv) return <Skeleton lines={4} />;
  if (broken)
    return (
      <Banner kind="error" title="This link doesn't match">
        <p>The key in this link doesn't control this payment. It may have been edited.</p>
      </Banner>
    );

  const balance = BigInt(state.balance || "0");
  const expires = Date.parse(inv.createdAt) + SEND_LINK_DAYS * 86_400_000;
  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card">
        <p className="eyebrow">Notara send link</p>
        <h1>{inv.description}</h1>
        <div className="invoice-sheet">
          <div className="amount">{formatAsset(inv.amount, inv.asset)}</div>
        </div>
      </div>
      {balance > 0n && Date.now() > expires && (
        <Banner kind="warn" title="This link is past its 7 days">
          <p>
            The sender asked for it to be claimed by {new Date(expires).toLocaleDateString()}. If you are the sender, claim it back to your own account below.
            Nothing stops anyone with the link from claiming it later: the key in the link controls the money.
          </p>
        </Banner>
      )}

      {!funded ? (
        <div className="card stack">
          <h2>Not funded yet</h2>
          <p className="muted">If you're the sender, pay it from any chain. Then share this same link.</p>
          <div>
            <Link
              className="btn btn-primary"
              to={`/pay/${inv.id}`}
              onClick={() => {
                try {
                  sessionStorage.setItem(`send-key-${inv.id}`, hash.slice(1));
                } catch {}
              }}
            >
              Fund this link
            </Link>
          </div>
        </div>
      ) : done || balance === 0n ? (
        <Banner kind="ok" title="Claimed">
          <p>
            {created ? `${created} is yours, and the money is in it. To use it in a wallet, import the key below.` : "The money has left this link."}{" "}
            {done && (
              <a href={`${EXPLORER[net]}/txns/${done}`} target="_blank" rel="noreferrer">
                View transaction <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </p>
        </Banner>
      ) : (
        <>
          <form className="card stack" onSubmit={claim}>
            <h2>
              <CircleCheck size={20} style={{ color: "var(--allow)", verticalAlign: "-3px" }} aria-hidden /> {formatAsset(state.balance, usdc)} is waiting for you
            </h2>
            <div className="field">
              <label htmlFor="to">Send it to your NEAR account</label>
              <input id="to" className="input mono" placeholder={`yourname.${tla}`} value={target} onChange={(e) => setTarget(e.target.value)} autoComplete="off" spellCheck={false} />
              <span className="hint">No NEAR needed: gas and the USDC setup are covered.</span>
            </div>
            <div>
              <button className="btn btn-primary" disabled={busy || !target.trim() || !state.claimReady}>
                {busy && <LoaderCircle size={16} className="spin" aria-hidden />} {state.claimReady ? "Claim" : "Getting the link ready…"}
              </button>
            </div>
          </form>
          <form className="card stack" onSubmit={createName}>
            <h2>No NEAR account yet? Get your own name</h2>
            <div className="field">
              <label htmlFor="newname">Choose a name</label>
              <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                <input id="newname" className="input mono" placeholder="yourname" value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" spellCheck={false} />
                <span className="mono">.{tla}</span>
              </div>
              <span className="hint">Free for you: we create the account and move the money there. Then import its key into a wallet like Meteor to use it.</span>
            </div>
            <div>
              <button className="btn btn-primary" disabled={busy || !newName.trim() || !state.claimReady}>
                {busy && <LoaderCircle size={16} className="spin" aria-hidden />} Create {newName.trim() || "yourname"}.{tla} and claim
              </button>
            </div>
          </form>
          <details className="card">
            <summary>Or keep the money in this link</summary>
            <p className="small">
              This link is already a NEAR wallet. Import its key into a wallet app (for example Meteor, "import private key") and the USDC is yours there.
            </p>
            {showKey ? (
              <>
                <div className="doc">{key.secret}</div>
                <CopyButton text={key.secret} label="Copy key" />
              </>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowKey(true)}>
                Show the key (keep it secret)
              </button>
            )}
          </details>
        </>
      )}
      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}
      <Banner kind="warn">
        <p>Anyone with this link can take the money. Don't share it further.</p>
      </Banner>
    </div>
  );
}
