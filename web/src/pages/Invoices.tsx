import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, LoaderCircle, Plus, RefreshCw, Wallet } from "../components/icons";
import { QrCode } from "../components/QrCode";
import { api, type Invoice } from "../lib/api";
import { ASSETS, asSentence, formatAsset, linkNetwork, USDC_MAINNET, USDC_TESTNET } from "../lib/format";
import { Banner, CopyButton, MainnetBadge, Skeleton, StepBar, TxLink } from "../components/ui";
import { NotDeployed, useDeployment } from "../components/Layout";
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

const STEPS = ["Describe it", "Sign it", "Share it"];

export function InvoicesPage() {
  const { dep, error: depErr, reload: reloadDep } = useDeployment();
  const wallet = useWallet();
  const [list, setList] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("2");
  const [asset, setAsset] = useState<string>(USDC_TESTNET);
  const [merchant, setMerchant] = useState("");
  const [unsigned, setUnsigned] = useState(false);
  const [made, setMade] = useState<Invoice | null>(null);
  const [signing, setSigning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const linkNet = linkNetwork(asset);
  const isLink = !!linkNet;
  const decimals = ASSETS[asset].decimals;
  const amountErr = amount && !new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(amount) ? `Enter a number like 2.5 (up to ${decimals} decimals)` : null;
  const ready = !!desc.trim() && !!amount && !amountErr;
  // Patient validation: a field shows its error after it's been left or after a create attempt,
  // then updates live while it's being corrected.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const touch = (f: string) => setTouched((t) => (t[f] ? t : { ...t, [f]: true }));
  const shows = (f: string) => tried || !!touched[f];
  const descErr = shows("desc") && !desc.trim() ? "Say what the payment is for. Your customer sees this." : null;
  const amountShown = shows("amount") ? (!amount ? "Enter an amount." : amountErr) : null;

  const [mine, setMine] = useState(true);
  // The public site only lists the connected wallet's own links.
  const owner = (mine || dep?.public) && wallet.accountId ? wallet.accountId : undefined;
  // The public site needs a wallet to know whose links to show; that's a prompt, not an error.
  const needsWallet = !!dep?.public && !owner;
  const reqSeq = useRef(0);
  const [listLoading, setListLoading] = useState(false);
  const load = useCallback(() => {
    // Wait for the deployment answer: before it arrives we don't know if this is the public site.
    if (!dep) return;
    const seq = ++reqSeq.current;
    if (needsWallet) {
      setList(null);
      setError(null);
      return;
    }
    setListLoading(true);
    api
      .invoices(owner)
      .then((r) => {
        if (seq !== reqSeq.current) return; // an older request answered late: keep the newer result
        setList(owner ? r.invoices.filter((i) => i.merchant === owner) : r.invoices);
        setError(null);
      })
      .catch((e) => seq === reqSeq.current && setError(e.message))
      .finally(() => seq === reqSeq.current && setListLoading(false));
  }, [owner, dep, needsWallet]);
  useEffect(load, [load]);

  const merchantErr = shows("merchant") && unsigned && linkNet === "mainnet" && !merchant.trim() ? "Enter the mainnet account that should receive the money, like yourname.near." : null;
  /** On a create attempt: reveal every error and move focus to the first field that needs fixing. */
  function validate(needMerchant: boolean): boolean {
    setTried(true);
    const first = !desc.trim() ? "desc" : !amount || amountErr ? "iamt" : needMerchant && !merchant.trim() ? "merchant" : null;
    if (first) document.getElementById(first)?.focus();
    return !first;
  }

  function done(inv: Invoice) {
    setTried(false);
    setTouched({});
    setMade(inv);
    setDesc("");
    load();
    requestAnimationFrame(() => document.getElementById("link-ready")?.focus());
  }

  /** The merchant's own wallet signs the link, so customers can see it really came from them. */
  async function createSigned() {
    if (!validate(false)) return;
    setFormErr(null);
    setSigning(true);
    try {
      const { token, accountId } = await wallet.signLink(async (account) => (await api.linkMessage({ merchant: account, description: desc.trim(), amountDecimal: amount, asset })).message, linkNet);
      done(await api.createInvoice({ description: desc.trim(), amountDecimal: amount, asset, merchant: accountId, signedToken: token }));
    } catch (e: any) {
      setFormErr(e.message); // stays next to the button; what was typed is kept
    } finally {
      setSigning(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!validate(isLink && linkNet === "mainnet")) return;
    setFormErr(null);
    setCreating(true);
    try {
      done(await api.createInvoice({ description: desc.trim(), amountDecimal: amount, asset, merchant: isLink && merchant.trim() ? merchant.trim() : undefined }));
    } catch (e: any) {
      setFormErr(e.message); // stays next to the button; what was typed is kept
    } finally {
      setCreating(false);
    }
  }

  const madeUrl = made ? `${location.origin}${linkNetwork(made.asset) ? "/pay" : "/invoices"}/${made.id}` : "";
  const walletOnNet = !!wallet.accountId && wallet.network === linkNet;

  return (
    <>
      <div className="page-head">
        <h1>Get paid with a link</h1>
        <p>Make a payment link, share it on WhatsApp, email or an invoice, and receive USDC on NEAR. Your customer sees it's really you before they pay.</p>
      </div>

      {!dep?.deployed && asset === "NEAR" ? (
        <NotDeployed />
      ) : made ? (
        <section className="card ready stack" id="link-ready" tabIndex={-1} aria-labelledby="ready-h" style={{ marginTop: 0, outline: "none" }}>
          <StepBar steps={STEPS} current={2} />
          <div>
            <h2 id="ready-h" style={{ marginBottom: 4 }}>
              Your link is ready to share
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {made.description}: <strong className="num">{formatAsset(made.amount, made.asset)}</strong> to <span className="mono">{made.merchant}</span>,{" "}
              {made.signed ? "signed by your wallet" : "not signed"} {linkNetwork(made.asset) === "mainnet" && <MainnetBadge />}
            </p>
          </div>
          <div className="url">{madeUrl}</div>
          <div className="row">
            <CopyButton text={madeUrl} label="Copy link" />
            {"share" in navigator && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigator.share({ title: made.description, url: madeUrl }).catch(() => {})}>
                Share
              </button>
            )}
            <Link className="btn btn-ghost btn-sm" to={linkNetwork(made.asset) ? `/pay/${made.id}` : `/invoices/${made.id}`}>
              See what your customer sees
            </Link>
          </div>
          <details>
            <summary className="small">Show a QR code, or add a pay button to your website</summary>
            <div className="stack" style={{ marginTop: 8 }}>
              <QrCode text={madeUrl} label="QR code for this payment link" />
              {linkNetwork(made.asset) && <CopyButton text={`<script src="${location.origin}/embed.js" data-link="${made.id}"></script>`} label="Copy website button code" />}
            </div>
          </details>
          <div>
            <button className="btn btn-primary" onClick={() => setMade(null)}>
              <Plus size={16} aria-hidden /> Make another link
            </button>
          </div>
        </section>
      ) : (
        <form className="card" onSubmit={create} noValidate style={{ marginTop: 0 }}>
          <StepBar steps={STEPS} current={ready ? 1 : 0} />
          {asset !== "NEAR" && (
            <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
              <legend className="field-legend">What kind of money?</legend>
              <div className="choices" role="radiogroup" aria-label="What kind of money?">
                <button type="button" role="radio" className="choice" aria-label="Test money, free testnet USDC" aria-checked={asset === USDC_TESTNET} onClick={() => setAsset(USDC_TESTNET)}>
                  <strong>
                    Test money <span className="tag testnet">testnet</span>
                  </strong>
                  <span className="d">Free testnet USDC. Use this to try Notara: nothing of value moves.</span>
                </button>
                <button type="button" role="radio" className="choice" aria-label="Real money, mainnet USDC" aria-checked={asset === USDC_MAINNET} onClick={() => setAsset(USDC_MAINNET)}>
                  <strong>
                    Real money <MainnetBadge />
                  </strong>
                  <span className="d">Real USDC. Your customer can pay from Ethereum, Base, Solana and more.</span>
                </button>
              </div>
            </fieldset>
          )}

          <div className="form-2">
            <div className="field">
              <label htmlFor="desc">What is it for?</label>
              <input
                id="desc"
                className="input"
                maxLength={200}
                placeholder="Logo design, 2 rounds"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => touch("desc")}
                aria-invalid={!!descErr}
                aria-describedby={descErr ? "desc-err desc-hint" : "desc-hint"}
              />
              {descErr && (
                <span className="err" id="desc-err">
                  {descErr}
                </span>
              )}
              <span className="hint" id="desc-hint">
                Your customer sees this{isLink ? ", and your wallet signs it" : ""}.
              </span>
            </div>
            <div className="field">
              <label htmlFor="iamt">Amount ({ASSETS[asset].symbol})</label>
              <input
                id="iamt"
                className="input num"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => touch("amount")}
                aria-invalid={!!amountShown}
                aria-describedby={amountShown ? "iamt-err" : undefined}
              />
              {amountShown && (
                <span className="err" id="iamt-err">
                  {amountShown}
                </span>
              )}
            </div>
          </div>

          {formErr && (
            <div style={{ marginTop: 16 }}>
              <Banner kind="error" title="The link wasn't created">
                <p>{asSentence(formErr)} Everything you typed is still here, so you can try again.</p>
              </Banner>
            </div>
          )}
          {isLink ? (
            <div className="stack" style={{ marginTop: 20 }}>
              <div className="row">
                <button type="button" className="btn btn-primary btn-lg" onClick={createSigned} disabled={signing} aria-busy={signing}>
                  {signing ? <LoaderCircle size={18} /> : <Wallet size={18} aria-hidden />}{" "}
                  {signing ? "Waiting for your wallet" : walletOnNet ? "Sign and create link" : "Connect wallet, sign and create"}
                </button>
                <span className="hint" style={{ maxWidth: "46ch" }}>
                  {walletOnNet ? (
                    <>
                      Paid to <span className="mono">{wallet.accountId}</span>. Your wallet signs a short message: no transaction, no fee.
                    </>
                  ) : (
                    <>The money goes to the {linkNet} wallet you connect. Signing is a short message: no transaction, no fee.</>
                  )}
                </span>
              </div>
              {!unsigned ? (
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setUnsigned(true)}>
                  No wallet that can sign? Create an unsigned link instead
                </button>
              ) : (
                <div className="card flat stack" style={{ gap: 10 }}>
                  <div className="field">
                    <label htmlFor="merchant">
                      NEAR {linkNet} account to pay {linkNet === "testnet" && <span className="muted">(optional)</span>}
                    </label>
                    <input
                      id="merchant"
                      className="input mono"
                      placeholder={linkNet === "testnet" ? "yourname.testnet" : "yourname.near"}
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      onBlur={() => touch("merchant")}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={!!merchantErr}
                      aria-describedby={merchantErr ? "merchant-err" : undefined}
                    />
                    {merchantErr && (
                      <span className="err" id="merchant-err">
                        {merchantErr}
                      </span>
                    )}
                    <span className="hint">
                      {linkNet === "testnet" && dep?.accounts ? <>Leave it empty to bill the demo merchant ({dep.accounts.merchant}). </> : null}
                      Customers will see "Not signed", so they can't be sure it's you.
                    </span>
                  </div>
                  <div>
                    <button className="btn btn-secondary" type="submit" disabled={creating} aria-busy={creating}>
                      {creating ? <LoaderCircle size={16} /> : <Plus size={16} aria-hidden />} Create unsigned link
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" type="submit" disabled={creating} aria-busy={creating}>
                {creating ? <LoaderCircle size={16} /> : <Plus size={16} aria-hidden />} Create agent demo invoice
              </button>
              <span className="hint">The demo AI agent pays it from its vault in test NEAR, after asking Notara.</span>
            </div>
          )}

          {!dep?.public && (
            <details style={{ marginTop: 16 }} open={asset === "NEAR"}>
              <summary className="small">For the AI-agent demo: bill in test NEAR instead</summary>
              <p className="small muted" style={{ margin: "4px 0 8px" }}>
                Makes an invoice the demo AI agent pays from its vault after asking Notara. It isn't a payment link for people.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAsset(asset === "NEAR" ? USDC_TESTNET : "NEAR")}>
                {asset === "NEAR" ? "Back to a USDC payment link" : "Switch to a NEAR invoice"}
              </button>
            </details>
          )}
        </form>
      )}

      <section>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{owner || dep?.public ? "Your links" : "All links on this server"}</h2>
          <div className="row">
            {wallet.accountId && !dep?.public && (
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine
              </label>
            )}
            {dep && !needsWallet && (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={listLoading} aria-busy={listLoading}>
                  <RefreshCw size={14} aria-hidden className={listLoading ? "spin" : ""} /> {listLoading ? "Refreshing" : "Refresh"}
                </button>
                <a className="btn btn-secondary btn-sm" href={`/api/invoices.csv${owner ? `?merchant=${encodeURIComponent(owner)}` : ""}`} download>
                  <Download size={14} aria-hidden /> Export CSV
                </a>
              </>
            )}
          </div>
        </div>
        {depErr ? (
          <Banner kind="error" title="Your links can't load right now">
            <p>
              Notara's server didn't answer, so this page can't fetch your links. They're safe; nothing was changed.{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={reloadDep}>
                Try again
              </button>
            </p>
          </Banner>
        ) : !dep ? (
          <Skeleton />
        ) : needsWallet ? (
          <div className="card flat empty">
            <p style={{ margin: "0 0 12px" }}>Connect the wallet you made links with to see them here. Links are listed per wallet, so nobody else can browse yours.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => wallet.connect()} disabled={!wallet.ready || wallet.busy}>
              <Wallet size={15} aria-hidden /> {wallet.ready ? "Connect wallet" : "Loading wallets…"}
            </button>
          </div>
        ) : error && list === null ? (
          <Banner kind="error" title="Your links didn't load">
            <p>
              {error}{" "}
              <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
                Try again
              </button>
            </p>
          </Banner>
        ) : list === null ? (
          <Skeleton />
        ) : list.length === 0 ? (
          <div className="card flat empty">
            <p style={{ margin: 0 }}>No links yet. Make your first one above; it takes a minute.</p>
          </div>
        ) : (
          <>
          {error && (
            <p className="small muted" role="status">
              Couldn't refresh ({error}). Showing the list as it was. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Try again</button>
            </p>
          )}
          <div className="table-wrap stack-mobile">
            <table>
              <thead>
                <tr>
                  <th>Link</th>
                  <th>For</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>
                    <span className="sr-only">Share</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Link">
                      <Link to={linkNetwork(i.asset) ? `/pay/${i.id}` : `/invoices/${i.id}`} className="mono">
                        {i.id}
                      </Link>
                      <div className="muted small">{new Date(i.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
                    </td>
                    <td data-label="For">
                      {i.description}
                      {i.kind === "send" && <div className="muted small">Send link</div>}
                      {linkNetwork(i.asset) === "mainnet" && (
                        <div>
                          <MainnetBadge />
                        </div>
                      )}
                    </td>
                    <td data-label="Amount" className="num" style={{ whiteSpace: "nowrap" }}>
                      {formatAsset(i.amount, i.asset)}
                    </td>
                    <td data-label="Status">
                      <InvoiceStatus s={i.status} />
                      {i.checkouts?.at(-1)?.refundReason && <div className="muted small">{i.checkouts.at(-1)!.refundReason}</div>}
                    </td>
                    <td data-label="Payment">
                      {i.txUrl ? (
                        <a href={i.txUrl} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : i.txHash ? (
                        <TxLink hash={i.txHash} />
                      ) : (
                        <span className="muted">Not paid yet</span>
                      )}
                    </td>
                    <td data-label="Share">
                      <CopyButton text={`${location.origin}${linkNetwork(i.asset) ? "/pay" : "/invoices"}/${i.id}`} label="Copy link" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </>
  );
}
