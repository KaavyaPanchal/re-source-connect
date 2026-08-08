import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — RE:SOURCE" },
      {
        name: "description",
        content:
          "RE:SOURCE terms of use: verification duties, document handling, liability limits and account rules for suppliers, recipients and logistics partners.",
      },
      { property: "og:title", content: "Terms & Conditions — RE:SOURCE" },
      {
        property: "og:description",
        content: "The rules that govern use of the RE:SOURCE coordination network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. What RE:SOURCE is",
    p: [
      "RE:SOURCE is a coordination platform that connects organizations holding surplus resources with organizations that need them, and with logistics providers who move them. RE:SOURCE does not own, buy, sell, store, inspect or transport any resource listed on the platform.",
      "All agreements about resources, quantities, condition, timing and transport are made directly between the organizations involved.",
    ],
  },
  {
    h: "2. Eligibility and accurate information",
    p: [
      "You may only register an organization you are authorized to represent. You must provide accurate, current and complete information about the organization, its registration details and your own role within it.",
      "Submitting false, altered, forged or misleading information or documents is a serious breach of these terms and may result in immediate suspension, permanent removal and referral to the relevant authorities.",
    ],
  },
  {
    h: "3. Verification",
    p: [
      "Organizations must pass verification before they can request or receive resources. Verification may include reviewing official registration documents, confirming contact details, duplicate detection and automated risk indicators.",
      "Verification requirements vary by organization type and jurisdiction. RE:SOURCE may request additional documentation at any time, and may re-review, suspend or revoke a verification if new information emerges.",
      "RE:SOURCE is not a government authority. Verification on the platform is a good-faith review of the information supplied and does not constitute government certification, accreditation or a guarantee of an organization's conduct.",
    ],
  },
  {
    h: "4. Documents you upload",
    p: [
      "Documents are uploaded to private storage. They are never shown publicly, never attached to public listings, never shared with other organizations and never used for marketing or profiling.",
      "Only authorized reviewers may open a document, always through a short-lived secure link, and every access is recorded in an audit trail.",
    ],
  },
  {
    h: "5. Responsibilities of participants",
    p: [
      "Suppliers are responsible for describing resources honestly, including quantity, condition, storage requirements and expiry, and for complying with all laws that apply to donating or transferring those resources — including food safety, medical, pharmaceutical and hazardous-goods rules.",
      "Recipients are responsible for confirming that they can lawfully accept, store and distribute what they request, and for confirming deliveries truthfully.",
      "Logistics providers are responsible for holding valid licences and insurance, and for transporting resources under the required conditions.",
    ],
  },
  {
    h: "6. Prohibited use",
    p: [
      "You must not resell resources obtained through the platform for profit where they were offered as a donation, misrepresent your organization or needs, impersonate another organization, upload malicious files, attempt to access data belonging to others, scrape the platform, or use it for anything unlawful.",
    ],
  },
  {
    h: "7. AI features",
    p: [
      "RE:SOURCE uses AI to score potential matches, flag risk indicators and draft plans and documents. AI output is advisory and can be wrong or incomplete.",
      "No AI proposal takes effect on its own. Every match, transfer, schedule and status change requires explicit human approval by a user of the relevant organization.",
    ],
  },
  {
    h: "8. Liability",
    p: [
      "The platform is provided on an as-is basis. To the maximum extent permitted by law, RE:SOURCE is not liable for the quality, safety, legality or fitness of any resource, for the conduct of any organization, for failed, delayed or damaged deliveries, or for any indirect or consequential loss arising from use of the platform.",
      "Nothing in these terms limits liability that cannot lawfully be limited.",
    ],
  },
  {
    h: "9. Suspension and termination",
    p: [
      "RE:SOURCE may suspend or terminate an account or organization that breaches these terms, fails verification, or presents a risk to other participants. You may close your account at any time; records required for audit, safety and legal purposes are retained as described in the privacy policy.",
    ],
  },
  {
    h: "10. Changes",
    p: [
      "These terms may be updated as the platform evolves. Material changes will be communicated in the app, and continued use after a change means you accept the updated terms.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link to="/">
        <Wordmark className="text-base" />
      </Link>
      <p className="mono-label mt-10">Legal</p>
      <h1 className="mt-2 text-3xl">Terms &amp; Conditions</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        These terms apply to every organization and user on the RE:SOURCE network. They are written
        in plain language and are not legal advice.
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
        See also the{" "}
        <Link to="/privacy" className="text-primary hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
