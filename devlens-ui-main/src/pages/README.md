# Pages

Plain React Router setup, matching internconnect-ui's structure. No file-based
routing, no code generation.

Routes are defined explicitly in `src/App.tsx`:

| Path | Component |
| --- | --- |
| `/` | redirects to `/bugs` |
| `/bugs` | `BugsPage` (list + layout, renders `<Outlet />`) |
| `/bugs/:id` | `BugDetailPage` |
| `/endpoints` | `EndpointsPage` (list + layout, renders `<Outlet />`) |
| `/endpoints/:id` | `EndpointDetailPage` |

The app uses `HashRouter` (not `BrowserRouter`) because the built app is loaded
by pywebview from a local file (`dist/index.html`), not served by a real web
server — hash-based routes (`#/bugs/123`) need no server rewrite rule to work
on refresh or deep link.

To add a new page: create the component in this folder, then add a `<Route>`
for it in `src/App.tsx`. That's it.
