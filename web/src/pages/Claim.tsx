import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";
import { Account, actions, type KeyPairString } from "near-api-js";
import { api, type SendState } from "../lib/api";
import { formatAsset, USDC_MAINNET } from "../lib/format";
import { fromFragment, type LinkKey } from "../lib/linkKey";
import { Banner, CopyButton, Skeleton } from "../components/ui";

const RPC = "https://rpc.mainnet.fastnear.com";
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

  async function claim(e: FormEvent) {
    e.preventDefault();
    if (!key || !state) return;
    setBusy(true);
    setError(null);
    try {
      const to = target.trim().toLowerCase();
      if (!ACCOUNT_RE.test(to)) throw new Error("Enter a NEAR account like yourname.near");
      const exists = await api.check({ network: "mainnet", recipient: to, amountDecimal: "0.01", asset: USDC_MAINNET });
      if (!exists.report.signals.find((s) => s.name === "account_state")?.data?.exists) throw new Error(`${to} doesn't exist on NEAR mainnet`);
      // Signed here with the link's key. Registers the receiver with USDC if needed, then moves everything.
      const acct = new Account(key.account, RPC, key.secret as KeyPairString);
      const r: any = await acct.signAndSendTransaction({
        receiverId: USDC_MAINNET,
        actions: [
          actions.functionCall("storage_deposit", { account_id: to, registration_only: true }, 30_000_000_000_000n, 1_250_000_000_000_000_000_000n),
          actions.functionCall("ft_transfer", { receiver_id: to, amount: state.balance, memo: "Notara send link" }, 30_000_000_000_000n, 1n),
        ],
      });
      setDone(r.transaction.hash);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card">
        <p className="eyebrow">Notara send link</p>
        <h1>{inv.description}</h1>
        <div className="invoice-sheet">
          <div className="amount">{formatAsset(inv.amount, inv.asset)}</div>
        </div>
      </div>

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
            The money has left this link.{" "}
            {done && (
              <a href={`https://nearblocks.io/txns/${done}`} target="_blank" rel="noreferrer">
                View transaction <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </p>
        </Banner>
      ) : (
        <>
          <form className="card stack" onSubmit={claim}>
            <h2>
              <CircleCheck size={20} style={{ color: "var(--allow)", verticalAlign: "-3px" }} aria-hidden /> {formatAsset(state.balance, USDC_MAINNET)} is waiting for you
            </h2>
            <div className="field">
              <label htmlFor="to">Send it to your NEAR account</label>
              <input id="to" className="input mono" placeholder="yourname.near" value={target} onChange={(e) => setTarget(e.target.value)} autoComplete="off" spellCheck={false} />
              <span className="hint">No NEAR needed: gas and the USDC setup are covered.</span>
            </div>
            <div>
              <button className="btn btn-primary" disabled={busy || !target.trim() || !state.claimReady}>
                {busy && <LoaderCircle size={16} className="spin" aria-hidden />} {state.claimReady ? "Claim" : "Getting the link ready…"}
              </button>
            </div>
          </form>
          <details className="card">
            <summary>No NEAR account yet?</summary>
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
