import os
import sys
import shutil
import tempfile
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler

# Setup environment & search paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
APP_DIR = os.path.join(PROJECT_ROOT, "app")

for p in [BASE_DIR, PROJECT_ROOT, APP_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Setup SQLite in writable temp directory on Vercel Serverless
TEMP_BASE = "/tmp" if os.path.exists("/tmp") else tempfile.gettempdir()
TMP_DB = os.path.join(TEMP_BASE, "production_data.db")

CANDIDATES = [
    os.path.join(BASE_DIR, "production_data.db"),
    os.path.join(PROJECT_ROOT, "app_data", "production_data.db"),
    os.path.join(APP_DIR, "production_data.db"),
    os.path.join(os.getcwd(), "app_data", "production_data.db"),
    os.path.join(os.getcwd(), "api", "production_data.db")
]

source_db = None
for c in CANDIDATES:
    if os.path.exists(c) and os.path.getsize(c) > 0:
        source_db = c
        break

if source_db:
    try:
        if not os.path.exists(TMP_DB) or os.path.getsize(TMP_DB) == 0:
            shutil.copy2(source_db, TMP_DB)
    except Exception as e:
        print(f"Warning copying DB to temp: {e}")

# Safely import server handler
server_import_error = None
try:
    from app.server import ProductionAppHandler
except Exception as e:
    server_import_error = traceback.format_exc()
    ProductionAppHandler = BaseHTTPRequestHandler


class handler(ProductionAppHandler):
    def _normalize_request_path(self):
        """Handle Vercel path rewrites where self.path might be /api/index.py"""
        orig_path = self.path
        
        # Check Vercel headers for original requested path
        forwarded = self.headers.get("x-forwarded-uri") or self.headers.get("x-matched-path")
        if forwarded and not forwarded.startswith("/api/index.py"):
            self.path = forwarded
            return

        # If path is /api/index.py?xxx, strip the /index.py prefix
        if self.path.startswith("/api/index.py"):
            suffix = self.path[len("/api/index.py"):]
            if suffix.startswith("?"):
                pass
            elif suffix.startswith("/"):
                self.path = "/api" + suffix

    def do_GET(self):
        self._normalize_request_path()

        # If import failed during cold start, report stack trace clearly
        if server_import_error:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"Vercel Serverless Import Error:\n{server_import_error}".encode("utf-8"))
            return

        # Diagnostic endpoint
        if self.path == "/api/debug" or self.path.startswith("/api/debug?"):
            import json, sqlite3
            db_exists = os.path.exists(TMP_DB)
            db_size = os.path.getsize(TMP_DB) if db_exists else 0
            tables = []
            try:
                conn = sqlite3.connect(TMP_DB if db_exists else (source_db or ""))
                cur = conn.cursor()
                tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
                conn.close()
            except Exception as ex:
                tables = [f"Err: {ex}"]

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "path": self.path,
                "source_db": source_db,
                "tmp_db": TMP_DB,
                "tmp_db_exists": db_exists,
                "tmp_db_size": db_size,
                "tables_count": len(tables),
                "tables": tables,
                "headers": dict(self.headers)
            }, indent=2).encode("utf-8"))
            return

        try:
            super().do_GET()
        except Exception as e:
            err = traceback.format_exc()
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"Vercel Serverless GET Error:\n{err}".encode("utf-8"))

    def do_POST(self):
        self._normalize_request_path()
        if server_import_error:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"Vercel Serverless Import Error:\n{server_import_error}".encode("utf-8"))
            return

        try:
            super().do_POST()
        except Exception as e:
            err = traceback.format_exc()
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"Vercel Serverless POST Error:\n{err}".encode("utf-8"))

    def do_OPTIONS(self):
        try:
            super().do_OPTIONS()
        except Exception:
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()
