import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DISCLAIMER_AUTHORITY,
  labelForCategory,
  statusMeta,
  type VerificationStatus,
} from "@/lib/verification";

export type BadgeOrg = {
  name: string;
  verification_status: string;
  org_category?: string | null;
  country?: string | null;
  registration_country?: string | null;
  issuing_authority?: string | null;
  verified_at?: string | null;
};

const TONE: Record<string, string> = {
  ok: "bg-primary-soft text-primary",
  warn: "bg-warn-soft text-warn",
  bad: "bg-destructive/10 text-destructive",
  info: "bg-muted text-muted-foreground",
};

export function VerificationStatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        TONE[meta.tone],
      )}
    >
      {meta.label}
    </span>
  );
}

/** Public-safe verification badge. Never exposes documents or internal notes. */
export function VerificationBadge({ org, className }: { org: BadgeOrg; className?: string }) {
  const verified = org.verification_status === "verified";
  const meta = statusMeta(org.verification_status);
  const Icon = verified ? BadgeCheck : meta.tone === "bad" ? ShieldAlert : ShieldQuestion;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            TONE[meta.tone],
            className,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {verified ? "Verified organization" : meta.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 text-xs">
        <p className="text-sm font-semibold">{org.name}</p>
        <p className="text-muted-foreground">{meta.blurb}</p>
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 pt-1">
          <dt className="text-muted-foreground">Level</dt>
          <dd>{verified ? "Registration document review" : "Not established"}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{labelForCategory(org.org_category)}</dd>
          <dt className="text-muted-foreground">Country</dt>
          <dd>{org.registration_country ?? org.country ?? "—"}</dd>
          <dt className="text-muted-foreground">Authority</dt>
          <dd>{org.issuing_authority ?? "—"}</dd>
          <dt className="text-muted-foreground">Verified</dt>
          <dd>{org.verified_at ? new Date(org.verified_at).toLocaleDateString() : "—"}</dd>
        </dl>
        <p className="border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
          {DISCLAIMER_AUTHORITY} Uploaded documents are never shown publicly.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Blocks an action until the organization is verified. */
export function VerificationGate({
  status,
  action,
  children,
}: {
  status: VerificationStatus | string;
  action: string;
  children: ReactNode;
}) {
  if (status === "verified") return <>{children}</>;
  const meta = statusMeta(status);
  return (
    <div className="panel border-warn/40 bg-warn-soft/30 p-5">
      <p className="mono-label text-warn">Verification required</p>
      <h3 className="mt-2 text-sm font-semibold">
        Your organization must be verified before it can {action}.
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Current status: <strong>{meta.label}</strong>. {meta.blurb}
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link to="/verification">Open verification center</Link>
      </Button>
    </div>
  );
}
