import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_surplus_resources",
  title: "List surplus resources",
  description:
    "List surplus resource listings visible to the signed-in user, newest first. Optionally filter by city or free-text title match.",
  inputSchema: {
    city: z.string().trim().optional().describe("Filter by city name."),
    query: z.string().trim().optional().describe("Case-insensitive match on the listing title."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("resources")
      .select(
        "id,title,quantity,reserved_quantity,unit,status,city,expires_at,requires_refrigeration,organization_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (city) q = q.ilike("city", city);
    if (query) q = q.ilike("title", `%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { resources: data ?? [] },
    };
  },
});
