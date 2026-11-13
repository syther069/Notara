// What the signed-in pages share: this wallet's Notara links, its notifications, and the watch runner.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, api, type Invoice } from "./api";
import { useWallet } from "./wallet";
import { CHECKS_KEY, PREFS_KEY, WATCH_EVERY_MS, WATCH_KEY, defaultPrefs, readLocal, useLocal, writeLocal, type LocalCheck, type Prefs, type Watch } from "./local";
import { formatAsset } from "./format";
import { newLinkNotes, notesFor, type NewNote, type Note } from "./notes";

export type { Note } from "./notes";
const NOTES_KEY = "notara-notes";
/** How often the open app looks for new payments and claims. */
const POLL_MS = 45_000;

type Data = {
  /** Links this wallet created (payment links and send links), newest first. null: not loaded yet. */
  links: Invoice[] | null;
  linksError: string | null;
  linksLoading: boolean;
  reloadLinks: () => void;
  /** This wallet's notes (and watched-account notes), newest first. */
  notes: Note[];
  markNotesRead: () => void;
  clearNotes: () => void;
};
const Ctx = createContext<Data>({ links: null, linksError: null, linksLoading: false, reloadLinks: () => {}, notes: [], markNotesRead: () => {}, clearNotes: () => {} });
export const useAccountData = () => useContext(Ctx);

/** Adds a note to the bell (once per id), and a browser alert if the visitor turned those on. */
export function pushNote(n: NewNote) {
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
  const [allNotes, setNotes] = useLocal<Note[]>(NOTES_KEY, []);
  const seq = useRef(0);

  /**
   * Loads this wallet's links. `silent` is the background refresh: it never asks the wallet to sign
   * (a missing or expired signature just skips the refresh) and never shows a loading state or an error.
   */
  const load = useCallback((silent: boolean) => {
    const acct = w.accountId;
    const mine = ++seq.current;
    if (!acct) {
      setLinks(null);
      setLinksError(null);
      return;
    }
    if (!silent) setLinksLoading(true);
    const net = w.network;
    const proofKey = `notara-links-proof:${net}:${acct}`;
    // The public site lists your links only with your wallet's signature: asked once, then reused for a day.
    // Locally (or while a saved signature is still good) the first request is enough.
    const load = async () => {
      const saved = readLocal<{ token: string; at: number } | null>(proofKey, null);
      const fresh = saved && Date.now() - saved.at < 23 * 3_600_000 ? saved.token : undefined;
      try {
        return await api.invoices(acct, fresh ? { proof: fresh, network: net } : undefined);
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 401 || silent) throw e;
        const { token, accountId } = await w.signLink(async (a) => (await api.linksListMessage(a)).message, net);
        if (accountId !== acct) throw new Error(`Your wallet signed as ${accountId}, not ${acct}`);
        writeLocal(proofKey, { token, at: Date.now() });
        return api.invoices(acct, { proof: token, network: net });
      }
    };
    load()
      .then((r) => {
        if (mine !== seq.current) return; // an older request answered late
        const list = r.invoices.filter((i) => i.merchant === acct).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLinks(list);
        setLinksError(null);
        // A link paid, or a send link claimed, since the last look becomes a notification, once.
        const seenKey = `notara-seen-events:${acct}`;
        const r2 = newLinkNotes(list, readLocal<string[] | null>(seenKey, null), acct, (i) => formatAsset(i.amount, i.asset));
        for (const n of r2.notes) pushNote(n);
        writeLocal(seenKey, r2.seen);
      })
      .catch((e) => !silent && mine === seq.current && setLinksError(e.message))
      .finally(() => !silent && mine === seq.current && setLinksLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.accountId, w.network]);
  const reloadLinks = useCallback(() => load(false), [load]);
  useEffect(() => {
    setLinks(null);
    reloadLinks();
  }, [reloadLinks]);

  // While the app is open and visible, look again for payments and claims, and at once when the tab
  // comes back into view, so a payment shows up in the bell without a page reload.
  useEffect(() => {
    if (!w.accountId) return;
    const tick = () => document.visibilityState === "visible" && load(true);
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [w.accountId, load]);

  const notes = useMemo(() => notesFor(allNotes, w.accountId), [allNotes, w.accountId]);
  const mine = useCallback((n: Note) => !n.account || n.account === w.accountId, [w.accountId]);

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
      // Only this wallet's notes: another wallet on this device keeps its own.
      markNotesRead: () => void setNotes((n) => n.map((x) => (mine(x) ? { ...x, read: true } : x))),
      clearNotes: () => void setNotes((n) => n.filter((x) => !mine(x))),
    }),
    [links, linksError, linksLoading, reloadLinks, notes, setNotes, mine],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
