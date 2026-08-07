import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { logAudit, notify, useRealtime } from "@/lib/session";
import { EmptyState, PageHeader, Stat, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RE:SOURCE" },
      {
        name: "description",
        content: "Verify organizations, monitor network activity and review the audit trail.",
      },
      { property: "og:title", content: "Admin — RE:SOURCE" },
      { property: "og:description", content: "Organization verification and audit oversight." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, userId } = useApp();
  const qc = useQueryClient();
  useRealtime(["organizations", "audit_logs"], [["admin-orgs"], ["admin-audit"]]);

  const { data: orgs } = useQuery({
    queryKey: ["admin-orgs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
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

  async function setStatus(
    org: { id: string; owner_id: string; name: string },
    status: "verified" | "rejected" | "flagged" | "pending",
  ) {
    const { error } = await supabase
      .from("organizations")
      .update({ verification_status: status })
      .eq("id", org.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit(userId, `org.${status}`, "organization", org.id, {});
    await notify(
      org.owner_id,
      `Organization ${status}`,
      `${org.name} is now ${status}.`,
      "verification",
      "/dashboard",
    );
    toast.success(`${org.name} marked ${status}.`);
    await qc.invalidateQueries({ queryKey: ["admin-orgs"] });
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
  const pending = list.filter((o) => o.verification_status === "pending");

  return (
    <div>
      <PageHeader
        label="Oversight"
        title="Admin"
        description="Verification decisions take effect immediately and are used by the match-scoring engine."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Organizations" value={list.length} />
        <Stat label="Pending review" value={pending.length} tone="warn" />
        <Stat
          label="Verified"
          value={list.filter((o) => o.verification_status === "verified").length}
          tone="primary"
        />
        <Stat
          label="Flagged / rejected"
          value={
            list.filter((o) => ["flagged", "rejected"].includes(o.verification_status)).length
          }
        />
      </div>

      <h2 className="mono-label mb-3">Organizations</h2>
      <div className="mb-10 grid gap-2">
        {list.map((o) => (
          <div key={o.id} className="panel flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{o.name}</h3>
                <StatusPill status={o.verification_status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {o.type}
                {o.city ? ` · ${o.city}` : ""} · reliability {o.reliability_score} ·{" "}
                {o.contact_email ?? "no contact email"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setStatus(o, "verified")}>
                Verify
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(o, "flagged")}>
                Flag
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(o, "rejected")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

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
