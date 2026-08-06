import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyOrganizations, useMyRoles, useAuthUser, useRealtime } from "@/lib/session";
import { AppContext } from "@/lib/app-context";
import { AppShell, Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: orgs, isLoading: orgsLoading } = useMyOrganizations(user?.id);
  const { data: roles } = useMyRoles(user?.id);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useRealtime(["organizations"], [["my-orgs", user?.id ?? ""]]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("resource.activeOrg");
    if (stored) setActiveOrgId(stored);
  }, []);

  const activeOrg = useMemo(() => {
    if (!orgs?.length) return null;
    return orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;
  }, [orgs, activeOrgId]);

  useEffect(() => {
    if (!orgsLoading && orgs && orgs.length === 0 && pathname !== "/onboarding") {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [orgs, orgsLoading, pathname, navigate]);

  if (loading || orgsLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Wordmark className="animate-pulse text-base" />
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        userId: user.id,
        email: user.email ?? "",
        orgs: orgs ?? [],
        activeOrg,
        setActiveOrgId: (id: string) => {
          setActiveOrgId(id);
          if (typeof window !== "undefined") window.localStorage.setItem("resource.activeOrg", id);
        },
        roles: roles ?? [],
        isAdmin: (roles ?? []).includes("admin"),
      }}
    >
      <AppShell>
        <Outlet />
      </AppShell>
    </AppContext.Provider>
  );
}
