// Your profile: who you are on payment pages, what the wallet holds, and how Notara behaves for you.
// Shown in the side sheet (from the wallet chip) and on /profile. Saved on this device only.
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/lib/wallet";
import { useBalances, useTheme, useToast, type ThemeChoice } from "@/components/Layout";
import { ABOUT_MAX, LINK_KINDS, LINK_LABEL, PREFS_KEY, defaultPrefs, linkHref, profileKey, removeLocal, sendsKey, useLocal, type LinkKind, type Prefs } from "@/lib/local";
import { usdcFigure } from "@/lib/format";
import { Building, Github, Globe, Linkedin, LogOut, Mail, Moon, Sun, Laptop, Telegram, Trash, Upload, XBrand } from "@/components/icons";
import { Avatar, handle, nearFigure, useProfile } from "./wallet";
import { Button, CharCount, Chip, CopyChip, FormField, Hint, Notice, Segmented, Select, Shimmer, TextArea, TextInput } from "./ui";

const LINK_ICON: Record<LinkKind, typeof Globe> = { company: Building, website: Globe, x: XBrand, email: Mail, telegram: Telegram, github: Github, linkedin: Linkedin };
const LINK_PLACEHOLDER: Record<LinkKind, string> = { company: "studio.example", website: "yourname.example", x: "@handle", email: "you@example.com", telegram: "@handle", github: "username", linkedin: "your-name" };

/** Shrinks a chosen picture to a 192px square so it fits in this device's storage. */
function squareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = 192;
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 192, 192);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read."));
    };
    img.src = url;
  });
}

export function usePrefs() {
  return useLocal<Prefs>(PREFS_KEY, defaultPrefs());
}

function SectionTitle({ children, note }: { children: string; note?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[15px] font-bold tracking-[-0.01em]">{children}</h3>
      {note && <p className="mt-0.5 text-[13px] text-muted">{note}</p>}
    </div>
  );
}

/** A social link as a chip: hover shows the full address and a copy button. */
export function LinkChip({ kind, value }: { kind: LinkKind; value: string }) {
  const href = linkHref(kind, value);
  const Icon = LINK_ICON[kind];
  if (!href) return null;
  const shown = href.replace(/^mailto:/, "");
  return (
    <Hint
      text={
        <span className="flex flex-col gap-1.5">
          <span className="break-all">{shown}</span>
          <CopyChip text={shown} label="Copy" className="!h-7 self-start !px-2.5 !text-[12px]" />
        </span>
      }
    >
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[13px] font-semibold transition-colors hover:bg-surface-secondary">
        <Icon size={14} aria-hidden /> {LINK_LABEL[kind].replace(" (public)", "").replace(" account", "").replace(" URL", "")}
      </a>
    </Hint>
  );
}

export function FundsPanel() {
  const w = useWallet();
  const { usdc, near, refresh } = useBalances();
  const row = (label: string, figure: React.ReactNode, hint: string) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <Hint text={hint} focusable>
        <span className="text-[14px] font-semibold underline decoration-dotted decoration-muted/60 underline-offset-4">{label}</span>
      </Hint>
      <span className="tnum text-[17px] font-bold tracking-[-0.02em]">{figure}</span>
    </div>
  );
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <SectionTitle>Funds</SectionTitle>
        <button type="button" onClick={refresh} className="text-[13px] font-semibold text-muted underline underline-offset-4 hover:text-foreground">
          Refresh
        </button>
      </div>
      <div className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-surface px-4">
        {row(
          "USDC on NEAR",
          usdc === undefined ? <Shimmer className="h-5 w-20" /> : usdc === null ? <span className="text-[14px] text-muted">Couldn't read it</span> : `$${usdcFigure(usdc)}`,
          `Your spendable USDC, read live from the USDC contract on NEAR ${w.network}. Payments you receive through your links land here.`,
        )}
        {row(
          "NEAR",
          near === undefined ? <Shimmer className="h-5 w-16" /> : near === null ? <span className="text-[14px] text-muted">Couldn't read it</span> : nearFigure(near),
          `NEAR is the network's own token. A little of it pays the tiny fee on each payment you send. Read live from your account on NEAR ${w.network}.`,
        )}
      </div>
      {w.network === "testnet" && <p className="mt-2 text-[13px] text-muted">Testnet balances are free test money. Get test USDC at faucet.circle.com (choose NEAR testnet).</p>}
    </div>
  );
}

/** Everything on the profile. `compact` is the side sheet (one column); the page uses two. */
export function ProfileEditor({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const w = useWallet();
  const account = w.accountId!;
  const [profile, setProfile] = useProfile(account);
  const [prefs, setPrefs] = usePrefs();
  const theme = useTheme();
  const toast = useToast();
  const nav = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = (patch: Partial<typeof profile>) => {
    if (!setProfile((p) => ({ ...p, ...patch }))) toast("That couldn't be saved: this browser's storage is full or blocked.", "error");
  };
  const zones = useMemo(() => {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [prefs.timezone, "UTC"];
    return [...new Set([prefs.timezone, ...all])].map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, [prefs.timezone]);
  const shownLinks = LINK_KINDS.filter((k) => linkHref(k, profile.links[k] ?? ""));

  const identity = (
    <section>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar account={account} size={72} />
          <Hint text="Upload a picture. It's kept on this device.">
            <button
              type="button"
              aria-label="Upload a profile picture"
              onClick={() => file.current?.click()}
              className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full border border-border bg-surface shadow-card transition-transform hover:scale-105 active:scale-95"
            >
              <Upload size={14} />
            </button>
          </Hint>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setImgErr(null);
              try {
                save({ avatar: await squareImage(f) });
              } catch (err) {
                setImgErr((err as Error).message);
              }
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[20px] font-extrabold tracking-[-0.03em]">{profile.displayName.trim() || handle(account)}</p>
          <p className="truncate font-mono text-[12.5px] text-muted">{account}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone={w.network === "mainnet" ? "gold" : "outline"} hint={w.network === "mainnet" ? "Connected on NEAR mainnet: real money." : "Connected on NEAR testnet: free test money, nothing of value."}>
              {w.network === "mainnet" ? "Mainnet" : "Testnet"}
            </Chip>
            {profile.avatar && (
              <button type="button" className="text-[12.5px] font-semibold text-muted underline underline-offset-4 hover:text-foreground" onClick={() => save({ avatar: "" })}>
                Remove picture
              </button>
            )}
          </div>
        </div>
      </div>
      {imgErr && <p role="alert" className="mt-2 text-[13px] font-semibold text-danger">{imgErr}</p>}
      <FormField label="Display name" className="mt-5" note="The name people see. Leave it empty to show your account.">
        <TextInput value={profile.displayName} maxLength={48} placeholder={handle(account)} onChange={(e) => save({ displayName: (e.target as HTMLInputElement).value })} />
      </FormField>
    </section>
  );

  const about = (
    <section>
      <FormField
        label="About"
        note="Add a short description of what you do — it appears on your public payment pages so customers know who they're paying."
        counter={<CharCount value={profile.about} max={ABOUT_MAX} />}
      >
        <TextArea value={profile.about} maxLength={ABOUT_MAX} placeholder="Brand and product designer. Invoices in USDC." onChange={(e) => save({ about: e.target.value })} />
      </FormField>
    </section>
  );

  const links = (
    <section>
      <SectionTitle note="Each one becomes a chip on your profile.">Links</SectionTitle>
      {shownLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {shownLinks.map((k) => (
            <LinkChip key={k} kind={k} value={profile.links[k]!} />
          ))}
        </div>
      )}
      <div className={compact ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
        {LINK_KINDS.map((k) => {
          const v = profile.links[k] ?? "";
          const bad = v.trim() && !linkHref(k, v);
          return (
            <FormField key={k} label={LINK_LABEL[k]} error={bad ? (k === "email" ? "That doesn't look like an email address." : "That doesn't look like a valid link or handle.") : undefined}>
              <TextInput value={v} placeholder={LINK_PLACEHOLDER[k]} autoComplete="off" spellCheck={false} aria-invalid={!!bad || undefined} onChange={(e) => save({ links: { ...profile.links, [k]: (e.target as HTMLInputElement).value } })} />
            </FormField>
          );
        })}
      </div>
    </section>
  );

  const preferences = (
    <section>
      <SectionTitle>Preferences</SectionTitle>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[14px] font-semibold">Theme</span>
          <Segmented<ThemeChoice>
            label="Theme"
            value={theme.choice}
            onChange={theme.setChoice}
            options={[
              { value: "light", label: (<><Sun size={14} aria-hidden /> Light</>) },
              { value: "dark", label: (<><Moon size={14} aria-hidden /> Dark</>) },
              { value: "system", label: (<><Laptop size={14} aria-hidden /> System</>) },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[26ch]">
            <span className="block text-[14px] font-semibold">Notifications</span>
            <span className="block text-[13px] text-muted">A browser alert when a watched account's result changes, while Notara is open.</span>
          </div>
          <Segmented
            label="Notifications"
            value={prefs.notifications ? "on" : "off"}
            onChange={async (v) => {
              if (v === "off") return void setPrefs((p) => ({ ...p, notifications: false }));
              if (!("Notification" in window)) return toast("This browser doesn't support notifications.", "error");
              const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
              if (perm !== "granted") return toast("Notifications are blocked for this site in your browser settings.", "error");
              setPrefs((p) => ({ ...p, notifications: true }));
            }}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
        </div>
        <FormField label="Default currency" note="How amounts are labelled. Payments always settle in USDC.">
          <Select
            label="Default currency"
            value={prefs.currency}
            onChange={(v) => setPrefs((p) => ({ ...p, currency: v as Prefs["currency"] }))}
            options={[
              { value: "USDC", label: "USDC", description: "12.50 USDC" },
              { value: "USD", label: "US dollars", description: "$12.50" },
            ]}
          />
        </FormField>
        <FormField label="Timezone" note="Used for dates in your tables and exports.">
          <Select label="Timezone" searchable searchPlaceholder="Search timezones…" value={prefs.timezone} onChange={(v) => setPrefs((p) => ({ ...p, timezone: v }))} options={zones} />
        </FormField>
      </div>
    </section>
  );

  const danger = (
    <section>
      <SectionTitle>Danger zone</SectionTitle>
      <div className="flex flex-col gap-3 rounded-2xl border border-danger/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[30ch] text-[13.5px] text-muted">Disconnecting signs this browser out. Your money and links stay where they are.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await w.disconnect();
              onNavigate?.();
              nav("/");
            }}
          >
            <LogOut size={14} aria-hidden /> Disconnect wallet
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
          <p className="max-w-[30ch] text-[13.5px] text-muted">Deletes your name, picture, About, links and the list of sends kept on this device. It can't be undone.</p>
          {confirmDelete ? (
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  removeLocal(profileKey(account));
                  removeLocal(sendsKey(account));
                  setConfirmDelete(false);
                  toast("Profile data deleted from this device.");
                }}
              >
                Delete it
              </Button>
            </span>
          ) : (
            <Button variant="danger-quiet" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash size={14} aria-hidden /> Delete profile data
            </Button>
          )}
        </div>
      </div>
    </section>
  );

  const stored = (
    <Notice>
      <p>
        <strong>Saved on this device.</strong> Your name, picture, About and links live in this browser. They show for you here and in your own previews; a customer opening your link from another device sees
        your account and the website you've proven instead.
      </p>
    </Notice>
  );

  if (compact)
    return (
      <div className="flex flex-col gap-8">
        {identity}
        <FundsPanel />
        {about}
        {links}
        {preferences}
        {stored}
        {danger}
      </div>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-card">{identity}</div>
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-card">{about}</div>
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-card">{links}</div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-card">
          <FundsPanel />
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-card" id="preferences">{preferences}</div>
        {stored}
        {danger}
      </div>
    </div>
  );
}
