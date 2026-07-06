export type BugStatus = "open" | "investigating" | "resolved";

export interface Bug {
  id: string;
  title: string;
  tags: string[];
  status: BugStatus;
  description: string;
  steps: string;
  solution: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  last_scanned: string | null;
}

export interface Endpoint {
  id: string;
  project_id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  view: string;
  app: string;
  last_scanned: string;
  ai_notes: string;
  ai_notes_generated_at: string | null;
}

interface DevLensApi {
  getBugs: () => Promise<Bug[]>;
  getBug: (id: string) => Promise<Bug | null>;
  createBug: (data: Partial<Bug>) => Promise<Bug>;
  updateBug: (id: string, patch: Partial<Bug>) => Promise<Bug>;
  deleteBug: (id: string) => Promise<{ ok: true }>;

  // Projects — each Django/backend codebase you point Endpoint Explorer at
  getProjects: () => Promise<Project[]>;
  createProject: () => Promise<Project | null>; // opens native folder picker; null if cancelled
  deleteProject: (id: string) => Promise<{ ok: true }>;

  // Endpoints — always scoped to a project
  getEndpoints: (projectId: string) => Promise<Endpoint[]>;
  getEndpoint: (id: string) => Promise<Endpoint | null>;
  updateEndpoint: (id: string, patch: Partial<Endpoint>) => Promise<Endpoint>;
  scanEndpoints: (projectId: string) => Promise<{ scanned: number; at: string }>;
}

declare global {
  interface Window {
    pywebview?: { api: DevLensApi };
  }
}

// pywebview injects `window.pywebview` asynchronously, AFTER the page has
// already loaded — it is not guaranteed to exist yet at module-evaluation
// time (which is when a top-level `window.pywebview!.api` would run). This
// proxy defers resolving the bridge until a method is actually called, and
// waits for the `pywebviewready` event if the bridge isn't there yet, so it
// never throws no matter how the load order lines up.
function waitForBridge(): Promise<DevLensApi> {
  if (window.pywebview?.api) {
    return Promise.resolve(window.pywebview.api);
  }
  return new Promise((resolve) => {
    window.addEventListener(
      "pywebviewready",
      () => resolve(window.pywebview!.api),
      { once: true },
    );
  });
}

export const api: DevLensApi = new Proxy({} as DevLensApi, {
  get(_target, prop: string) {
    return async (...args: unknown[]) => {
      const bridge = await waitForBridge();
      const fn = bridge[prop as keyof DevLensApi] as (...a: unknown[]) => unknown;
      return fn(...args);
    };
  },
});