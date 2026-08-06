import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useRealtime } from "@/lib/session";
import { EmptyState, PageHeader, Stat, StatusPill, UrgencyBadge } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { estimateMeals, hoursUntil, urgencyScore } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RE:SOURCE" },
      {
        name: "description",
        content: "Live view of your surplus, needs, matches, transfers and verified impact.",
      },
      { property: "og:title", content: "Dashboard — RE:SOURCE" },
      { property: "og:description", content: "Your live resource coordination workspace." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { activeOrg } = useApp();
  const orgId = activeOrg?.id;

  useRealtime(
    ["resources", "needs", "matches", "transfers"],
    [["dashboard", orgId ?? ""]],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [resources, needs, matches, transfers, atRisk] = await Promise.all([
        supabase.from("resources").select("*").eq("organization_id", orgId!),
        supabase.from("needs").select("*").eq("organization_id", orgId!),
        supabase
          .from("matches")
          .select("*, resources(title, unit), needs(title), supplier:organizations!matches_supplier_org_id_fkey(name), recipient:organizations!matches_recipient_org_id_fkey(name)")
          .or(`supplier_org_id.eq.${orgId},recipient_org_id.eq.${orgId}`)
          .order("score", { ascending: false })
          .limit(6),
        supabase
          .from("transfers")
          .select("*, resources(title)")
          .or(`supplier_org_id.eq.${orgId},recipient_org_id.eq.${orgId},logistics_org_id.eq.${orgId}`)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("resources")
          .select("*, organizations(name)")
          .eq("status", "available")
          .not("expires_at", "is", null)
          .order("expires_at", { ascending: true })
          .limit(6),
      ]);
      return {
        resources: resources.data ?? [],
        needs: needs.data ?? [],
        matches: matches.data ?? [],
        transfers: transfers.data ?? [],
        atRisk: (atRisk.data ?? []).filter((r) => (hoursUntil(r.expires_at) ?? 999) < 96),
      };
    },
  });

  if (!activeOrg) return null;

  const type = activeOrg.type;
  const delivered = (data?.transfers ?? []).filter(
    (t) => t.status === "delivered" || t.status === "impact_verified",
  );
  const deliveredQty = delivered.reduce((s, t) => s + Number(t.delivered_quantity ?? 0), 0);

  return (
    <div>
      <PageHeader
        label={`${activeOrg.type} workspace`}
        title={activeOrg.name}
        description={
          activeOrg.verification_status === "verified"
            ? "Verified organization. You can be matched with other verified counterparties."
            : "Verification pending. You can operate, but matches will flag the unverified status until an administrator reviews your organization."
        }
        action={
          <Button asChild>
            <Link
              to={type === "supplier" ? "/resources" : type === "recipient" ? "/needs" : "/fleet"}
            >
              {type === "supplier"
                ? "Add surplus"
                : type === "recipient"
                  ? "Create need"
                  : "Manage fleet"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {type === "supplier" && (
          <>
            <Stat
              label="Active surplus"
              value={(data?.resources ?? []).filter((r) => r.status === "available").length}
              hint="Listings currently open to matching"
            />
            <Stat
              label="Quantity listed"
              value={(data?.resources ?? [])
                .filter((r) => r.status === "available")
                .reduce((s, r) => s + Number(r.quantity), 0)
                .toLocaleString()}
              hint="Across all units"
            />
          </>
        )}
        {type === "recipient" && (
          <>
            <Stat
              label="Active needs"
              value={(data?.needs ?? []).filter((n) => n.status === "active").length}
              hint="Open requests visible to suppliers"
            />
            <Stat
              label="Outstanding quantity"
              value={(data?.needs ?? [])
                .filter((n) => n.status === "active")
                .reduce((s, n) => s + Math.max(0, Number(n.quantity) - Number(n.fulfilled_quantity)), 0)
                .toLocaleString()}
              hint="Still unfulfilled"
            />
          </>
        )}
        {type === "logistics" && (
          <>
            <Stat
              label="Assigned transfers"
              value={(data?.transfers ?? []).length}
              hint="Jobs connected to your fleet"
            />
            <Stat
              label="Completed deliveries"
              value={delivered.length}
              tone="primary"
              hint="Confirmed by recipients"
            />
          </>
        )}
        <Stat
          label="Open matches"
          value={(data?.matches ?? []).filter((m) => m.status === "proposed").length}
          tone="info"
          hint="Awaiting a decision"
        />
        <Stat
          label="Verified delivered"
          value={deliveredQty.toLocaleString()}
          tone="primary"
          hint={
            deliveredQty > 0
              ? `≈ ${estimateMeals(deliveredQty).toLocaleString()} meals (estimated)`
              : "Confirmed quantities only"
          }
        />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">At risk</h2>
            <span className="mono-label">Network-wide</span>
          </div>
          {isLoading ? (
            <div className="panel h-40 animate-pulse" />
          ) : (data?.atRisk ?? []).length === 0 ? (
            <EmptyState
              title="Nothing expiring soon"
              description="No available resources on the network are within 96 hours of expiry."
            />
          ) : (
            <ul className="space-y-2">
              {(data?.atRisk ?? []).map((r) => {
                const h = hoursUntil(r.expires_at);
                return (
                  <li key={r.id} className="panel flex items-center gap-3 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(r.quantity).toLocaleString()} {r.unit} ·{" "}
                        {(r.organizations as { name: string } | null)?.name ?? "Unknown"} ·{" "}
                        {h != null && h > 0 ? `${Math.round(h)}h left` : "expired"}
                      </p>
                    </div>
                    <UrgencyBadge score={urgencyScore(r.expires_at)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent matches</h2>
            <Link to="/matches" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {(data?.matches ?? []).length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="Run the matching engine from the Matches page, or ask the assistant to find counterparties."
            />
          ) : (
            <ul className="space-y-2">
              {(data?.matches ?? []).map((m) => (
                <li key={m.id} className="panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {Math.round(Number(m.score))}%
                    </span>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="mt-1.5 truncate text-sm">
                    {(m.supplier as { name: string } | null)?.name} →{" "}
                    {(m.recipient as { name: string } | null)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(m.quantity).toLocaleString()} {m.unit} ·{" "}
                    {(m.resources as { title: string } | null)?.title}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent transfers</h2>
          <Link to="/transfers" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {(data?.transfers ?? []).length === 0 ? (
          <EmptyState
            title="No transfers yet"
            description="Transfers are created when a match is accepted by both sides."
          />
        ) : (
          <ul className="space-y-2">
            {(data?.transfers ?? []).map((t) => (
              <li key={t.id} className="panel flex flex-wrap items-center gap-3 p-3">
                <StatusPill status={t.status} />
                <span className="text-sm">{(t.resources as { title: string } | null)?.title}</span>
                <span className="text-xs text-muted-foreground">
                  {Number(t.quantity).toLocaleString()} {t.unit}
                </span>
                <Link
                  to="/transfers/$transferId"
                  params={{ transferId: t.id }}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
