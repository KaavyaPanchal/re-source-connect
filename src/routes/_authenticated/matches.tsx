import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, RefreshCw, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useRealtime, logAudit, notify } from "@/lib/session";
import { EmptyState, PageHeader, StatusPill } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { computeCandidates } from "@/lib/matching";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({
    meta: [
      { title: "Matches — RE:SOURCE" },
      {
        name: "description",
        content:
          "Scored matches between live surplus and live needs, with the reasoning behind every score.",
      },
      { property: "og:title", content: "Matches — RE:SOURCE" },
      { property: "og:description", content: "Review, accept or reject scored resource matches." },
    ],
  }),
  component: MatchesPage,
});

function scoreTone(score: number) {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-info";
  if (score >= 40) return "text-warn";
  return "text-muted-foreground";
}

function MatchesPage() {
  const { activeOrg, userId } = useApp();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  useRealtime(
    ["matches", "resources", "needs"],
    [["matches", activeOrg?.id ?? ""], ["candidates", activeOrg?.id ?? ""]],
  );

  const { data: candidates, isFetching, refetch } = useQuery({
    queryKey: ["candidates", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: () => computeCandidates(activeOrg!.id),
  });

  const { data: saved } = useQuery({
    queryKey: ["matches", activeOrg?.id],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, resources(title, unit), needs(title), transfers(id)")
        .or(`supplier_org_id.eq.${activeOrg!.id},recipient_org_id.eq.${activeOrg!.id}`)
        .order("score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const savedKeys = new Set((saved ?? []).map((m) => `${m.resource_id}:${m.need_id}`));

  async function proposeMatch(key: string) {
    const c = (candidates ?? []).find((x) => `${x.resource.id}:${x.need.id}` === key);
    if (!c) return;
    setBusy(key);
    try {
      const { data, error } = await supabase
        .from("matches")
        .insert({
          resource_id: c.resource.id,
          need_id: c.need.id,
          supplier_org_id: c.resource.organization_id,
          recipient_org_id: c.need.organization_id,
          quantity: c.quantity,
          unit: c.need.unit,
          score: c.score,
          distance_km: c.distanceKm,
          generated_by: "engine",
          explanation: c.reasons.join(" · "),
          rationale: {
            reasons: c.reasons,
            blockers: c.blockers,
            missing: c.missing,
          } as never,
          status: "proposed",
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit(userId, "match.proposed", "match", data.id, { score: c.score });
      toast.success("Match proposed to both organizations.");
      await qc.invalidateQueries({ queryKey: ["matches", activeOrg?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not propose match");
    } finally {
      setBusy(null);
    }
  }

  async function respond(matchId: string, accept: boolean) {
    if (!activeOrg) return;
    setBusy(matchId);
    try {
      const match = (saved ?? []).find((m) => m.id === matchId);
      if (!match) return;
      const isSupplier = match.supplier_org_id === activeOrg.id;
      
      const other = isSupplier ? match.recipient_response : match.supplier_response;
      const decision = accept ? "accepted" : "rejected";
      const status = !accept ? "rejected" : other === "accepted" ? "accepted" : "proposed";

      const { error } = await supabase
        .from("matches")
        .update(
          isSupplier
            ? { supplier_response: decision, status }
            : { recipient_response: decision, status },
        )
        .eq("id", matchId);
      if (error) throw error;
      await logAudit(userId, `match.${decision}`, "match", matchId, {});
      toast.success(accept ? "Response recorded." : "Match rejected.");
      await qc.invalidateQueries({ queryKey: ["matches", activeOrg.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function createTransfer(matchId: string) {
    if (!activeOrg) return;
    setBusy(matchId);
    try {
      const match = (saved ?? []).find((m) => m.id === matchId);
      if (!match) return;
      const { data, error } = await supabase
        .from("transfers")
        .insert({
          match_id: match.id,
          resource_id: match.resource_id,
          need_id: match.need_id,
          supplier_org_id: match.supplier_org_id,
          recipient_org_id: match.recipient_org_id,
          quantity: match.quantity,
          unit: match.unit,
          distance_km: match.distance_km,
          status: "accepted",
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("matches").update({ status: "converted" }).eq("id", match.id);

      // Reserve the quantity on the resource so it cannot be double-promised.
      const { data: resource } = await supabase
        .from("resources")
        .select("reserved_quantity")
        .eq("id", match.resource_id)
        .single();
      if (resource) {
        await supabase
          .from("resources")
          .update({ reserved_quantity: Number(resource.reserved_quantity) + Number(match.quantity) })
          .eq("id", match.resource_id);
      }

      const { data: orgs } = await supabase
        .from("organizations_directory")
        .select("owner_id")
        .in("id", [match.supplier_org_id, match.recipient_org_id]);
      for (const o of orgs ?? []) {
        await notify(
          o.owner_id,
          "Transfer created",
          `A transfer of ${match.quantity} ${match.unit} is now being coordinated.`,
          "transfer",
          "/transfers",
        );
      }
      await logAudit(userId, "transfer.created", "transfer", data.id, {});
      toast.success("Transfer created — track it under Transfers.");
      await qc.invalidateQueries({ queryKey: ["matches", activeOrg.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (!activeOrg) return null;

  return (
    <div>
      <PageHeader
        label="Coordination"
        title="Matches"
        description="Scores are recomputed from live database values every time you open or refresh this page."
        action={
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
            Recompute
          </Button>
        }
      />

      <section className="mb-10">
        <h2 className="mono-label mb-3">Active match proposals</h2>
        {(saved ?? []).length === 0 ? (
          <p className="panel p-4 text-sm text-muted-foreground">
            No proposals yet. Propose one from the scored candidates below.
          </p>
        ) : (
          <div className="grid gap-3">
            {(saved ?? []).map((m) => {
              const rationale = (m.rationale ?? {}) as {
                reasons?: string[];
                blockers?: string[];
                missing?: string[];
              };
              const isSupplier = m.supplier_org_id === activeOrg.id;
              const myResponse = isSupplier ? m.supplier_response : m.recipient_response;
              const hasTransfer = ((m.transfers as unknown[]) ?? []).length > 0;
              return (
                <div key={m.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-mono text-lg font-semibold", scoreTone(m.score))}>
                          {m.score}
                        </span>
                        <h3 className="text-sm font-semibold">
                          {(m.resources as { title?: string } | null)?.title} →{" "}
                          {(m.needs as { title?: string } | null)?.title}
                        </h3>
                        <StatusPill status={m.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.quantity} {m.unit}
                        {m.distance_km != null && ` · ${m.distance_km} km`} ·{" "}
                        {isSupplier ? "you supply" : "you receive"}
                      </p>
                      {(rationale.reasons ?? []).length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {(rationale.reasons ?? []).slice(0, 4).map((r) => (
                            <li key={r} className="text-xs text-muted-foreground">
                              · {r}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(rationale.blockers ?? []).map((b) => (
                        <p key={b} className="mt-1 text-xs text-destructive">
                          Blocker: {b}
                        </p>
                      ))}
                      {(rationale.missing ?? []).map((b) => (
                        <p key={b} className="mt-1 text-xs text-warn">
                          Missing: {b}
                        </p>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.status === "proposed" && !myResponse && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy === m.id}
                            onClick={() => respond(m.id, true)}
                          >
                            <Check className="mr-1 h-4 w-4" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === m.id}
                            onClick={() => respond(m.id, false)}
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                      {myResponse && m.status !== "converted" && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          you {myResponse}
                        </Badge>
                      )}
                      {m.status === "accepted" && !hasTransfer && (
                        <Button size="sm" disabled={busy === m.id} onClick={() => createTransfer(m.id)}>
                          Create transfer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mono-label mb-3">Scored candidates</h2>
        {(candidates ?? []).length === 0 ? (
          <EmptyState
            title="No candidate matches right now"
            description="Candidates appear as soon as there is live surplus on one side and a live need on the other."
          />
        ) : (
          <div className="grid gap-3">
            {(candidates ?? [])
              .filter((c) => !savedKeys.has(`${c.resource.id}:${c.need.id}`))
              .map((c) => {
                const key = `${c.resource.id}:${c.need.id}`;
                return (
                  <div key={key} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn("font-mono text-lg font-semibold", scoreTone(c.score))}
                          >
                            {c.score}
                          </span>
                          <h3 className="text-sm font-semibold">
                            {c.resource.title} → {c.need.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.supplierOrg?.name} → {c.recipientOrg?.name} · {c.quantity}{" "}
                          {c.need.unit}
                          {c.distanceKm != null && ` · ${c.distanceKm} km`}
                        </p>
                        <ul className="mt-2 space-y-0.5">
                          {c.reasons.slice(0, 4).map((r) => (
                            <li key={r} className="text-xs text-muted-foreground">
                              · {r}
                            </li>
                          ))}
                        </ul>
                        {c.blockers.map((b) => (
                          <p key={b} className="mt-1 text-xs text-destructive">
                            Blocker: {b}
                          </p>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === key || c.blockers.length > 0}
                        onClick={() => proposeMatch(key)}
                      >
                        <Sparkles className="mr-1.5 h-4 w-4" /> Propose
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
