import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { logAudit } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader } from "@/components/bits";
import { cn } from "@/lib/utils";
import { Boxes, HeartHandshake, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Register your organization — RE:SOURCE" },
      {
        name: "description",
        content: "Register a supplier, recipient or logistics organization on RE:SOURCE.",
      },
      { property: "og:title", content: "Register your organization — RE:SOURCE" },
      {
        property: "og:description",
        content: "Create your organization profile to start coordinating resources.",
      },
    ],
  }),
  component: Onboarding,
});

const TYPES = [
  {
    key: "supplier" as const,
    icon: Boxes,
    title: "Supplier",
    d: "Businesses, restaurants, farms, manufacturers or individuals with surplus resources.",
  },
  {
    key: "recipient" as const,
    icon: HeartHandshake,
    title: "Recipient organization",
    d: "Food banks, NGOs, shelters, schools and community organizations with needs.",
  },
  {
    key: "logistics" as const,
    icon: Truck,
    title: "Logistics provider",
    d: "Transport operators moving resources between suppliers and recipients.",
  },
];

const schema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
  description: z.string().trim().max(1000).optional(),
  contact_email: z.string().trim().email("Valid contact email required").max(255),
  contact_phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  country: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

function Onboarding() {
  const { userId, email, setActiveOrgId, orgs } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<"supplier" | "recipient" | "logistics" | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    contact_email: email,
    contact_phone: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
  });
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return toast.error("Choose an organization type");
    const parsed = schema.safeParse({
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          owner_id: userId,
          name: parsed.data.name,
          type,
          description: parsed.data.description ?? null,
          contact_email: parsed.data.contact_email,
          contact_phone: parsed.data.contact_phone ?? null,
          address: parsed.data.address ?? null,
          city: parsed.data.city,
          country: parsed.data.country ?? null,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("user_roles").insert({ user_id: userId, role: type }).select();
      await logAudit(userId, "organization.created", "organization", data.id, { type });
      await qc.invalidateQueries();
      setActiveOrgId(data.id);
      toast.success("Organization created. Verification is pending review.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        label={orgs.length ? "New organization" : "Step 1 of 1"}
        title="Register your organization"
        description="Your organization starts as pending. An administrator reviews it before it can be matched with verified counterparties."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "panel p-4 text-left transition-all hover:shadow-lift",
              type === t.key && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            <t.icon className={cn("h-5 w-5", type === t.key ? "text-primary" : "text-muted-foreground")} />
            <h3 className="mt-3 text-sm font-semibold">{t.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.d}</p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="panel mt-6 space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
          </Field>
          <Field label="Contact email">
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              maxLength={255}
              required
            />
          </Field>
          <Field label="Contact phone">
            <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} maxLength={40} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} required />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} />
          </Field>
          <Field label="Latitude" hint="Optional — enables distance-aware matching.">
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </Field>
          <Field label="Longitude" hint="Optional — enables distance-aware matching.">
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
            maxLength={1000}
            rows={3}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !type}>
            {busy ? "Creating…" : "Create organization"}
          </Button>
        </div>
      </form>
    </div>
  );
}
