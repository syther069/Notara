// Merchant Passport: a public profile anyone can check before paying someone.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { api, type CheckResponse, type MerchantProfile } from "../lib/api";
import { USDC_MAINNET } from "../lib/format";
import { AccountLink, Banner, Skeleton } from "../components/ui";
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
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.merchant(account).then(setProfile).catch((e) => setError(e.message));
    api.check({ network: "mainnet", recipient: account, amountDecimal: "1", asset: USDC_MAINNET }).then(setCheck).catch((e) => setError(e.message));
  }, [account]);
  useEffect(load, [load]);

  async function verifySite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await api.checkWebsite(account, website);
      setProfile(p);
      toast(p.websiteVerified ? `${p.website} confirmed.` : `${p.website} doesn't list ${account} yet.`, p.websiteVerified ? "ok" : "error");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-head">
        <p className="eyebrow">Merchant Passport</p>
        <h1 style={{ wordBreak: "break-all" }}>{account}</h1>
        <AccountLink id={account} explorer="https://nearblocks.io" />
      </div>
      {error && (
        <Banner kind="error">
          <p>{error}</p>
        </Banner>
      )}

      <SafetyPanel check={check} merchant={profile} registry={dep?.mainnetRegistry} />

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
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input className="input" placeholder="yourshop.com" value={website} onChange={(e) => setWebsite(e.target.value)} aria-label="Your website" />
          <button className="btn btn-primary" disabled={busy || !website.trim()}>
            {busy && <LoaderCircle size={16} className="spin" aria-hidden />} Check
          </button>
        </div>
        {profile?.websiteCheckedAt && (
          <p className="small muted" style={{ margin: 0 }}>
            Last checked {new Date(profile.websiteCheckedAt).toLocaleString()}: {profile.website} {profile.websiteVerified ? "confirms" : "does not confirm"} this account.
          </p>
        )}
      </form>
    </div>
  );
}
