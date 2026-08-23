import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable Use Policy — RE:SOURCE" },
      {
        name: "description",
        content:
          "Conduct rules for suppliers, recipients and logistics partners on RE:SOURCE: honest listings, no resale of donations, no impersonation, no scraping, and how breaches are handled.",
      },
      { property: "og:title", content: "Acceptable Use Policy — RE:SOURCE" },
      {
        property: "og:description",
        content: "The conduct rules every organization on the RE:SOURCE network agrees to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptableUsePage,
});

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "Be who you say you are",
    p: [
      "Register only an organization you are authorized to represent, using its legal name and genuine registration details.",
      "Do not impersonate another organization, create duplicate accounts to bypass a verification decision, or submit altered, forged or expired documents.",
    ],
  },
  {
    h: "List and request honestly",
    p: [
      "Describe quantity, condition, storage requirements and expiry accurately, and update or withdraw a listing as soon as it is no longer available.",
      "Request only what your organization can lawfully accept, store and distribute, and confirm deliveries truthfully.",
    ],
  },
  {
    h: "Do not profit from donations",
    p: [
      "Resources offered as a donation must not be resold for profit, traded, or diverted to a purpose the supplier did not agree to.",
    ],
  },
  {
    h: "Respect other participants",
    p: [
      "Use the messaging thread for coordinating a transfer. No harassment, discriminatory content, spam or unsolicited marketing.",
      "Contact details obtained through a transfer may be used for that transfer, not for building mailing lists.",
    ],
  },
  {
    h: "Respect the platform",
    p: [
      "Do not attempt to access data belonging to other organizations, probe or bypass access controls, scrape the platform, upload malicious files, or automate activity in a way that degrades service for others.",
      "Agent and API access must act as the signed-in user and stay within that user's permissions.",
    ],
  },
  {
    h: "Handle regulated goods correctly",
    p: [
      "Food, medical, pharmaceutical, cold-chain and hazardous items may only be listed, accepted or transported by organizations that are legally allowed to do so and that can meet the required handling conditions.",
    ],
  },
  {
    h: "Enforcement",
    p: [
      "Breaches may result in a warning, removal of listings, revoked verification, suspension or permanent removal, depending on severity and intent. Serious cases involving fraud or safety may be referred to the relevant authorities.",
      "Records of the breach and the action taken are kept in the audit trail.",
    ],
  },
];

function AcceptableUsePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link to="/">
        <Wordmark className="text-base" />
      </Link>
      <p className="mono-label mt-10">Legal</p>
      <h1 className="mt-2 text-3xl">Acceptable Use Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        These rules apply to every user and organization on the network, alongside the terms and
        conditions.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-base font-semibold">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para.slice(0, 32)} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm">
        Back to the{" "}
        <Link to="/legal" className="text-primary hover:underline">
          legal center
        </Link>
        .
      </p>
    </div>
  );
}
