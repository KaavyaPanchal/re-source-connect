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

export const analyzeListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resourceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: resource, error } = await supabase
      .from("resources")
      .select("*, resource_categories(name)")
      .eq("id", data.resourceId)
      .single();
    if (error || !resource) throw new Error("Resource not found");

    const raw = await askGateway(
      "You are a logistics analyst for a surplus-resource coordination platform. Reply with strict JSON only, using the keys: summary (one or two sentences), urgency (low|medium|high|critical), missing (array of short strings naming absent but important listing details), suggested_recipients (array of short strings describing recipient organization types).",
      JSON.stringify({
        title: resource.title,
        category: (resource.resource_categories as { name: string } | null)?.name,
        quantity: resource.quantity,
        unit: resource.unit,
        condition: resource.condition,
        storage_requirements: resource.storage_requirements,
        requires_refrigeration: resource.requires_refrigeration,
        expires_at: resource.expires_at,
        city: resource.city,
        description: resource.description,
        now: new Date().toISOString(),
      }),
    );

    const parsed = parseJson(raw);
    const analysis = {
      summary: typeof parsed["summary"] === "string" ? parsed["summary"] : "No summary produced.",
      urgency: typeof parsed["urgency"] === "string" ? parsed["urgency"] : "medium",
      missing: Array.isArray(parsed["missing"]) ? (parsed["missing"] as string[]).slice(0, 8) : [],
      suggested_recipients: Array.isArray(parsed["suggested_recipients"])
        ? (parsed["suggested_recipients"] as string[]).slice(0, 8)
        : [],
      analyzed_at: new Date().toISOString(),
    };

    await supabase.from("resources").update({ ai_analysis: analysis }).eq("id", data.resourceId);
    return analysis;
  });

export const assistantAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(2).max(2000),
        organizationId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [resources, needs, transfers, orgs] = await Promise.all([
      supabase
        .from("resources")
        .select("id,title,quantity,reserved_quantity,unit,city,expires_at,status,requires_refrigeration,organization_id")
        .in("status", ["available", "reserved"])
        .limit(80),
      supabase
        .from("needs")
        .select("id,title,quantity,fulfilled_quantity,unit,city,deadline,status,has_refrigeration,organization_id")
        .in("status", ["active", "partially_fulfilled"])
        .limit(80),
      supabase
        .from("transfers")
        .select("id,status,quantity,unit,scheduled_pickup_at,scheduled_delivery_at,supplier_org_id,recipient_org_id")
        .limit(50),
      supabase.from("organizations").select("id,name,type,city,verification_status").limit(80),
    ]);

    const answer = await askGateway(
      "You are the coordination assistant for RE:SOURCE, a surplus-resource matching platform. Answer using ONLY the live database snapshot provided. Be concise and concrete: cite titles, quantities, cities and deadlines from the data. If the data does not contain the answer, say exactly what is missing. Never invent organizations, quantities or transfers.",
      JSON.stringify({
        now: new Date().toISOString(),
        active_organization_id: data.organizationId ?? null,
        organizations: orgs.data ?? [],
        resources: resources.data ?? [],
        needs: needs.data ?? [],
        transfers: transfers.data ?? [],
        question: data.question,
      }),
    );

    return { answer: answer || "No answer produced." };
  });
