import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Shield, Landmark, ScrollText } from "lucide-react";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal & Compliance Center — RE:SOURCE" },
      {
        name: "description",
        content:
          "Terms & conditions, privacy policy, acceptable use and the compliance posture RE:SOURCE applies when public bodies and regulated organizations coordinate resources.",
      },
      { property: "og:title", content: "Legal & Compliance Center — RE:SOURCE" },
      {
        property: "og:description",
        content:
          "Every policy that governs the RE:SOURCE network, in one place: terms, privacy, acceptable use and compliance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalHub,
});

const DOCS = [
  {
    to: "/terms" as const,
    icon: FileText,
    label: "Terms & Conditions",
    d: "What the platform is and is not, eligibility, verification duties, participant responsibilities, prohibited use, AI limits and liability.",
  },
  {
    to: "/privacy" as const,
    icon: Shield,
    label: "Privacy Policy",
    d: "What data is collected, why, who can see it, how verification documents are stored, retention periods and your rights.",
  },
  {
    to: "/acceptable-use" as const,
    icon: ScrollText,
    label: "Acceptable Use Policy",
    d: "The conduct rules for suppliers, recipients, logistics partners and public-sector observers on the network.",
  },
  {
    to: "/compliance" as const,
    icon: Landmark,
    label: "Compliance & Government Engagement",
    d: "How the platform supports oversight by public bodies: identity verification, audit trails, record retention and data requests.",
  },
];

function LegalHub() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link to="/">
        <Wordmark className="text-base" />
      </Link>
      <p className="mono-label mt-10">Legal</p>
      <h1 className="mt-2 text-3xl">Legal &amp; Compliance Center</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        RE:SOURCE is used by charities, hospitals, food banks, companies and public bodies. These
        documents set out the rules everyone on the network agrees to, and how information is
        handled when a government or regulator is involved in a transfer.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {DOCS.map((d) => (
          <Link key={d.to} to={d.to} className="panel block p-5 transition-colors hover:bg-muted/40">
            <d.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{d.label}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{d.d}</p>
          </Link>
        ))}
      </div>

      <div className="panel mt-8 p-5">
        <p className="mono-label">Disclaimer</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          RE:SOURCE is not a government authority, regulator or certification body. Verification on
          the platform is a good-faith review of the information and documents an organization
          supplies. It is not government accreditation and does not guarantee an organization&apos;s
          conduct. These documents are written in plain language and are not legal advice.
        </p>
      </div>
    </div>
  );
}
