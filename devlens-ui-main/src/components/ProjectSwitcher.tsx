import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, FolderOpen, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// The dropdown that lets you pick which scanned Django codebase you're
// looking at, plus "New Project" to point Endpoint Explorer at a different
// folder. Lives in the sidebar so it's available from every page, not just
// Endpoint Explorer — picking or creating a project always takes you there.
export function ProjectSwitcher() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getProjects(),
  });

  const current = projects.find((p) => p.id === projectId);

  const createProject = useMutation({
    mutationFn: () => api.createProject(),
    onSuccess: (project) => {
      if (!project) return; // user cancelled the folder picker
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      navigate(`/endpoints/${project.id}`);
    },
  });

  return (
    <div className="relative px-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs transition hover:bg-surface-2"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {current?.name ?? "Select a project"}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <ul className="max-h-56 overflow-y-auto py-1">
              {projects.length === 0 && (
                <li className="px-3 py-2 text-[11px] text-muted-foreground">
                  No projects yet.
                </li>
              )}
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/endpoints/${p.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col gap-0.5 px-3 py-2 text-xs transition hover:bg-surface-2",
                      p.id === projectId && "bg-surface-2",
                    )}
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="mono truncate text-[10px] text-muted-foreground">
                      {p.path}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => createProject.mutate()}
              disabled={createProject.isPending}
              className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-2 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {createProject.isPending ? "Opening folder picker…" : "New project"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}