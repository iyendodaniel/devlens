import json
import uuid
from datetime import datetime
from db import get_connection
import scanner
import webview


class DevLensAPI:
    """
    Exposed to the frontend via pywebview as window.pywebview.api.<name>.
    pywebview does NOT convert casing — it exposes methods under their exact
    Python name — so these are camelCase on purpose, to match the DevLensApi
    interface in src/lib/api.ts and mockApi.ts exactly. Internal helpers stay
    snake_case (and underscore-prefixed, so pywebview won't expose them anyway).
    """

    def __init__(self):
        self._window = None  # set by main.py after window creation. Leading
        # underscore is required: pywebview's js_api introspection walks every
        # public attribute looking for nested methods to expose, and if this
        # held the raw Window object under a public name, it would recurse
        # into window.dom.body and crash before the window finishes loading.

    # ---- Bugs ----
    def getBugs(self):
        conn = get_connection()
        rows = conn.execute("SELECT * FROM bugs ORDER BY updated_at DESC").fetchall()
        conn.close()
        return [self._bug_to_dict(r) for r in rows]

    def createBug(self, data):
        conn = get_connection()
        bug_id = f"b_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        conn.execute(
            "INSERT INTO bugs (id, title, tags, status, description, steps, solution, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (bug_id, data["title"], json.dumps(data.get("tags", [])),
             data.get("status", "open"), data.get("description", ""),
             data.get("steps", ""), data.get("solution", ""), now, now),
        )
        conn.commit()
        conn.close()
        return self.getBug(bug_id)

    def _bug_to_dict(self, row):
        d = dict(row)
        d["tags"] = json.loads(d["tags"] or "[]")
        return d

    def getBug(self, id):
        conn = get_connection()
        row = conn.execute("SELECT * FROM bugs WHERE id = ?", (id,)).fetchone()
        conn.close()
        if not row:
            return None
        return self._bug_to_dict(row)

    def updateBug(self, id, patch):
        existing = self.getBug(id)
        if not existing:
            return None
        merged = {**existing, **patch}
        conn = get_connection()
        now = datetime.utcnow().isoformat()
        conn.execute(
            "UPDATE bugs SET title = ?, tags = ?, status = ?, description = ?, steps = ?, solution = ?, updated_at = ? WHERE id = ?",
            (merged["title"], json.dumps(merged.get("tags", [])),
             merged["status"], merged.get("description", ""),
             merged.get("steps", ""), merged.get("solution", ""), now, id),
        )
        conn.commit()
        conn.close()
        return self.getBug(id)

    def deleteBug(self, id):
        conn = get_connection()
        conn.execute("DELETE FROM bugs WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return {"ok": True}

    # ---- Projects ----
    def getProjects(self):
        conn = get_connection()
        rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def createProject(self):
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if not result:
            return None  # user cancelled
        folder_path = result[0]
        name = folder_path.rstrip("/\\").split("/")[-1].split("\\")[-1]
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        conn.execute(
            "INSERT INTO projects (id, name, path, last_scanned, created_at) VALUES (?, ?, ?, ?, ?)",
            (project_id, name, folder_path, None, now),
        )
        conn.commit()
        conn.close()
        return {"id": project_id, "name": name, "path": folder_path, "last_scanned": None}

    def deleteProject(self, id):
        conn = get_connection()
        conn.execute("DELETE FROM endpoints WHERE project_id = ?", (id,))
        conn.execute("DELETE FROM projects WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return {"ok": True}

    # ---- Endpoints ----
    def getEndpoints(self, project_id):
        conn = get_connection()
        rows = conn.execute(
            "SELECT * FROM endpoints WHERE project_id = ?", (project_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def getEndpoint(self, id):
        conn = get_connection()
        row = conn.execute("SELECT * FROM endpoints WHERE id = ?", (id,)).fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)

    def updateEndpoint(self, id, patch):
        existing = self.getEndpoint(id)
        if not existing:
            return None
        merged = {**existing, **patch}
        conn = get_connection()
        conn.execute(
            "UPDATE endpoints SET method = ?, path = ?, view = ?, app = ?, ai_notes = ?, ai_notes_generated_at = ? WHERE id = ?",
            (merged["method"], merged["path"], merged.get("view", ""),
             merged.get("app", ""), merged.get("ai_notes", ""),
             merged.get("ai_notes_generated_at"), id),
        )
        conn.commit()
        conn.close()
        return self.getEndpoint(id)

    def scanEndpoints(self, project_id):
        conn = get_connection()
        project = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if not project:
            conn.close()
            return {"scanned": 0, "at": None}

        found = scanner.scan_urls(project["path"])  # AST parser, returns list of dicts
        now = datetime.utcnow().isoformat()

        conn.execute("DELETE FROM endpoints WHERE project_id = ?", (project_id,))
        for ep in found:
            conn.execute(
                "INSERT INTO endpoints (id, project_id, method, path, view, app, last_scanned, ai_notes, ai_notes_generated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (f"e_{uuid.uuid4().hex[:8]}", project_id, ep["method"], ep["path"],
                 ep["view"], ep["app"], now, "", None),
            )
        conn.execute(
            "UPDATE projects SET last_scanned = ? WHERE id = ?", (now, project_id)
        )
        conn.commit()
        conn.close()
        return {"scanned": len(found), "at": now}

    def minimizeWindow(self):
        self._window.minimize()

    def toggleMaximize(self):
        if self._window.maximized:
            self._window.restore()
        else:
            self._window.maximize()

    def closeWindow(self):
        self._window.destroy()

