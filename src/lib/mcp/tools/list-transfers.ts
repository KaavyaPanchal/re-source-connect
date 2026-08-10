import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transfers",
  title: "List transfers",
  description:
    "List resource transfers the signed-in user can see, newest first. Optionally filter by transfer status.",
  inputSchema: {
    status: z
      .enum(["proposed", "scheduled", "in_transit", "picked_up", "delivered", "verified", "cancelled"])
      .optional()
      .describe("Filter by transfer status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("transfers")
      .select(
        "id,status,quantity,unit,resource_id,need_id,supplier_org_id,recipient_org_id,logistics_org_id,scheduled_pickup_at,scheduled_delivery_at,delivered_at,impact_verified,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (status) {
      const { data, error } = await q;
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      const filtered = (data ?? []).filter((t) => t.status === status);
      return {
        content: [{ type: "text", text: JSON.stringify(filtered) }],
        structuredContent: { transfers: filtered },
      };
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { transfers: data ?? [] },
    };
  },
});
