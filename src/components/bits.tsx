import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { urgencyBand } from "@/lib/domain";

export function PageHeader({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mono-label">{label}</p>
        <h1 className="mt-2 text-2xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "primary" | "warn" | "info";
}) {
  return (
    <div className="panel p-4">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "warn" && "text-warn",
          tone === "info" && "text-info",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function UrgencyBadge({ score }: { score: number }) {
  const band = urgencyBand(score);
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent text-[10px] uppercase tracking-wider",
        band === "critical" && "bg-destructive/10 text-destructive",
        band === "high" && "bg-warn-soft text-warn",
        band === "moderate" && "bg-info-soft text-info",
        band === "low" && "bg-muted text-muted-foreground",
      )}
    >
      {band} · {score}
    </Badge>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "verified" || status === "impact_verified" || status === "delivered" || status === "accepted" || status === "available" || status === "active"
      ? "bg-primary-soft text-primary"
      : status === "rejected" || status === "cancelled" || status === "flagged" || status === "expired"
        ? "bg-destructive/10 text-destructive"
        : status === "pending" || status === "proposed"
          ? "bg-warn-soft text-warn"
          : "bg-info-soft text-info";
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        tone,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
