import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance & Government Engagement — RE:SOURCE" },
      {
        name: "description",
        content:
          "How RE:SOURCE supports oversight by public bodies: organization identity verification, append-only audit trails, record retention, lawful data requests and incident contact.",
      },
      { property: "og:title", content: "Compliance & Government Engagement — RE:SOURCE" },
      {
        property: "og:description",
        content:
          "Identity verification, audit trails, retention and lawful data requests for public-sector participation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Scope",
    p: [
      "This page describes the controls RE:SOURCE operates today and the commitments the platform makes to organizations, including public bodies, that coordinate resources through it.",
      "It does not assert any certification, accreditation, audit outcome or regulatory approval. Where a specific standard is required for a programme, the parties must agree it separately in writing.",
    ],
  },
  {
    h: "2. Organization identity verification",
    p: [
      "Every organization must complete verification before it can request or receive resources. The flow collects the legal name, organization type and category, registration number, issuing authority and registration country, an operating address, and the name, position and relationship of the authorized representative.",
      "Official proof of legal existence must be uploaded and is reviewed by a human before a verification decision is recorded. Automated duplicate detection and advisory AI risk indicators support the reviewer; they never decide on their own.",
      "A verification can be re-reviewed, suspended or revoked at any time if new information emerges.",
    ],
  },
  {
    h: "3. Audit trail and traceability",
    p: [
      "Verification decisions, document access events, transfer status changes and delivery confirmations are written to append-only records with a timestamp and the acting user.",
      "Each completed transfer traces back to the originating surplus listing, the matched need, the approving users on both sides, the assigned logistics provider and the delivery confirmation.",
      "Impact figures shown in the app are derived from those confirmed records rather than entered by hand.",
    ],
  },
  {
    h: "4. Document handling",
    p: [
      "Verification documents are held in private storage with no public links. A document can be opened only by the organization owner who uploaded it and by authorized reviewers, and only through a short-lived secure link generated on request.",
      "Documents are never shown on public profiles, never attached to listings and never shared with other organizations on the network.",
    ],
  },
  {
    h: "5. Access control and tenancy",
    p: [
      "Access rules are enforced in the database, not only in the interface. An organization can reach its own records and the records of transfers it is party to. Full organization records, including contact and registration details, are visible only to the owner and to authorized reviewers; other participants see a limited public directory entry.",
      "Reviewer access requires an administrator role and is logged.",
    ],
  },
  {
    h: "6. Retention",
    p: [
      "Transfer, delivery and audit records are retained for accountability and legal compliance, including after an account is closed.",
      "Verification documents are retained while the organization is active and for as long as needed to evidence the verification decision, then deleted.",
      "Full retention detail is set out in the privacy policy.",
    ],
  },
  {
    h: "7. Requests from public authorities",
    p: [
      "Requests for records from a public authority must be made in writing through the in-app support channel and must identify the requesting body, the legal basis and the specific records sought.",
      "RE:SOURCE discloses only the records within the scope of a lawful request, records the disclosure in the audit trail, and notifies the affected organization unless prohibited from doing so by law.",
    ],
  },
  {
    h: "8. Responsibility for regulated goods",
    p: [
      "Organizations remain responsible for complying with the law that applies to what they transfer, including food safety, medical, pharmaceutical, cold-chain and hazardous-goods rules, and for holding the licences and insurance their role requires.",
      "RE:SOURCE does not own, buy, sell, store, inspect or transport any resource listed on the platform and does not certify that any resource is fit for a given use.",
    ],
  },
  {
    h: "9. AI governance",
    p: [
      "AI is used to score potential matches, flag risk indicators and draft plans and documents. AI output is advisory and can be wrong or incomplete.",
      "No AI proposal takes effect on its own. Every match, transfer, schedule and status change requires explicit approval by a user of the relevant organization.",
      "Uploaded document files are not sent to AI models for verification scoring.",
    ],
  },
  {
    h: "10. Reporting a concern",
    p: [
      "Suspected fraud, a misused listing, a security weakness or a data concern should be reported through the in-app support channel with as much detail as possible. Reports are triaged by administrators and recorded in the audit trail.",
    ],
  },
];

function CompliancePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link to="/">
        <Wordmark className="text-base" />
      </Link>
      <p className="mono-label mt-10">Legal</p>
      <h1 className="mt-2 text-3xl">Compliance &amp; Government Engagement</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        What public bodies, regulators and partner organizations can expect from the way RE:SOURCE
        verifies participants and keeps records.
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
