import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RE:SOURCE — AI resource coordination infrastructure" },
      {
        name: "description",
        content:
          "RE:SOURCE finds surplus, verifies organizations, matches supply to need, coordinates logistics and tracks verified impact. Starting with food.",
      },
      { property: "og:title", content: "RE:SOURCE — AI resource coordination infrastructure" },
      {
        property: "og:description",
        content:
          "Find, verify, match, coordinate, act, track, impact. Real-time coordination for surplus resources.",
      },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { k: "FIND", d: "Surplus and needs enter the network as live, editable records." },
  { k: "VERIFY", d: "Organizations are reviewed and verified before they can transact." },
  { k: "MATCH", d: "Multi-factor scoring explains every proposed pairing." },
  { k: "COORDINATE", d: "Transport, windows and documents are planned by the assistant." },
  { k: "ACT", d: "Nothing executes until an authorized user approves it." },
  { k: "TRACK", d: "Every status change is written to an auditable timeline." },
  { k: "IMPACT", d: "Estimated and verified outcomes are reported separately." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Wordmark className="text-base" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid-canvas border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <p className="mono-label">Resource coordination infrastructure</p>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] sm:text-6xl">
            Surplus is not a shortage problem.
            <br />
            It is a <span className="text-primary">coordination</span> problem.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            RE:SOURCE connects verified surplus with verified organizations that need it — and
            coordinates the transfer end to end. Food first, built generically for medical
            supplies, water, equipment, transport and more.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Join the network <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
          <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verification before transaction
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Human approval before action
            </span>
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" /> Live database, no simulated data
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="mono-label">The pipeline</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((s, i) => (
            <div key={s.k} className="bg-card p-6">
              <span className="mono-label">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-sm font-semibold tracking-wide">{s.k}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-3">
          {[
            {
              icon: Boxes,
              t: "For suppliers",
              d: "List surplus in under a minute. Edit quantity, expiry and availability at any time — the matching engine always uses the current value, never a stale one.",
            },
            {
              icon: Sparkles,
              t: "For organizations",
              d: "Post what you need, with minimums, alternatives, storage capacity and a deadline. Accept or reject every proposed match.",
            },
            {
              icon: RouteIcon,
              t: "For logistics",
              d: "Publish vehicles, capacity, refrigeration and service areas. Accept jobs and drive the transfer status from pickup to delivery.",
            },
          ].map((c) => (
            <div key={c.t}>
              <c.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="panel p-10">
          <p className="mono-label">AI, constrained</p>
          <h2 className="mt-3 max-w-2xl text-3xl">
            The assistant reads the live database, uses real tools, and never executes without
            approval.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            It searches resources and needs, verifies status, calculates logistics, drafts transfer
            plans and documents. Every claim traces back to a row in the database. When something
            is missing, it says so. When an action can&apos;t be performed, it stays pending — it
            is never reported as done.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Wordmark />
          <p className="text-xs text-muted-foreground">
            Built as operating infrastructure, not a demonstration.
          </p>
        </div>
      </footer>
    </div>
  );
}
