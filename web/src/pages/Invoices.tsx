import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { api, type Invoice } from "../lib/api";
import { ASSETS, formatAsset, USDC_MAINNET, USDC_TESTNET } from "../lib/format";
import { Banner, CopyButton, Skeleton, TxLink } from "../components/ui";
import { NotDeployed, useDeployment, useToast } from "../components/Layout";
import { useWallet } from "../lib/wallet";

export const INVOICE_STATUS: Record<Invoice["status"], { text: string; cls: string }> = {
  unpaid: { text: "Unpaid", cls: "NEUTRAL" },
  pending_approval: { text: "Waiting for approval", cls: "WARN" },
  processing: { text: "Processing", cls: "WARN" },
  refunded: { text: "Refunded", cls: "NEUTRAL" },
  paid: { text: "Paid", cls: "ALLOW" },
  refused: { text: "Refused", cls: "BLOCK" },
  failed: { text: "Failed", cls: "BLOCK" },
};

export function InvoiceStatus({ s }: { s: Invoice["status"] }) {
  const x = INVOICE_STATUS[s];
  return <span className={`badge ${x.cls}`}>{x.text}</span>;
}

export function InvoicesPage() {
  const { dep } = useDeployment();
  const toast = useToast();
  const [list, setList] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("2");
  const [asset, setAsset] = useState<string>(USDC_MAINNET);
  const [merchant, setMerchant] = useState("");
  const isLink = asset === USDC_MAINNET;
  const wallet = useWallet();
  const [signing, setSigning] = useState(false);

  /** The merchant's own mainnet wallet signs the link, so customers can see it really came from them. */
  async function createSigned() {
    if (!desc.trim() || amountErr) return;
    setSigning(true);
    try {
      const { token, accountId } = await wallet.signLink(async (account) => (await api.linkMessage({ merchant: account, description: desc.trim(), amountDecimal: amount, asset })).message);
      const inv = await api.createInvoice({ description: desc.trim(), amountDecimal: amount, asset, merchant: accountId, signedToken: token });
      toast(`Signed payment link ${inv.id} created for ${accountId}.`);
      setDesc("");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSigning(false);
    }
  }
  const [creating, setCreating] = useState(false);
  const decimals = ASSETS[asset].decimals;

  const [mine, setMine] = useState(false);
  const owner = mine && wallet.network === "mainnet" ? wallet.accountId ?? undefined : undefined;
  const load = useCallback(() => {
    api
      .invoices(owner)
      .then((r) => {
        setList(r.invoices);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [owner]);
  useEffect(load, [load]);

  const amountErr =
    amount && !new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(amount) ? `Enter a number like 2.5 (max ${decimals} decimals)` : null;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!desc.trim() || amountErr || (isLink && !merchant.trim())) return;
    setCreating(true);
    try {
      const inv = await api.createInvoice({ description: desc.trim(), amountDecimal: amount, asset, merchant: isLink ? merchant.trim() : undefined });
      toast(`${isLink ? "Payment link" : "Invoice"} ${inv.id} created.`);
      setDesc("");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Invoices</h1>
        <p>
          For merchants: create an invoice and share its link. The customer's AI agent pays it through Notara and the vault, and the status here
          comes from the vault's on-chain record.
        </p>
        {dep?.accounts && (
          <p className="small">
            Paid to the demo merchant <span className="mono">{dep.accounts.merchant}</span>
          </p>
        )}
      </div>

      {!dep?.deployed ? (
        <NotDeployed />
      ) : (
        <form className="card" onSubmit={create} noValidate>
          <h2>New invoice</h2>
          <div className="check-form">
            <div className="field">
              <label htmlFor="desc">What is it for?</label>
              <input id="desc" className="input" maxLength={200} placeholder="1,000 API credits" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="iamt">Amount ({ASSETS[asset].symbol})</label>
              <input id="iamt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountErr} />
              {amountErr && <span className="err">{amountErr}</span>}
            </div>
            <div className="field">
              <label id="cur-label">Currency</label>
              <div className="segmented" role="group" aria-labelledby="cur-label">
                <button type="button" aria-pressed={isLink} onClick={() => setAsset(USDC_MAINNET)}>
                  USDC, any chain
                </button>
                <button type="button" aria-pressed={asset === USDC_TESTNET} onClick={() => setAsset(USDC_TESTNET)}>
                  USDC test
                </button>
                <button type="button" aria-pressed={asset === "NEAR"} onClick={() => setAsset("NEAR")}>
                  NEAR test
                </button>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creating || !desc.trim() || !!amountErr || (isLink && !merchant.trim())}>
              {creating ? <LoaderCircle size={16} className="spin" aria-hidden /> : <Plus size={16} aria-hidden />} Create
            </button>
          </div>
          {isLink && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="merchant">Your NEAR mainnet account (the money goes here)</label>
              <input id="merchant" className="input mono" placeholder="yourname.near" value={merchant} onChange={(e) => setMerchant(e.target.value)} autoComplete="off" spellCheck={false} />
              <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={createSigned} disabled={signing || !desc.trim() || !!amountErr}>
                  {signing && <LoaderCircle size={14} className="spin" aria-hidden />} Sign with my NEAR wallet and create
                </button>
                <span className="hint">Recommended. Your wallet signs who gets paid, how much and for what, and customers see it was really you.</span>
              </div>
            </div>
          )}
          <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
            {isLink ? "Real money: your customer pays from any chain through NEAR Intents and you receive exact USDC on NEAR. " : "Test money only. "}
            USDC test is Circle's testnet USDC on NEAR (a NEP-141 token). The vault pays it with <code>ft_transfer</code>, attaching the required 1 yoctoNEAR
            itself, because the agent's limited key can't attach deposits.
          </p>
        </form>
      )}

      <section>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{owner ? `My links (${owner})` : "All links and invoices"}</h2>
          <div className="row">
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={14} aria-hidden /> Refresh
            </button>
            {wallet.accountId && wallet.network === "mainnet" && (
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine
              </label>
            )}
            <a className="btn btn-secondary btn-sm" href={`/api/invoices.csv${owner ? `?merchant=${encodeURIComponent(owner)}` : ""}`} download>
              <Download size={14} aria-hidden /> Export CSV
            </a>
          </div>
        </div>
        {error && (
          <Banner kind="error">
            <p>{error}</p>
          </Banner>
        )}
        {list === null ? (
          !error && <Skeleton />
        ) : list.length === 0 ? (
          <p className="muted">No invoices yet. Create one above.</p>
        ) : (
          <div className="table-wrap stack-mobile">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Invoice">
                      <Link to={i.asset === USDC_MAINNET ? `/pay/${i.id}` : `/invoices/${i.id}`} className="mono">
                        {i.id}
                      </Link>
                      <div className="muted small">{new Date(i.createdAt).toLocaleString()}</div>
                    </td>
                    <td data-label="Description">{i.description}</td>
                    <td data-label="Amount">
                      {formatAsset(i.amount, i.asset)}
                    </td>
                    <td data-label="Status">
                      <InvoiceStatus s={i.status} />
                      {i.checkouts?.at(-1)?.refundReason && <div className="muted small">{i.checkouts.at(-1)!.refundReason}</div>}
                      {i.kind === "send" && <div className="muted small">send link</div>}
                    </td>
                    <td data-label="Payment">{i.txUrl ? <a href={i.txUrl} target="_blank" rel="noreferrer">View</a> : i.txHash ? <TxLink hash={i.txHash} /> : <span className="muted">—</span>}</td>
                    <td data-label="Link">
                      <CopyButton text={`${location.origin}${i.asset === USDC_MAINNET ? "/pay" : "/invoices"}/${i.id}`} label="Copy link" />
                      {i.asset === USDC_MAINNET && i.kind !== "send" && (
                        <CopyButton text={`<script src="${location.origin}/embed.js" data-link="${i.id}"></script>`} label="Copy button for your site" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
