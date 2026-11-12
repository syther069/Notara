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
        sub="How you appear on Notara, what your wallet holds, and your preferences."
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
