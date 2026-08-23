import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/app-shell";
import { z } from "zod";

type Search = { mode?: "signin" | "signup"; next?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    mode: search["mode"] === "signup" ? "signup" : "signin",
    ...(typeof search["next"] === "string" && search["next"].startsWith("/")
      ? { next: search["next"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — RE:SOURCE" },
      {
        name: "description",
        content: "Sign in or create a RE:SOURCE account to coordinate surplus resources.",
      },
      { property: "og:title", content: "Sign in — RE:SOURCE" },
      { property: "og:description", content: "Access your RE:SOURCE coordination workspace." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const { mode, next } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (next) {
        window.location.href = next;
        return;
      }
      void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: next ? window.location.origin + next : window.location.origin,
            data: { full_name: parsed.data.fullName ?? "" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
        if (next) {
          window.location.href = next;
          return;
        }
        void navigate({ to: "/onboarding", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        if (next) {
          window.location.href = next;
          return;
        }
        void navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grid-canvas hidden border-r border-border p-12 lg:flex lg:flex-col lg:justify-between">
        <Link to="/">
          <Wordmark className="text-base" />
        </Link>
        <div>
          <h2 className="max-w-md text-3xl leading-tight">
            Verified supply. Verified need. Coordinated action.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Create an account, register your organization as a supplier, recipient or logistics
            provider, and start coordinating on live data.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Human approval required for every action.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden">
            <Wordmark className="text-base" />
          </Link>
          <p className="mono-label mt-8 lg:mt-0">{isSignup ? "Create account" : "Sign in"}</p>
          <h1 className="mt-2 text-2xl">
            {isSignup ? "Join the network" : "Welcome back"}
          </h1>

          {sent ? (
            <div className="panel mt-8 p-5">
              <p className="text-sm">
                We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then
                sign in.
              </p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {isSignup && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Working…" : isSignup ? "Create account" : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignup ? "Already registered?" : "No account yet?"}{" "}
                <Link
                  to="/auth"
                  search={{ mode: isSignup ? "signin" : "signup" }}
                  className="text-primary hover:underline"
                >
                  {isSignup ? "Sign in" : "Create one"}
                </Link>
              </p>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing you agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  terms
                </Link>
                ,{" "}
                <Link to="/acceptable-use" className="text-primary hover:underline">
                  acceptable use policy
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  privacy policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
