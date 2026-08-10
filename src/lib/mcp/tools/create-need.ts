import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_need",
  title: "Create a need",
  description:
    "Publish a new resource need for one of the signed-in user's organizations. Call list_my_organizations and list_resource_categories first to get valid ids.",
  inputSchema: {
    organization_id: z.string().uuid().describe("Organization publishing the need."),
    category_id: z.string().uuid().describe("Resource category id."),
    title: z.string().trim().min(2).max(160).describe("Short title of what is needed."),
    quantity: z.number().positive().describe("Quantity needed."),
    unit: z.string().trim().max(32).optional().describe("Unit of measure, e.g. kg or units."),
    city: z.string().trim().max(120).optional().describe("Delivery city."),
    deadline: z.string().trim().optional().describe("ISO 8601 date/time the need must be met by."),
    purpose: z.string().trim().max(2000).optional().describe("Who this serves and why."),
    has_refrigeration: z.boolean().optional().describe("Whether the recipient has refrigeration."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("needs")
      .insert({
        organization_id: input.organization_id,
        category_id: input.category_id,
        created_by: ctx.getUserId() ?? "",
        title: input.title,
        quantity: input.quantity,
        ...(input.unit ? { unit: input.unit } : {}),
        ...(input.city ? { city: input.city } : {}),
        ...(input.deadline ? { deadline: input.deadline } : {}),
        ...(input.purpose ? { purpose: input.purpose } : {}),
        ...(input.has_refrigeration === undefined ? {} : { has_refrigeration: input.has_refrigeration }),
      })
      .select("id,title,quantity,unit,city,deadline,status")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { need: data },
    };
  },
});
