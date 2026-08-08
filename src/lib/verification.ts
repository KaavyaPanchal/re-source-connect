import type { Organization } from "@/lib/session";

export type OrgCategory =
  | "nonprofit_ngo"
  | "charity"
  | "school"
  | "hospital"
  | "government"
  | "community"
  | "religious"
  | "business"
  | "other";

export type DocKind =
  | "certificate_of_registration"
  | "certificate_of_incorporation"
  | "charity_registration"
  | "nonprofit_registration"
  | "government_registration"
  | "business_registration"
  | "tax_exemption"
  | "government_license"
  | "other_official_proof";

export type VerificationStatus =
  | "not_verified"
  | "under_review"
  | "verified"
  | "info_required"
  | "rejected"
  | "suspended"
  | "pending"
  | "flagged";

export const ORG_CATEGORIES: { value: OrgCategory; label: string }[] = [
  { value: "nonprofit_ngo", label: "Registered nonprofit / NGO" },
  { value: "charity", label: "Registered charity" },
  { value: "school", label: "School / educational institution" },
  { value: "hospital", label: "Hospital / healthcare organization" },
  { value: "government", label: "Government organization" },
  { value: "community", label: "Community organization" },
  { value: "religious", label: "Religious / community institution" },
  { value: "business", label: "Business / company" },
  { value: "other", label: "Other" },
];

export const DOC_KINDS: { value: DocKind; label: string }[] = [
  { value: "certificate_of_registration", label: "Certificate of Registration" },
  { value: "certificate_of_incorporation", label: "Certificate of Incorporation" },
  { value: "charity_registration", label: "Charity Registration Certificate" },
  { value: "nonprofit_registration", label: "Nonprofit Registration Certificate" },
  { value: "government_registration", label: "Government-issued Organization Registration" },
  { value: "business_registration", label: "Business Registration Certificate" },
  { value: "tax_exemption", label: "Tax / Exemption Certificate" },
  { value: "government_license", label: "Official Government License" },
  { value: "other_official_proof", label: "Other official proof of legal existence" },
];

/** Document options relevant to each organization type — users are never asked for irrelevant proof. */
const DOCS_BY_CATEGORY: Record<OrgCategory, DocKind[]> = {
  nonprofit_ngo: [
    "nonprofit_registration",
    "certificate_of_registration",
    "certificate_of_incorporation",
    "tax_exemption",
    "other_official_proof",
  ],
  charity: [
    "charity_registration",
    "certificate_of_registration",
    "tax_exemption",
    "other_official_proof",
  ],
  school: [
    "government_registration",
    "certificate_of_registration",
    "government_license",
    "other_official_proof",
  ],
  hospital: [
    "government_license",
    "government_registration",
    "certificate_of_registration",
    "other_official_proof",
  ],
  government: ["government_registration", "government_license", "other_official_proof"],
  community: [
    "certificate_of_registration",
    "nonprofit_registration",
    "other_official_proof",
  ],
  religious: [
    "certificate_of_registration",
    "nonprofit_registration",
    "tax_exemption",
    "other_official_proof",
  ],
  business: [
    "business_registration",
    "certificate_of_incorporation",
    "certificate_of_registration",
    "tax_exemption",
    "other_official_proof",
  ],
  other: DOC_KINDS.map((d) => d.value),
};

export function docOptionsFor(category: OrgCategory) {
  const allowed = DOCS_BY_CATEGORY[category] ?? DOCS_BY_CATEGORY.other;
  return DOC_KINDS.filter((d) => allowed.includes(d.value));
}

export function labelForCategory(value?: string | null) {
  return ORG_CATEGORIES.find((c) => c.value === value)?.label ?? "Unspecified";
}

export function labelForDoc(value?: string | null) {
  return DOC_KINDS.find((d) => d.value === value)?.label ?? "Not selected";
}

export const STATUS_META: Record<
  string,
  { label: string; tone: "ok" | "warn" | "bad" | "info"; blurb: string }
> = {
  not_verified: {
    label: "Not verified",
    tone: "info",
    blurb: "Registration is incomplete. Submit your verification details to continue.",
  },
  pending: {
    label: "Not verified",
    tone: "info",
    blurb: "Registration is incomplete. Submit your verification details to continue.",
  },
  under_review: {
    label: "Under review",
    tone: "warn",
    blurb: "Documents submitted. A reviewer is checking your organization.",
  },
  verified: {
    label: "Verified",
    tone: "ok",
    blurb: "This organization passed the required verification process.",
  },
  info_required: {
    label: "Additional information required",
    tone: "warn",
    blurb: "Something is missing or inconsistent. Update your details and resubmit.",
  },
  rejected: {
    label: "Rejected",
    tone: "bad",
    blurb: "Verification failed. Contact support if you believe this is an error.",
  },
  suspended: {
    label: "Suspended",
    tone: "bad",
    blurb: "This previously verified organization is temporarily restricted.",
  },
  flagged: {
    label: "Flagged",
    tone: "bad",
    blurb: "This organization is flagged for review.",
  },
};

export function statusMeta(status?: string | null) {
  return (
    STATUS_META[status ?? "not_verified"] ?? {
      label: status ?? "Unknown",
      tone: "info" as const,
      blurb: "",
    }
  );
}

export type ChecklistItem = { key: string; label: string; done: boolean; hint: string };

export function verificationChecklist(org: Organization): ChecklistItem[] {
  return [
    {
      key: "details",
      label: "Organization details",
      done: !!(org.name && org.city && org.contact_email),
      hint: "Name, location and contact email.",
    },
    {
      key: "representative",
      label: "Authorized representative",
      done: !!(org.rep_full_name && org.rep_position && org.rep_relationship),
      hint: "Who is registering on behalf of the organization.",
    },
    {
      key: "registration",
      label: "Registration details",
      done: !!(org.registration_number && org.issuing_authority && org.registration_country),
      hint: "Registration number, issuing authority and country.",
    },
    {
      key: "document",
      label: "Official proof document",
      done: !!(org.doc_kind && org.doc_path),
      hint: "Uploaded privately and only visible to reviewers.",
    },
    {
      key: "email",
      label: "Email verification",
      done: !!org.email_verified,
      hint: "Confirms the organization contact address.",
    },
    {
      key: "phone",
      label: "Phone verification",
      done: !!org.phone_verified,
      hint: "SMS one-time-code where an SMS provider is available.",
    },
    {
      key: "consent",
      label: "Terms, privacy and consents",
      done: !!(org.accepted_terms_at && org.accepted_privacy_at && org.consent_verification_at),
      hint: "Recorded at registration.",
    },
  ];
}

/** Everything required before an organization may be submitted for review. */
export function readyForReview(org: Organization) {
  const items = verificationChecklist(org);
  const blocking = items.filter((i) => !["phone", "email"].includes(i.key));
  return blocking.every((i) => i.done);
}

export function canReceiveResources(org: Organization | null | undefined) {
  return org?.verification_status === "verified";
}

export const DISCLAIMER_JURISDICTION =
  "Verification requirements vary by organization type and jurisdiction. RE:SOURCE may request additional documentation when necessary.";

export const DISCLAIMER_AUTHORITY =
  "RE:SOURCE is not a government authority and verification on the platform does not constitute government certification.";

export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export function validateDocFile(file: File): string | null {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return "Upload a PDF, JPG, PNG or WEBP file.";
  }
  if (file.size > MAX_DOC_BYTES) return "File must be 10 MB or smaller.";
  if (file.size === 0) return "That file appears to be empty.";
  return null;
}
