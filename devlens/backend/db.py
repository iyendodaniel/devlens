import sqlite3
from pathlib import Path

DB_PATH = Path.home() / ".devlens" / "devlens.db"
DB_PATH.parent.mkdir(exist_ok=True)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bugs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            tags TEXT,
            status TEXT,
            description TEXT,
            steps TEXT,
            solution TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            last_scanned TEXT,
            created_at TEXT
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS endpoints (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            view TEXT,
            app TEXT,
            last_scanned TEXT,
            ai_notes TEXT,
            ai_notes_generated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    """)

    try:
        conn.execute("ALTER TABLE projects ADD COLUMN frontend_path TEXT")
    except sqlite3.OperationalError:
        pass 

    # Configured once via Actions -> Build Frontend, then reused on every run
    # so Automation Mode never has to stop and ask where the build goes.
    try:
        conn.execute("ALTER TABLE projects ADD COLUMN build_destination_path TEXT")
    except sqlite3.OperationalError:
        pass

    conn.execute("""
        CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            key TEXT NOT NULL,
            name TEXT NOT NULL,
            built_in INTEGER NOT NULL DEFAULT 0,
            execution_mode TEXT NOT NULL DEFAULT 'learning',
            steps TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    """)

    conn.commit()
    conn.close()

