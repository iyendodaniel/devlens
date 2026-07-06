import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProjectsEmpty } from "./EndpointsPage";

// Bare /endpoints has no project context yet. Send the person to whichever
// project they last had scanned, or show an empty state if none exist.
export function EndpointsIndexRedirect() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getProjects(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading projects…
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return <ProjectsEmpty />;
  }

  return <Navigate to={`/endpoints/${projects[0].id}`} replace />;
}
