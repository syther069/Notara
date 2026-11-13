// Notifications: which events in a wallet's links are new since the last look. Pure, so it can be tested.
import type { Invoice } from "./api";

export interface Note {
  id: string;
  text: string;
  href: string;
  at: string;
  read: boolean;
  /** The wallet the note belongs to. Watched-account notes have none and show for every wallet. */
  account?: string;
}
export type NewNote = Omit<Note, "read" | "at">;

/** Every event worth a note in this list of links, as a stable id and the note it becomes. */
function events(list: Invoice[], account: string, amount: (i: Invoice) => string): NewNote[] {
  const out: NewNote[] = [];
  for (const i of list) {
    const what = i.description || i.id;
    if (i.kind !== "send" && i.status === "paid")
      out.push({ id: `paid-${i.id}`, account, text: `${what} was paid: ${amount(i)}.`, href: `/transactions?q=${encodeURIComponent(i.id)}` });
    if (i.kind === "send" && i.claimedAt)
      out.push({ id: `claimed-${i.id}`, account, text: `Your send link for ${amount(i)} was claimed${i.claimedTo ? ` by ${i.claimedTo}` : ""}.`, href: `/transactions?q=${encodeURIComponent(i.id)}` });
  }
  return out;
}

/**
 * The notes to add, and the new list of seen event ids. The first look at a wallet (seen is null) only
 * records what already happened, so connecting a wallet never floods the bell with old payments.
 */
export function newLinkNotes(list: Invoice[], seen: string[] | null, account: string, amount: (i: Invoice) => string): { notes: NewNote[]; seen: string[] } {
  const all = events(list, account, amount);
  const ids = all.map((n) => n.id);
  if (!seen) return { notes: [], seen: ids };
  const known = new Set(seen);
  return { notes: all.filter((n) => !known.has(n.id)), seen: [...new Set([...seen, ...ids])] };
}

/** The notes one wallet should see: its own, plus the device-wide watched-account notes. */
export const notesFor = (notes: Note[], account: string | null) => notes.filter((n) => !n.account || n.account === account);
