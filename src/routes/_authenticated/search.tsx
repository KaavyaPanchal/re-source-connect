import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useRealtime } from "@/lib/session";
import { EmptyState, PageHeader, StatusPill } from "@/components/bits";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search the network — RE:SOURCE" },
      {
        name: "description",
        content:
          "Search every published surplus resource, need and organization across the coordination network.",
      },
      { property: "og:title", content: "Search the network — RE:SOURCE" },
      { property: "og:description", content: "Find surplus, needs and partner organizations." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState("all");
  const { data: categories } = useCategories();

  useRealtime(["resources", "needs", "organizations"], [["network"]]);

  const { data } = useQuery({
    queryKey: ["network"],
    queryFn: async () => {
      const [res, needs, orgs] = await Promise.all([
        supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("needs").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("organizations").select("*").order("name").limit(300),
      ]);
      if (res.error) throw res.error;
      if (needs.error) throw needs.error;
      if (orgs.error) throw orgs.error;
      return { resources: res.data ?? [], needs: needs.data ?? [], orgs: orgs.data ?? [] };
    },
  });

  const term = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!data) return [];
    const rows: {
      id: string;
      kind: "resource" | "need" | "organization";
      title: string;
      subtitle: string;
      status: string;
      categoryId?: string;
    }[] = [];

    for (const r of data.resources) {
      rows.push({
        id: r.id,
        kind: "resource",
        title: r.title,
        subtitle: `${Number(r.quantity) - Number(r.reserved_quantity)} ${r.unit} available${r.city ? ` · ${r.city}` : ""}`,
        status: r.status,
        categoryId: r.category_id,
      });
    }
    for (const n of data.needs) {
      rows.push({
        id: n.id,
        kind: "need",
        title: n.title,
        subtitle: `${Number(n.quantity) - Number(n.fulfilled_quantity)} ${n.unit} outstanding${n.city ? ` · ${n.city}` : ""}`,
        status: n.status,
        categoryId: n.category_id,
      });
    }
    for (const o of data.orgs) {
      rows.push({
        id: o.id,
        kind: "organization",
        title: o.name,
        subtitle: `${o.type}${o.city ? ` · ${o.city}` : ""} · reliability ${o.reliability_score}`,
        status: o.verification_status,
      });
    }

    return rows.filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (category !== "all" && row.categoryId !== category) return false;
      if (!term) return true;
      return (row.title + " " + row.subtitle).toLowerCase().includes(term);
    });
  }, [data, kind, category, term]);

  return (
    <div>
      <PageHeader
        label="Network"
        title="Search"
        description="Everything published by verified and pending organizations across the network."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_220px]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search surplus, needs, organizations"
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everything</SelectItem>
            <SelectItem value="resource">Surplus</SelectItem>
            <SelectItem value="need">Needs</SelectItem>
            <SelectItem value="organization">Organizations</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.family} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="Nothing matched"
          description="Try a broader term, or clear the category and type filters."
        />
      ) : (
        <div className="grid gap-2">
          {results.map((r) => (
            <div
              key={`${r.kind}-${r.id}`}
              className="panel flex flex-wrap items-center justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono-label">{r.kind}</span>
                  <h3 className="text-sm font-semibold">{r.title}</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.subtitle}</p>
              </div>
              <StatusPill status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
