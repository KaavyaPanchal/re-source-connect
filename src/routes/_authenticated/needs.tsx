import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useCategories, useRealtime, logAudit } from "@/lib/session";
import { EmptyState, Field, PageHeader, StatusPill } from "@/components/bits";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { urgencyScore } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/needs")({
  head: () => ({
    meta: [
      { title: "Needs — RE:SOURCE" },
      {
        name: "description",
        content:
          "Publish what your organization needs, with quantities and deadlines the matching engine can act on.",
      },
      { property: "og:title", content: "Needs — RE:SOURCE" },
      { property: "og:description", content: "Publish and track your organization's open needs." },
    ],
  }),
  component: NeedsPage,
});

const schema = z.object({
  title: z.string().trim().min(2, "Title required").max(140),
  category_id: z.string().uuid("Choose a category"),
  quantity: z.number().positive("Quantity must be greater than 0").max(1_000_000_000),
  unit: z.string().trim().min(1).max(20),
});

type FormState = {
  id?: string;
  title: string;
  category_id: string;
  quantity: string;
  min_quantity: string;
  unit: string;
  purpose: string;
  acceptable_alternatives: string;
  storage_capacity: string;
  delivery_requirements: string;
  has_refrigeration: boolean;
  deadline: string;
  address: string;
  city: string;
  status: string;
};

const EMPTY: FormState = {
  title: "",
  category_id: "",
  quantity: "",
  min_quantity: "",
  unit: "kg",
  purpose: "",
  acceptable_alternatives: "",
  storage_capacity: "",
  delivery_requirements: "",
  has_refrigeration: false,
  deadline: "",
  address: "",
  city: "",
  status: "active",
};

function NeedsPage() {
  const { activeOrg, userId } = useApp();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  useRealtime(["needs"], [["needs", activeOrg?.id ?? ""]]);

  const { data: needs } = useQuery({
    queryKey: ["needs", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("needs")
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
    setForm({ ...EMPTY, city: activeOrg?.city ?? "", address: activeOrg?.address ?? "" });
    setOpen(true);
  }

  function openEdit(n: Record<string, unknown>) {
    setForm({
      id: n["id"] as string,
      title: (n["title"] as string) ?? "",
      category_id: (n["category_id"] as string) ?? "",
      quantity: String(n["quantity"] ?? ""),
      min_quantity: n["min_quantity"] == null ? "" : String(n["min_quantity"]),
      unit: (n["unit"] as string) ?? "kg",
      purpose: (n["purpose"] as string) ?? "",
      acceptable_alternatives: (n["acceptable_alternatives"] as string) ?? "",
      storage_capacity: (n["storage_capacity"] as string) ?? "",
      delivery_requirements: (n["delivery_requirements"] as string) ?? "",
      has_refrigeration: Boolean(n["has_refrigeration"]),
      deadline: n["deadline"] ? String(n["deadline"]).slice(0, 16) : "",
      address: (n["address"] as string) ?? "",
      city: (n["city"] as string) ?? "",
      status: (n["status"] as string) ?? "active",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    const parsed = schema.safeParse({
      title: form.title,
      category_id: form.category_id,
      quantity: Number(form.quantity),
      unit: form.unit,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      const deadline = form.deadline ? new Date(form.deadline).toISOString() : null;
      const payload = {
        organization_id: activeOrg.id,
        category_id: parsed.data.category_id,
        title: parsed.data.title,
        quantity: parsed.data.quantity,
        min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
        unit: parsed.data.unit,
        purpose: form.purpose || null,
        acceptable_alternatives: form.acceptable_alternatives || null,
        storage_capacity: form.storage_capacity || null,
        delivery_requirements: form.delivery_requirements || null,
        has_refrigeration: form.has_refrigeration,
        deadline,
        address: form.address || null,
        city: form.city || null,
        latitude: activeOrg.latitude,
        longitude: activeOrg.longitude,
        status: form.status as "active",
        urgency_score: urgencyScore(deadline),
      };

      if (form.id) {
        const { error } = await supabase.from("needs").update(payload).eq("id", form.id);
        if (error) throw error;
        await logAudit(userId, "need.updated", "need", form.id, {});
        toast.success("Need updated.");
      } else {
        const { data, error } = await supabase
          .from("needs")
          .insert({ ...payload, created_by: userId })
          .select()
          .single();
        if (error) throw error;
        await logAudit(userId, "need.created", "need", data.id, {});
        toast.success("Need published — it is now visible to the matching engine.");
      }
      await qc.invalidateQueries({ queryKey: ["needs", activeOrg.id] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("needs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit(userId, "need.deleted", "need", id, {});
    await qc.invalidateQueries({ queryKey: ["needs", activeOrg?.id] });
    toast.success("Need removed.");
  }

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Demand side"
        title="Needs"
        description="Every field you fill in improves match quality. Quantities and deadlines drive scoring directly."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Add need
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit need" : "Add need"}</DialogTitle>
            <DialogDescription>
              Missing details are reported by the assistant before a transfer is proposed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                maxLength={140}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.family} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["active", "partially_fulfilled", "fulfilled", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Quantity needed">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  required
                />
              </Field>
              <Field label="Minimum useful" hint="Below this, a partial transfer is not worth it.">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.min_quantity}
                  onChange={(e) => set("min_quantity", e.target.value)}
                />
              </Field>
              <Field label="Unit">
                <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} required />
              </Field>
            </div>
            <Field label="Deadline">
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </Field>
            <Field label="Purpose">
              <Textarea
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                rows={2}
                maxLength={2000}
              />
            </Field>
            <Field label="Acceptable alternatives">
              <Input
                value={form.acceptable_alternatives}
                onChange={(e) => set("acceptable_alternatives", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Storage capacity">
                <Input
                  value={form.storage_capacity}
                  onChange={(e) => set("storage_capacity", e.target.value)}
                />
              </Field>
              <Field label="Delivery requirements">
                <Input
                  value={form.delivery_requirements}
                  onChange={(e) => set("delivery_requirements", e.target.value)}
                />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-xs font-medium">Cold storage available</p>
                <p className="text-[11px] text-muted-foreground">
                  Required to receive refrigerated resources.
                </p>
              </div>
              <Switch
                checked={form.has_refrigeration}
                onCheckedChange={(v) => set("has_refrigeration", v)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery address">
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : form.id ? "Save changes" : "Publish need"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {(needs ?? []).length === 0 ? (
        <EmptyState
          title="No needs published yet"
          description="Publish a need and the matching engine will start scoring live surplus against it."
          action={<Button onClick={openNew}>Add need</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {(needs ?? []).map((n) => {
            const outstanding = Number(n.quantity) - Number(n.fulfilled_quantity);
            const pct = Math.min(
              100,
              Math.round((Number(n.fulfilled_quantity) / Math.max(Number(n.quantity), 1)) * 100),
            );
            return (
              <div key={n.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{n.title}</h3>
                      <StatusPill status={n.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {outstanding} {n.unit} outstanding of {n.quantity} {n.unit}
                      {n.deadline && ` · due ${new Date(n.deadline).toLocaleString()}`}
                      {n.city && ` · ${n.city}`}
                    </p>
                    <div className="mt-2 h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
