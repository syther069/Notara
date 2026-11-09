import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Invoice, type MerchantProfile, type MyVault } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { formatAsset, linkNetwork, nearAmount, timeAgo } from "../lib/format";
import { ArrowRight, Bot, Globe, Link2, RefreshCw, Search, Send, Wallet } from "../components/icons";
import { Banner, MainnetBadge, Skeleton } from "../components/ui";
import { InvoiceStatus } from "./Invoices";

/** The signed-in home: what this wallet has on Notara, read live. The public landing page stays at "/". */
export function DashboardPage() {
  const w = useWallet();
  const [links, setLinks] = useState<Invoice[] | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [vault, setVault] = useState<MyVault | null | "n/a">(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    if (!w.accountId) return;
    setRefreshing(true);
    setError(null);
    const acct = w.accountId;
    Promise.all([
      api.invoices(acct).then((r) => setLinks(r.invoices.filter((i) => i.merchant === acct).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))),
      api.merchant(acct).then(setProfile),
      w.network === "testnet" ? api.myVault(acct).then(setVault) : Promise.resolve(setVault("n/a")),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };
  useEffect(load, [w.accountId, w.network]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!w.accountId)
    return (
      <div className="page-head">
        <h1>Your dashboard</h1>
        <p>Connect a NEAR wallet to see your payment links, what you've been paid and your AI-agent vault.</p>
        <button className="btn btn-primary btn-lg" onClick={() => w.connect()} disabled={!w.ready || w.busy}>
          <Wallet size={18} aria-hidden /> Connect wallet
        </button>
      </div>
    );

  const paidLinks = links?.filter((l) => l.status === "paid").length ?? 0;

  return (
    <>
      <div className="dash-head">
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {w.network === "mainnet" ? <MainnetBadge /> : <span className="tag testnet">Testnet</span>}
          </p>
          <h1 className="mono" style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.02em", wordBreak: "break-all" }}>
            {w.accountId}
          </h1>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={refreshing} aria-busy={refreshing}>
          <RefreshCw size={15} aria-hidden className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <nav className="dash-actions" aria-label="Quick actions">
        <Link to="/invoices" className="primary">
          <span className="ic">
            <Link2 size={18} aria-hidden />
          </span>
          New payment link
        </Link>
        <Link to="/send">
          <span className="ic">
            <Send size={18} aria-hidden />
          </span>
          Send by link
        </Link>
        <Link to="/check">
          <span className="ic">
            <Search size={18} aria-hidden />
          </span>
          Check an account
        </Link>
        <Link to={`/m/${encodeURIComponent(w.accountId)}`}>
          <span className="ic">
            <Globe size={18} aria-hidden />
          </span>
          Public profile
        </Link>
      </nav>

      {error && (
        <Banner kind="error" title="Some of your data didn't load">
          <p>
            {error}. What loaded is still shown. <button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>
          </p>
        </Banner>
      )}

      <div className="dash-grid" style={{ marginTop: error ? 16 : 0 }}>
        <section className="card" style={{ margin: 0 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Your payment links</h2>
            {links && links.length > 0 && (
              <Link to="/invoices" className="small">
                All links
              </Link>
            )}
          </div>
          {!links ? (
            <Skeleton lines={4} />
          ) : links.length === 0 ? (
            <div className="empty">
              <p>No payment links yet. Create one and share it to get paid in USDC.</p>
              <Link to="/invoices" className="btn btn-primary btn-sm">
                <Link2 size={15} aria-hidden /> Create a payment link
              </Link>
            </div>
          ) : (
            <ul className="list-rows">
              {links.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/pay/${l.id}`} className="t" style={{ display: "block", color: "inherit" }}>
                      {l.description || l.id}
                    </Link>
                    <span className="small muted">
                      {l.id}, {timeAgo(l.createdAt)} {linkNetwork(l.asset) === "mainnet" && <MainnetBadge />}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                    <strong className="num" style={{ whiteSpace: "nowrap" }}>
                      {formatAsset(l.amount, l.asset)}
                    </strong>
                    <InvoiceStatus s={l.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="stack" style={{ margin: 0 }}>
          <section className="card" style={{ margin: 0 }}>
            <h2>Received</h2>
            {!profile ? (
              <Skeleton lines={2} />
            ) : (
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="stat">
                  <div className="label">USDC paid to you</div>
                  <div className="value">{profile.paidTotal}</div>
                </div>
                <div className="stat">
                  <div className="label">Links paid</div>
                  <div className="value">
                    {paidLinks} <span className="muted" style={{ fontSize: 16, fontWeight: 600 }}>of {profile.links}</span>
                  </div>
                </div>
              </div>
            )}
            {profile && (
              <p className="small muted" style={{ margin: "12px 0 0" }}>
                Website:{" "}
                {profile.website ? (
                  <>
                    {profile.website} {profile.websiteVerified ? "(proven)" : "(not proven yet)"}
                  </>
                ) : (
                  <Link to={`/m/${encodeURIComponent(w.accountId)}`}>prove your website</Link>
                )}
              </p>
            )}
          </section>

          <section className="card" style={{ margin: 0 }}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <span className="card-icon" style={{ margin: 0, width: 34, height: 34 }}>
                <Bot size={18} aria-hidden />
              </span>
              <h2 style={{ margin: 0 }}>AI-agent vault</h2>
            </div>
            {vault === null ? (
              <Skeleton lines={2} />
            ) : vault === "n/a" ? (
              <p className="small muted" style={{ margin: 0 }}>
                Vaults run on testnet with free test NEAR. Switch your wallet to testnet to create one.
              </p>
            ) : vault.exists ? (
              <>
                <p className="small" style={{ margin: "0 0 4px" }}>
                  Balance <strong className="num">{nearAmount(vault.balance)} NEAR</strong>
                </p>
                <p className="small muted mono" style={{ margin: "0 0 12px", wordBreak: "break-all" }}>
                  {vault.vault}
                </p>
                <div className="row">
                  <Link to={`/vault?vault=${encodeURIComponent(vault.vault)}`} className="btn btn-secondary btn-sm">
                    Open vault
                  </Link>
                  <Link to="/security" className="btn btn-ghost btn-sm">
                    Run the agent <ArrowRight size={14} className="arrow" aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="small muted">You don't have a vault yet. Create one you own, then watch an AI agent try to pay from it.</p>
                <Link to="/security" className="btn btn-tonal btn-sm">
                  Create my vault <ArrowRight size={14} className="arrow" aria-hidden />
                </Link>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
