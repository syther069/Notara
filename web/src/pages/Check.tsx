// Check an Account: one question. "Is this account safe to pay?" A verdict, a plain reason, the signals.
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type CheckResponse } from "@/lib/api";
import { recordCheck } from "@/lib/data";
import { CHECKS_KEY, WATCH_EVERY_MS, WATCH_KEY, useLocal, type LocalCheck, type Watch } from "@/lib/local";
import { asSentence, SIGNAL_LABELS, timeAgo, usdcFor, validAccount } from "@/lib/format";
import { useDeployment } from "@/components/Layout";
import { Eye, Search, Send } from "@/components/icons";
import { ShareSheet } from "@/components/vengeance/share-sheet";
import { PageHead } from "@/components/shell/AppShell";
import { handle } from "@/components/app/wallet";
import { Button, Card, CopyChip, FormField, Hint, LinkButton, Notice, Segmented, Shimmer, TextInput } from "@/components/app/ui";
import { SignalsPanel, VerdictCard, VerdictChip, topReason } from "@/components/app/verdict";
import { cn } from "@/lib/utils";

type Net = "testnet" | "mainnet";

export function CheckPage() {
  const { dep } = useDeployment();
  const [params, setParams] = useSearchParams();
  const [recipient, setRecipient] = useState(params.get("account") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "10");
  const [network, setNetwork] = useState<Net>(params.get("network") === "testnet" ? "testnet" : params.get("network") === "mainnet" ? "mainnet" : "testnet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<CheckResponse | null>(null);
  const [tried, setTried] = useState(false);
  const [recent] = useLocal<LocalCheck[]>(CHECKS_KEY, []);
  const [watches, setWatches] = useLocal<Watch[]>(WATCH_KEY, []);

  const acct = recipient.trim();
  const acctErr = !acct ? "Enter the NEAR account you want to check." : !validAccount(acct) ? "Use lowercase letters, digits, - _ and dots, like alice.near." : null;
  const amtErr = !amount ? "Enter the amount you plan to pay." : !/^\d+(\.\d{1,6})?$/.test(amount) ? "Enter a number like 25 or 12.50." : null;

  async function run(a = acct, amt = amount, n = network) {
    setError(null);
    setRes(null);
    setLoading(true);
    setParams({ account: a, amount: amt, network: n }, { replace: true });
    try {
      const r = await api.check({ network: n, recipient: a, amountDecimal: amt, asset: usdcFor(n) });
      setRes(r);
      recordCheck({ account: a, network: n, decision: r.report.decision, reason: topReason(r), at: new Date().toISOString() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  // A shared or deep link like /agents/check?account=aurora&network=mainnet runs at once.
  useEffect(() => {
    if (params.get("account") && validAccount(params.get("account")!)) run(params.get("account")!, params.get("amount") ?? "10", network);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = acctErr ? "ck-acct" : amtErr ? "ck-amt" : null;
    if (first) return document.getElementById(first)?.focus();
    run();
  };

  const examples: { label: string; account: string; net: Net }[] = [
    ...(dep?.accounts
      ? ([
          { label: "Demo attacker", account: dep.accounts.attacker, net: "testnet" },
          { label: "Demo merchant", account: dep.accounts.merchant, net: "testnet" },
          { label: "New shop", account: dep.accounts.newShop, net: "testnet" },
        ] as const)
      : []),
    { label: "aurora (mainnet)", account: "aurora", net: "mainnet" },
    { label: "A made-up name", account: "definitely-not-real-xyz.near", net: "mainnet" },
  ];

  const checked = res?.report.request;
  const watch = checked ? watches.find((x) => x.account === checked.recipient && x.network === checked.network) : undefined;
  const shareUrl = checked ? `${location.origin}/agents/check?account=${encodeURIComponent(checked.recipient)}&amount=${encodeURIComponent(amount)}&network=${checked.network}` : "";

  return (
    <>
      <PageHead title="Is this account safe to pay?" sub="Notara reads the account's history and shared scam reports, live, and tells you what it found. It can't tell you whether someone will deliver what they promise." />

      <Card className="!p-6">
        <form onSubmit={submit} noValidate className="grid items-start gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto_auto]">
          <FormField label="Account" error={tried && acctErr ? acctErr : undefined}>
            <TextInput id="ck-acct" value={recipient} onChange={(e) => setRecipient((e.target as HTMLInputElement).value)} placeholder="alice.near" autoComplete="off" spellCheck={false} className="font-mono" aria-invalid={(tried && !!acctErr) || undefined} />
          </FormField>
          <FormField label="Amount (USDC)" error={tried && amtErr ? amtErr : undefined}>
            <TextInput id="ck-amt" value={amount} inputMode="decimal" onChange={(e) => setAmount((e.target as HTMLInputElement).value)} className="tnum" aria-invalid={(tried && !!amtErr) || undefined} />
          </FormField>
          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-semibold">Network</span>
            <Segmented label="Network" value={network} onChange={setNetwork} className="h-11 items-center" options={[{ value: "testnet", label: "Testnet" }, { value: "mainnet", label: "Mainnet" }]} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-semibold opacity-0 max-md:hidden" aria-hidden>Go</span>
            <Button type="submit" busy={loading}>
              <Search size={17} aria-hidden /> {loading ? "Checking…" : "Check"}
            </Button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-muted">Try:</span>
          {examples.map((x) => (
            <button
              key={x.account}
              type="button"
              onClick={() => {
                setRecipient(x.account);
                setNetwork(x.net);
                run(x.account, amount && !amtErr ? amount : "10", x.net);
              }}
              className="h-8 rounded-full border border-border bg-surface px-3 text-[13px] font-semibold transition-colors hover:bg-surface-secondary"
            >
              {x.label}
            </button>
          ))}
        </div>
      </Card>

      {recent.length > 0 && (
        <section className="mt-6" aria-labelledby="ck-recent">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="ck-recent" className="text-[15px] font-bold">Recent checks</h2>
            <span className="text-[12.5px] text-muted">Kept on this device only</span>
          </div>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
            {recent.map((c) => {
              const watched = watches.some((x) => x.account === c.account && x.network === c.network);
              return (
                <li key={`${c.account}-${c.network}`} className="shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipient(c.account);
                      setNetwork(c.network);
                      run(c.account, amount && !amtErr ? amount : "10", c.network);
                    }}
                    className="flex w-[230px] flex-col gap-2 rounded-2xl border border-border/70 bg-surface p-3.5 text-left shadow-card transition-[transform,box-shadow] duration-300 ease-enter hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transform-none"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[13px] font-semibold">{handle(c.account)}</span>
                      {watched && <Eye size={14} aria-label="Watched" className="shrink-0 text-muted" />}
                    </span>
                    <VerdictChip decision={c.decision} />
                    <span className="text-[12px] text-muted">{c.network} · {timeAgo(Date.parse(c.at))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {loading && (
          <Card aria-busy="true">
            <p className="text-[15px] font-bold">Checking live NEAR data…</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.values(SIGNAL_LABELS).map((l) => (
                <li key={l} className="flex items-center gap-2 text-[13.5px] text-muted">
                  <Shimmer className="size-3 rounded-full" /> {l}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {error && (
          <Notice tone="danger" title="The check didn't run" action={<Button size="sm" variant="secondary" onClick={() => run()}>Try again</Button>}>
            <p>{asSentence(error)} No verdict was produced, so treat this account as unchecked.</p>
          </Notice>
        )}
        {res && checked && (
          <>
            {checked.network === "mainnet" && (
              <Notice>
                <p>Mainnet is read-only here. Notara has no report registry on mainnet yet, so shared reports show as unavailable and the result is at least amber. That's the fail-closed rule working, not a finding about the account.</p>
              </Notice>
            )}
            <VerdictCard res={res}>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-4">
                {res.report.decision !== "BLOCK" && (
                  <LinkButton to={`/send?to=${encodeURIComponent(checked.recipient)}&amount=${encodeURIComponent(amount)}`} size="sm">
                    <Send size={15} aria-hidden /> Pay this account
                  </LinkButton>
                )}
                <ShareSheet url={shareUrl} title="Share this check" variant="compact" />
                <CopyChip text={JSON.stringify(res.report, null, 2)} label="Copy report" />
                <Hint text={watch ? "Watching: Notara re-checks this account every 6 hours while it's open in this browser, and tells you if the verdict changes." : "Re-check this account every 6 hours while Notara is open in this browser, and get a notification if the verdict changes."}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!watch}
                    onClick={() =>
                      setWatches((all) =>
                        watch ? all.filter((x) => x !== undefined && !(x.account === checked.recipient && x.network === checked.network)) : [...all, { account: checked.recipient, network: checked.network as Net, decision: res.report.decision, checkedAt: new Date().toISOString() }],
                      )
                    }
                    className="ml-auto inline-flex h-9 items-center gap-2.5 rounded-full border border-border bg-surface pl-3.5 pr-1.5 text-[13.5px] font-semibold"
                  >
                    <Eye size={15} aria-hidden /> Watch this account
                    <span className={cn("relative h-6 w-10 rounded-full transition-colors duration-200", watch ? "bg-accent" : "bg-default")}>
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-transform duration-200 ease-enter", watch ? "translate-x-[18px]" : "translate-x-0.5")} />
                    </span>
                  </button>
                </Hint>
              </div>
            </VerdictCard>
            <p className="-mt-1 text-[12.5px] text-muted">
              Sharing sends a link that re-runs this check live for whoever opens it; it isn't a frozen copy. {watch && `Next re-check about ${Math.round(WATCH_EVERY_MS / 3_600_000)} hours after the last one.`}
            </p>
            <SignalsPanel res={res} defaultOpen={res.report.decision !== "ALLOW"} />
          </>
        )}
      </div>
    </>
  );
}
