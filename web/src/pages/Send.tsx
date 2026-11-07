import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, Send as SendIcon } from "lucide-react";
import { api, type Invoice } from "../lib/api";
import { newLinkKey, SEND_LINK_DAYS, toFragment } from "../lib/linkKey";
import { Banner, CopyButton } from "../components/ui";
import { QrCode } from "../components/QrCode";

export function SendPage() {
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ inv: Invoice; url: string; path: string } | null>(null);
  const amountErr = amount && !/^\d+(\.\d{1,6})?$/.test(amount) ? "Enter a number like 5 or 2.5" : null;

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The key is made here, in your browser. The server only learns which account it controls.
      const key = newLinkKey();
      const inv = await api.createSend({ amountDecimal: amount, implicitAccount: key.account, note: note.trim() });
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
          <div className="field">
            <label htmlFor="samt">Amount (USDC)</label>
            <input id="samt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountErr} />
            {amountErr ? <span className="err">{amountErr}</span> : <span className="hint">Up to 25 USDC per link in this prototype.</span>}
          </div>
          <div className="field">
            <label htmlFor="snote">Note (optional)</label>
            <input id="snote" className="input" maxLength={120} placeholder="Happy birthday!" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <button className="btn btn-primary" disabled={busy || !!amountErr || !amount}>
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
        <div className="card stack">
          <h2>Your link is ready. Save it now.</h2>
          <div className="doc">{made.url}</div>
          <details>
            <summary className="small">Show as a QR code (to hand over in person)</summary>
            <div style={{ marginTop: 8 }}>
              <QrCode text={made.url} label="QR code of the send link" />
            </div>
          </details>
          <div className="row">
            <CopyButton text={made.url} label="Copy link" />
            <Link className="btn btn-primary" to={made.path}>
              Fund it now
            </Link>
          </div>
          <Banner kind="warn" title="This link works like cash">
            <p>
              Anyone who has it can take the money. Only send it to the person it's for. If they haven't claimed it within {SEND_LINK_DAYS} days ({new Date(Date.now() + SEND_LINK_DAYS * 86_400_000).toLocaleDateString()}), open the link yourself to take the money back.
              We can't recover a lost link: the key exists only in it.
            </p>
          </Banner>
        </div>
      )}
      <p className="muted small">Real money on NEAR mainnet. Prototype, not audited: keep amounts small.</p>
    </div>
  );
}
