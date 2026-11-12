import { A, C, Callout, Facts, H2, H3, Lead, P, Step, Steps, UL } from "../kit";

export function SendLinks() {
  return (
    <>
      <Lead>A send link holds USDC like cash. Whoever opens it can claim the money into a NEAR account, including a new one made on the spot, without needing any NEAR for fees.</Lead>
      <Callout kind="note" title="Testnet in this prototype">
        <p>Send links run on NEAR testnet with Circle test USDC. They aren't offered on mainnet yet.</p>
      </Callout>

      <H2>How it works</H2>
      <Steps>
        <Step title="Your browser makes a one-time key">
          <p>
            The key is put in the part of the link after <C>#</C>, which browsers never send to a server. Its public key is a NEAR implicit account (64 hex characters) that will hold the money.
          </p>
        </Step>
        <Step title="You fund the link">
          <p>Send between 1 and 25 USDC to it. Until it's funded, the person you send it to sees an empty link.</p>
        </Step>
        <Step title="They open it and claim">
          <p>
            They claim into an existing account, or pick a new name that Notara's sponsor account creates for them. The link's key signs one <C>ft_transfer</C>, and the sponsor relays it as a NEP-366 meta transaction, paying the gas and
            the 1 yoctoNEAR deposit the transfer needs.
          </p>
        </Step>
      </Steps>

      <H2>Limits</H2>
      <Facts
        rows={[
          ["Amount", "1 to 25 USDC per link"],
          ["New links", "5 a day per sender, and 200 a day across the whole site, in this prototype"],
          ["To make one", "Your wallet signs a short message (NEP-413). It's free and moves no money; it stops scripts from making empty links."],
          ["Reminder period", "7 days. After that, the claim page asks the sender to take the money back."],
          ["Who can claim", "Anyone holding the link, at any time, until it's claimed"],
        ]}
      />

      <H3>Taking money back</H3>
      <P>
        You made the link, so you hold its key too. If it isn't claimed, open your own link and claim it back to your account. The 7 days are a reminder, not a lock: nothing stops someone holding the link from claiming it later, because the key in
        the link controls the money.
      </P>

      <H2>What the sponsor pays</H2>
      <UL>
        <li>USDC storage for the link's account, when the link is made.</li>
        <li>0.002 NEAR once, so the link's account exists on-chain and can sign the claim.</li>
        <li>The gas and 1 yoctoNEAR deposit for the claim, and the new account name if one is made.</li>
      </UL>
      <P>The person with the link never gets spendable NEAR from the sponsor, only the 0.002 NEAR that keeps the link's account alive.</P>

      <Callout kind="warning" title="Treat a send link like cash">
        <p>
          Only send it to the person it's for. Anyone who sees it can take the money. To pay someone who already has a NEAR account, <A href="/send">send to the account</A> instead.
        </p>
      </Callout>
    </>
  );
}
