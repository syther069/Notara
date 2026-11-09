import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, LoaderCircle, RefreshCw } from "../components/icons";
import { api, type CheckResponse, type Invoice } from "../lib/api";
import { formatAsset, linkNetwork } from "../lib/format";
import { AccountLink, Banner, Skeleton, TxLink } from "../components/ui";
import { CheckResult } from "../components/CheckResult";
import { useToast } from "../components/Layout";
import { InvoiceStatus } from "./Invoices";

export function InvoicePage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [check, setCheck] = useState<CheckResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const load = useCallback(() => {
    api
      .invoice(id)
      .then((i) => {
        setInv(i);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function pay() {
    setPaying(true);
    setCheck(null);
    try {
      const r = await api.payInvoice(id);
      setInv(r.invoice);
      setCheck(r.check ?? null);
      setLog(r.log);
      toast(
        r.invoice.status === "paid"
          ? `Invoice ${id} paid.`
          : r.invoice.status === "pending_approval"
            ? `Invoice ${id} is waiting for the owner's approval.`
            : `Invoice ${id}: ${r.invoice.status}.`,
        r.invoice.status === "paid" || r.invoice.status === "pending_approval" ? "ok" : "error",
      );
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setPaying(false);
    }
  }

  if (linkNetwork(inv?.asset)) return <Navigate to={`/pay/${inv!.id}`} replace />;

  return (
    <>
      <p>
        <Link to="/invoices" className="small">
          <ArrowLeft size={14} aria-hidden /> All invoices
        </Link>
      </p>
      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}
      {!inv ? (
        !error && <Skeleton lines={5} />
      ) : (
        <div className="stack">
          <div className="card invoice-sheet">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mono muted">{inv.id}</span>
              <InvoiceStatus s={inv.status} />
            </div>
            <h1 className="link-title" style={{ marginTop: 16 }}>{inv.description}</h1>
            <div className="amount">
              {formatAsset(inv.amount, inv.asset)}
            </div>
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>Pay to</dt>
              <dd>
                <AccountLink id={inv.merchant} />
              </dd>
              <dt>Created</dt>
              <dd>{new Date(inv.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</dd>
              {inv.decision && (
                <>
                  <dt>Notara verdict</dt>
                  <dd>{inv.decision}</dd>
                </>
              )}
              {inv.vaultPaymentId && (
                <>
                  <dt>Vault payment</dt>
                  <dd className="mono">#{inv.vaultPaymentId}</dd>
                </>
              )}
              {inv.txHash && (
                <>
                  <dt>Transaction</dt>
                  <dd>
                    <TxLink hash={inv.txHash} />
                  </dd>
                </>
              )}
              {inv.paidAt && (
                <>
                  <dt>Paid at</dt>
                  <dd>{new Date(inv.paidAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</dd>
                </>
              )}
            </dl>
            {inv.reasons && inv.reasons.length > 0 && inv.status !== "paid" && (
              <div style={{ marginTop: 16 }}>
                <Banner kind={inv.status === "pending_approval" ? "warn" : "error"} title="Why">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {inv.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </Banner>
              </div>
            )}
            <div className="row" style={{ marginTop: 20 }}>
              {(inv.status === "unpaid" || inv.status === "refused" || inv.status === "failed") && (
                <button className="btn btn-primary" onClick={pay} disabled={paying}>
                  {paying ? <LoaderCircle size={16} className="spin" aria-hidden /> : <Bot size={16} aria-hidden />}
                  {paying ? "Agent is paying…" : "Pay with the customer's AI agent"}
                </button>
              )}
              {inv.status === "pending_approval" && (
                <Link to="/vault" className="btn btn-secondary">
                  Approve on the Vault page
                </Link>
              )}
              <button className="btn btn-secondary" onClick={load}>
                <RefreshCw size={16} aria-hidden /> Refresh status
              </button>
            </div>
            <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
              The agent pays through Notara check and the testnet vault. It never holds a key that can send money directly.
            </p>
          </div>

          {log.length > 0 && (
            <div className="console">
              <div className="console-head">Agent log</div>
              <div className="console-body" style={{ height: "auto", maxHeight: 220 }}>
                {log.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}
          {check && (
            <>
              <h2>Notara check for this payment</h2>
              <CheckResult res={check} />
            </>
          )}
        </div>
      )}
    </>
  );
}
