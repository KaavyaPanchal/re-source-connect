import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSurplusResources from "./tools/list-surplus-resources";
import listNeeds from "./tools/list-needs";
import listTransfers from "./tools/list-transfers";
import listMyOrganizations from "./tools/list-my-organizations";
import listResourceCategories from "./tools/list-resource-categories";
import createNeed from "./tools/create-need";

// The OAuth issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "re-source-connect",
  title: "RE:SOURCE Connect",
  version: "0.1.0",
  instructions:
    "Tools for RE:SOURCE, a surplus-resource coordination platform. Read live surplus listings, needs and transfers, and publish new needs for organizations the signed-in user owns. All data access runs as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSurplusResources,
    listNeeds,
    listTransfers,
    listMyOrganizations,
    listResourceCategories,
    createNeed,
  ],
});
