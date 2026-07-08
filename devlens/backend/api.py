import json
import uuid
from datetime import datetime
from db import get_connection
import scanner
import webview
import os
import platform
import shutil
import subprocess
import shlex


# ---- Built-in Actions ----
# Predefined, per-project workflows shipped with DevLens. Seeded into the
# `actions` table the first time a project's Actions are loaded, then stored
# like any other row so they're editable from there on — this dict is only
# ever read for a brand-new project, never re-applied over a user's edits.
#
# Step shapes:
#   command   -> {"type": "command", "command": str, "cwd": "project"|"frontend", "explanation": str}
#   operation -> {"type": "operation", "operation": str, "explanation": str}
# "operation" steps describe something the backend does natively (copying a
# folder, etc.) rather than a shell command — there's no literal command to
# show, so the preview renders `operation` where it would otherwise render
# `command`.
BUILT_IN_ACTIONS = {
    "build_frontend": {
        "name": "Build Frontend",
        "steps": [
            {
                "type": "command",
                "command": "npm run build",
                "cwd": "frontend",
                "explanation": "Builds the production version of the frontend.",
            },
            {
                "type": "operation",
                "operation": "Copy the generated dist folder.",
                "explanation": "Copies the production build output.",
            },
            {
                "type": "operation",
                "operation": "Move or copy the folder to the configured backend directory.",
                "explanation": "Makes the latest frontend available to the backend for serving.",
            },
        ],
    },
    "python_migrations": {
        "name": "Python Migrations",
        "steps": [
            {
                "type": "command",
                "command": "python manage.py makemigrations",
                "cwd": "project",
                "explanation": "Creates new migration files based on changes made to Django models.",
            },
            {
                "type": "command",
                "command": "python manage.py migrate",
                "cwd": "project",
                "explanation": "Applies all pending migrations to the project's database.",
            },
        ],
    },
}


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


    def setFrontendPath(self, project_id):
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)

        if not result:
            conn = get_connection()
            row = conn.execute(
                "SELECT * FROM projects WHERE id = ?", (project_id,)
            ).fetchone()
            conn.close()
            return dict(row) if row else None

        folder_path = result[0]

        conn = get_connection()
        conn.execute(
            "UPDATE projects SET frontend_path = ? WHERE id = ?",
            (folder_path, project_id),
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        conn.close()
        return dict(row)


    # ---- Actions (generic) ----
    def _action_to_dict(self, row):
        d = dict(row)
        d["steps"] = json.loads(d["steps"])
        d["built_in"] = bool(d["built_in"])
        return d

    def getActions(self, project_id):
        conn = get_connection()
        existing = conn.execute(
            "SELECT key FROM actions WHERE project_id = ?", (project_id,)
        ).fetchall()
        have = {r["key"] for r in existing}

        now = datetime.utcnow().isoformat()
        for key, defaults in BUILT_IN_ACTIONS.items():
            if key in have:
                continue
            conn.execute(
                "INSERT INTO actions (id, project_id, key, name, built_in, execution_mode, steps, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, 1, 'learning', ?, ?, ?)",
                (f"act_{uuid.uuid4().hex[:8]}", project_id, key, defaults["name"],
                 json.dumps(defaults["steps"]), now, now),
            )
        conn.commit()

        rows = conn.execute(
            "SELECT * FROM actions WHERE project_id = ? ORDER BY built_in DESC, created_at ASC",
            (project_id,),
        ).fetchall()
        conn.close()
        return [self._action_to_dict(r) for r in rows]

    def updateAction(self, id, patch):
        conn = get_connection()
        row = conn.execute("SELECT * FROM actions WHERE id = ?", (id,)).fetchone()
        if not row:
            conn.close()
            return None
        existing = self._action_to_dict(row)
        merged_name = patch.get("name", existing["name"])
        merged_mode = patch.get("execution_mode", existing["execution_mode"])
        merged_steps = patch.get("steps", existing["steps"])
        now = datetime.utcnow().isoformat()
        conn.execute(
            "UPDATE actions SET name = ?, execution_mode = ?, steps = ?, updated_at = ? WHERE id = ?",
            (merged_name, merged_mode, json.dumps(merged_steps), now, id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM actions WHERE id = ?", (id,)).fetchone()
        conn.close()
        return self._action_to_dict(row)

    def runCommandStep(self, project_id, cwd_kind, command):
        """Runs one `command`-type step. cwd_kind is "project" (the Django
        root Endpoint Explorer scans) or "frontend" (project.frontend_path).
        Used by command-only actions like Python Migrations; Build Frontend
        keeps its own buildFrontend/copyDistTo methods below since the npm
        step needs OS-specific binary resolution and the copy step isn't a
        shell command at all.
        """
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        conn.close()
        if not row:
            return {"ok": False, "output": "", "error": "Project not found."}

        cwd = row["frontend_path"] if cwd_kind == "frontend" else row["path"]
        if not cwd or not os.path.isdir(cwd):
            missing = "frontend folder" if cwd_kind == "frontend" else "project folder"
            return {"ok": False, "output": "", "error": f"No valid {missing} configured."}

        try:
            args = command if platform.system() == "Windows" else shlex.split(command)
            result = subprocess.run(
                args,
                cwd=cwd,
                capture_output=True,
                text=True,
                shell=platform.system() == "Windows",
            )
        except FileNotFoundError as e:
            return {"ok": False, "output": "", "error": f"Command not found: {e}"}

        if result.returncode == 0:
            return {"ok": True, "output": result.stdout + result.stderr}
        return {
            "ok": False,
            "output": result.stdout + result.stderr,
            "error": f"`{command}` exited with code {result.returncode}",
        }

    def setBuildDestination(self, project_id):
        """Configures project.build_destination_path once, so Automation
        Mode's copy step never has to interrupt the run with a picker."""
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        conn = get_connection()
        if result:
            conn.execute(
                "UPDATE projects SET build_destination_path = ? WHERE id = ?",
                (result[0], project_id),
            )
            conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def buildFrontend(self, project_id):
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        conn.close()

        frontend_path = row["frontend_path"] if row else None

        if not frontend_path or not os.path.isdir(frontend_path):
            return {"ok": False, "output": "", "error": "No valid frontend folder set for this project."}

        npm_cmd = "npm.cmd" if platform.system() == "Windows" else "npm"

        try:
            result = subprocess.run(
                [npm_cmd, "run", "build"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            return {"ok": False, "output": "", "error": "npm was not found. Is Node.js installed?"}

        if result.returncode == 0:
            return {"ok": True, "output": result.stdout + result.stderr}
        else:
            return {
                "ok": False,
                "output": result.stdout + result.stderr,
                "error": f"npm run build exited with code {result.returncode}",
            }


    def pickBuildDestination(self):
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if not result:
            return None
        return result[0]


    def copyDistTo(self, project_id, destination):
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        conn.close()

        frontend_path = row["frontend_path"] if row else None
        if not frontend_path:
            return {"ok": False, "output": "", "error": "No frontend folder set."}

        dist_path = os.path.join(frontend_path, "dist")

        if not os.path.isdir(dist_path):
            return {"ok": False, "output": "", "error": "No dist/ folder found — did the build run?"}

        target_path = os.path.join(destination, "dist")

        try:
            shutil.copytree(dist_path, target_path, dirs_exist_ok=True)
            return {"ok": True, "output": f"Copied dist/ -> {target_path}"}
        except Exception as e:
            return {"ok": False, "output": "", "error": str(e)}

