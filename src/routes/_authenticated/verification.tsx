import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, Circle, FileUp, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { logAudit } from "@/lib/session";
import { assessOrgRisk, checkOfficialRegistry, getDocumentUrl } from "@/lib/verification.functions";
import {
  DISCLAIMER_AUTHORITY,
  DISCLAIMER_JURISDICTION,
  docOptionsFor,
  labelForCategory,
  labelForDoc,
  readyForReview,
  statusMeta,
  validateDocFile,
  verificationChecklist,
  type OrgCategory,
} from "@/lib/verification";
import { Field, EmptyState, PageHeader } from "@/components/bits";
import { VerificationStatusPill } from "@/components/verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Verification center — RE:SOURCE" },
      {
        name: "description",
        content:
          "Complete registration details, upload official proof and track the verification status of your organization.",
      },
      { property: "og:title", content: "Verification center — RE:SOURCE" },
      {
        property: "og:description",
        content: "Trust, verification and document status for your organization.",
      },
    ],
  }),
  component: VerificationPage,
});

const detailSchema = z.object({
  registration_number: z.string().trim().min(2, "Registration number is required").max(80),
  issuing_authority: z.string().trim().min(2, "Issuing authority is required").max(160),
  registration_country: z.string().trim().min(2, "Registration country is required").max(120),
  registration_date: z.string().trim().max(20).optional(),
  website: z.string().trim().max(255).optional(),
  rep_full_name: z.string().trim().min(2, "Representative name is required").max(120),
  rep_position: z.string().trim().min(2, "Position is required").max(120),
  rep_relationship: z.string().trim().min(2, "Relationship is required").max(160),
});

function VerificationPage() {
  const { activeOrg, userId } = useApp();
  const qc = useQueryClient();
  const runRisk = useServerFn(assessOrgRisk);
  const runRegistry = useServerFn(checkOfficialRegistry);
  const openDoc = useServerFn(getDocumentUrl);
  const [busy, setBusy] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? "";

  const { data: events } = useQuery({
    queryKey: ["org-events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_verification_events")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    registration_number: activeOrg?.registration_number ?? "",
    issuing_authority: activeOrg?.issuing_authority ?? "",
    registration_country: activeOrg?.registration_country ?? activeOrg?.country ?? "",
    registration_date: activeOrg?.registration_date ?? "",
    website: activeOrg?.website ?? "",
    rep_full_name: activeOrg?.rep_full_name ?? "",
    rep_position: activeOrg?.rep_position ?? "",
    rep_relationship: activeOrg?.rep_relationship ?? "",
  });
  const [docKind, setDocKind] = useState(activeOrg?.doc_kind ?? "");

  if (!activeOrg) {
    return (
      <EmptyState
        title="No organization selected"
        description="Register an organization first."
        action={
          <Button asChild>
            <Link to="/onboarding">Register organization</Link>
          </Button>
        }
      />
    );
  }

  const org = activeOrg;
  const meta = statusMeta(org.verification_status);
  const checklist = verificationChecklist(org);
  const ready = readyForReview(org);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function refresh() {
    await qc.invalidateQueries();
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const parsed = detailSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy("details");
    const { error } = await supabase
      .from("organizations")
      .update({
        registration_number: parsed.data.registration_number,
        issuing_authority: parsed.data.issuing_authority,
        registration_country: parsed.data.registration_country,
        registration_date: parsed.data.registration_date || null,
        website: parsed.data.website || null,
        rep_full_name: parsed.data.rep_full_name,
        rep_position: parsed.data.rep_position,
        rep_relationship: parsed.data.rep_relationship,
      })
      .eq("id", org.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Registration details saved.");
    await refresh();
  }

  async function uploadDoc(file: File) {
    if (!docKind) {
      toast.error("Choose which document you are uploading first.");
      return;
    }
    const problem = validateDocFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy("doc");
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${userId}/${org.id}/${docKind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("organizations")
        .update({ doc_kind: docKind as never, doc_path: path, doc_uploaded_at: new Date().toISOString() })
        .eq("id", org.id);
      if (error) throw error;
      await supabase.from("org_verification_events").insert({
        organization_id: org.id,
        event: "document_uploaded",
        actor_id: userId,
        note: labelForDoc(docKind),
      });
      toast.success("Document uploaded to private storage.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function viewDoc() {
    setBusy("view");
    try {
      const res = await openDoc({ data: { organizationId: org.id } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open document");
    } finally {
      setBusy(null);
    }
  }

  async function verifyEmail() {
    setBusy("email");
    const { data: userRes } = await supabase.auth.getUser();
    const accountEmail = userRes.user?.email?.toLowerCase();
    const orgEmail = org.contact_email?.toLowerCase();
    if (accountEmail && orgEmail && accountEmail === orgEmail) {
      await supabase.from("organizations").update({ email_verified: true }).eq("id", org.id);
      await supabase.from("org_verification_events").insert({
        organization_id: org.id,
        event: "email_verified",
        actor_id: userId,
        note: "Contact address matches the confirmed account email.",
      });
      toast.success("Contact email verified.");
      await refresh();
    } else {
      toast.error(
        "The contact email differs from your confirmed account email, so it will be checked during human review.",
      );
    }
    setBusy(null);
  }

  async function registryCheck() {
    setBusy("registry");
    try {
      const res = await runRegistry({ data: { organizationId: org.id } });
      toast.message("Registry check", { description: res.message });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registry check failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitForReview() {
    if (!ready) {
      toast.error("Complete every required item before submitting.");
      return;
    }
    setBusy("submit");
    const { error } = await supabase
      .from("organizations")
      .update({ verification_status: "under_review", submitted_at: new Date().toISOString() })
      .eq("id", org.id);
    if (error) {
      setBusy(null);
      toast.error(error.message);
      return;
    }
    await supabase.from("org_verification_events").insert({
      organization_id: org.id,
      event: "submitted",
      actor_id: userId,
      note: "Owner submitted the organization for verification.",
    });
    await logAudit(userId, "organization.submitted", "organization", org.id, {});
    try {
      await runRisk({ data: { organizationId: org.id } });
    } catch {
      /* risk analysis is advisory; submission still stands */
    }
    setBusy(null);
    toast.success("Submitted for review. You will be notified when a decision is made.");
    await refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Trust & verification"
        title="Verification center"
        description="Organizations must be verified before requesting or receiving resources. Everything here is reviewed by a human."
      />

      <div className="panel mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{org.name}</h2>
              <VerificationStatusPill status={org.verification_status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelForCategory(org.org_category)} · {org.type}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={registryCheck} disabled={busy === "registry"}>
              Registry check
            </Button>
            <Button
              size="sm"
              onClick={submitForReview}
              disabled={
                busy === "submit" || !ready || ["under_review", "verified"].includes(org.verification_status)
              }
            >
              {org.verification_status === "under_review" ? "Awaiting review" : "Submit for review"}
            </Button>
          </div>
        </div>
        {org.verification_notes && (
          <p className="mt-4 rounded border border-warn/40 bg-warn-soft/40 p-3 text-sm">
            <strong>Reviewer note:</strong> {org.verification_notes}
          </p>
        )}
      </div>

      <h2 className="mono-label mb-3">Requirements</h2>
      <div className="panel mb-8 divide-y divide-border">
        {checklist.map((item) => (
          <div key={item.key} className="flex items-start gap-3 px-4 py-3">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mono-label mb-3">Registration &amp; representative</h2>
      <form onSubmit={saveDetails} className="panel mb-8 space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration number">
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
          <Field label="Registration date" hint="Optional.">
            <Input
              type="date"
              value={form.registration_date}
              onChange={(e) => set("registration_date", e.target.value)}
            />
          </Field>
          <Field label="Official website" hint="Optional but strengthens verification.">
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={255} />
          </Field>
          <Field label="Representative full name">
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
          <Field label="Relationship to organization">
            <Input
              value={form.rep_relationship}
              onChange={(e) => set("rep_relationship", e.target.value)}
              maxLength={160}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy === "details"}>
            {busy === "details" ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>

      <h2 className="mono-label mb-3">Official proof document</h2>
      <div className="panel mb-8 space-y-4 p-6">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Stored privately. Never shown publicly, never shared with other organizations, only opened
          by authorized reviewers through a short-lived secure link. Every access is logged.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select value={docKind} onValueChange={setDocKind}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a document" />
              </SelectTrigger>
              <SelectContent>
                {docOptionsFor((org.org_category as OrgCategory) ?? "other").map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="docfile">File (PDF, JPG, PNG, WEBP — max 10 MB)</Label>
            <Input
              id="docfile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              disabled={busy === "doc"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadDoc(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        {org.doc_path ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3">
            <p className="text-sm">
              <FileUp className="mr-1.5 inline h-3.5 w-3.5" />
              {labelForDoc(org.doc_kind)} ·{" "}
              <span className="text-muted-foreground">
                uploaded {org.doc_uploaded_at ? new Date(org.doc_uploaded_at).toLocaleString() : ""}
              </span>
            </p>
            <Button size="sm" variant="outline" onClick={viewDoc} disabled={busy === "view"}>
              Open securely
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No document uploaded yet.</p>
        )}
      </div>

      <h2 className="mono-label mb-3">Contact verification</h2>
      <div className="panel mb-8 grid gap-3 p-6 sm:grid-cols-2">
        <div className="rounded border border-border p-3">
          <p className="text-sm font-medium">Email · {org.contact_email ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {org.email_verified ? "Verified." : "Not verified yet."}
          </p>
          {!org.email_verified && (
            <Button size="sm" variant="outline" className="mt-3" onClick={verifyEmail} disabled={busy === "email"}>
              Verify email
            </Button>
          )}
        </div>
        <div className="rounded border border-border p-3">
          <p className="text-sm font-medium">Phone · {org.contact_phone ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {org.phone_verified
              ? "Verified."
              : "No SMS provider is connected to this network, so the number is confirmed by the reviewer instead of by one-time code."}
          </p>
        </div>
      </div>

      <h2 className="mono-label mb-3">Verification history</h2>
      <div className="panel mb-8 divide-y divide-border">
        {(events ?? []).length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
        )}
        {(events ?? []).map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <div>
              <p className="font-mono text-xs">{e.event}</p>
              {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {DISCLAIMER_JURISDICTION} {DISCLAIMER_AUTHORITY} Read the{" "}
          <Link to="/terms" className="text-primary hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
