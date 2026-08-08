import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — RE:SOURCE" },
      {
        name: "description",
        content:
          "How RE:SOURCE collects, stores, protects and deletes organization data and verification documents, and what rights you have over your information.",
      },
      { property: "og:title", content: "Privacy Policy — RE:SOURCE" },
      {
        property: "og:description",
        content: "Clear answers on data collection, document security, retention and your rights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "What we collect",
    p: [
      "Account data: your name, email address and, if you provide it, your phone number.",
      "Organization data: name, type and category, description, website, address and location, contact details, registration number, issuing authority and registration country.",
      "Representative data: the name, position and relationship to the organization of the person registering it.",
      "Verification documents: the official proof of legal existence you upload.",
      "Operational data: resources, needs, matches, transfers, messages, deliveries and confirmations you create on the platform.",
      "Audit data: verification decisions, document access events and key actions, with timestamps and the acting user.",
    ],
  },
  {
    h: "Why we collect it",
    p: [
      "To confirm that organizations requesting or receiving resources are legitimate, to prevent fraud and duplicate registrations, to coordinate matches and transfers between organizations, to keep an auditable record of what happened, and to comply with legal obligations.",
      "We do not sell your data. We do not use your documents for advertising, profiling or model training.",
    ],
  },
  {
    h: "How documents are stored and who can see them",
    p: [
      "Verification documents are stored in private storage that is not publicly reachable. There are no public links.",
      "A document can only be opened by the organization owner who uploaded it and by authorized RE:SOURCE reviewers, and only through a short-lived secure link generated on request.",
      "Documents are never shown on public profiles, never attached to listings, and never shared with other organizations on the network.",
      "Every access is written to an append-only audit trail.",
    ],
  },
  {
    h: "What other organizations can see",
    p: [
      "Other participants see your organization name, type and category, general location, public description, contact details you choose to publish, verification status and the date of verification.",
      "They never see your uploaded documents, your registration file, internal reviewer notes, risk indicators or your representative's personal details.",
    ],
  },
  {
    h: "AI processing",
    p: [
      "Structured details of a submitted organization record — not the document file itself — may be sent to an AI model to flag internal inconsistencies and possible duplicates. This is advisory only; a human reviewer makes every verification decision.",
    ],
  },
  {
    h: "Retention",
    p: [
      "Verification documents are retained while the organization is active and for as long as needed to evidence the verification decision, then deleted.",
      "Transfer, delivery and audit records are retained for accountability and legal compliance even after an account is closed.",
      "You can ask us to delete data that is not subject to a retention obligation.",
    ],
  },
  {
    h: "Your rights",
    p: [
      "You can access and correct your organization and account information from within the app, request a copy of your data, request deletion, withdraw optional consents such as communications, and object to processing you believe is unjustified.",
      "Contact the platform administrators through the in-app support channel to exercise these rights.",
    ],
  },
  {
    h: "Security",
    p: [
      "Access to data is enforced at the database level so an organization can only reach its own records. Documents sit in private storage behind per-user access rules. Reviewer access is limited to accounts with an administrator role and is logged.",
    ],
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link to="/">
        <Wordmark className="text-base" />
      </Link>
      <p className="mono-label mt-10">Legal</p>
      <h1 className="mt-2 text-3xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This policy explains exactly what RE:SOURCE collects, why, who can see it, and how long it
        is kept.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-base font-semibold">{s.h}</h2>
            <ul className="mt-2 space-y-2">
              {s.p.map((para) => (
                <li key={para.slice(0, 32)} className="text-sm leading-relaxed text-muted-foreground">
                  {para}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm">
        See also the{" "}
        <Link to="/terms" className="text-primary hover:underline">
          terms &amp; conditions
        </Link>
        .
      </p>
    </div>
  );
}
