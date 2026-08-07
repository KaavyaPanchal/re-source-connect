import { supabase } from "@/integrations/supabase/client";
import {
  scoreMatch,
  type MatchResult,
  type ScorableNeed,
  type ScorableResource,
} from "@/lib/domain";
import type { Organization } from "@/lib/session";

export type Candidate = MatchResult & {
  resource: ScorableResource & { organization_id: string };
  need: ScorableNeed;
  supplierOrg: Organization | undefined;
  recipientOrg: Organization | undefined;
};

/**
 * Pulls live resources, needs and organizations, then scores every
 * cross-organization pairing relevant to `orgId`.
 */
export async function computeCandidates(
  orgId: string | null,
  opts: { limit?: number; minScore?: number } = {},
): Promise<Candidate[]> {
  const [resRes, needRes, orgRes, logRes] = await Promise.all([
    supabase.from("resources").select("*").in("status", ["available", "reserved"]),
    supabase.from("needs").select("*").in("status", ["active", "partially_fulfilled"]),
    supabase.from("organizations").select("*"),
    supabase.from("logistics_profiles").select("*").eq("available", true),
  ]);
  if (resRes.error) throw resRes.error;
  if (needRes.error) throw needRes.error;
  if (orgRes.error) throw orgRes.error;

  const orgs = (orgRes.data ?? []) as Organization[];
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const transportAvailable = (logRes.data ?? []).length > 0;

  const resources = (resRes.data ?? []) as unknown as ScorableResource[];
  const needs = (needRes.data ?? []) as unknown as ScorableNeed[];

  const out: Candidate[] = [];
  for (const resource of resources) {
    for (const need of needs) {
      if (resource.organization_id === need.organization_id) continue;
      if (orgId && resource.organization_id !== orgId && need.organization_id !== orgId) continue;
      const supplierOrg = orgById.get(resource.organization_id);
      const recipientOrg = orgById.get(need.organization_id);
      const result = scoreMatch(resource, need, {
        supplierVerified: supplierOrg?.verification_status === "verified",
        recipientVerified: recipientOrg?.verification_status === "verified",
        supplierReliability: supplierOrg?.reliability_score,
        transportAvailable,
      });
      if (result.score < (opts.minScore ?? 25)) continue;
      if (result.quantity <= 0) continue;
      out.push({ ...result, resource, need, supplierOrg, recipientOrg });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, opts.limit ?? 40);
}
