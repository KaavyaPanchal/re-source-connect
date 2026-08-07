import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useRealtime } from "@/lib/session";
import { EmptyState, Field, PageHeader, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TRANSFER_LABEL } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet — RE:SOURCE" },
      {
        name: "description",
        content:
          "Publish vehicle capacity and service areas, then claim transfers that need transport.",
      },
      { property: "og:title", content: "Fleet — RE:SOURCE" },
      { property: "og:description", content: "Manage vehicles and claim open transport jobs." },
    ],
  }),
  component: FleetPage,
});

type Form = {
  id?: string;
  vehicle_type: string;
  capacity_kg: string;
  refrigerated: boolean;
  max_distance_km: string;
  price_per_km: string;
  currency: string;
  service_areas: string;
  notes: string;
  available: boolean;
};

const EMPTY: Form = {
  vehicle_type: "Van",
  capacity_kg: "1000",
  refrigerated: false,
  max_distance_km: "150",
  price_per_km: "0",
  currency: "EUR",
  service_areas: "",
  notes: "",
  available: true,
};

function FleetPage() {
  const { activeOrg } = useApp();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  useRealtime(
    ["logistics_profiles", "transfers"],
    [["fleet", activeOrg?.id ?? ""], ["open-jobs", activeOrg?.id ?? ""]],
  );

  const { data: vehicles } = useQuery({
    queryKey: ["fleet", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistics_profiles")
        .select("*")
        .eq("organization_id", activeOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["open-jobs", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("*, resources(title), needs(title)")
        .is("logistics_org_id", null)
        .in("status", ["accepted", "scheduled", "pickup_ready"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myJobs } = useQuery({
    queryKey: ["my-jobs", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("*, resources(title), needs(title)")
        .eq("logistics_org_id", activeOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setBusy(true);
    try {
      const payload = {
        organization_id: activeOrg.id,
        vehicle_type: form.vehicle_type.trim(),
        capacity_kg: Number(form.capacity_kg) || 0,
        refrigerated: form.refrigerated,
        max_distance_km: Number(form.max_distance_km) || 0,
        price_per_km: Number(form.price_per_km) || 0,
        currency: form.currency.trim() || "EUR",
        service_areas: form.service_areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: form.notes || null,
        available: form.available,
      };
      if (form.id) {
        const { error } = await supabase
          .from("logistics_profiles")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("logistics_profiles").insert(payload);
        if (error) throw error;
      }
      toast.success("Vehicle saved.");
      setForm(EMPTY);
      await qc.invalidateQueries({ queryKey: ["fleet", activeOrg.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function claim(id: string) {
    if (!activeOrg) return;
    const { error } = await supabase
      .from("transfers")
      .update({ logistics_org_id: activeOrg.id })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Job claimed.");
    await qc.invalidateQueries({ queryKey: ["open-jobs", activeOrg.id] });
    await qc.invalidateQueries({ queryKey: ["my-jobs", activeOrg.id] });
  }

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Transport"
        title="Fleet"
        description="Vehicles you publish here are used by the matching engine to decide whether a transfer is feasible."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section>
            <h2 className="mono-label mb-3">Your vehicles</h2>
            {(vehicles ?? []).length === 0 ? (
              <EmptyState
                title="No vehicles yet"
                description="Add at least one vehicle so transfers can be routed to you."
              />
            ) : (
              <div className="grid gap-3">
                {(vehicles ?? []).map((v) => (
                  <div key={v.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {v.vehicle_type} · {v.capacity_kg} kg
                        {v.refrigerated ? " · refrigerated" : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Up to {v.max_distance_km} km · {v.price_per_km} {v.currency}/km
                        {v.service_areas.length > 0 && ` · ${v.service_areas.join(", ")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={v.available ? "active" : "unavailable"} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm({
                            id: v.id,
                            vehicle_type: v.vehicle_type,
                            capacity_kg: String(v.capacity_kg),
                            refrigerated: v.refrigerated,
                            max_distance_km: String(v.max_distance_km),
                            price_per_km: String(v.price_per_km),
                            currency: v.currency,
                            service_areas: v.service_areas.join(", "),
                            notes: v.notes ?? "",
                            available: v.available,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mono-label mb-3">Open transport jobs</h2>
            {(jobs ?? []).length === 0 ? (
              <p className="panel p-4 text-sm text-muted-foreground">
                No unassigned transfers right now.
              </p>
            ) : (
              <div className="grid gap-3">
                {(jobs ?? []).map((j) => (
                  <div key={j.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {(j.resources as { title?: string } | null)?.title} →{" "}
                        {(j.needs as { title?: string } | null)?.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {j.quantity} {j.unit}
                        {j.distance_km != null && ` · ${j.distance_km} km`} ·{" "}
                        {TRANSFER_LABEL[j.status as keyof typeof TRANSFER_LABEL]}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => claim(j.id)}>
                      Claim job
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mono-label mb-3">Your jobs</h2>
            {(myJobs ?? []).length === 0 ? (
              <p className="panel p-4 text-sm text-muted-foreground">Nothing assigned yet.</p>
            ) : (
              <div className="grid gap-3">
                {(myJobs ?? []).map((j) => (
                  <div key={j.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {(j.resources as { title?: string } | null)?.title} →{" "}
                        {(j.needs as { title?: string } | null)?.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {j.quantity} {j.unit}
                        {j.scheduled_pickup_at &&
                          ` · pickup ${new Date(j.scheduled_pickup_at).toLocaleString()}`}
                      </p>
                    </div>
                    <StatusPill status={j.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <form onSubmit={save} className="panel h-fit space-y-4 p-4">
          <h2 className="mono-label">{form.id ? "Edit vehicle" : "Add vehicle"}</h2>
          <Field label="Vehicle type">
            <Input
              value={form.vehicle_type}
              onChange={(e) => set("vehicle_type", e.target.value)}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacity (kg)">
              <Input
                type="number"
                min="0"
                value={form.capacity_kg}
                onChange={(e) => set("capacity_kg", e.target.value)}
              />
            </Field>
            <Field label="Max distance (km)">
              <Input
                type="number"
                min="0"
                value={form.max_distance_km}
                onChange={(e) => set("max_distance_km", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price per km">
              <Input
                type="number"
                min="0"
                step="any"
                value={form.price_per_km}
                onChange={(e) => set("price_per_km", e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </Field>
          </div>
          <Field label="Service areas" hint="Comma separated cities or regions.">
            <Input
              value={form.service_areas}
              onChange={(e) => set("service_areas", e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <span className="text-xs font-medium">Refrigerated</span>
            <Switch
              checked={form.refrigerated}
              onCheckedChange={(v) => set("refrigerated", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <span className="text-xs font-medium">Available for jobs</span>
            <Switch checked={form.available} onCheckedChange={(v) => set("available", v)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Saving…" : form.id ? "Save vehicle" : "Add vehicle"}
            </Button>
            {form.id && (
              <Button type="button" variant="outline" onClick={() => setForm(EMPTY)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
