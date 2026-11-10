// What the signed-in pages share: this wallet's Notara links, its notifications, and the watch runner.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type Invoice } from "./api";
import { useWallet } from "./wallet";
import { CHECKS_KEY, PREFS_KEY, WATCH_EVERY_MS, WATCH_KEY, defaultPrefs, readLocal, useLocal, writeLocal, type LocalCheck, type Prefs, type Watch } from "./local";
import { formatAsset } from "./format";

export interface Note {
  id: string;
  text: string;
  href: string;
  at: string;
  read: boolean;
}
const NOTES_KEY = "notara-notes";

type Data = {
  /** Links this wallet created (payment links and send links), newest first. null: not loaded yet. */
  links: Invoice[] | null;
  linksError: string | null;
  linksLoading: boolean;
  reloadLinks: () => void;
  notes: Note[];
  markNotesRead: () => void;
  clearNotes: () => void;
};
const Ctx = createContext<Data>({ links: null, linksError: null, linksLoading: false, reloadLinks: () => {}, notes: [], markNotesRead: () => {}, clearNotes: () => {} });
export const useAccountData = () => useContext(Ctx);

function pushNote(n: Omit<Note, "read" | "at">) {
  const all = readLocal<Note[]>(NOTES_KEY, []);
  if (all.some((x) => x.id === n.id)) return;
  writeLocal(NOTES_KEY, [{ ...n, at: new Date().toISOString(), read: false }, ...all].slice(0, 30));
  const prefs = readLocal<Prefs>(PREFS_KEY, defaultPrefs());
  if (prefs.notifications && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Notara", { body: n.text });
    } catch {}
  }
}

/** Remembers an account check on this device (the recent-checks row, and a watch if one is on). */
export function recordCheck(c: LocalCheck) {
  const all = readLocal<LocalCheck[]>(CHECKS_KEY, []).filter((x) => !(x.account === c.account && x.network === c.network));
  writeLocal(CHECKS_KEY, [c, ...all].slice(0, 12));
  const watches = readLocal<Watch[]>(WATCH_KEY, []);
  const i = watches.findIndex((x) => x.account === c.account && x.network === c.network);
  if (i >= 0) {
    watches[i] = { ...watches[i], decision: c.decision, checkedAt: c.at, changedFrom: undefined };
    writeLocal(WATCH_KEY, watches);
  }
}

export function AccountDataProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [links, setLinks] = useState<Invoice[] | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [notes, setNotes] = useLocal<Note[]>(NOTES_KEY, []);
  const seq = useRef(0);

  const reloadLinks = useCallback(() => {
    const acct = w.accountId;
    const mine = ++seq.current;
    if (!acct) {
      setLinks(null);
      setLinksError(null);
      return;
    }
    setLinksLoading(true);
    api
      .invoices(acct)
      .then((r) => {
        if (mine !== seq.current) return; // an older request answered late
        const list = r.invoices.filter((i) => i.merchant === acct).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLinks(list);
        setLinksError(null);
        // A link that turned paid since the last look becomes a notification, once.
        const seenKey = `notara-seen-paid:${acct}`;
        const seen = readLocal<string[] | null>(seenKey, null);
        const paid = list.filter((i) => i.status === "paid" && i.kind !== "send");
        if (seen) for (const i of paid) if (!seen.includes(i.id)) pushNote({ id: `paid-${i.id}`, text: `${i.description || i.id} was paid: ${formatAsset(i.amount, i.asset)}.`, href: "/transactions" });
        writeLocal(seenKey, paid.map((i) => i.id));
      })
      .catch((e) => mine === seq.current && setLinksError(e.message))
      .finally(() => mine === seq.current && setLinksLoading(false));
  }, [w.accountId]);
  useEffect(() => {
    setLinks(null);
    reloadLinks();
  }, [reloadLinks]);

  // Watched accounts: re-checked every few hours while Notara is open here. A changed result is a notification.
  useEffect(() => {
    let stop = false;
    async function run() {
      const watches = readLocal<Watch[]>(WATCH_KEY, []);
      for (const wt of watches) {
        if (stop || Date.now() - Date.parse(wt.checkedAt) < WATCH_EVERY_MS) continue;
        try {
          const r = await api.check({ network: wt.network, recipient: wt.account, amountDecimal: "1" });
          const now = readLocal<Watch[]>(WATCH_KEY, []);
          const i = now.findIndex((x) => x.account === wt.account && x.network === wt.network);
          if (i < 0) continue; // unwatched meanwhile
          const changed = r.report.decision !== wt.decision;
          now[i] = { ...now[i], decision: r.report.decision, checkedAt: new Date().toISOString(), changedFrom: changed ? wt.decision : now[i].changedFrom };
          writeLocal(WATCH_KEY, now);
          if (changed)
            pushNote({
              id: `watch-${wt.account}-${now[i].checkedAt}`,
              text: `${wt.account} changed from ${wt.decision} to ${r.report.decision}.`,
              href: `/agents/check?account=${encodeURIComponent(wt.account)}&network=${wt.network}`,
            });
        } catch {
          // The server didn't answer: keep the old result and try again on the next pass.
        }
      }
    }
    run();
    const t = setInterval(run, 15 * 60 * 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const value = useMemo(
    () => ({
      links,
      linksError,
      linksLoading,
      reloadLinks,
      notes,
      markNotesRead: () => void setNotes((n) => n.map((x) => ({ ...x, read: true }))),
      clearNotes: () => void setNotes([]),
    }),
    [links, linksError, linksLoading, reloadLinks, notes, setNotes],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
