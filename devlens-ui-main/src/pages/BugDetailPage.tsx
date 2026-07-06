import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2, Save, Check } from "lucide-react";
import { api, type Bug, type BugStatus } from "@/lib/api";
import { StatusPill, BugsEmpty } from "./BugsPage";
import { cn } from "@/lib/utils";

export function BugDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: bug, isLoading } = useQuery({
    queryKey: ["bug", id],
    queryFn: () => api.getBug(id),
  });

  const [draft, setDraft] = useState<Bug | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (bug) setDraft(bug);
  }, [bug]);

  const update = useMutation({
    mutationFn: (patch: Partial<Bug>) => api.updateBug(id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(["bug", id], updated);
      qc.invalidateQueries({ queryKey: ["bugs"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteBug(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
      navigate("/bugs");
    },
  });

  if (isLoading || !draft) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!bug) return <BugsEmpty />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(bug);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="mono">{bug.id}</span>
            <span>·</span>
            <span>
              updated{" "}
              {new Date(bug.updated_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="mt-1 w-full bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus:ring-0"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={draft.status} />
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as BugStatus })
              }
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] outline-none focus:border-primary/50"
            >
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="ml-2 flex flex-wrap items-center gap-1">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => remove.mutate()}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
            title="Delete bug"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              update.mutate({
                title: draft.title,
                status: draft.status,
                description: draft.description,
                steps: draft.steps,
                solution: draft.solution,
                tags: draft.tags,
              })
            }
            disabled={!dirty || update.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              dirty
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-surface text-muted-foreground",
            )}
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" /> Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {update.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
              </>
            )}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-3xl space-y-6">
          <Section label="Tags">
            <input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className="input mono"
              placeholder="comma, separated"
            />
          </Section>

          <Section label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={5}
              className="input"
            />
          </Section>

          <Section label="Steps to reproduce">
            <textarea
              value={draft.steps}
              onChange={(e) => setDraft({ ...draft, steps: e.target.value })}
              rows={6}
              className="input mono"
            />
          </Section>

          <Section label="Solution / notes">
            <textarea
              value={draft.solution}
              onChange={(e) => setDraft({ ...draft, solution: e.target.value })}
              rows={6}
              className="input"
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
