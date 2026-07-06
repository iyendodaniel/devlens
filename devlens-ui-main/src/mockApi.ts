// Mock API for DevLens. Mirrors the shape the Python pywebview bridge will expose.
// Replace this file with the real mockApi.js Daniel attached; function names should match 1:1.

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

let bugs = [
  {
    id: "b_001",
    title: "Django admin logout redirects to /admin/login/?next= with encoded slash",
    tags: ["django", "auth", "admin"],
    status: "open",
    created_at: "2026-06-28T10:12:00Z",
    updated_at: "2026-06-28T10:12:00Z",
    description:
      "After clicking logout in Django admin, the redirect URL double-encodes the next param, breaking the login form's redirect back.",
    steps:
      "1. Log in to /admin\n2. Click logout\n3. Observe URL — %2F appears where / should be",
    solution:
      "Override LogoutView and pass next_page explicitly instead of relying on the referer header.",
  },
  {
    id: "b_002",
    title: "SQLite WAL file grows unbounded during long ingest jobs",
    tags: ["sqlite", "performance"],
    status: "investigating",
    created_at: "2026-07-01T14:03:00Z",
    updated_at: "2026-07-02T08:41:00Z",
    description:
      "During bulk ingest, the -wal file grows into the GBs. Readers hold long transactions preventing checkpoint.",
    steps:
      "1. Start ingest of >100k rows\n2. Open a read transaction in another process\n3. Watch db-wal file size",
    solution:
      "Ensure read connections use short transactions; run PRAGMA wal_checkpoint(TRUNCATE) after batches.",
  },
  {
    id: "b_003",
    title: "pywebview window flashes white on load before React mounts",
    tags: ["pywebview", "ux"],
    status: "resolved",
    created_at: "2026-06-20T09:00:00Z",
    updated_at: "2026-06-21T09:00:00Z",
    description: "White flash between window open and first paint.",
    steps: "1. Launch app\n2. Observe brief white flash",
    solution: "Set window background_color to match the app's --background before creating the webview.",
  },
  {
    id: "b_004",
    title: "Groq streaming response drops final chunk on abort",
    tags: ["groq", "ai", "streaming"],
    status: "open",
    created_at: "2026-07-03T16:22:00Z",
    updated_at: "2026-07-03T16:22:00Z",
    description: "Aborting a streamed completion loses the last accumulated tokens before flush.",
    steps: "1. Start a streaming call\n2. Abort mid-stream\n3. Compare returned text vs. tokens seen",
    solution: "",
  },
];

let projects = [
  {
    id: "proj_internconnect",
    name: "internconnect-backend",
    path: "C:\\Users\\DELL\\Documents\\My projects\\Python_files\\Django_projects\\internconnect",
    last_scanned: "2026-07-04T18:00:00Z",
  },
  {
    id: "proj_classent",
    name: "classent-backend",
    path: "C:\\Users\\DELL\\Documents\\My projects\\Python_files\\Django_projects\\classent",
    last_scanned: "2026-06-30T09:12:00Z",
  },
  {
    id: "proj_lightup",
    name: "lightup-backend",
    path: "C:\\Users\\DELL\\Documents\\My projects\\Python_files\\Django_projects\\lightup",
    last_scanned: null,
  },
];

let endpoints = [
  {
    id: "e_001",
    project_id: "proj_internconnect",
    method: "GET",
    path: "/api/students/<int:pk>/stage3/",
    view: "Stage3ProfileView",
    app: "students",
    last_scanned: "2026-07-04T18:00:00Z",
    ai_notes:
      "Returns the Stage 3 AI Deep Dive profile for a student. Requires IsAuthenticated. Excludes raw screen-monitor recordings from the response, those are fetched separately by the admin review endpoint.",
    ai_notes_generated_at: "2026-07-04T18:00:12Z",
  },
  {
    id: "e_002",
    project_id: "proj_internconnect",
    method: "POST",
    path: "/api/students/stage3/submit/",
    view: "Stage3SubmitView",
    app: "students",
    last_scanned: "2026-07-04T18:00:00Z",
    ai_notes:
      "Handles Stage 3 submission. Writes to Stage3Profile and triggers a Resend result email on completion. No rate limiting detected on this route, worth adding given it's AI-scored.",
    ai_notes_generated_at: "2026-07-04T18:00:14Z",
  },
  {
    id: "e_003",
    project_id: "proj_internconnect",
    method: "GET",
    path: "/api/companies/<int:company_id>/interns/",
    view: "CompanyInternListView",
    app: "companies",
    last_scanned: "2026-07-04T18:00:00Z",
    ai_notes:
      "Returns vetted interns for a company. Serializer confirms student contact fields are excluded, consistent with the fee-protection model (companies pay 10% off-platform, so direct contact info should stay hidden pre-request).",
    ai_notes_generated_at: "2026-07-04T18:00:16Z",
  },
  {
    id: "e_004",
    project_id: "proj_internconnect",
    method: "POST",
    path: "/api/waitlist/",
    view: "WaitlistCreateView",
    app: "core",
    last_scanned: "2026-07-04T18:00:00Z",
    ai_notes:
      "Public endpoint, no auth required. Open to unauthenticated traffic, consider django-ratelimit here.",
    ai_notes_generated_at: "2026-07-04T18:00:18Z",
  },
  {
    id: "e_005",
    project_id: "proj_classent",
    method: "GET",
    path: "/api/schools/<int:school_id>/attendance/",
    view: "AttendanceListView",
    app: "attendance",
    last_scanned: "2026-06-30T09:12:00Z",
    ai_notes:
      "Lists attendance records scoped by school_id. Confirms tenant isolation, every queryset filters on school_id before returning rows.",
    ai_notes_generated_at: "2026-06-30T09:12:20Z",
  },
  {
    id: "e_006",
    project_id: "proj_classent",
    method: "POST",
    path: "/api/schools/<int:school_id>/attendance/mark/",
    view: "AttendanceMarkView",
    app: "attendance",
    last_scanned: "2026-06-30T09:12:00Z",
    ai_notes:
      "Double-verification write: accepts either a student self-mark or a teacher roll-call payload, branches on a role field. Consider splitting into two views for clarity.",
    ai_notes_generated_at: "2026-06-30T09:12:22Z",
  },
];

export const mockApi = {
  async getBugs() {
    await delay();
    return [...bugs].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async getBug(id: string) {
    await delay(120);
    return bugs.find((b) => b.id === id) ?? null;
  },
  async createBug(data: any) {
    await delay();
    const bug = {
      id: `b_${uid()}`,
      title: data.title ?? "Untitled bug",
      tags: data.tags ?? [],
      status: data.status ?? "open",
      description: data.description ?? "",
      steps: data.steps ?? "",
      solution: data.solution ?? "",
      created_at: now(),
      updated_at: now(),
    };
    bugs = [bug, ...bugs];
    return bug;
  },
  async updateBug(id: string, patch: any) {
    await delay(160);
    bugs = bugs.map((b) => (b.id === id ? { ...b, ...patch, updated_at: now() } : b));
    return bugs.find((b) => b.id === id);
  },
  async deleteBug(id: string) {
    await delay(140);
    bugs = bugs.filter((b) => b.id !== id);
    return { ok: true };
  },

  // ---- Projects ----
  async getProjects() {
    await delay(150);
    return [...projects];
  },

  async createProject() {
    // Real backend opens a native OS folder picker here (webview.FOLDER_DIALOG).
    // Mock version simulates picking a folder after a short delay, so the
    // frontend flow (click → dialog → new project appears) can be built and
    // tested without the Python bridge.
    await delay(400);
    const name = `new-project-${uid()}`;
    const project = {
      id: `proj_${uid()}`,
      name,
      path: `C:\\Users\\DELL\\Documents\\My projects\\Python_files\\Django_projects\\${name}`,
      last_scanned: null as string | null,
    };
    projects = [...projects, project];
    return project;
  },

  async deleteProject(id: string) {
    await delay(150);
    projects = projects.filter((p) => p.id !== id);
    endpoints = endpoints.filter((e) => e.project_id !== id);
    return { ok: true };
  },

  // ---- Endpoints (scoped to a project) ----
  async getEndpoints(projectId: string) {
    await delay();
    return endpoints.filter((e) => e.project_id === projectId);
  },
  async getEndpoint(id: string) {
    await delay(120);
    return endpoints.find((e) => e.id === id) ?? null;
  },
  async updateEndpoint(id: string, patch: any) {
    await delay(160);
    endpoints = endpoints.map((e) => (e.id === id ? { ...e, ...patch } : e));
    return endpoints.find((e) => e.id === id);
  },

  async scanEndpoints(projectId: string) {
    // Simulates re-scanning that project's urls.py files. Real backend
    // statically parses urlpatterns via Python's ast module instead of
    // importing the scanned project.
    await delay(900);
    const stamp = now();
    endpoints = endpoints.map((e) =>
      e.project_id === projectId ? { ...e, last_scanned: stamp } : e,
    );
    projects = projects.map((p) =>
      p.id === projectId ? { ...p, last_scanned: stamp } : p,
    );
    return {
      scanned: endpoints.filter((e) => e.project_id === projectId).length,
      at: stamp,
    };
  },
};
