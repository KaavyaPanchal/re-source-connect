import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useRealtime, logAudit, notify } from "@/lib/session";
import { EmptyState, Field, PageHeader, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRANSFER_FLOW,
  TRANSFER_LABEL,
  estimateCo2AvoidedKg,
  estimateMeals,
  estimateTransportEmissionsKg,
  type TransferStatus,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "Transfers — RE:SOURCE" },
      {
        name: "description",
        content:
          "Coordinate pickup, transport and delivery of matched resources, with verified impact at the end.",
      },
      { property: "og:title", content: "Transfers — RE:SOURCE" },
      { property: "og:description", content: "Live transfer pipeline from proposal to verified impact." },
    ],
  }),
  component: TransfersPage,
});

type TransferRow = {
  id: string;
  status: TransferStatus;
  quantity: number;
  unit: string;
  distance_km: number | null;
  supplier_org_id: string;
  recipient_org_id: string;
  logistics_org_id: string | null;
  resource_id: string;
  need_id: string;
  scheduled_pickup_at: string | null;
  scheduled_delivery_at: string | null;
  pickup_instructions: string | null;
  delivery_instructions: string | null;
  delivered_at: string | null;
  delivered_quantity: number | null;
  delivery_notes: string | null;
  impact_verified: boolean;
  resources: { title: string } | null;
  needs: { title: string } | null;
};

function TransfersPage() {
  const { activeOrg, userId } = useApp();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useRealtime(["transfers", "messages"], [["transfers", activeOrg?.id ?? ""]]);

  const { data: transfers } = useQuery({
    queryKey: ["transfers", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const id = activeOrg!.id;
      const { data, error } = await supabase
        .from("transfers")
        .select("*, resources(title), needs(title)")
        .or(
          `supplier_org_id.eq.${id},recipient_org_id.eq.${id},logistics_org_id.eq.${id}`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TransferRow[];
    },
  });

  const { data: carriers } = useQuery({
    queryKey: ["carriers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations_directory")
        .select("id, name, city")
        .eq("type", "logistics");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function advance(t: TransferRow, next: TransferStatus) {
    setBusy(t.id);
    try {
      const patch: Record<string, unknown> = { status: next };
      if (next === "delivered") patch["delivered_at"] = new Date().toISOString();
      const { error } = await supabase.from("transfers").update(patch as never).eq("id", t.id);
      if (error) throw error;
      await logAudit(userId, `transfer.${next}`, "transfer", t.id, {});
      const { data: orgs } = await supabase
        .from("organizations_directory")
        .select("owner_id")
        .in("id", [t.supplier_org_id, t.recipient_org_id]);
      for (const o of orgs ?? []) {
        await notify(
          o.owner_id,
          `Transfer ${TRANSFER_LABEL[next].toLowerCase()}`,
          `${t.resources?.title ?? "Transfer"} — ${t.quantity} ${t.unit}`,
          "transfer",
          "/transfers",
        );
      }
      toast.success(`Marked ${TRANSFER_LABEL[next].toLowerCase()}.`);
      await qc.invalidateQueries({ queryKey: ["transfers", activeOrg?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveDetails(t: TransferRow, patch: Record<string, unknown>) {
    setBusy(t.id);
    try {
      const { error } = await supabase.from("transfers").update(patch as never).eq("id", t.id);
      if (error) throw error;
      toast.success("Transfer updated.");
      await qc.invalidateQueries({ queryKey: ["transfers", activeOrg?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  /** Delivery confirmation writes back to the need, the resource and impact. */
  async function verifyImpact(t: TransferRow) {
    setBusy(t.id);
    try {
      const delivered = Number(t.delivered_quantity ?? t.quantity);
      const { data: need } = await supabase
        .from("needs")
        .select("quantity, fulfilled_quantity")
        .eq("id", t.need_id)
        .single();
      if (need) {
        const fulfilled = Number(need.fulfilled_quantity) + delivered;
        await supabase
          .from("needs")
          .update({
            fulfilled_quantity: fulfilled,
            status: fulfilled >= Number(need.quantity) ? "fulfilled" : "partially_fulfilled",
          })
          .eq("id", t.need_id);
      }

      const { data: resource } = await supabase
        .from("resources")
        .select("quantity, reserved_quantity")
        .eq("id", t.resource_id)
        .single();
      if (resource) {
        const remaining = Math.max(0, Number(resource.quantity) - delivered);
        await supabase
          .from("resources")
          .update({
            quantity: remaining,
            reserved_quantity: Math.max(0, Number(resource.reserved_quantity) - Number(t.quantity)),
            status: remaining <= 0 ? "transferred" : "available",
          })
          .eq("id", t.resource_id);
      }

      const { error } = await supabase
        .from("transfers")
        .update({ status: "impact_verified", impact_verified: true, confirmed_by: userId })
        .eq("id", t.id);
      if (error) throw error;
      await logAudit(userId, "transfer.impact_verified", "transfer", t.id, { delivered });
      toast.success("Impact verified and counted.");
      await qc.invalidateQueries({ queryKey: ["transfers", activeOrg?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(null);
    }
  }

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Logistics"
        title="Transfers"
        description="Every state change is written to the database and pushed live to the other parties."
      />

      {(transfers ?? []).length === 0 ? (
        <EmptyState
          title="No transfers yet"
          description="Accept a match and create a transfer to start coordinating pickup and delivery."
        />
      ) : (
        <div className="grid gap-3">
          {(transfers ?? []).map((t) => {
            const idx = TRANSFER_FLOW.indexOf(t.status);
            const next = idx >= 0 ? TRANSFER_FLOW[idx + 1] : undefined;
            const role =
              t.supplier_org_id === activeOrg.id
                ? "supplier"
                : t.recipient_org_id === activeOrg.id
                  ? "recipient"
                  : "carrier";
            const expanded = openId === t.id;
            return (
              <div key={t.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {t.resources?.title ?? "Resource"} → {t.needs?.title ?? "Need"}
                      </h3>
                      <StatusPill status={t.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.quantity} {t.unit}
                      {t.distance_km != null && ` · ${t.distance_km} km`} · you are the {role}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {TRANSFER_FLOW.map((s, i) => (
                        <span
                          key={s}
                          title={TRANSFER_LABEL[s]}
                          className={cn(
                            "h-1.5 w-10 rounded-full",
                            i <= idx ? "bg-primary" : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.status !== "cancelled" && t.status !== "impact_verified" && next && (
                      <Button
                        size="sm"
                        disabled={busy === t.id}
                        onClick={() =>
                          next === "impact_verified" ? verifyImpact(t) : advance(t, next)
                        }
                      >
                        Mark {TRANSFER_LABEL[next].toLowerCase()}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenId(expanded ? null : t.id)}
                    >
                      {expanded ? "Hide" : "Details"}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <TransferDetails
                    transfer={t}
                    busy={busy === t.id}
                    carriers={carriers ?? []}
                    onSave={(patch) => saveDetails(t, patch)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TransferDetails({
  transfer,
  busy,
  carriers,
  onSave,
}: {
  transfer: TransferRow;
  busy: boolean;
  carriers: { id: string; name: string; city: string | null }[];
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const { userId, email } = useApp();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState(transfer.scheduled_pickup_at?.slice(0, 16) ?? "");
  const [delivery, setDelivery] = useState(transfer.scheduled_delivery_at?.slice(0, 16) ?? "");
  const [carrier, setCarrier] = useState(transfer.logistics_org_id ?? "");
  const [pickupNotes, setPickupNotes] = useState(transfer.pickup_instructions ?? "");
  const [deliveryNotes, setDeliveryNotes] = useState(transfer.delivery_notes ?? "");
  const [deliveredQty, setDeliveredQty] = useState(
    String(transfer.delivered_quantity ?? transfer.quantity),
  );
  const [message, setMessage] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["transfer-messages", transfer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("transfer_id", transfer.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function send() {
    if (!message.trim()) return;
    const { error } = await supabase.from("messages").insert({
      transfer_id: transfer.id,
      sender_id: userId,
      sender_name: email,
      body: message.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    await qc.invalidateQueries({ queryKey: ["transfer-messages", transfer.id] });
  }

  const meals = estimateMeals(Number(transfer.delivered_quantity ?? transfer.quantity));
  const co2 = estimateCo2AvoidedKg(Number(transfer.delivered_quantity ?? transfer.quantity));
  const emissions = estimateTransportEmissionsKg(
    Number(transfer.distance_km ?? 0),
    Number(transfer.delivered_quantity ?? transfer.quantity),
  );

  return (
    <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
      <div className="space-y-4">
        <h4 className="mono-label">Coordination</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scheduled pickup">
            <Input
              type="datetime-local"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </Field>
          <Field label="Scheduled delivery">
            <Input
              type="datetime-local"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Carrier">
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger>
              <SelectValue placeholder="Assign a logistics partner" />
            </SelectTrigger>
            <SelectContent>
              {carriers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` · ${c.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pickup instructions">
          <Textarea rows={2} value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivered quantity">
            <Input
              type="number"
              min="0"
              step="any"
              value={deliveredQty}
              onChange={(e) => setDeliveredQty(e.target.value)}
            />
          </Field>
          <Field label="Delivery notes">
            <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
          </Field>
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            onSave({
              scheduled_pickup_at: pickup ? new Date(pickup).toISOString() : null,
              scheduled_delivery_at: delivery ? new Date(delivery).toISOString() : null,
              logistics_org_id: carrier || null,
              pickup_instructions: pickupNotes || null,
              delivery_notes: deliveryNotes || null,
              delivered_quantity: deliveredQty ? Number(deliveredQty) : null,
            })
          }
        >
          Save coordination details
        </Button>

        <div className="panel bg-muted/40 p-3">
          <p className="mono-label">Estimated impact on completion</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            ~{meals} meal equivalents · ~{co2} kg CO₂e diverted · ~{emissions} kg CO₂e transport cost
            (estimates, not measurements)
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <h4 className="mono-label mb-3">Thread</h4>
        <div className="mb-3 max-h-64 flex-1 space-y-2 overflow-y-auto">
          {(messages ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No messages yet.</p>
          )}
          {(messages ?? []).map((m) => (
            <div key={m.id} className="rounded-md border border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                {m.is_ai ? "Assistant" : (m.sender_name ?? "Member")} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="mt-0.5 text-sm">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message the other party"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button size="sm" onClick={() => void send()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
