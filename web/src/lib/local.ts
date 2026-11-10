// What Notara remembers on this device only (localStorage): your profile, preferences, the sends you made
// from here, and the accounts you checked. None of it is sent to a server, so it doesn't follow you to
// another browser, and nobody else sees it. Pages that show it say so.
import { useCallback, useEffect, useState } from "react";
import type { Decision } from "./api";

const EVENT = "notara-local";

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    return true;
  } catch {
    return false; // storage full or blocked: the caller says the change wasn't saved
  }
}

export function removeLocal(key: string) {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  } catch {}
}

/** State kept in localStorage, shared live by every component that reads the same key. */
export function useLocal<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => boolean] {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));
  useEffect(() => {
    setValue(readLocal(key, fallback));
    const on = (e: Event) => {
      if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) setValue(readLocal(key, fallback));
    };
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => writeLocal(key, typeof next === "function" ? (next as (p: T) => T)(readLocal(key, fallback)) : next), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, set];
}

// ------------------------------------------------------------------ profile

export const LINK_KINDS = ["company", "website", "x", "email", "telegram", "github", "linkedin"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export const LINK_LABEL: Record<LinkKind, string> = { company: "Company URL", website: "Website", x: "X account", email: "Email (public)", telegram: "Telegram", github: "GitHub", linkedin: "LinkedIn" };

export interface Profile {
  displayName: string;
  /** A small square image as a data URL, or "" for the generated identicon. */
  avatar: string;
  about: string;
  links: Partial<Record<LinkKind, string>>;
}
export const EMPTY_PROFILE: Profile = { displayName: "", avatar: "", about: "", links: {} };
export const profileKey = (account: string) => `notara-profile:${account}`;
export const ABOUT_MAX = 240;

/** The full address a link chip opens, or null when what was typed isn't usable. */
export function linkHref(kind: LinkKind, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null;
  const handle = v.replace(/^@/, "");
  if (kind === "x" && /^[A-Za-z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
  if (kind === "telegram" && /^[A-Za-z0-9_]{4,32}$/.test(handle)) return `https://t.me/${handle}`;
  if (kind === "github" && /^[A-Za-z0-9-]{1,39}$/.test(handle)) return `https://github.com/${handle}`;
  if (kind === "linkedin" && /^[A-Za-z0-9-]{3,100}$/.test(handle)) return `https://www.linkedin.com/in/${handle}`;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? (u.hostname.includes(".") ? u.href : null) : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ preferences

export interface Prefs {
  notifications: boolean;
  /** How amounts are labelled. USDC is the only asset that settles; "USD" shows a $ sign instead. */
  currency: "USDC" | "USD";
  timezone: string;
}
export const PREFS_KEY = "notara-prefs";
export const defaultPrefs = (): Prefs => ({ notifications: false, currency: "USDC", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });

// ------------------------------------------------------------------ sends made from this device

export interface LocalSend {
  id: string;
  from: string;
  to: string;
  /** USDC in its smallest unit (6 decimals). */
  amount: string;
  memo: string;
  network: "mainnet" | "testnet";
  txHash: string;
  at: string;
  /** The account check shown when the send was confirmed. */
  check?: { decision: Decision; reason: string; coverage: string };
  expense?: boolean;
}
export const sendsKey = (account: string) => `notara-sends:${account}`;

// ------------------------------------------------------------------ account checks made from this device

export interface LocalCheck {
  account: string;
  network: "mainnet" | "testnet";
  decision: Decision;
  reason: string;
  at: string;
}
export const CHECKS_KEY = "notara-checks";
export interface Watch {
  account: string;
  network: "mainnet" | "testnet";
  decision: Decision;
  checkedAt: string;
  /** Set when a re-check came back different, until the visitor has seen it. */
  changedFrom?: Decision;
}
export const WATCH_KEY = "notara-watch";
/** How often an open Notara tab re-checks a watched account. */
export const WATCH_EVERY_MS = 6 * 60 * 60 * 1000;
