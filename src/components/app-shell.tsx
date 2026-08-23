import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  ArrowLeftRight,
  BarChart3,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { useRealtime } from "@/lib/session";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-sm font-medium tracking-[0.18em]", className)}>
      RE<span className="text-primary">:</span>SOURCE
    </span>
  );
}

type NavItem = { to: string; label: string; icon: typeof Boxes; show: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const { activeOrg, orgs, setActiveOrgId, isAdmin, email } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const type = activeOrg?.type;
  const items: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/resources", label: "Surplus", icon: Boxes, show: type === "supplier" },
    { to: "/needs", label: "Needs", icon: ClipboardList, show: type === "recipient" },
    { to: "/fleet", label: "Fleet", icon: Truck, show: type === "logistics" },
    { to: "/matches", label: "Matches", icon: Sparkles, show: type !== "logistics" },
    { to: "/transfers", label: "Transfers", icon: ArrowLeftRight, show: true },
    { to: "/assistant", label: "Assistant", icon: Sparkles, show: true },
    { to: "/search", label: "Search", icon: Search, show: true },
    { to: "/map", label: "Map", icon: MapIcon, show: true },
    { to: "/impact", label: "Impact", icon: BarChart3, show: true },
    { to: "/verification", label: "Verification", icon: ShieldCheck, show: true },
    { to: "/admin", label: "Admin", icon: ShieldCheck, show: isAdmin },
  ].filter((i) => i.show);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <Link to="/dashboard" className="shrink-0">
            <Wordmark className="text-base" />
          </Link>

          {orgs.length > 0 && (
            <Select value={activeOrg?.id ?? ""} onValueChange={setActiveOrgId}>
              <SelectTrigger className="h-8 w-[190px] text-xs">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.name} · {o.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeOrg && (
            <Badge
              variant="outline"
              className={cn(
                "hidden shrink-0 border-border text-[10px] uppercase tracking-wider sm:inline-flex",
                activeOrg.verification_status === "verified"
                  ? "bg-primary-soft text-primary"
                  : activeOrg.verification_status === "flagged" ||
                      activeOrg.verification_status === "rejected"
                    ? "bg-warn-soft text-warn"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {activeOrg.verification_status}
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <span className="hidden max-w-[160px] truncate px-2 text-xs text-muted-foreground md:inline">
              {email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6">
        <nav
          className={cn(
            "w-52 shrink-0 lg:block",
            mobileOpen
              ? "fixed inset-x-0 top-14 z-30 block border-b border-border bg-background p-4 shadow-lift"
              : "hidden",
          )}
        >
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-16">
          {children}
          <div className="mt-16 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/acceptable-use" className="hover:text-foreground">
              Acceptable use
            </Link>
            <Link to="/compliance" className="hover:text-foreground">
              Compliance
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { userId } = useApp();
  const queryClient = useQueryClient();
  useRealtime(["notifications"], [["notifications", userId]]);

  const { data } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const unread = (data ?? []).filter((n) => !n.read).length;

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="mono-label">Notifications</span>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {(data ?? []).length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nothing yet.</p>
          )}
          {(data ?? []).map((n) => (
            <div
              key={n.id}
              className={cn(
                "border-b border-border/60 px-3 py-2.5 last:border-0",
                !n.read && "bg-primary-soft/40",
              )}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
