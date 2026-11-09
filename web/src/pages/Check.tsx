import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { LoaderCircle, Search } from "../components/icons";
import { api, type CheckResponse } from "../lib/api";
import { CheckResult } from "../components/CheckResult";
import { Banner, MainnetBadge } from "../components/ui";
import { useDeployment } from "../components/Layout";
import { SIGNAL_LABELS } from "../lib/format";

const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function CheckPage() {
  const { dep } = useDeployment();
  const [params, setParams] = useSearchParams();
  const [recipient, setRecipient] = useState(params.get("account") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "0.1");
  const [network, setNetwork] = useState<"testnet" | "mainnet">(params.get("network") === "mainnet" ? "mainnet" : "testnet");
  // USDC here is Circle's testnet token, so it only applies on testnet.
  const [currency, setCurrency] = useState<"NEAR" | "USDC">(params.get("asset") === "USDC" && params.get("network") !== "mainnet" ? "USDC" : "NEAR");
  const maxDecimals = currency === "USDC" && network === "testnet" ? 6 : 24;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<CheckResponse | null>(null);

  const accountErr = recipient && !ACCOUNT_RE.test(recipient.trim()) ? "Use lowercase letters, digits, - _ and dots (e.g. alice.testnet)" : null;
  const amountErr = amount && !new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`).test(amount) ? "Enter a number like 0.25" : null;

  // Errors appear once a field is left or a check is attempted, then update live while it's fixed.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const shows = (f: string) => tried || !!touched[f];
  const acctShown = shows("acct") ? (!recipient.trim() ? "Enter the NEAR account you want to check." : accountErr) : null;
  const amtShown = shows("amt") ? (!amount ? "Enter an amount." : amountErr) : null;

  async function run(r = recipient, a = amount, n = network, c: "NEAR" | "USDC" = n === "mainnet" ? "NEAR" : currency) {
    setError(null);
    setRes(null);
    setLoading(true);
    setParams({ account: r.trim(), amount: a, network: n, asset: c }, { replace: true });
    try {
      setRes(await api.check({ network: n, recipient: r.trim(), amountDecimal: a, asset: c }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Deep links like /check?account=aurora&network=mainnet run immediately.
  useEffect(() => {
    if (params.get("account")) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = !recipient.trim() || accountErr ? "acct" : !amount || amountErr ? "amt" : null;
    if (first) return document.getElementById(first)?.focus();
    run();
  };

  const examples: { label: string; account: string; net: "testnet" | "mainnet" }[] = [
    { label: "aurora (mainnet contract)", account: "aurora", net: "mainnet" },
    { label: "a made-up name", account: "definitely-not-real-xyz.near", net: "mainnet" },
  ];
  if (dep?.accounts) {
    examples.unshift(
      { label: "demo attacker", account: dep.accounts.attacker, net: "testnet" },
      { label: "demo merchant", account: dep.accounts.merchant, net: "testnet" },
      { label: "new shop", account: dep.accounts.newShop, net: "testnet" },
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Check a NEAR account</h1>
        <p>See what Notara would decide before an agent pays this account, and exactly which evidence the decision is based on.</p>
      </div>

      <form className="card" onSubmit={submit} noValidate>
        <div className="check-form">
          <div className="field">
            <label htmlFor="acct">Recipient account</label>
            <input
              id="acct"
              className="input mono"
              placeholder="alice.testnet"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, acct: true }))}
              aria-invalid={!!acctShown}
              aria-describedby={acctShown ? "acct-err" : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {acctShown && (
              <span className="err" id="acct-err">
                {acctShown}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="amt">Amount</label>
            <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <input
                id="amt"
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, amt: true }))}
                aria-invalid={!!amtShown}
                aria-describedby={amtShown ? "amt-err" : network === "mainnet" ? "amt-hint" : undefined}
              />
              <select
                className="input"
                style={{ width: "auto" }}
                aria-label="Currency"
                value={network === "mainnet" ? "NEAR" : currency}
                disabled={network === "mainnet"}
                onChange={(e) => setCurrency(e.target.value as "NEAR" | "USDC")}
              >
                <option value="NEAR">NEAR</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
            {amtShown && (
              <span className="err" id="amt-err">
                {amtShown}
              </span>
            )}
            {network === "mainnet" && (
              <span className="hint" id="amt-hint">
                Mainnet checks use NEAR amounts, so the currency is fixed.
              </span>
            )}
          </div>
          <div className="field">
            <label id="net-label">Network</label>
            <div className="segmented" role="group" aria-labelledby="net-label">
              <button type="button" aria-pressed={network === "testnet"} onClick={() => setNetwork("testnet")}>
                Testnet
              </button>
              <button type="button" aria-pressed={network === "mainnet"} onClick={() => setNetwork("mainnet")}>
                <MainnetBadge readOnly />
              </button>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? <LoaderCircle size={16} className="spin" aria-hidden /> : <Search size={16} aria-hidden />} Check
          </button>
        </div>
        <div className="chips">
          <span className="muted small">Try:</span>
          {examples.map((x) => (
            <button
              type="button"
              className="chip"
              key={x.account}
              onClick={() => {
                setRecipient(x.account);
                setNetwork(x.net);
                run(x.account, amount, x.net);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        {loading && (
          <div className="card">
            <p style={{ fontWeight: 700 }}>
              <LoaderCircle size={16} className="spin" aria-hidden /> Checking live NEAR data…
            </p>
            <ul className="muted small" style={{ margin: 0 }}>
              {Object.values(SIGNAL_LABELS).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {error && <Banner kind="error" title="Check failed">{<p>{error}</p>}</Banner>}
        {res && (
          <>
            {network === "mainnet" && (
              <div style={{ marginBottom: 16 }}>
                <Banner kind="info">
                  <p>
                    Mainnet is read-only here. There is no Notara registry on mainnet, so shared reports show as unavailable and the result is at least
                    WARN. That's the fail-closed rule working, not a finding about the account.
                  </p>
                </Banner>
              </div>
            )}
            <CheckResult res={res} />
          </>
        )}
      </div>
    </>
  );
}
