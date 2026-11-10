import { Link } from "react-router-dom";
import { useWallet } from "@/lib/wallet";
import { ConnectPanel, PageHead } from "@/components/shell/AppShell";
import { ProfileEditor } from "@/components/app/profile";
import { LinkButton } from "@/components/app/ui";
import { Globe } from "@/components/icons";

export function ProfilePage() {
  const w = useWallet();
  if (!w.accountId) return <ConnectPanel title="Your profile" body="Connect a NEAR wallet to set your name, picture and links, and to see what your wallet holds." />;
  return (
    <>
      <PageHead
        title="Profile"
        sub="How you appear on Notara, and what your wallet holds."
        actions={
          <LinkButton to={`/m/${encodeURIComponent(w.accountId)}`} variant="secondary">
            <Globe size={16} aria-hidden /> Open my public page
          </LinkButton>
        }
      />
      <ProfileEditor />
    </>
  );
}

export function SettingsPage() {
  const w = useWallet();
  if (!w.accountId) return <ConnectPanel title="Settings" body="Connect a NEAR wallet to set your theme, notifications, currency label and timezone." />;
  return (
    <>
      <PageHead title="Settings" sub={<>Preferences live with your profile. <Link to="/profile#preferences" className="font-semibold text-foreground underline underline-offset-4">Open them on your profile</Link>, or change them here.</>} />
      <div className="max-w-xl">
        <ProfileEditor compact />
      </div>
    </>
  );
}
