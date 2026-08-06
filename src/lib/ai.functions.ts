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
