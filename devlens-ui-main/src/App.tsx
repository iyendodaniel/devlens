import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell, NotFoundPage } from "./AppShell";
import { BugsPage, BugsEmpty } from "./pages/BugsPage";
import { BugDetailPage } from "./pages/BugDetailPage";
import { EndpointsPage, EndpointsEmpty } from "./pages/EndpointsPage";
import { EndpointsIndexRedirect } from "./pages/EndpointsIndexRedirect";
import { EndpointDetailPage } from "./pages/EndpointDetailPage";
import { ErrorBoundary } from "./ErrorBoundary";

// HashRouter is deliberate: the built app is loaded by pywebview from a local
// file:// path (dist/index.html), not served from a real web server. HashRouter
// keeps all routing in the URL fragment (#/bugs/123) so there's no server-side
// rewrite rule needed to make deep links or refreshes work.
const queryClient = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/bugs" replace />} />

              <Route path="bugs" element={<BugsPage />}>
                <Route index element={<BugsEmpty />} />
                <Route path=":id" element={<BugDetailPage />} />
              </Route>

              <Route path="endpoints" element={<EndpointsIndexRedirect />} />
              <Route path="endpoints/:projectId" element={<EndpointsPage />}>
                <Route index element={<EndpointsEmpty />} />
                <Route path=":id" element={<EndpointDetailPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
