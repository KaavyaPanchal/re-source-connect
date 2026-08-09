import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Boxes, HeartHandshake, Lock, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { logAudit } from "@/lib/session";
import {
  DISCLAIMER_AUTHORITY,
  DISCLAIMER_JURISDICTION,
  ORG_CATEGORIES,
  type OrgCategory,
} from "@/lib/verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, PageHeader } from "@/components/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Register your organization — RE:SOURCE" },
      {
        name: "description",
        content:
          "Register a supplier, recipient or logistics organization and start the RE:SOURCE verification process.",
      },
      { property: "og:title", content: "Register your organization — RE:SOURCE" },
      {
        property: "og:description",
        content: "Organization registration, authorized representative and verification consents.",
      },
    ],
  }),
  component: Onboarding,
});

const TYPES = [
  {
    key: "supplier" as const,
    icon: Boxes,
    title: "Supplier",
    d: "Businesses, restaurants, farms, manufacturers or individuals with surplus resources.",
  },
  {
    key: "recipient" as const,
    icon: HeartHandshake,
    title: "Recipient organization",
    d: "Food banks, NGOs, shelters, schools and community organizations with needs.",
  },
  {
    key: "logistics" as const,
    icon: Truck,
    title: "Logistics provider",
    d: "Transport operators moving resources between suppliers and recipients.",
  },
];

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
  description: z.string().trim().max(1000).optional(),
  website: z.string().trim().max(255).optional(),
  contact_email: z.string().trim().email("Valid contact email required").max(255),
  contact_phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  country: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

const repSchema = z.object({
  rep_full_name: z.string().trim().min(2, "Representative full name is required").max(120),
  rep_position: z.string().trim().min(2, "Position or role is required").max(120),
  rep_relationship: z
    .string()
    .trim()
    .min(2, "Describe the relationship to the organization")
    .max(160),
  registration_number: z.string().trim().max(80).optional(),
  issuing_authority: z.string().trim().max(160).optional(),
  registration_country: z.string().trim().max(120).optional(),
  registration_date: z.string().trim().max(20).optional(),
});

const STEPS = ["Organization type", "Details", "Representative", "Consents"];

function Onboarding() {
  const { userId, email, setActiveOrgId, orgs } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [type, setType] = useState<"supplier" | "recipient" | "logistics" | null>(null);
  const [category, setCategory] = useState<OrgCategory | "">("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
    contact_email: email,
    contact_phone: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    rep_full_name: "",
    rep_position: "",
    rep_relationship: "",
    registration_number: "",
    issuing_authority: "",
    registration_country: "",
    registration_date: "",
  });
  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    verification: false,
    comms: false,
    accuracy: false,
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function next() {
    if (step === 0) {
      if (!type) return toast.error("Choose an organization type");
      if (!category) return toast.error("Choose the category that best describes you");
    }
    if (step === 1) {
      const parsed = detailsSchema.safeParse({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      });
      if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    if (step === 2) {
      const parsed = repSchema.safeParse(form);
      if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    if (!type || !category) return;
    if (!consent.terms || !consent.privacy || !consent.verification || !consent.accuracy) {
      toast.error("All required consents must be accepted.");
      return;
    }
    const details = detailsSchema.safeParse({
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    });
    const rep = repSchema.safeParse(form);
    if (!details.success || !rep.success) {
      toast.error("Some details are incomplete — go back and review.");
      return;
    }

    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          owner_id: userId,
          name: details.data.name,
          type,
          org_category: category as never,
          description: details.data.description || null,
          website: details.data.website || null,
          contact_email: details.data.contact_email,
          contact_phone: details.data.contact_phone || null,
          address: details.data.address || null,
          city: details.data.city,
          country: details.data.country || null,
          latitude: details.data.latitude,
          longitude: details.data.longitude,
          rep_full_name: rep.data.rep_full_name,
          rep_position: rep.data.rep_position,
          rep_relationship: rep.data.rep_relationship,
          registration_number: rep.data.registration_number || null,
          issuing_authority: rep.data.issuing_authority || null,
          registration_country:
            rep.data.registration_country || details.data.country || null,
          registration_date: rep.data.registration_date || null,
          verification_status: "not_verified" as never,
          accepted_terms_at: now,
          accepted_privacy_at: now,
          consent_verification_at: now,
          consent_comms_at: consent.comms ? now : null,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("user_roles").insert({ user_id: userId, role: type }).select();
      await supabase.from("org_verification_events").insert({
        organization_id: data.id,
        event: "registered",
        status: "not_verified" as never,
        actor_id: userId,
        note: "Organization registered. Verification not yet submitted.",
      });
      await logAudit(userId, "organization.created", "organization", data.id, { type, category });
      await qc.invalidateQueries();
      setActiveOrgId(data.id);
      toast.success("Organization created. Continue in the verification center.");
      void navigate({ to: "/verification" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        label={orgs.length ? "New organization" : `Step ${step + 1} of ${STEPS.length}`}
        title="Register your organization"
        description="Organizations are checked before they can request or receive resources. Nothing you upload is ever shown publicly."
      />

      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary-soft text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  "panel p-4 text-left transition-all hover:shadow-lift",
                  type === t.key && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <t.icon
                  className={cn(
                    "h-5 w-5",
                    type === t.key ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <h3 className="mt-3 text-sm font-semibold">{t.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.d}</p>
              </button>
            ))}
          </div>
          <div className="panel p-6">
            <Field
              label="Organization category"
              hint="Determines which official documents you will be asked for. You are never asked for irrelevant proof."
            >
              <Select value={category} onValueChange={(v) => setCategory(v as OrgCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="mt-4 text-xs text-muted-foreground">{DISCLAIMER_JURISDICTION}</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Official website" hint="Optional but strengthens verification.">
              <Input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                maxLength={255}
                placeholder="https://"
              />
            </Field>
            <Field label="Contact email">
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                maxLength={255}
              />
            </Field>
            <Field label="Contact phone">
              <Input
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                maxLength={300}
              />
            </Field>
            <Field label="Latitude" hint="Optional — enables distance-aware matching.">
              <Input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </Field>
            <Field label="Longitude" hint="Optional — enables distance-aware matching.">
              <Input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="panel space-y-5 p-6">
          <p className="text-sm text-muted-foreground">
            The authorized representative is the person registering on behalf of the organization.
            These details are used for verification only.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.rep_full_name}
                onChange={(e) => set("rep_full_name", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Position / role">
              <Input
                value={form.rep_position}
                onChange={(e) => set("rep_position", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Relationship to the organization" hint="e.g. employee, director, volunteer coordinator.">
              <Input
                value={form.rep_relationship}
                onChange={(e) => set("rep_relationship", e.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="Registration number" hint="Optional here — required before review.">
              <Input
                value={form.registration_number}
                onChange={(e) => set("registration_number", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Issuing authority">
              <Input
                value={form.issuing_authority}
                onChange={(e) => set("issuing_authority", e.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="Country of registration">
              <Input
                value={form.registration_country}
                onChange={(e) => set("registration_country", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Registration date">
              <Input
                type="date"
                value={form.registration_date}
                onChange={(e) => set("registration_date", e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel space-y-4 p-6">
          <div className="flex items-start gap-2 rounded bg-muted/60 p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Documents you upload later are stored privately, are visible only to authorized
              reviewers, are never shown publicly and are never shared with other organizations.
            </p>
          </div>

          {[
            {
              k: "accuracy" as const,
              label:
                "I confirm the information provided is accurate and that I am authorized to register this organization.",
            },
            {
              k: "verification" as const,
              label:
                "I consent to RE:SOURCE verifying this organization, including reviewing documents I upload.",
            },
            {
              k: "terms" as const,
              label: "I accept the Terms & Conditions.",
              link: "/terms" as const,
              linkLabel: "Read terms",
            },
            {
              k: "privacy" as const,
              label: "I have read the Privacy Policy and consent to the described data handling.",
              link: "/privacy" as const,
              linkLabel: "Read privacy policy",
            },
            {
              k: "comms" as const,
              label: "Optional: send me coordination and platform updates by email.",
            },
          ].map((c) => (
            <label key={c.k} className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={consent[c.k]}
                onCheckedChange={(v) => setConsent((s) => ({ ...s, [c.k]: v === true }))}
                className="mt-0.5"
              />
              <span>
                {c.label}{" "}
                {"link" in c && c.link && (
                  <Link to={c.link} className="text-primary underline underline-offset-2">
                    {c.linkLabel}
                  </Link>
                )}
              </span>
            </label>
          ))}

          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {DISCLAIMER_AUTHORITY} {DISCLAIMER_JURISDICTION}
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create organization"}
          </Button>
        )}
      </div>
    </div>
  );
}
