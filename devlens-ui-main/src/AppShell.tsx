import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, Route as RouteIcon, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";

const NAV = [
  { to: "/bugs", label: "Bug Book", icon: BookOpen, match: "/bugs" },
  { to: "/endpoints", label: "Endpoint Explorer", icon: RouteIcon, match: "/endpoints" },
] as const;

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Command className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">DevLens</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              local · v0.1
            </div>
          </div>
        </div>

        <div className="mt-2 mb-3">
          <ProjectSwitcher />
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-resolved" />
            <span>pywebview bridge</span>
          </div>
          <div className="mt-1 mono text-[10px] opacity-70">
            {typeof window !== "undefined" && window.pywebview
              ? "connected"
              : "mock · dev mode"}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">View not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That screen doesn't exist in DevLens.
        </p>
        <Link
          to="/bugs"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Back to Bug Book
        </Link>
      </div>
    </div>
  );
}