import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { assistantAsk } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — RE:SOURCE" },
      {
        name: "description",
        content:
          "Ask the coordination assistant about live surplus, needs and transfers. Answers are grounded in the database.",
      },
      { property: "og:title", content: "Assistant — RE:SOURCE" },
      { property: "og:description", content: "A coordination assistant grounded in live data." },
    ],
  }),
  component: AssistantPage,
});

const PROMPTS = [
  "What surplus is closest to expiring right now?",
  "Which needs have no candidate supply?",
  "Summarise the transfers that need attention today.",
];

function AssistantPage() {
  const { activeOrg } = useApp();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    setTurns((t) => [...t, { role: "user", text: q }]);
    setQuestion("");
    setBusy(true);
    try {
      const res = await assistantAsk({
        data: { question: q, ...(activeOrg ? { organizationId: activeOrg.id } : {}) },
      });
      setTurns((t) => [...t, { role: "assistant", text: res.answer }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "The assistant could not respond";
      toast.error(msg);
      setTurns((t) => [...t, { role: "assistant", text: msg }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        label="AI"
        title="Assistant"
        description="Every answer is generated from a live snapshot of resources, needs, transfers and organizations."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Button key={p} size="sm" variant="outline" disabled={busy} onClick={() => void ask(p)}>
            {p}
          </Button>
        ))}
      </div>

      <div className="panel mb-4 min-h-[280px] space-y-3 p-4">
        {turns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about expiring surplus, unmatched needs or stalled transfers.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={
              t.role === "user"
                ? "rounded-md bg-muted px-3 py-2 text-sm"
                : "rounded-md border border-border px-3 py-2 text-sm whitespace-pre-wrap"
            }
          >
            <p className="mono-label mb-1">{t.role === "user" ? "You" : "Assistant"}</p>
            {t.text}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">Reading live data…</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the assistant"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
            }
          }}
        />
        <Button disabled={busy} onClick={() => void ask(question)}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Ask
        </Button>
      </div>
    </div>
  );
}
