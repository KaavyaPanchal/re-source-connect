import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/lib/session";
import { PageHeader } from "@/components/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Network map — RE:SOURCE" },
      {
        name: "description",
        content:
          "Geographic view of surplus, needs and transport capacity across the coordination network.",
      },
      { property: "og:title", content: "Network map — RE:SOURCE" },
      { property: "og:description", content: "See where surplus and demand sit geographically." },
    ],
  }),
  component: MapPage,
});

type Point = {
  id: string;
  kind: "resource" | "need" | "logistics";
  label: string;
  detail: string;
  lat: number;
  lng: number;
};

function MapPage() {
  const [hover, setHover] = useState<Point | null>(null);
  useRealtime(["resources", "needs", "organizations"], [["map-points"]]);

  const { data } = useQuery({
    queryKey: ["map-points"],
    queryFn: async () => {
      const [res, needs, orgs] = await Promise.all([
        supabase.from("resources").select("*").in("status", ["available", "reserved"]),
        supabase.from("needs").select("*").in("status", ["active", "partially_fulfilled"]),
        supabase.from("organizations_directory").select("*").eq("type", "logistics"),
      ]);
      if (res.error) throw res.error;
      if (needs.error) throw needs.error;
      if (orgs.error) throw orgs.error;

      const points: Point[] = [];
      for (const r of res.data ?? []) {
        if (r.latitude == null || r.longitude == null) continue;
        points.push({
          id: `r-${r.id}`,
          kind: "resource",
          label: r.title,
          detail: `${Number(r.quantity) - Number(r.reserved_quantity)} ${r.unit}${r.city ? ` · ${r.city}` : ""}`,
          lat: Number(r.latitude),
          lng: Number(r.longitude),
        });
      }
      for (const n of needs.data ?? []) {
        if (n.latitude == null || n.longitude == null) continue;
        points.push({
          id: `n-${n.id}`,
          kind: "need",
          label: n.title,
          detail: `${Number(n.quantity) - Number(n.fulfilled_quantity)} ${n.unit} needed${n.city ? ` · ${n.city}` : ""}`,
          lat: Number(n.latitude),
          lng: Number(n.longitude),
        });
      }
      for (const o of orgs.data ?? []) {
        if (o.latitude == null || o.longitude == null) continue;
        points.push({
          id: `l-${o.id}`,
          kind: "logistics",
          label: o.name,
          detail: `Transport${o.city ? ` · ${o.city}` : ""}`,
          lat: Number(o.latitude),
          lng: Number(o.longitude),
        });
      }
      return points;
    },
  });

  const points = data ?? [];

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const pad = 0.6;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [points]);

  function position(p: Point) {
    if (!bounds) return { left: "50%", top: "50%" };
    const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { left: `${x}%`, top: `${y}%` };
  }

  const counts = {
    resource: points.filter((p) => p.kind === "resource").length,
    need: points.filter((p) => p.kind === "need").length,
    logistics: points.filter((p) => p.kind === "logistics").length,
  };

  return (
    <div>
      <PageHeader
        label="Geography"
        title="Network map"
        description="Plotted from the coordinates stored on live listings. Add coordinates to an organization to place it here."
      />

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Surplus ({counts.resource})
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warn" /> Needs ({counts.need})
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-info" /> Transport ({counts.logistics})
        </span>
      </div>

      <div className="panel grid-bg relative h-[520px] overflow-hidden">
        {points.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing to plot yet. Listings need latitude and longitude to appear on the map.
            </p>
          </div>
        )}
        {points.map((p) => (
          <button
            key={p.id}
            type="button"
            style={position(p)}
            onMouseEnter={() => setHover(p)}
            onFocus={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            aria-label={`${p.label} — ${p.detail}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 transition-transform hover:scale-125",
              p.kind === "resource" && "h-3 w-3 bg-primary ring-primary/20",
              p.kind === "need" && "h-3 w-3 bg-warn ring-warn/20",
              p.kind === "logistics" && "h-2.5 w-2.5 bg-info ring-info/20",
            )}
          />
        ))}
        {hover && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-md border border-border bg-background/95 p-3 shadow-lift">
            <p className="mono-label">{hover.kind}</p>
            <p className="mt-1 text-sm font-semibold">{hover.label}</p>
            <p className="text-xs text-muted-foreground">{hover.detail}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {hover.lat.toFixed(3)}, {hover.lng.toFixed(3)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
