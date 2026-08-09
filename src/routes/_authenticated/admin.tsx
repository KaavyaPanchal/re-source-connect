import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, ShieldAlert, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { logAudit, notify, useRealtime } from "@/lib/session";
import { assessOrgRisk, getDocumentUrl } from "@/lib/verification.functions";
import { labelForCategory, labelForDoc, statusMeta } from "@/lib/verification";
import { EmptyState, PageHeader, Stat } from "@/components/bits";
import { VerificationStatusPill } from "@/components/verification";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin verification center — RE:SOURCE" },
      {
        name: "description",
        content:
          "Review organization verification submissions, documents, risk signals and the audit trail.",
      },
      { property: "og:title", content: "Admin verification center — RE:SOURCE" },
      {
        property: "og:description",
        content: "Organization verification decisions, admin notes and audit oversight.",
      },
    ],
  }),
  component: AdminPage,
});

type Decision = "verified" | "info_required" | "rejected" | "suspended" | "under_review";

const DECISIONS: { value: Decision; label: string; variant?: "outline" }[] = [
  { value: "verified", label: "Approve" },
  { value: "info_required", label: "Request info", variant: "outline" },
  { value: "rejected", label: "Reject", variant: "outline" },
  { value: "suspended", label: "Suspend", variant: "outline" },
];

function AdminPage() {
  const { isAdmin, userId } = useApp();
  const qc = useQueryClient();
  const runRisk = useServerFn(assessOrgRisk);
  const openDoc = useServerFn(getDocumentUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useRealtime(
    ["organizations", "audit_logs"],
    [["admin-orgs"], ["admin-audit"]],
  );

  const { data: orgs } = useQuery({
    queryKey: ["admin-orgs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["admin-audit"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: adminNotes } = useQuery({
    queryKey: ["admin-notes", expanded],
    enabled: isAdmin && !!expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_admin_notes")
        .select("*")
        .eq("organization_id", expanded!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function decide(
    org: { id: string; owner_id: string; name: string },
    status: Decision,
  ) {
    const note = notes[org.id]?.trim() ?? "";
    if ((status === "info_required" || status === "rejected") && note.length < 5) {
      toast.error("Explain what is missing or why this was rejected.");
      return;
    }
    setBusy(org.id);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          verification_status: status as never,
          verification_notes: note || null,
          verified_at: status === "verified" ? new Date().toISOString() : null,
        })
        .eq("id", org.id);
      if (error) throw error;

      await supabase.from("org_verification_events").insert({
        organization_id: org.id,
        event: "decision",
        status: status as never,
        actor_id: userId,
        note: note || null,
      });
      if (note) {
        await supabase
          .from("org_admin_notes")
          .insert({ organization_id: org.id, admin_id: userId, note });
      }
      await logAudit(userId, `org.${status}`, "organization", org.id, {});
      await notify(
        org.owner_id,
        `Verification update: ${statusMeta(status).label}`,
        note || `${org.name} is now ${statusMeta(status).label.toLowerCase()}.`,
        "verification",
        "/verification",
      );
      toast.success(`${org.name}: ${statusMeta(status).label}.`);
      setNotes((n) => ({ ...n, [org.id]: "" }));
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  async function analyze(orgId: string) {
    setBusy(orgId);
    try {
      const res = await runRisk({ data: { organizationId: orgId } });
      toast.success(`Risk level: ${res.level}`);
      await qc.invalidateQueries({ queryKey: ["admin-orgs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Risk analysis failed");
    } finally {
      setBusy(null);
    }
  }

  async function viewDoc(orgId: string) {
    setBusy(orgId);
    try {
      const { url } = await openDoc({ data: { organizationId: orgId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open document");
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Your account does not have the admin role on this network."
      />
    );
  }

  const list = orgs ?? [];
  const queue = list.filter((o) =>
    ["under_review", "pending", "flagged"].includes(o.verification_status),
  );
  const rest = list.filter((o) => !queue.includes(o));

  function card(o: (typeof list)[number]) {
    const risk = (o.ai_risk_reasons ?? []) as unknown as string[];
    const isOpen = expanded === o.id;
    return (
      <div key={o.id} className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{o.name}</h3>
              <VerificationStatusPill status={o.verification_status} />
              {o.ai_risk_level && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  risk {o.ai_risk_level}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelForCategory(o.org_category)} · {o.type}
              {o.city ? ` · ${o.city}` : ""}
              {o.registration_country ? ` · ${o.registration_country}` : ""} ·{" "}
              {o.contact_email ?? "no contact email"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reg. {o.registration_number ?? "—"} · {o.issuing_authority ?? "no authority"} ·{" "}
              {labelForDoc(o.doc_kind)} {o.doc_path ? "(uploaded)" : "(missing)"} · email{" "}
              {o.email_verified ? "verified" : "unverified"} · phone{" "}
              {o.phone_verified ? "verified" : "unverified"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : o.id)}>
              {isOpen ? "Close" : "Review"}
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mono-label mb-1">Representative</p>
                <p className="text-xs text-muted-foreground">
                  {o.rep_full_name ?? "—"} · {o.rep_position ?? "—"} · {o.rep_relationship ?? "—"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Website: {o.website ?? "—"} · Consents:{" "}
                  {o.accepted_terms_at && o.accepted_privacy_at && o.consent_verification_at
                    ? "complete"
                    : "incomplete"}
                </p>
              </div>
              <div>
                <p className="mono-label mb-1">AI risk signals</p>
                {risk.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No analysis yet — advisory only, never an automatic decision.
                  </p>
                ) : (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {risk.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === o.id}
                onClick={() => analyze(o.id)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Run risk & duplicate check
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === o.id || !o.doc_path}
                onClick={() => viewDoc(o.id)}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Open document (2 min link)
              </Button>
            </div>

            <Textarea
              rows={2}
              maxLength={1000}
              placeholder="Reviewer note — shared with the organization for info-required and rejection decisions."
              value={notes[o.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
            />

            <div className="flex flex-wrap gap-2">
              {DECISIONS.map((d) => (
                <Button
                  key={d.value}
                  size="sm"
                  variant={d.variant}
                  disabled={busy === o.id}
                  onClick={() => decide(o, d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>

            {(adminNotes ?? []).length > 0 && (
              <div>
                <p className="mono-label mb-1">Internal notes</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(adminNotes ?? []).map((n) => (
                    <li key={n.id}>
                      {new Date(n.created_at).toLocaleString()} — {n.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Oversight"
        title="Admin verification center"
        description="Decisions take effect immediately: only verified organizations can publish needs or receive transfers."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Organizations" value={list.length} />
        <Stat label="Awaiting review" value={queue.length} tone="warn" />
        <Stat
          label="Verified"
          value={list.filter((o) => o.verification_status === "verified").length}
          tone="primary"
        />
        <Stat
          label="Rejected / suspended"
          value={
            list.filter((o) => ["rejected", "suspended"].includes(o.verification_status)).length
          }
        />
      </div>

      <h2 className="mono-label mb-3 flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" /> Review queue
      </h2>
      <div className="mb-10 grid gap-2">
        {queue.length === 0 && (
          <p className="panel p-4 text-sm text-muted-foreground">
            Nothing awaiting review right now.
          </p>
        )}
        {queue.map(card)}
      </div>

      <h2 className="mono-label mb-3">All organizations</h2>
      <div className="mb-10 grid gap-2">{rest.map(card)}</div>

      <h2 className="mono-label mb-3">Recent activity</h2>
      <div className="panel divide-y divide-border">
        {(audit ?? []).length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
        {(audit ?? []).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <p className="font-mono text-xs">{a.action}</p>
            <p className="text-xs text-muted-foreground">
              {a.entity} · {new Date(a.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
