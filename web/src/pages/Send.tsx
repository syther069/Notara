import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, Send as SendIcon } from "../components/icons";
import { api, type Invoice } from "../lib/api";
import { newLinkKey, SEND_LINK_DAYS, toFragment } from "../lib/linkKey";
import { Banner, CopyButton, MainnetBadge, StepBar } from "../components/ui";
import { QrCode } from "../components/QrCode";
import { useDeployment } from "../components/Layout";

export function SendPage() {
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ inv: Invoice; url: string; path: string } | null>(null);
  const [network, setNetwork] = useState<"mainnet" | "testnet">("testnet");
  const { dep } = useDeployment();
  // Off only when the server says so; an unknown answer (still loading) leaves the button alone.
  const mainnetOff = network === "mainnet" && dep?.mainnetSend === false;
  const amountErr = amount &&!/^\d+(\.\d{1,6})?$/.test(amount) ? "Enter a number like 5 or 2.5" : null;

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The key is made here, in your browser. The server only learns which account it controls.
      const key = newLinkKey();
      const inv = await api.createSend({ amountDecimal: amount, implicitAccount: key.account, note: note.trim(), network });
      const fragment = toFragment(key);
      try {
        sessionStorage.setItem(`send-key-${inv.id}`, fragment);
      } catch {}
      const path = `/claim/${inv.id}#${fragment}`;
      setMade({ inv, path, url: `${location.origin}${path}` });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-head">
        <h1>Send money with a link</h1>
        <p>Pay from any chain. The person you send the link to gets USDC on NEAR, with no wallet or NEAR needed to start.</p>
      </div>

      {!made ? (
        <form className="card stack" onSubmit={create} noValidate>
          <StepBar steps={["Create it", "Fund it", "Share it"]} current={0} />
          <div className="field">
            <label htmlFor="samt">Amount (USDC)</label>
            <input id="samt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountErr} />
            {amountErr ? <span className="err">{amountErr}</span> : <span className="hint">Up to 25 USDC per link in this prototype.</span>}
          </div>
          <div className="field">
            <label id="snet">Money</label>
            <div className="segmented" role="group" aria-labelledby="snet">
              <button type="button" aria-pressed={network === "testnet"} onClick={() => setNetwork("testnet")}>
                Testnet USDC (free)
              </button>
              <button type="button" aria-pressed={network === "mainnet"} onClick={() => setNetwork("mainnet")}>
                Real USDC <MainnetBadge />
              </button>
            </div>
            <span className="hint">{network === "testnet" ? "Fund it from a NEAR testnet wallet with free USDC from faucet.circle.com." : "Fund it from any chain through NEAR Intents."}</span>
          </div>
          {mainnetOff && (
            <Banner kind="warn" title="Real-money send links aren't switched on yet">
              <p>
                They need a sponsor account that pays the gas for the person who claims the money, and this site doesn't have one yet. Use Testnet USDC to try the full flow
                for free.
              </p>
            </Banner>
          )}
          <div className="field">
            <label htmlFor="snote">Note (optional)</label>
            <input id="snote" className="input" maxLength={120} placeholder="Happy birthday!" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <button className="btn btn-primary" disabled={busy || !!amountErr || !amount || mainnetOff}>
              {busy ? <LoaderCircle size={16} className="spin" aria-hidden /> : <SendIcon size={16} aria-hidden />} Create send link
            </button>
          </div>
          {error && (
            <Banner kind="error">
              <p>{error}</p>
            </Banner>
          )}
        </form>
      ) : (
        <div className="card ready stack">
          <StepBar steps={["Create it", "Fund it", "Share it"]} current={1} />
          <div>
            <h2 style={{ marginBottom: 4 }}>Link created. Now put the money in.</h2>
            <p className="muted" style={{ margin: 0 }}>
              Fund it first, then share it. Until it's funded, the person you send it to will see an empty link.
            </p>
          </div>
          <div>
            <Link className="btn btn-primary btn-lg" to={made.path}>
              Fund it now
            </Link>
          </div>
          <div className="field">
            <span className="label">Your send link (save it: it's the only key to the money)</span>
            <div className="url">{made.url}</div>
          </div>
          <details>
            <summary className="small">Show as a QR code (to hand over in person)</summary>
            <div style={{ marginTop: 8 }}>
              <QrCode text={made.url} label="QR code of the send link" />
            </div>
          </details>
          <div className="row">
            <CopyButton text={made.url} label="Copy link" />
          </div>
          <Banner kind="warn" title="This link works like cash">
            <p>
              Anyone who has it can take the money. Only send it to the person it's for. If they haven't claimed it within {SEND_LINK_DAYS} days ({new Date(Date.now() + SEND_LINK_DAYS * 86_400_000).toLocaleDateString()}), open the link yourself to take the money back.
              We can't recover a lost link: the key exists only in it.
            </p>
          </Banner>
        </div>
      )}
      <p className="muted small">{network === "mainnet" ? "Real money on NEAR mainnet. Prototype, not audited: keep amounts small." : "Testnet: free test money, nothing of value moves."}</p>
    </div>
  );
}
