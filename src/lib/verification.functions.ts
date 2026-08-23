import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function askGateway(system: string, user: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Attempts an automated registry lookup. RE:SOURCE has no official registry
 * integration configured, so this always reports that no registry could be
 * reached — the organization must then go through human review. It never
 * reports a positive verification it did not actually perform.
 */
export const checkOfficialRegistry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: org, error } = await context.supabase
      .from("organizations")
      .select("id,name,registration_number,issuing_authority,registration_country")
      .eq("id", data.organizationId)
      .single();
    if (error || !org) throw new Error("Organization not found");
    return {
      checked: false as const,
      outcome: "manual_review" as const,
      message:
        "No automated government registry is connected for " +
        (org.registration_country ?? "this country") +
        ". Registration details will be checked by a human reviewer.",
    };
  });

/**
 * AI-assisted risk indicators plus deterministic duplicate detection.
 * Advisory only — never a basis for automatic approval or rejection.
 */
export const assessOrgRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", data.organizationId)
      .single();
    if (error || !org) throw new Error("Organization not found");

    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;
    if (!isAdmin && org.owner_id !== userId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dupes } = await supabaseAdmin.rpc("find_org_duplicates", {
      _org_id: data.organizationId,
    });
    const duplicates = (dupes ?? []) as { id: string; name: string; reason: string }[];

    let level = "medium";
    let explanation = "";
    let signals: string[] = [];

    try {
      const raw = await askGateway(
        [
          "You are a fraud-risk analyst for RE:SOURCE, a resource coordination platform.",
          "Assess only INTERNAL CONSISTENCY of the submitted organization record.",
          "You cannot access government registries and must never claim an organization is legitimate or fraudulent.",
          "Look for: organization name vs website domain vs email domain mismatch, registration number format inconsistent with the stated country/authority, missing or contradictory fields, location inconsistencies, generic or copied-looking descriptions, and the duplicate candidates provided.",
          'Reply with strict JSON only: {"level":"low|medium|high","explanation":"2-3 sentences","signals":["short finding", ...]}',
        ].join(" "),
        JSON.stringify({
          now: new Date().toISOString(),
          organization: {
            name: org.name,
            type: org.type,
            category: org.org_category,
            description: org.description,
            website: org.website,
            contact_email: org.contact_email,
            contact_phone: org.contact_phone,
            address: org.address,
            city: org.city,
            country: org.country,
            registration_number: org.registration_number,
            issuing_authority: org.issuing_authority,
            registration_country: org.registration_country,
            registration_date: org.registration_date,
            document_kind: org.doc_kind,
            document_uploaded: !!org.doc_path,
            email_verified: org.email_verified,
            phone_verified: org.phone_verified,
            representative: {
              name: org.rep_full_name,
              position: org.rep_position,
              relationship: org.rep_relationship,
            },
          },
          duplicate_candidates: duplicates,
        }),
      );
      const parsed = parseJson(raw);
      const lvl = String(parsed["level"] ?? "").toLowerCase();
      level = ["low", "medium", "high"].includes(lvl) ? lvl : "medium";
      explanation =
        typeof parsed["explanation"] === "string"
          ? parsed["explanation"]
          : "No explanation produced.";
      signals = Array.isArray(parsed["signals"]) ? (parsed["signals"] as string[]).slice(0, 10) : [];
    } catch (err) {
      level = "medium";
      explanation =
        "Automated risk analysis is unavailable right now, so no AI signal was produced. Review manually. (" +
        (err instanceof Error ? err.message : "unknown error") +
        ")";
      signals = [];
    }

    if (duplicates.length > 0 && level === "low") level = "medium";
    const reasons = [
      ...signals,
      ...duplicates.map((d) => `Possible duplicate of "${d.name}" (${d.reason})`),
    ];

    await supabase
      .from("organizations")
      .update({
        ai_risk_level: level,
        ai_risk_reasons: reasons as never,
        ai_risk_at: new Date().toISOString(),
      })
      .eq("id", data.organizationId);

    await supabase.from("org_verification_events").insert({
      organization_id: data.organizationId,
      event: "ai_risk_assessed",
      actor_id: userId,
      note: explanation,
      meta: { level, duplicates } as never,
    });

    return { level, explanation, signals, duplicates };
  });

/** Issues a short-lived private link so an authorized reviewer can open a document. */
export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id,owner_id,doc_path")
      .eq("id", data.organizationId)
      .single();
    if (error || !org) throw new Error("Organization not found");
    if (!org.doc_path) throw new Error("No document uploaded");

    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;
    if (!isAdmin && org.owner_id !== userId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(org.doc_path, 120);
    if (signErr || !signed) throw new Error("Could not create a secure link");

    await supabase.from("org_verification_events").insert({
      organization_id: data.organizationId,
      event: "document_accessed",
      actor_id: userId,
      note: isAdmin ? "Reviewer opened the document." : "Owner opened their own document.",
    });

    return { url: signed.signedUrl, expiresInSeconds: 120 };
  });
