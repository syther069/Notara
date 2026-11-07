import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api, type Checkout, type CheckResponse, type Invoice, type MerchantProfile, type PayToken } from "../lib/api";
import { formatAsset, unitsToDecimal } from "../lib/format";
import { AccountLink, Banner, CopyButton, Skeleton } from "../components/ui";
import { SafetyPanel } from "../components/SafetyPanel";
import { useWallet } from "../lib/wallet";
import { useDeployment } from "../components/Layout";
import { InvoiceStatus } from "./Invoices";
import { evmAccount, evmPay, hasEvmWallet } from "../lib/evm";
import { QrCode } from "../components/QrCode";

const STATE: Record<string, string> = {
  PENDING_DEPOSIT: "Waiting for your payment.",
  KNOWN_DEPOSIT_TX: "We can see your payment. Converting it now.",
  PROCESSING: "Payment received. Converting it now.",
  INCOMPLETE_DEPOSIT: "That was less than the amount needed. Send the rest before the deadline, or it will be refunded.",
  REFUNDED: "This payment was refunded to your refund address.",
  FAILED: "This payment failed. Any money sent is refunded to your refund address.",
};

export function PayPage() {
  const { id = "" } = useParams();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [check, setCheck] = useState<CheckResponse | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [tokens, setTokens] = useState<PayToken[]>([]);
  const [token, setToken] = useState("");
  const [refundTo, setRefundTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wallet = useWallet();
  const { dep } = useDeployment();
  const [nearBusy, setNearBusy] = useState(false);
  const [evmTx, setEvmTx] = useState<string | null>(null);

  async function payFromNear() {
    if (!inv) return;
    setNearBusy(true);
    setError(null);
    try {
      const { txHash, signerId } = await wallet.payUsdc(inv.asset, inv.merchant, inv.amount);
      setInv(await api.nearTx(inv.id, { txHash, signerId }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setNearBusy(false);
    }
  }

  const load = useCallback(() => {
    api.invoice(id).then(setInv).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);
  useEffect(() => {
    api.payTokens().then((r) => {
      setTokens(r.tokens);
      setToken((t) => t || (r.tokens.find((x) => x.label === "USDC on base") ?? r.tokens[0])?.assetId || "");
    }).catch((e) => setError(e.message));
  }, []);

  const asset = inv?.asset;
  const amount = inv?.amount;
  const merchant = inv?.merchant;
  useEffect(() => {
    if (merchant) api.merchant(merchant).then(setProfile).catch(() => {});
    if (merchant && amount && asset)
      api.check({ network: "mainnet", recipient: merchant, amountDecimal: unitsToDecimal(amount, asset), asset }).then(setCheck).catch((e) => setError(e.message));
  }, [merchant, amount, asset]);

  const current: Checkout | undefined = inv?.checkouts?.at(-1);
  const waiting = !!current && (inv?.status === "unpaid" || inv?.status === "processing");
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [waiting, load]);

  async function getAddress(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setInv(await api.quote(id, { originAsset: token, refundTo: refundTo.trim() }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function evm(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message ?? String(err));
    }
  }

  if (error && !inv)
    return (
      <Banner kind="error">
        <p>{error}</p>
      </Banner>
    );
  if (!inv) return <Skeleton lines={5} />;

  const expired = current && current.status === "PENDING_DEPOSIT" && Date.parse(current.deadline) < Date.now();
  const showForm = inv.status !== "paid" && inv.status !== "processing" && (!current || expired || current.status === "REFUNDED" || current.status === "FAILED");
  const blocked = check?.report.decision === "BLOCK" && inv.kind !== "send";
  const isSend = inv.kind === "send";
  const sendKey = isSend ? (() => { try { return sessionStorage.getItem(`send-key-${inv.id}`); } catch { return null; } })() : null;
  const paidCheckout = inv.checkouts?.find((c) => c.status === "SUCCESS");

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="mono muted">{inv.id}</span>
          <InvoiceStatus s={inv.status} />
        </div>
        <h1 style={{ marginTop: 16 }}>{inv.description}</h1>
        <div className="invoice-sheet">
          <div className="amount">{formatAsset(inv.amount, inv.asset)}</div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {isSend ? "You're funding a send link. The money waits in a one-time account until someone opens the link." : <>Pay to <AccountLink id={inv.merchant} explorer="https://nearblocks.io" /> · <Link to={`/m/${inv.merchant}`}>Merchant Passport</Link></>}
        </p>
        {!isSend && inv.status !== "paid" && (
          <details style={{ marginTop: 8 }}>
            <summary className="small">Show a QR code to pay on a phone</summary>
            <div style={{ marginTop: 8 }}>
              <QrCode text={location.href.split("#")[0]} label="QR code for this payment link" />
            </div>
          </details>
        )}
      </div>

      {inv.status === "paid" ? (
        <Banner kind="ok" title="Paid">
          <p>
            {isSend ? "The link now holds" : `${inv.merchant} received`} {formatAsset(inv.amount, inv.asset)}.{" "}
            {paidCheckout?.txUrl && (
              <a href={paidCheckout.txUrl} target="_blank" rel="noreferrer">
                View transaction <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </p>
        </Banner>
      ) : isSend ? null : (
        <>
          <h2 style={{ marginBottom: 0 }}>Before you pay</h2>
          <SafetyPanel check={check} merchant={profile} signature={inv.signature} signedBy={inv.merchant} registry={dep?.mainnetRegistry} />
        </>
      )}

      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}

      {showForm &&
        (blocked ? (
          <Banner kind="error" title="Payment refused">
            <p>A serious policy rule applies to this account, so we won't create a payment address.</p>
          </Banner>
        ) : (
          <>
          <div className="card stack">
            <h2>Have USDC on NEAR?</h2>
            <p className="muted small" style={{ margin: 0 }}>Pay straight from your NEAR wallet (Meteor, HOT, Intear…). It needs a little NEAR for gas.</p>
            <div>
              <button type="button" className="btn btn-primary" onClick={payFromNear} disabled={nearBusy}>
                {nearBusy && <LoaderCircle size={16} className="spin" aria-hidden />} Pay {formatAsset(inv.amount, inv.asset)} with NEAR wallet
              </button>
            </div>
          </div>
          <form className="card stack" onSubmit={getAddress}>
            <h2>Pay from another chain</h2>
            <div className="field">
              <label htmlFor="token">Token and network you'll pay from</label>
              <select id="token" className="input" value={token} onChange={(e) => setToken(e.target.value)}>
                {tokens.map((t) => (
                  <option key={t.assetId} value={t.assetId}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="refund">Your refund address on that network</label>
              <input id="refund" className="input mono" value={refundTo} onChange={(e) => setRefundTo(e.target.value)} autoComplete="off" spellCheck={false} required />
              {tokens.find((t) => t.assetId === token)?.chainId && hasEvmWallet() && (
                <button type="button" className="btn btn-ghost" style={{ alignSelf: "start" }} onClick={() => evm(async () => setRefundTo(await evmAccount()))}>
                  Use my browser wallet's address
                </button>
              )}
              <span className="hint">If anything goes wrong, or you overpay, the money comes back here. Use a wallet you control, not an exchange deposit address.</span>
            </div>
            <div>
              <button className="btn btn-primary" disabled={busy || !token || !refundTo.trim()}>
                {busy && <LoaderCircle size={16} className="spin" aria-hidden />} Get payment address
              </button>
            </div>
          </form>
          </>
        ))}

      {current && !showForm && inv.status !== "paid" && (
        <div className="card stack" aria-live="polite">
          <h2>Send your payment</h2>
          <p>
            Send <strong>{current.amountIn} {current.label}</strong> to this one-time address:
          </p>
          <div className="doc">{current.depositAddress}</div>
          {!current.depositMemo && <QrCode text={current.depositAddress} label="QR code of the deposit address" />}
          <div className="row">
            <CopyButton text={current.depositAddress} label="Copy address" />
            <CopyButton text={current.amountIn} label="Copy amount" />
          </div>
          {(() => {
            const t = tokens.find((x) => x.assetId === current.originAsset);
            if (!t?.chainId || !current.amountInUnits || current.depositMemo || current.status !== "PENDING_DEPOSIT") return null;
            return hasEvmWallet() ? (
              <div className="stack" style={{ gap: 6 }}>
                <div>
                  <button className="btn btn-primary" onClick={() => evm(async () => setEvmTx(await evmPay({ chainId: t.chainId!, contract: t.contract, to: current.depositAddress, units: current.amountInUnits! })))}>
                    Pay {current.amountIn} {current.label} with MetaMask or another browser wallet
                  </button>
                </div>
                {evmTx && <p className="small mono">Sent: {evmTx}. This page updates when it arrives.</p>}
                {error && <p className="small" role="alert">{error}</p>}
              </div>
            ) : (
              <p className="small muted">Have MetaMask or Rabby? Install it in this browser to pay in one click.</p>
            );
          })()}
          {current.depositMemo && (
            <Banner kind="warn" title="This payment also needs a memo">
              <p className="mono">{current.depositMemo}</p>
            </Banner>
          )}
          <Banner kind="warn">
            <p>
              Send only {current.label}. Another token or network can lose your money. Pay before {new Date(current.deadline).toLocaleTimeString()}.
            </p>
          </Banner>
          <p className="row" style={{ margin: 0 }}>
            {current.status === "SUCCESS" ? <CircleCheck size={16} aria-hidden /> : <LoaderCircle size={16} className="spin" aria-hidden />}
            {STATE[current.status] ?? current.status}
          </p>
        </div>
      )}
      {current && showForm && STATE[current.status] && current.status !== "PENDING_DEPOSIT" && (
        <Banner kind="warn">
          <p>{STATE[current.status]}{current.refundReason ? ` Reason: ${current.refundReason}.` : ""}</p>
        </Banner>
      )}

      {isSend && sendKey && (
        <p>
          <Link className="btn btn-secondary" to={`/claim/${inv.id}#${sendKey}`}>
            Back to your send link
          </Link>
        </p>
      )}
      <p className="muted small">
        Routed by NEAR Intents. We never hold your money. This is a prototype and has not been audited, so use small amounts.
      </p>
    </div>
  );
}
