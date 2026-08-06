import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useCategories, useRealtime, logAudit } from "@/lib/session";
import { EmptyState, Field, PageHeader, StatusPill, UrgencyBadge } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hoursUntil, urgencyScore } from "@/lib/domain";
import { analyzeListing } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Surplus resources — RE:SOURCE" },
      {
        name: "description",
        content: "List and update surplus resources. Every edit is used by matching immediately.",
      },
      { property: "og:title", content: "Surplus resources — RE:SOURCE" },
      { property: "og:description", content: "Manage the surplus your organization can transfer." },
    ],
  }),
  component: ResourcesPage,
});

const schema = z.object({
  title: z.string().trim().min(2, "Title required").max(140),
  category_id: z.string().uuid("Choose a category"),
  quantity: z.number().nonnegative("Quantity must be 0 or more").max(1_000_000_000),
  unit: z.string().trim().min(1).max(20),
  condition: z.string().trim().max(120).optional(),
  storage_requirements: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
  pickup_address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  photos: z.array(z.string().url()).max(10),
});

type FormState = {
  id?: string;
  title: string;
  category_id: string;
  quantity: string;
  unit: string;
  condition: string;
  storage_requirements: string;
  requires_refrigeration: boolean;
  description: string;
  expires_at: string;
  available_from: string;
  available_to: string;
  pickup_address: string;
  city: string;
  latitude: string;
  longitude: string;
  photos: string;
  status: string;
};

const EMPTY: FormState = {
  title: "",
  category_id: "",
  quantity: "",
  unit: "kg",
  condition: "",
  storage_requirements: "",
  requires_refrigeration: false,
  description: "",
  expires_at: "",
  available_from: "",
  available_to: "",
  pickup_address: "",
  city: "",
  latitude: "",
  longitude: "",
  photos: "",
  status: "available",
};

function ResourcesPage() {
  const { activeOrg, userId } = useApp();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useRealtime(["resources"], [["resources", activeOrg?.id ?? ""]]);

  const { data: resources } = useQuery({
    queryKey: ["resources", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("organization_id", activeOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openNew() {
    setForm({ ...EMPTY, city: activeOrg?.city ?? "", pickup_address: activeOrg?.address ?? "" });
    setOpen(true);
  }

  function openEdit(r: Record<string, unknown>) {
    setForm({
      id: r["id"] as string,
      title: (r["title"] as string) ?? "",
      category_id: (r["category_id"] as string) ?? "",
      quantity: String(r["quantity"] ?? ""),
      unit: (r["unit"] as string) ?? "kg",
      condition: (r["condition"] as string) ?? "",
      storage_requirements: (r["storage_requirements"] as string) ?? "",
      requires_refrigeration: Boolean(r["requires_refrigeration"]),
      description: (r["description"] as string) ?? "",
      expires_at: r["expires_at"] ? String(r["expires_at"]).slice(0, 16) : "",
      available_from: r["available_from"] ? String(r["available_from"]).slice(0, 16) : "",
      available_to: r["available_to"] ? String(r["available_to"]).slice(0, 16) : "",
      pickup_address: (r["pickup_address"] as string) ?? "",
      city: (r["city"] as string) ?? "",
      latitude: r["latitude"] == null ? "" : String(r["latitude"]),
      longitude: r["longitude"] == null ? "" : String(r["longitude"]),
      photos: ((r["photos"] as string[]) ?? []).join("\n"),
      status: (r["status"] as string) ?? "available",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    const photos = form.photos
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = schema.safeParse({
      title: form.title,
      category_id: form.category_id,
      quantity: Number(form.quantity),
      unit: form.unit,
      condition: form.condition,
      storage_requirements: form.storage_requirements,
      description: form.description,
      pickup_address: form.pickup_address,
      city: form.city,
      photos,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        organization_id: activeOrg.id,
        category_id: parsed.data.category_id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        condition: parsed.data.condition ?? null,
        storage_requirements: parsed.data.storage_requirements ?? null,
        requires_refrigeration: form.requires_refrigeration,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        available_from: form.available_from ? new Date(form.available_from).toISOString() : null,
        available_to: form.available_to ? new Date(form.available_to).toISOString() : null,
        pickup_address: parsed.data.pickup_address ?? null,
        city: parsed.data.city ?? null,
        latitude: form.latitude ? Number(form.latitude) : activeOrg.latitude,
        longitude: form.longitude ? Number(form.longitude) : activeOrg.longitude,
        photos,
        status: form.status as "available",
        urgency_score: urgencyScore(form.expires_at ? new Date(form.expires_at).toISOString() : null),
      };

      if (form.id) {
        const { error } = await supabase.from("resources").update(payload).eq("id", form.id);
        if (error) throw error;
        await logAudit(userId, "resource.updated", "resource", form.id, {
          quantity: payload.quantity,
        });
        toast.success("Resource updated — matching now uses the new values.");
      } else {
        const { data, error } = await supabase
          .from("resources")
          .insert({ ...payload, created_by: userId })
          .select()
          .single();
        if (error) throw error;
        await logAudit(userId, "resource.created", "resource", data.id, {});
        toast.success("Surplus listed.");
      }
      await qc.invalidateQueries({ queryKey: ["resources", activeOrg.id] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit(userId, "resource.deleted", "resource", id, {});
    await qc.invalidateQueries({ queryKey: ["resources", activeOrg?.id] });
    toast.success("Resource removed.");
  }

  async function analyze(id: string) {
    setAnalyzing(id);
    try {
      const result = await analyzeListing({ data: { resourceId: id } });
      toast.success(result.summary.slice(0, 120));
      await qc.invalidateQueries({ queryKey: ["resources", activeOrg?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  }

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Supply side"
        title="Surplus resources"
        description="Edit quantity, expiry or availability at any time. The matching engine always reads the current values."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Add surplus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit resource" : "Add surplus"}</DialogTitle>
                <DialogDescription>
                  Anything you leave blank is reported as missing information by the assistant.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <Field label="Title">
                  <Input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={140} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Category">
                    <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quantity">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Unit">
                    <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} maxLength={20} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Expires at">
                    <Input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => set("expires_at", e.target.value)}
                    />
                  </Field>
                  <Field label="Available from">
                    <Input
                      type="datetime-local"
                      value={form.available_from}
                      onChange={(e) => set("available_from", e.target.value)}
                    />
                  </Field>
                  <Field label="Available to">
                    <Input
                      type="datetime-local"
                      value={form.available_to}
                      onChange={(e) => set("available_to", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Condition">
                    <Input
                      value={form.condition}
                      onChange={(e) => set("condition", e.target.value)}
                      maxLength={120}
                      placeholder="Sealed, unopened, grade A…"
                    />
                  </Field>
                  <Field label="Storage requirements">
                    <Input
                      value={form.storage_requirements}
                      onChange={(e) => set("storage_requirements", e.target.value)}
                      maxLength={300}
                      placeholder="Dry storage, below 25°C…"
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border p-3">
                  <Switch
                    checked={form.requires_refrigeration}
                    onCheckedChange={(v) => set("requires_refrigeration", v)}
                    id="fridge"
                  />
                  <label htmlFor="fridge" className="text-sm">
                    Requires refrigerated storage and transport
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pickup address">
                    <Input
                      value={form.pickup_address}
                      onChange={(e) => set("pickup_address", e.target.value)}
                      maxLength={300}
                    />
                  </Field>
                  <Field label="City">
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => set("latitude", e.target.value)}
                    />
                  </Field>
                  <Field label="Longitude">
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
                    rows={3}
                    maxLength={2000}
                  />
                </Field>
                <Field label="Photo / document URLs" hint="One URL per line.">
                  <Textarea value={form.photos} onChange={(e) => set("photos", e.target.value)} rows={2} />
                </Field>
                <Field label="Availability status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Saving…" : form.id ? "Save changes" : "List surplus"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {(resources ?? []).length === 0 ? (
        <EmptyState
          title="No surplus listed"
          description="Add your first resource. It becomes matchable immediately."
          action={<Button onClick={openNew}>Add surplus</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {(resources ?? []).map((r) => {
            const h = hoursUntil(r.expires_at);
            const analysis = r.ai_analysis as
              | { summary?: string; missing?: string[]; urgency?: string }
              | null;
            return (
              <li key={r.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{r.title}</h3>
                      <StatusPill status={r.status} />
                      {r.expires_at && <UrgencyBadge score={urgencyScore(r.expires_at)} />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {Number(r.quantity).toLocaleString()} {r.unit}
                      {Number(r.reserved_quantity) > 0 &&
                        ` · ${Number(r.reserved_quantity).toLocaleString()} reserved`}
                      {r.city && ` · ${r.city}`}
                      {h != null && ` · ${h > 0 ? `${Math.round(h)}h to expiry` : "expired"}`}
                      {r.requires_refrigeration && " · refrigerated"}
                    </p>
                    {analysis?.summary && (
                      <p className="mt-2 rounded-md bg-info-soft px-3 py-2 text-xs text-foreground">
                        <span className="mono-label mr-2">AI</span>
                        {analysis.summary}
                        {analysis.missing?.length ? (
                          <span className="mt-1 block text-warn">
                            Missing: {analysis.missing.join(", ")}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyze(r.id)}
                      disabled={analyzing === r.id}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {analyzing === r.id ? "Analyzing…" : "Analyze"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
