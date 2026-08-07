import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useRealtime } from "@/lib/session";
import { PageHeader, Stat, EmptyState } from "@/components/bits";
import {
  estimateCo2AvoidedKg,
  estimateMeals,
  estimateTransportEmissionsKg,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/impact")({
  head: () => ({
    meta: [
      { title: "Impact — RE:SOURCE" },
      {
        name: "description",
        content:
          "Verified delivery outcomes: quantity moved, meal equivalents and emissions avoided, computed from confirmed transfers.",
      },
      { property: "og:title", content: "Impact — RE:SOURCE" },
      { property: "og:description", content: "Impact computed only from verified deliveries." },
    ],
  }),
  component: ImpactPage,
});

function ImpactPage() {
  const { activeOrg } = useApp();
  useRealtime(["transfers"], [["impact", activeOrg?.id ?? ""]]);

  const { data } = useQuery({
    queryKey: ["impact", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const id = activeOrg!.id;
      const { data, error } = await supabase
        .from("transfers")
        .select("*, resources(title), needs(title)")
        .or(`supplier_org_id.eq.${id},recipient_org_id.eq.${id},logistics_org_id.eq.${id}`)
        .in("status", ["delivered", "impact_verified"])
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const verified = rows.filter((t) => t.impact_verified);
  const totalQty = verified.reduce(
    (sum, t) => sum + Number(t.delivered_quantity ?? t.quantity),
    0,
  );
  const totalKm = verified.reduce((sum, t) => sum + Number(t.distance_km ?? 0), 0);
  const meals = estimateMeals(totalQty);
  const co2 = estimateCo2AvoidedKg(totalQty);
  const transport = verified.reduce(
    (sum, t) =>
      sum +
      estimateTransportEmissionsKg(
        Number(t.distance_km ?? 0),
        Number(t.delivered_quantity ?? t.quantity),
      ),
    0,
  );

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Outcomes"
        title="Impact"
        description="Only transfers with a confirmed delivery and verified impact are counted. Environmental figures are estimates derived from delivered quantity and distance."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Verified transfers" value={verified.length} tone="primary" />
        <Stat label="Quantity delivered" value={Math.round(totalQty * 10) / 10} hint="in listing units" />
        <Stat label="Meal equivalents" value={meals} hint="estimated" tone="info" />
        <Stat
          label="Net CO₂e avoided"
          value={`${Math.round((co2 - transport) * 10) / 10} kg`}
          hint={`${co2} kg diverted − ${Math.round(transport * 10) / 10} kg transport`}
          tone="primary"
        />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Distance covered" value={`${Math.round(totalKm)} km`} />
        <Stat label="Delivered, awaiting verification" value={rows.length - verified.length} tone="warn" />
        <Stat
          label="Average per transfer"
          value={verified.length ? Math.round((totalQty / verified.length) * 10) / 10 : 0}
        />
      </div>

      <h2 className="mono-label mb-3">Verified deliveries</h2>
      {rows.length === 0 ? (
        <EmptyState
          title="No completed deliveries yet"
          description="Impact appears here once a transfer is delivered and its impact is verified."
        />
      ) : (
        <div className="grid gap-2">
          {rows.map((t) => (
            <div key={t.id} className="panel flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div>
                <p className="text-sm font-semibold">
                  {(t.resources as { title?: string } | null)?.title} →{" "}
                  {(t.needs as { title?: string } | null)?.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.delivered_quantity ?? t.quantity} {t.unit}
                  {t.delivered_at && ` · delivered ${new Date(t.delivered_at).toLocaleDateString()}`}
                  {t.distance_km != null && ` · ${t.distance_km} km`}
                </p>
              </div>
              <span className="mono-label">
                {t.impact_verified ? "verified" : "awaiting verification"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
