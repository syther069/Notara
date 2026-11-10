import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Invoice, type MerchantProfile, type MyVault } from "../lib/api";
import { useWallet } from "../lib/wallet";
import { formatAsset, linkNetwork, nearAmount, timeAgo } from "../lib/format";
import { mountMoment } from "../lib/kit";
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
        <h1>Your Notara dashboard</h1>
        <p>Connect a NEAR wallet to see your payment links, what you've been paid and your AI-agent vault. Notara reads them live; nothing is sent.</p>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => w.connect()} disabled={!w.ready || w.busy}>
            <Wallet size={18} aria-hidden /> Connect wallet
          </button>
          <Link to="/start" className="btn btn-secondary">
            Try it on testnet
          </Link>
        </div>
      </div>
    );

  const paidLinks = links?.filter((l) => l.status === "paid").length ?? 0;
  const vaultFigure = vault === null ? null : vault === "n/a" ? "Testnet only" : vault.exists ? `${nearAmount(vault.balance)} NEAR` : "None yet";
  // The figures roll once (counter-rolls) when every one of them is final: a figure that changes later is a new row.
  const figures = profile && links ? [profile.paidTotal, String(paidLinks), String(links.length), vaultFigure ?? "…"] : null;

  return (
    <>
      <div className="dash-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            {w.network === "mainnet" ? <MainnetBadge /> : <span className="tag testnet">Testnet</span>}
          </div>
          <h1 style={{ margin: 0 }}>Your Notara dashboard</h1>
          <p className="acct">{w.accountId}</p>
        </div>
        <div className="row">
          <Link to="/invoices" className="btn btn-primary">
            <Link2 size={18} aria-hidden /> Create a payment link
          </Link>
          <button className="btn btn-secondary" onClick={load} disabled={refreshing} aria-busy={refreshing}>
            <RefreshCw size={16} aria-hidden className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 24 }}>
          <Banner kind="error" title="Some of your data didn't load">
            <p>
              {error}. What loaded is still shown.{" "}
              <button className="btn btn-ghost btn-sm" onClick={load}>
                Try again
              </button>
            </p>
          </Banner>
        </div>
      )}

      {figures && vault !== null ? (
        <div className="dash-stats" data-moment="counter-rolls" key={figures.join("|")} ref={mountMoment} aria-label="Your totals, read live">
          <div>
            <p className="label">USDC paid to you</p>
            <p className="t-stat num">{figures[0]}</p>
          </div>
          <div>
            <p className="label">Links paid</p>
            <p className="t-stat num">{figures[1]}</p>
          </div>
          <div>
            <p className="label">Payment links</p>
            <p className="t-stat num">{figures[2]}</p>
          </div>
          <div>
            <p className="label">AI-agent vault</p>
            <p className="t-stat num">{figures[3]}</p>
          </div>
        </div>
      ) : (
        <div className="dash-stats" aria-busy="true">
          {["USDC paid to you", "Links paid", "Payment links", "AI-agent vault"].map((l) => (
            <div key={l}>
              <p className="label">{l}</p>
              <div className="skeleton" style={{ height: 34, width: "60%", marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="links-h">
        <div className="tool-split">
          <div className="tool-main card">
            <div className="sec-head">
              <h2 id="links-h">Your payment links</h2>
              {links && links.length > 0 && (
                <Link to="/invoices" className="ulink always">
                  All links <ArrowRight size={14} aria-hidden />
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
              <ul className="dash-rows">
                {links.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/pay/${l.id}`} className="t">
                        {l.description || l.id}
                      </Link>
                      <span className="small muted">
                        <span className="mono">{l.id}</span>, {timeAgo(l.createdAt)} {linkNetwork(l.asset) === "mainnet" && <MainnetBadge />}
                      </span>
                    </div>
                    <strong className="num" style={{ whiteSpace: "nowrap" }}>
                      {formatAsset(l.amount, l.asset)}
                    </strong>
                    <InvoiceStatus s={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="tool-side dash-side">
            <section className="card" style={{ margin: 0 }} aria-labelledby="vault-h">
              <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                <span className="card-icon" style={{ margin: 0 }}>
                  <Bot size={20} aria-hidden />
                </span>
                <h2 id="vault-h" style={{ margin: 0 }}>
                  AI-agent vault
                </h2>
              </div>
              {vault === null ? (
                <Skeleton lines={2} />
              ) : vault === "n/a" ? (
                <p className="muted" style={{ margin: 0 }}>
                  Vaults run on testnet with free test NEAR. Switch your wallet to testnet to create one.
                </p>
              ) : vault.exists ? (
                <>
                  <p className="small muted mono" style={{ margin: "0 0 16px", wordBreak: "break-all" }}>
                    {vault.vault}
                  </p>
                  <div className="row">
                    <Link to={`/vault?vault=${encodeURIComponent(vault.vault)}`} className="btn btn-secondary btn-sm">
                      Open the vault
                    </Link>
                    <Link to="/security" className="btn btn-ghost btn-sm">
                      Run the agent
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted">You don't have a vault yet. Create one you own, then watch an AI agent try to pay from it.</p>
                  <Link to="/security" className="btn btn-secondary btn-sm">
                    Create my vault <ArrowRight size={14} className="arrow" aria-hidden />
                  </Link>
                </>
              )}
            </section>

            <section className="card" style={{ margin: 0 }} aria-labelledby="site-h">
              <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                <span className="card-icon" style={{ margin: 0 }}>
                  <Globe size={20} aria-hidden />
                </span>
                <h2 id="site-h" style={{ margin: 0 }}>
                  Public profile
                </h2>
              </div>
              {!profile ? (
                <Skeleton lines={2} />
              ) : (
                <p className="muted" style={{ margin: "0 0 16px" }}>
                  Website:{" "}
                  {profile.website ? (
                    <>
                      <span className="mono">{profile.website}</span> {profile.websiteVerified ? "(proven)" : "(not proven yet)"}
                    </>
                  ) : (
                    "none added yet"
                  )}
                  . Customers see this before they pay.
                </p>
              )}
              <Link to={`/m/${encodeURIComponent(w.accountId)}`} className="btn btn-secondary btn-sm">
                {profile?.websiteVerified ? "Open my profile" : "Prove my website"}
              </Link>
            </section>
          </div>
        </div>
      </section>

      <section aria-labelledby="do-h">
        <h2 id="do-h">Get paid, send or check</h2>
        <nav className="dash-tiles" aria-label="What you can do">
          <Link to="/invoices" className="dash-tile is-main">
            <span className="ic">
              <Link2 size={22} aria-hidden />
            </span>
            <span>
              <strong>Payment link</strong>
              <br />
              <span className="d">Signed by your wallet, paid from any chain.</span>
            </span>
          </Link>
          <Link to="/send" className="dash-tile">
            <span className="ic">
              <Send size={22} aria-hidden />
            </span>
            <span>
              <strong>Send link</strong>
              <br />
              <span className="d">USDC anyone can claim, no wallet needed yet.</span>
            </span>
          </Link>
          <Link to="/check" className="dash-tile">
            <span className="ic">
              <Search size={22} aria-hidden />
            </span>
            <span>
              <strong>Account check</strong>
              <br />
              <span className="d">Age, activity and scam reports, read live.</span>
            </span>
          </Link>
          <Link to={`/m/${encodeURIComponent(w.accountId)}`} className="dash-tile">
            <span className="ic">
              <Globe size={22} aria-hidden />
            </span>
            <span>
              <strong>Public profile</strong>
              <br />
              <span className="d">What customers see about you.</span>
            </span>
          </Link>
        </nav>
      </section>
    </>
  );
}
