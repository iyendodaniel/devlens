import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, RefreshCw, Route as RouteIcon, FolderOpen } from "lucide-react";
import { api, type Endpoint } from "@/lib/api";
import { cn } from "@/lib/utils";

const METHOD_CLASS: Record<Endpoint["method"], string> = {
  GET: "text-method-get bg-method-get/10 ring-method-get/25",
  POST: "text-method-post bg-method-post/10 ring-method-post/25",
  PUT: "text-method-put bg-method-put/10 ring-method-put/25",
  PATCH: "text-method-patch bg-method-patch/10 ring-method-patch/25",
  DELETE: "text-method-delete bg-method-delete/10 ring-method-delete/25",
};

export function MethodBadge({ method }: { method: Endpoint["method"] }) {
  return (
    <span
      className={cn(
        "mono inline-flex min-w-[46px] justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        METHOD_CLASS[method],
      )}
    >
      {method}
    </span>
  );
}

export function EndpointsPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["endpoints", projectId],
    queryFn: () => api.getEndpoints(projectId),
    enabled: !!projectId,
  });

  const { pathname } = useLocation();
  const selectedId = pathname.split("/")[3] ?? null;

  const [q, setQ] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");

  const apps = useMemo(
    () => Array.from(new Set(endpoints.map((e) => e.app))).sort(),
    [endpoints],
  );

  const filtered = useMemo(() => {
    return endpoints.filter((e) => {
      if (appFilter !== "all" && e.app !== appFilter) return false;
      if (!q.trim()) return true;
      const n = q.toLowerCase();
      return (
        e.path.toLowerCase().includes(n) ||
        e.view.toLowerCase().includes(n) ||
        e.app.toLowerCase().includes(n)
      );
    });
  }, [endpoints, q, appFilter]);

  const scan = useMutation({
    mutationFn: () => api.scanEndpoints(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-1">
      <section className="flex w-[420px] shrink-0 flex-col border-r border-border">
        <header className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Endpoint Explorer
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {endpoints.length} routes · Django scan
              </p>
            </div>
            <button
              onClick={() => scan.mutate()}
              disabled={scan.isPending || !projectId}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", scan.isPending && "animate-spin")}
                strokeWidth={2.5}
              />
              {scan.isPending ? "Scanning…" : "Scan"}
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by path, view, app…"
              className="w-full rounded-md border border-border bg-surface pl-8 pr-2 py-1.5 text-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setAppFilter("all")}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition",
                appFilter === "all"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              all
            </button>
            {apps.map((a) => (
              <button
                key={a}
                onClick={() => setAppFilter(a)}
                className={cn(
                  "mono rounded-md px-2 py-1 text-[11px] font-medium transition",
                  appFilter === a
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <li className="p-4 text-xs text-muted-foreground">Loading routes…</li>
          )}
          {!isLoading && filtered.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">
              Nothing matched. Hit <span className="mono">Scan</span> if this
              project hasn't been scanned yet.
            </li>
          )}
          {filtered.map((e) => {
            const active = e.id === selectedId;
            return (
              <li key={e.id}>
                <Link
                  to={`/endpoints/${projectId}/${e.id}`}
                  className={cn(
                    "block border-l-2 px-4 py-2.5 transition-colors",
                    active
                      ? "border-primary bg-surface"
                      : "border-transparent hover:bg-surface/60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MethodBadge method={e.method} />
                    <span className="mono truncate text-[12px] text-foreground">
                      {e.path}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-[54px] text-[10px] text-muted-foreground">
                    <span className="mono">{e.app}</span>
                    <span>·</span>
                    <span>{e.view}</span>
                    {e.ai_notes && (
                      <span
                        className="ml-auto inline-block h-1.5 w-1.5 rounded-full bg-ai/80"
                        title="Has AI notes"
                      />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </section>
    </div>
  );
}

export function EndpointsEmpty() {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
          <RouteIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-sm font-semibold">Pick an endpoint</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Or hit <span className="mono">Scan</span> to introspect this
          project's URL config and refresh the list.
        </p>
      </div>
    </div>
  );
}

export function ProjectsEmpty() {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-sm font-semibold">No project yet</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the dropdown above and hit <span className="mono">New project</span> to
          point Endpoint Explorer at a Django codebase.
        </p>
      </div>
    </div>
  );
}