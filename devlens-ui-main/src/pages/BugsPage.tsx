import { Link, Outlet, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Plus, X, Tag } from "lucide-react";
import { api, type Bug, type BugStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<BugStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
};

function StatusDot({ status }: { status: BugStatus }) {
  const color =
    status === "open"
      ? "bg-status-open"
      : status === "investigating"
        ? "bg-status-investigating"
        : "bg-status-resolved";
  return <span className={cn("h-1.5 w-1.5 rounded-full", color)} />;
}

export function StatusPill({ status }: { status: BugStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground/90">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BugsPage() {
  const qc = useQueryClient();
  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ["bugs"],
    queryFn: () => api.getBugs(),
  });

  const { pathname } = useLocation();
  const selectedId = pathname.startsWith("/bugs/") ? pathname.split("/")[2] : null;

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<BugStatus | "all">("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return bugs.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        b.title.toLowerCase().includes(needle) ||
        b.tags.some((t) => t.toLowerCase().includes(needle)) ||
        b.description.toLowerCase().includes(needle)
      );
    });
  }, [bugs, q, statusFilter]);

  const create = useMutation({
    mutationFn: (data: Partial<Bug>) => api.createBug(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
      setCreating(false);
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* List column */}
      <section className="flex w-[380px] shrink-0 flex-col border-r border-border">
        <header className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Bug Book</h1>
              <p className="text-[11px] text-muted-foreground">
                {bugs.length} entries · manual log
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              New
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bugs, tags…"
              className="w-full rounded-md border border-border bg-surface pl-8 pr-2 py-1.5 text-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1">
            {(["all", "open", "investigating", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium capitalize transition",
                  statusFilter === s
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <li className="p-4 text-xs text-muted-foreground">Loading…</li>
          )}
          {!isLoading && filtered.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">
              No bugs match.
            </li>
          )}
          {filtered.map((b) => {
            const active = b.id === selectedId;
            return (
              <li key={b.id}>
                <Link
                  to={`/bugs/${b.id}`}
                  className={cn(
                    "block border-l-2 px-4 py-3 transition-colors",
                    active
                      ? "border-primary bg-surface"
                      : "border-transparent hover:bg-surface/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[13px] font-medium leading-snug">
                      {b.title}
                    </h3>
                    <StatusDot status={b.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {b.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(b.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Detail column */}
      <section className="min-w-0 flex-1 overflow-hidden">
        {creating ? (
          <NewBugForm
            onCancel={() => setCreating(false)}
            onSubmit={(data) => create.mutate(data)}
            submitting={create.isPending}
          />
        ) : (
          <Outlet />
        )}
      </section>
    </div>
  );
}

export function BugsEmpty() {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
          <Tag className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-sm font-semibold">Pick a bug</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select an entry on the left, or hit <span className="mono">New</span> to log
          one. This log stays intentionally AI-free - write it yourself.
        </p>
      </div>
    </div>
  );
}

function NewBugForm({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (data: Partial<Bug>) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<BugStatus>("open");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [solution, setSolution] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          status,
          description,
          steps,
          solution,
        });
      }}
      className="flex h-full flex-col"
    >
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            new entry
          </p>
          <h2 className="text-sm font-semibold">Log a bug</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the bug…"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tags" hint="Comma-separated">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="django, auth"
                className="input mono"
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BugStatus)}
                className="input"
              >
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input"
              placeholder="What went wrong? Context matters."
            />
          </Field>

          <Field label="Steps to reproduce">
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={4}
              className="input mono"
              placeholder="1. …"
            />
          </Field>

          <Field label="Solution / notes">
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={4}
              className="input"
              placeholder="Fix or working notes (leave blank if unresolved)."
            />
          </Field>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save bug"}
        </button>
      </footer>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/70">{hint}</span>
        )}
      </div>
      {children}
    </label>
  );
}
