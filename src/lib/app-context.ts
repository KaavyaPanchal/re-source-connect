import { createContext, useContext } from "react";
import type { Organization } from "@/lib/session";

export type AppContextValue = {
  userId: string;
  email: string;
  orgs: Organization[];
  activeOrg: Organization | null;
  setActiveOrgId: (id: string) => void;
  roles: string[];
  isAdmin: boolean;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside the authenticated layout");
  return ctx;
}
