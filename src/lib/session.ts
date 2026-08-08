import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Organization = {
  id: string;
  owner_id: string;
  name: string;
  type: "supplier" | "recipient" | "logistics";
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status:
    | "not_verified"
    | "under_review"
    | "verified"
    | "info_required"
    | "rejected"
    | "suspended"
    | "pending"
    | "flagged";
  verification_notes: string | null;
  reliability_score: number;
  created_at: string;
  org_category: string;
  website: string | null;
  registration_number: string | null;
  issuing_authority: string | null;
  registration_country: string | null;
  registration_date: string | null;
  doc_kind: string | null;
  doc_path: string | null;
  doc_uploaded_at: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  rep_full_name: string | null;
  rep_position: string | null;
  rep_relationship: string | null;
  accepted_terms_at: string | null;
  accepted_privacy_at: string | null;
  consent_verification_at: string | null;
  consent_comms_at: string | null;
  ai_risk_level: string | null;
  ai_risk_reasons: unknown;
  ai_risk_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
};


export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useMyOrganizations(userId?: string) {
  return useQuery({
    queryKey: ["my-orgs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Organization[];
    },
  });
}

export function useMyRoles(userId?: string) {
  return useQuery({
    queryKey: ["my-roles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_categories")
        .select("*")
        .eq("active", true)
        .order("family")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Subscribe to a set of tables and invalidate queries when anything changes. */
export function useRealtime(tables: string[], keys: string[][]) {
  const qc = useQueryClient();
  const tableKey = tables.join(",");
  const invalidateKey = JSON.stringify(keys);
  useEffect(() => {
    const channel = supabase.channel(`rt-${tableKey}-${Math.random().toString(36).slice(2)}`);
    for (const table of tableKey.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of JSON.parse(invalidateKey) as string[][]) {
          void qc.invalidateQueries({ queryKey: key });
        }
      });
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tableKey, invalidateKey, qc]);
}

export async function logAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    meta: meta as never,
  });
}

export async function notify(
  userId: string,
  title: string,
  body: string,
  type: string,
  link?: string,
) {
  await supabase
    .from("notifications")
    .insert({ user_id: userId, title, body, type, link: link ?? null });
}
