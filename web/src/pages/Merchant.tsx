// Merchant Passport: a public profile anyone can check before paying someone.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { LoaderCircle } from "../components/icons";
import { api, type CheckResponse, type MerchantProfile } from "../lib/api";
import { EXPLORER, netOfAccount, usdcFor } from "../lib/format";
import { AccountLink, Banner, NetworkTag, Skeleton } from "../components/ui";
import { SafetyPanel } from "../components/SafetyPanel";
import { useDeployment, useToast } from "../components/Layout";

export function MerchantPage() {
  const { account = "" } = useParams();
  const toast = useToast();
  const { dep } = useDeployment();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [check, setCheck] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  // The website check result and any failure stay under the form, not only in a toast.
  const [siteErr, setSiteErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.merchant(account).then(setProfile).catch((e) => setError(e.message));
    api.check({ network: netOfAccount(account), recipient: account, amountDecimal: "1", asset: usdcFor(netOfAccount(account)) }).then(setCheck).catch((e) => setError(e.message));
  }, [account]);
  useEffect(load, [load]);

  async function verifySite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSiteErr(null);
    try {
      const p = await api.checkWebsite(account, website);
      setProfile(p);
      if (p.websiteVerified) toast(`${p.website} confirmed.`, "ok");
    } catch (err: any) {
      setSiteErr(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div className="tags">
          <span className="tag">Merchant Passport</span> <NetworkTag network={netOfAccount(account)} />
        </div>
        <h1 style={{ wordBreak: "break-all" }}>{account}</h1>
        <AccountLink id={account} explorer={EXPLORER[netOfAccount(account)]} />
      </div>
      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}

      <SafetyPanel check={check} merchant={profile} registry={netOfAccount(account) === "testnet" ? dep?.registry : dep?.mainnetRegistry} />

      {!profile ? (
        <Skeleton lines={3} />
      ) : (
        <div className="grid-3">
          <div className="card stat">
            <div className="label">Payment links</div>
            <div className="value">{profile.links}</div>
            <div className="muted small">{profile.signedLinks} signed by their wallet</div>
          </div>
          <div className="card stat">
            <div className="label">Paid through Notara</div>
            <div className="value">{profile.paid}</div>
          </div>
          <div className="card stat">
            <div className="label">Received</div>
            <div className="value">{profile.paidTotal} USDC</div>
          </div>
        </div>
      )}
      <p className="muted small">Counts only include payments made through this Notara server.</p>

      <form className="card stack" onSubmit={verifySite}>
        <h2>Is this your account? Prove you own your website</h2>
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Put a text file at <code>https://yourshop.com/.well-known/near.txt</code> containing <code>{account}</code>.
          </li>
          <li>Enter your website below. We fetch the file and show the result to your customers.</li>
        </ol>
        <div className="field">
          <label htmlFor="site">Your website</label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              id="site"
              className="input"
              placeholder="yourshop.com"
              value={website}
              onChange={(e) => (setWebsite(e.target.value), setSiteErr(null))}
              aria-invalid={!!siteErr}
              aria-describedby={siteErr ? "site-err" : undefined}
              autoComplete="url"
              inputMode="url"
            />
            <button className="btn btn-primary" disabled={busy || !website.trim()} aria-busy={busy}>
              {busy && <LoaderCircle size={16} className="spin" aria-hidden />} Check my website
            </button>
          </div>
          {siteErr && (
            <span className="err" id="site-err" role="alert">
              {siteErr}. Nothing was changed; check the address and try again.
            </span>
          )}
        </div>
        {profile?.websiteCheckedAt && (
          <p className="small muted" style={{ margin: 0 }}>
            Last checked {new Date(profile.websiteCheckedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}: {profile.website} {profile.websiteVerified ? "confirms" : "does not confirm"} this account.
          </p>
        )}
      </form>
    </div>
  );
}
