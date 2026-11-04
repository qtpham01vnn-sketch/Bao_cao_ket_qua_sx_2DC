import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import sys
import random
import datetime
import hmac
import hashlib
import time
import threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_mau_engine import build_form_mau_payload, save_form_mau_custom_data, parse_form_mau_excel_upload, resolve_period
from dashboard_excel_exporter import generate_dashboard_excel_report
import supabase_sync

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_PATH = os.path.join(WORKSPACE_DIR, "app_data", "production_data.db")
ORIGINAL_EXCEL_PATH = os.path.join(WORKSPACE_DIR, "New Biểu đồ Báo cáo TH 2 DC năm 2026.xlsx")
SERVER_START_TIME = time.time()
SESSION_SECRET = os.environ.get("SESSION_SECRET", "phuongnam-production-2dc-enterprise-secret-key-2026")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def parse_month_int(val):
    if not val or str(val).lower() in ("all", "none", "null"):
        return None
    val_str = str(val).strip()
    if "-" in val_str:
        val_str = val_str.split("-")[-1]
    try:
        return int(val_str)
    except (ValueError, TypeError):
        return None

def generate_session_token(username, role, duration_hours=24):
    expires_at = int(time.time()) + (duration_hours * 3600)
    payload = f"{username}:{role}:{expires_at}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

def verify_session_token(token):
    if not token:
        return False, None
    parts = token.split(":")
    if len(parts) != 4:
        return False, None
    username, role, expires_at_str, sig = parts
    try:
        expires_at = int(expires_at_str)
        if time.time() > expires_at:
            return False, None
    except ValueError:
        return False, None
    expected_payload = f"{username}:{role}:{expires_at_str}"
    expected_sig = hmac.new(SESSION_SECRET.encode(), expected_payload.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig, expected_sig):
        return True, {"username": username, "role": role, "expires_at": expires_at}
    return False, None

def check_brute_force(identifier):
    conn = get_db()
    cur = conn.cursor()
    row = cur.execute("SELECT failed_attempts, locked_until FROM auth_security_rate_limit WHERE identifier = ?", (identifier,)).fetchone()
    conn.close()
    if row:
        locked_until = row["locked_until"]
        if locked_until:
            try:
                locked_dt = datetime.datetime.fromisoformat(locked_until)
                if datetime.datetime.now() < locked_dt:
                    diff_min = int((locked_dt - datetime.datetime.now()).total_seconds() / 60) + 1
                    return False, f"Tài khoản/IP tạm thời bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau {diff_min} phút."
            except Exception:
                pass
    return True, None

def record_auth_failure(identifier):
    conn = get_db()
    cur = conn.cursor()
    row = cur.execute("SELECT failed_attempts FROM auth_security_rate_limit WHERE identifier = ?", (identifier,)).fetchone()
    now_str = datetime.datetime.now().isoformat()
    if row:
        attempts = row["failed_attempts"] + 1
        locked_until = None
        if attempts >= 5:
            locked_until = (datetime.datetime.now() + datetime.timedelta(minutes=15)).isoformat()
        cur.execute("UPDATE auth_security_rate_limit SET failed_attempts = ?, locked_until = ?, last_attempt = ? WHERE identifier = ?", (attempts, locked_until, now_str, identifier))
    else:
        cur.execute("INSERT INTO auth_security_rate_limit (identifier, failed_attempts, last_attempt) VALUES (?, 1, ?)", (identifier, now_str))
    conn.commit()
    conn.close()

def record_auth_success(identifier):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM auth_security_rate_limit WHERE identifier = ?", (identifier,))
    conn.commit()
    conn.close()

def init_auth_access_table():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_access_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            full_name TEXT,
            department TEXT,
            device_id TEXT NOT NULL,
            request_type TEXT DEFAULT 'trial_25h',
            status TEXT DEFAULT 'pending',
            activation_pin TEXT,
            granted_at TEXT,
            expires_at TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS system_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            target_table TEXT,
            target_id TEXT,
            user_info TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS report_approvals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL DEFAULT 2026,
            report_type TEXT DEFAULT 'form_mau_signoff',
            status TEXT DEFAULT 'draft',
            submitted_by TEXT,
            submitted_at TEXT,
            approved_by TEXT,
            approved_role TEXT,
            approved_at TEXT,
            signature_hash TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(month, year, report_type)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS auth_security_rate_limit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL UNIQUE,
            failed_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            last_attempt TEXT
        )
    """)
    conn.commit()
    conn.close()

init_auth_access_table()

class ProductionAppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(BASE_DIR, "public"), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role, X-Admin-Token")
        self.end_headers()

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        params = urllib.parse.parse_qs(parsed_url.query)

        if path.startswith("/api/"):
            try:
                if path == "/api/dashboard":
                    self.handle_dashboard(params)
                elif path == "/api/data/summary":
                    self.handle_get_summary(params)
                elif path == "/api/data/brands":
                    self.handle_get_brands(params)
                elif path == "/api/data/materials":
                    self.handle_get_materials(params)
                elif path == "/api/data/coal":
                    self.handle_get_coal(params)
                elif path == "/api/norms/versions":
                    self.handle_get_norm_versions(params)
                elif path == "/api/norms/details":
                    self.handle_get_norm_details(params)
                elif path == "/api/report/form-mau":
                    self.handle_get_form_mau(params)
                elif path == "/api/export/sign-off-report" or path == "/api/export/form-mau-excel":
                    self.handle_export_sign_off_report(params)
                elif path == "/api/export/dashboard-excel":
                    self.handle_export_dashboard_excel(params)
                elif path == "/api/metadata":
                    self.handle_metadata()
                elif path == "/api/access/requests":
                    self.handle_get_access_requests()
                elif path == "/api/access/check-status":
                    self.handle_check_access_status(params)
                elif path == "/api/supabase/status":
                    self.send_json_response(supabase_sync.get_sync_status())
                elif path == "/api/audit-logs":
                    self.handle_get_audit_logs()
                elif path == "/api/approval/status":
                    self.handle_get_approval_status(params)
                elif path == "/api/approval/history":
                    self.handle_get_approval_history()
                elif path == "/api/data/anomalies":
                    self.handle_get_anomalies(params)
                elif path == "/api/health":
                    self.handle_health_check()
                else:
                    self.send_json_response({"error": "Endpoint not found"}, status=404)
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_json_response({"error": str(e)}, status=500)
            return

        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" in content_type:
                if path == "/api/import/monthly":
                    self.handle_import_monthly_multipart(post_data, content_type)
                    return
                elif path == "/api/report/form-mau/import-excel":
                    self.handle_import_form_mau_multipart(post_data, content_type)
                    return

            body = {}
            if post_data:
                try:
                    body = json.loads(post_data.decode("utf-8"))
                except:
                    pass

            if path == "/api/norms/versions":
                self.handle_create_norm_version(body)
            elif path == "/api/norms/details":
                self.handle_save_norm_details(body)
            elif path == "/api/norms/items":
                self.handle_add_norm_item(body)
            elif path == "/api/report/form-mau/save-custom":
                self.handle_save_form_mau_custom(body)
            elif path == "/api/access/request":
                self.handle_create_access_request(body)
            elif path == "/api/access/approve":
                self.handle_approve_access_request(body)
            elif path == "/api/access/verify-pin":
                self.handle_verify_pin_access(body)
            elif path == "/api/auth/login":
                self.handle_auth_login(body)
            elif path == "/api/approval/submit":
                self.handle_submit_approval(body)
            elif path == "/api/approval/sign":
                self.handle_sign_approval(body)
            elif path == "/api/supabase/sync":
                self.handle_supabase_sync(body)
            elif path == "/api/supabase/config":
                self.handle_supabase_config(body)
            else:
                self.send_json_response({"error": "Endpoint not found"}, status=404)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, status=500)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        params = urllib.parse.parse_qs(parsed_url.query)
        item_id = params.get("id", [None])[0]

        # Security & Authorization check
        user_role = self.headers.get("X-User-Role", "") or params.get("role", [""])[0]
        admin_token = self.headers.get("X-Admin-Token", "") or self.headers.get("Authorization", "")
        client_ip = self.client_address[0] if self.client_address else "unknown"

        # Enforce Admin Role or Session Token strictly without localhost bypass
        token_valid, token_data = verify_session_token(admin_token.replace("Bearer ", "").strip())
        is_admin = (user_role in ["admin", "ptgd"]) or (token_valid and token_data.get("role") in ["admin", "ptgd"])

        if not is_admin:
            self.log_audit("UNAUTHORIZED_DELETE_ATTEMPT", path, str(item_id), f"IP: {client_ip}, Role: {user_role}")
            self.send_json_response({"error": "Không có quyền thực hiện: Thao tác xóa yêu cầu quyền Quản trị viên (Admin)."}, status=403)
            return

        if not item_id:
            self.send_json_response({"error": "ID parameter required"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        target_table = None
        if path == "/api/data/summary":
            target_table = "data_production_summary"
            cur.execute("DELETE FROM data_production_summary WHERE id = ?", (item_id,))
        elif path == "/api/data/brands":
            target_table = "data_brand_production"
            cur.execute("DELETE FROM data_brand_production WHERE id = ?", (item_id,))
        elif path == "/api/data/materials":
            target_table = "data_material_consumption"
            cur.execute("DELETE FROM data_material_consumption WHERE id = ?", (item_id,))
        elif path == "/api/data/coal":
            target_table = "data_coal_consumption"
            cur.execute("DELETE FROM data_coal_consumption WHERE id = ?", (item_id,))
        elif path == "/api/norms/versions":
            target_table = "master_norms_version"
            cur.execute("DELETE FROM master_norms_detail WHERE version_id = ?", (item_id,))
            cur.execute("DELETE FROM master_norms_version WHERE id = ?", (item_id,))
        elif path == "/api/norms/items":
            target_table = "master_norms_detail"
            cur.execute("DELETE FROM master_norms_detail WHERE id = ?", (item_id,))

        if target_table:
            self.log_audit("DELETE", target_table, str(item_id), f"Role: {user_role or 'admin'}")

        conn.commit()
        conn.close()
        self.send_json_response({"success": True, "message": "Đã xóa bản ghi thành công"})

    def handle_metadata(self):
        conn = get_db()
        cur = conn.cursor()
        months = [r[0] for r in cur.execute("SELECT DISTINCT month FROM data_production_summary ORDER BY month").fetchall()]
        lines = [r[0] for r in cur.execute("SELECT DISTINCT line FROM data_production_summary WHERE line != '' ORDER BY line").fetchall()]
        sizes = [r[0] for r in cur.execute("SELECT DISTINCT size FROM data_production_summary WHERE size != '' ORDER BY size").fetchall()]
        brands = [r[0] for r in cur.execute("SELECT DISTINCT brand_name FROM data_brand_production WHERE brand_name != '' ORDER BY brand_name").fetchall()]
        glazes = [r[0] for r in cur.execute("SELECT DISTINCT glaze_type FROM data_brand_production WHERE glaze_type != '' ORDER BY glaze_type").fetchall()]
        conn.close()

        self.send_json_response({
            "months": months,
            "lines": lines,
            "sizes": sizes,
            "brands": brands,
            "glazes": glazes
        })

    def handle_dashboard(self, params):
        # Section 1 parameters (Sản lượng & Chất lượng)
        p1_month = params.get("p1_month", params.get("month", ["all"]))[0]
        p1_line = params.get("p1_line", params.get("line", ["all"]))[0]
        p1_size = params.get("p1_size", params.get("size", ["all"]))[0]
        p1_brand = params.get("p1_brand", params.get("brand", ["all"]))[0]

        # Section 2 parameters (Sản lượng Thương hiệu)
        p2_month = params.get("p2_month", params.get("month", ["all"]))[0]
        p2_line = params.get("p2_line", params.get("line", ["all"]))[0]
        p2_size = params.get("p2_size", params.get("size", ["all"]))[0]
        p2_brand = params.get("p2_brand", ["all"])[0]
        p2_glaze = params.get("p2_glaze", params.get("glaze", ["all"]))[0]

        # Section 3 parameters (Tiêu hao Vật tư)
        p3_month = params.get("p3_month", params.get("month", ["all"]))[0]
        p3_line = params.get("p3_line", params.get("line", ["all"]))[0]
        p3_size = params.get("p3_size", params.get("size", ["all"]))[0]

        # Section 4 parameters (Sử dụng Than)
        p4_month = params.get("p4_month", params.get("month", ["all"]))[0]
        p4_line = params.get("p4_line", params.get("line", ["all"]))[0]
        p4_size = params.get("p4_size", params.get("size", ["all"]))[0]

        conn = get_db()
        cur = conn.cursor()

        def parse_months_filter(month_val):
            if not month_val or str(month_val).lower() in ("all", "all_months", "tất cả", "t1-t9", "t1-t12"):
                return None
            s = str(month_val).strip()
            if "," in s:
                nums = [int(x.strip()) for x in s.split(",") if x.strip().isdigit()]
                return nums if nums else None
            elif "-" in s:
                parts = [int(x.strip()) for x in s.split("-") if x.strip().isdigit()]
                if len(parts) == 2:
                    if parts[0] > 100:  # e.g. 2026-08 (Year-Month)
                        return [parts[1]]
                    else:
                        return list(range(parts[0], parts[1] + 1))
            elif s.isdigit():
                return [int(s)]
            return None

        # =========================================================================
        # 1. SECTION 1: Summary & Quality (Using p1_* filters)
        # =========================================================================
        where_d1 = ["unit = 'm2'"]
        vals_d1 = []
        m_list_1 = parse_months_filter(p1_month)
        if m_list_1:
            where_d1.append(f"month IN ({','.join(['?']*len(m_list_1))})")
            vals_d1.extend(m_list_1)
        if p1_line != "all":
            where_d1.append("line = ?")
            vals_d1.append(p1_line)
        if p1_size != "all":
            where_d1.append("size = ?")
            vals_d1.append(p1_size)

        clause_d1 = ("WHERE " + " AND ".join(where_d1)) if where_d1 else ""
        q_prod = f"""
            SELECT data_type, 
                   COUNT(*) as row_count,
                   SUM(recovery_total) as total_m2, 
                   SUM(a1) as a1_m2, 
                   SUM(a) as a_m2, 
                   SUM(b) as b_m2, 
                   SUM(sl_ep) as press_m2, 
                   SUM(prod_days) as days, 
                   SUM(stop_time_total) as stop_tot, 
                   SUM(stop_time_2mf) as stop_2mf 
            FROM data_production_summary 
            {clause_d1} 
            GROUP BY data_type
        """
        prod_rows = {r["data_type"]: dict(r) for r in cur.execute(q_prod, vals_d1).fetchall()}
        
        actual = prod_rows.get("Thực hiện", {"row_count": 1, "total_m2": 0, "a1_m2": 0, "a_m2": 0, "b_m2": 0, "press_m2": 0, "days": 0, "stop_tot": 0, "stop_2mf": 0})
        plan = prod_rows.get("Kế hoạch", {"row_count": 1, "total_m2": 0, "a1_m2": 0, "a_m2": 0, "b_m2": 0, "press_m2": 0, "days": 0, "stop_tot": 0, "stop_2mf": 0})

        # Section 1 Dual Donut Metrics
        act_tot = actual["total_m2"]
        act_a1 = actual["a1_m2"]
        act_a = actual["a_m2"]
        act_b = actual["b_m2"]
        act_days = actual["days"]
        act_a1_pct = (act_a1 / act_tot * 100) if act_tot > 0 else 0
        act_a_pct = (act_a / act_tot * 100) if act_tot > 0 else 0
        act_b_pct = (act_b / act_tot * 100) if act_tot > 0 else 0
        act_avg_day = (act_tot / act_days) if act_days > 0 else 0
        act_stop_2mf = (actual["stop_2mf"] / actual["row_count"]) if actual["row_count"] > 0 else 0

        pln_tot = plan["total_m2"]
        pln_a1 = plan["a1_m2"]
        pln_a = plan["a_m2"]
        pln_b = plan["b_m2"]
        pln_days = plan["days"]
        pln_a1_pct = (pln_a1 / pln_tot * 100) if pln_tot > 0 else 0
        pln_a_pct = (pln_a / pln_tot * 100) if pln_tot > 0 else 0
        pln_b_pct = (pln_b / pln_tot * 100) if pln_tot > 0 else 0
        pln_avg_day = (pln_tot / pln_days) if pln_days > 0 else 0
        pln_stop_2mf = (plan["stop_2mf"] / plan["row_count"]) if plan["row_count"] > 0 else 0

        completion_rate = (act_tot / pln_tot * 100) if pln_tot > 0 else 0

        # Section 1 Monthly Trend Chart (Grouped Bar Chart)
        if p1_brand != "all":
            # If Section 1 selected a specific brand
            trend_spec_where = ["brand_name = ?"]
            trend_spec_vals = [p1_brand]
            if p1_line != "all":
                trend_spec_where.append("line = ?")
                trend_spec_vals.append(p1_line)
            if p1_size != "all":
                trend_spec_where.append("size = ?")
                trend_spec_vals.append(p1_size)
            trend_spec_clause = "WHERE " + " AND ".join(trend_spec_where)
            q_spec_trend = f"SELECT month, SUM(quantity_m2) as total_m2, SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2, SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2 FROM data_brand_production {trend_spec_clause} GROUP BY month ORDER BY month"
            
            monthly_map = {}
            for r in cur.execute(q_spec_trend, trend_spec_vals).fetchall():
                m = r["month"]
                monthly_map[m] = {
                    "month": f"{m}",
                    "month_num": m,
                    "plan": 0,
                    "actual": r["total_m2"],
                    "a1": r["a1_m2"],
                    "b": r["b_m2"]
                }
            monthly_trend = sorted(list(monthly_map.values()), key=lambda x: x["month_num"])
        else:
            trend_where = ["unit = 'm2'"]
            trend_vals = []
            if p1_line != "all":
                trend_where.append("line = ?")
                trend_vals.append(p1_line)
            if p1_size != "all":
                trend_where.append("size = ?")
                trend_vals.append(p1_size)
            trend_clause = ("WHERE " + " AND ".join(trend_where)) if trend_where else ""

            q_monthly = f"SELECT month, data_type, SUM(recovery_total) as total_m2, SUM(a1) as a1_m2, SUM(a) as a_m2, SUM(b) as b_m2 FROM data_production_summary {trend_clause} GROUP BY month, data_type ORDER BY month"
            monthly_map = {}
            for r in cur.execute(q_monthly, trend_vals).fetchall():
                m = r["month"]
                if m not in monthly_map:
                    monthly_map[m] = {"month": f"{m}", "month_num": m, "plan": 0, "actual": 0, "a1": 0, "a": 0, "b": 0}
                if r["data_type"] == "Kế hoạch":
                    monthly_map[m]["plan"] = r["total_m2"]
                else:
                    monthly_map[m]["actual"] = r["total_m2"]
                    monthly_map[m]["a1"] = r["a1_m2"]
                    monthly_map[m]["a"] = r["a_m2"]
                    monthly_map[m]["b"] = r["b_m2"]
            monthly_trend = sorted(list(monthly_map.values()), key=lambda x: x["month_num"])

        actual_data = {
            "total_m2": act_tot,
            "a1_m2": act_a1,
            "a_m2": act_a,
            "b_m2": act_b,
            "a1_pct": act_a1_pct,
            "a_pct": act_a_pct,
            "b_pct": act_b_pct,
            "days": act_days,
            "avg_per_day": act_avg_day,
            "stop_time_2mf": act_stop_2mf,
            "share_pct": 100.0
        }
        plan_data = {
            "total_m2": pln_tot,
            "a1_m2": pln_a1,
            "a_m2": pln_a,
            "b_m2": pln_b,
            "a1_pct": pln_a1_pct,
            "a_pct": pln_a_pct,
            "b_pct": pln_b_pct,
            "days": pln_days,
            "avg_per_day": pln_avg_day,
            "stop_time_2mf": pln_stop_2mf
        }

        # =========================================================================
        # 2. SECTION 2: Brand Distribution & Table (Using p2_* filters)
        # =========================================================================
        where_avail = []
        vals_avail = []
        m_list_2 = parse_months_filter(p2_month)
        if m_list_2:
            where_avail.append(f"month IN ({','.join(['?']*len(m_list_2))})")
            vals_avail.extend(m_list_2)
        if p2_line != "all":
            where_avail.append("line = ?")
            vals_avail.append(p2_line)
        if p2_size != "all":
            where_avail.append("size = ?")
            vals_avail.append(p2_size)
        if p2_glaze != "all":
            if p2_glaze.lower() in ("bóng", "bong", "glossy"):
                where_avail.append("(glaze_type LIKE '%Bóng%' OR glaze_type LIKE '%Phương Nam%' OR glaze_type LIKE '%Panson%')")
            elif p2_glaze.lower() in ("matt", "matl"):
                where_avail.append("glaze_type LIKE '%Matt%'")
            elif p2_glaze.lower() in ("sugar", "sân vườn", "san vuon"):
                where_avail.append("glaze_type LIKE '%Sugar%'")
            else:
                where_avail.append("glaze_type = ?")
                vals_avail.append(p2_glaze)
        clause_avail = ("WHERE " + " AND ".join(where_avail)) if where_avail else ""
        q_avail_brands = f"SELECT DISTINCT brand_name FROM data_brand_production {clause_avail} {'AND' if clause_avail else 'WHERE'} brand_name != '' ORDER BY brand_name"
        available_brands = [r[0] for r in cur.execute(q_avail_brands, vals_avail).fetchall()]

        where_d2 = []
        vals_d2 = []
        if m_list_2:
            where_d2.append(f"month IN ({','.join(['?']*len(m_list_2))})")
            vals_d2.extend(m_list_2)
        if p2_line != "all":
            where_d2.append("line = ?")
            vals_d2.append(p2_line)
        if p2_size != "all":
            where_d2.append("size = ?")
            vals_d2.append(p2_size)
        if p2_glaze != "all":
            if p2_glaze.lower() in ("bóng", "bong", "glossy"):
                where_d2.append("(glaze_type LIKE '%Bóng%' OR glaze_type LIKE '%Phương Nam%' OR glaze_type LIKE '%Panson%')")
            elif p2_glaze.lower() in ("matt", "matl"):
                where_d2.append("glaze_type LIKE '%Matt%'")
            elif p2_glaze.lower() in ("sugar", "sân vườn", "san vuon"):
                where_d2.append("glaze_type LIKE '%Sugar%'")
            else:
                where_d2.append("glaze_type = ?")
                vals_d2.append(p2_glaze)

        clause_d2 = ("WHERE " + " AND ".join(where_d2)) if where_d2 else ""
        q_brand = f"""
            SELECT brand_name, 
                   glaze_type,
                   SUM(quantity_m2) as total_m2, 
                   SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2, 
                   SUM(CASE WHEN grade = 'A' THEN quantity_m2 ELSE 0 END) as a_m2, 
                   SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2,
                   GROUP_CONCAT(DISTINCT line) as lines,
                   GROUP_CONCAT(DISTINCT size) as sizes,
                   glaze_type as glazes
            FROM data_brand_production 
            {clause_d2} 
            GROUP BY brand_name, size, glaze_type 
            ORDER BY total_m2 DESC
        """
        all_brand_rows = [dict(r) for r in cur.execute(q_brand, vals_d2).fetchall()]
        grand_total_brand_m2 = sum(r["total_m2"] for r in all_brand_rows)

        brand_table = []
        for r in all_brand_rows:
            tot = r["total_m2"]
            a1 = r["a1_m2"]
            a = r["a_m2"]
            b = r["b_m2"]
            a1_p = (a1 / tot * 100) if tot > 0 else 0
            a_p = (a / tot * 100) if tot > 0 else 0
            b_p = (b / tot * 100) if tot > 0 else 0
            share_p = (tot / grand_total_brand_m2 * 100) if grand_total_brand_m2 > 0 else 0
            brand_table.append({
                "brand_name": r["brand_name"],
                "total_m2": tot,
                "a1_m2": a1,
                "a_m2": a,
                "b_m2": b,
                "a1_pct": a1_p,
                "a_pct": a_p,
                "b_pct": b_p,
                "share_pct": share_p,
                "lines": r.get("lines") or "",
                "sizes": r.get("sizes") or "",
                "glazes": r.get("glazes") or ""
            })

        if p2_brand != "all":
            # Breakdown by glaze or size for this single brand
            where_spec = ["brand_name = ?"]
            vals_spec = [p2_brand]
            if m_list_2:
                where_spec.append(f"month IN ({','.join(['?']*len(m_list_2))})")
                vals_spec.extend(m_list_2)
            if p2_line != "all":
                where_spec.append("line = ?")
                vals_spec.append(p2_line)
            if p2_size != "all":
                where_spec.append("size = ?")
                vals_spec.append(p2_size)
            clause_spec = "WHERE " + " AND ".join(where_spec)
            
            q_brand_dist = f"SELECT glaze_type as brand_name, SUM(quantity_m2) as total_m2 FROM data_brand_production {clause_spec} GROUP BY glaze_type ORDER BY total_m2 DESC"
            brand_dist_rows = [dict(r) for r in cur.execute(q_brand_dist, vals_spec).fetchall()]
            if not brand_dist_rows or (len(brand_dist_rows) == 1 and not brand_dist_rows[0]["brand_name"]):
                q_brand_dist = f"SELECT size as brand_name, SUM(quantity_m2) as total_m2 FROM data_brand_production {clause_spec} GROUP BY size ORDER BY total_m2 DESC"
                brand_dist_rows = [dict(r) for r in cur.execute(q_brand_dist, vals_spec).fetchall()]
        else:
            brand_dist_rows = all_brand_rows[:10]

        # =========================================================================
        # 3. SECTION 3: Materials Consumption (Using p3_* filters)
        # =========================================================================
        where_d3 = []
        vals_d3 = []
        m_list_3 = parse_months_filter(p3_month)
        if m_list_3:
            where_d3.append(f"month IN ({','.join(['?']*len(m_list_3))})")
            vals_d3.extend(m_list_3)
        if p3_line != "all":
            where_d3.append("line = ?")
            vals_d3.append(p3_line)
        if p3_size != "all":
            where_d3.append("size = ?")
            vals_d3.append(p3_size)
        clause_d3 = ("WHERE " + " AND ".join(where_d3)) if where_d3 else ""

        q_mat_list = f"""
            SELECT id, stt, month, line, size, material_name, unit, norm_value, 
                   used_qty, prod_qty, actual_rate, reduced_qty, over_qty, diff_qty, status_text
            FROM data_material_consumption 
            {clause_d3}
            ORDER BY id ASC
        """
        raw_mat_rows = [dict(r) for r in cur.execute(q_mat_list, vals_d3).fetchall()]

        total_mat_used_kg = sum(r["used_qty"] for r in raw_mat_rows if r["unit"] == "Kg")
        total_mat_reduced_kg = sum(r["reduced_qty"] for r in raw_mat_rows)
        total_mat_over_kg = sum(r["over_qty"] for r in raw_mat_rows)
        
        total_xuong_kg = sum(r["used_qty"] for r in raw_mat_rows if "xương" in r["material_name"].lower())
        total_men_kg = sum(r["used_qty"] for r in raw_mat_rows if "men" in r["material_name"].lower())
        total_vo_dieu_kg = sum(r["used_qty"] for r in raw_mat_rows if "điều" in r["material_name"].lower())

        q_mat_chart = f"""
            SELECT material_name, line, size, unit,
                   AVG(norm_value) as norm_val,
                   SUM(used_qty) as total_used,
                   SUM(prod_qty) as total_prod,
                   SUM(reduced_qty) as total_reduced,
                   SUM(over_qty) as total_over,
                   SUM(diff_qty) as total_diff
            FROM data_material_consumption
            {clause_d3}
            GROUP BY material_name, line, size, unit
            ORDER BY total_used DESC
        """
        chart_mat_rows = []
        for r in cur.execute(q_mat_chart, vals_d3).fetchall():
            d = dict(r)
            p_m2 = d["total_prod"]
            act_r = (d["total_used"] / p_m2) if p_m2 > 0 else 0
            chart_mat_rows.append({
                "material_name": d["material_name"],
                "line": d.get("line") or "",
                "size": d.get("size") or "",
                "unit": d["unit"],
                "norm_value": round(d["norm_val"] or 0, 4),
                "actual_rate": round(act_r, 4),
                "total_used": round(d["total_used"] or 0, 2),
                "prod_qty": round(p_m2 or 0, 2),
                "total_reduced": round(d["total_reduced"] or 0, 2),
                "total_over": round(d["total_over"] or 0, 2),
                "diff_qty": round((d.get("total_diff") or (d["total_used"] - (d["norm_val"] or 0) * p_m2)), 2)
            })

        # =========================================================================
        # 4. SECTION 4: Coal Consumption (Using p4_* filters)
        # =========================================================================
        where_d4 = []
        vals_d4 = []
        m_list_4 = parse_months_filter(p4_month)
        if m_list_4:
            where_d4.append(f"month IN ({','.join(['?']*len(m_list_4))})")
            vals_d4.extend(m_list_4)
        if p4_line != "all":
            where_d4.append("line = ?")
            vals_d4.append(p4_line)
        if p4_size != "all":
            where_d4.append("size = ?")
            vals_d4.append(p4_size)
        clause_d4 = ("WHERE " + " AND ".join(where_d4)) if where_d4 else ""

        q_coal_list = f"""
            SELECT id, stt, month, line, size, coal_supplier, warehouse, import_date, 
                   firing_type, heat_value, ash_rate, std_ash_rate, stone_rate,
                   issued_weight, ash_weight, ash_export_rate, compensation_weight, excess_ash_weight,
                   total_used_weight, production_m2, rate_lump, rate_with_ash, rate_total, note
            FROM data_coal_consumption
            {clause_d4}
            ORDER BY id ASC
        """
        raw_coal_rows = [dict(r) for r in cur.execute(q_coal_list, vals_d4).fetchall()]

        total_coal_issued = sum(r["issued_weight"] or 0 for r in raw_coal_rows)
        total_coal_used = sum(r["total_used_weight"] or 0 for r in raw_coal_rows)
        total_coal_prod_m2 = sum(r["production_m2"] or 0 for r in raw_coal_rows)
        total_coal_ash = sum(r["ash_weight"] or 0 for r in raw_coal_rows)
        
        avg_coal_rate = (total_coal_used / total_coal_prod_m2) if total_coal_prod_m2 > 0 else 0
        
        valid_heats = [r["heat_value"] for r in raw_coal_rows if r["heat_value"] and r["heat_value"] > 0]
        avg_coal_heat = (sum(valid_heats) / len(valid_heats)) if valid_heats else 0

        valid_ashes = [r["ash_rate"] for r in raw_coal_rows if r["ash_rate"] is not None and r["ash_rate"] > 0]
        avg_coal_ash = (sum(valid_ashes) / len(valid_ashes)) if valid_ashes else 0

        where_coal_trend = []
        vals_coal_trend = []
        if p4_line != "all":
            where_coal_trend.append("line = ?")
            vals_coal_trend.append(p4_line)
        if p4_size != "all":
            where_coal_trend.append("size = ?")
            vals_coal_trend.append(p4_size)
        clause_coal_trend = ("WHERE " + " AND ".join(where_coal_trend)) if where_coal_trend else ""

        q_coal_trend = f"""
            SELECT month, 
                   SUM(total_used_weight) as used_kg, 
                   SUM(production_m2) as prod_m2,
                   AVG(heat_value) as heat_val,
                   AVG(ash_rate) as ash_pct
            FROM data_coal_consumption
            {clause_coal_trend}
            GROUP BY month
            ORDER BY month
        """
        coal_monthly_trend = []
        for r in cur.execute(q_coal_trend, vals_coal_trend).fetchall():
            m_used = r["used_kg"] or 0
            m_prod = r["prod_m2"] or 0
            m_rate = (m_used / m_prod) if m_prod > 0 else 0
            coal_monthly_trend.append({
                "month": f"{r['month']}",
                "month_num": r["month"],
                "used_ton": round(m_used / 1000, 1),
                "prod_m2": round(m_prod, 0),
                "rate_kg_m2": round(m_rate, 2),
                "heat_val": round(r["heat_val"] or 0, 0),
                "ash_pct": round(r["ash_pct"] or 0, 1)
            })

        conn.close()

        self.send_json_response({
            "is_brand_selected": (p1_brand != "all"),
            "selected_brand_name": p1_brand,
            "completion_rate": completion_rate,
            "actual": actual_data,
            "plan": plan_data,
            "monthly_trend": monthly_trend,
            "brand_distribution": brand_dist_rows,
            "available_brands": available_brands,
            "brand_table": brand_table,
            "materials_section": {
                "total_used_kg": total_mat_used_kg,
                "total_reduced_kg": total_mat_reduced_kg,
                "total_over_kg": total_mat_over_kg,
                "total_xuong_kg": total_xuong_kg,
                "total_men_kg": total_men_kg,
                "total_vo_dieu_kg": total_vo_dieu_kg,
                "materials_list": raw_mat_rows,
                "materials_chart": chart_mat_rows
            },
            "coal_section": {
                "total_coal_issued_kg": total_coal_issued,
                "total_coal_used_kg": total_coal_used,
                "total_coal_prod_m2": total_coal_prod_m2,
                "total_coal_ash_kg": total_coal_ash,
                "avg_coal_rate": avg_coal_rate,
                "avg_coal_heat": avg_coal_heat,
                "avg_coal_ash": avg_coal_ash,
                "coal_list": raw_coal_rows,
                "coal_monthly_trend": coal_monthly_trend
            }
        })

    def handle_get_summary(self, params):
        conn = get_db()
        cur = conn.cursor()
        month = params.get("month", [None])[0]
        line = params.get("line", [None])[0]
        size = params.get("size", [None])[0]
        unit = params.get("unit", ["m2"])[0]

        where = []
        vals = []
        if unit and unit != "all":
            where.append("unit = ?")
            vals.append(unit)
        m_int = parse_month_int(month)
        if m_int is not None:
            where.append("month = ?")
            vals.append(m_int)
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)

        q = "SELECT * FROM data_production_summary"
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY month, line, id"
        rows = [dict(r) for r in cur.execute(q, vals).fetchall()]
        conn.close()

        self.send_json_response({"data": rows, "count": len(rows)})

    def handle_get_brands(self, params):
        conn = get_db()
        cur = conn.cursor()
        month = params.get("month", [None])[0]
        line = params.get("line", [None])[0]
        size = params.get("size", [None])[0]
        glaze = params.get("glaze", [None])[0]

        where = []
        vals = []
        m_int = parse_month_int(month)
        if m_int is not None:
            where.append("month = ?")
            vals.append(m_int)
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)
        if glaze and glaze != "all":
            if glaze.lower() in ("bóng", "bong", "glossy"):
                where.append("(glaze_type LIKE '%Bóng%' OR glaze_type LIKE '%Phương Nam%' OR glaze_type LIKE '%Panson%')")
            elif glaze.lower() in ("matt", "matl"):
                where.append("glaze_type LIKE '%Matt%'")
            elif glaze.lower() in ("sugar", "sân vườn", "san vuon"):
                where.append("glaze_type LIKE '%Sugar%'")
            else:
                where.append("glaze_type = ?")
                vals.append(glaze)

        q = "SELECT * FROM data_brand_production"
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY month, line, id"
        rows = [dict(r) for r in cur.execute(q, vals).fetchall()]

        # Compute Total Summary (A1, A, B, Grand Total)
        sum_a1 = sum(r["quantity_m2"] for r in rows if r["grade"] == "A1")
        sum_a = sum(r["quantity_m2"] for r in rows if r["grade"] == "A")
        sum_b = sum(r["quantity_m2"] for r in rows if r["grade"] == "B")
        grand_total = sum(r["quantity_m2"] for r in rows)

        conn.close()

        self.send_json_response({
            "data": rows,
            "count": len(rows),
            "summary_totals": {
                "sum_a1": sum_a1,
                "sum_a": sum_a,
                "sum_b": sum_b,
                "grand_total": grand_total
            }
        })

    def handle_get_materials(self, params):
        conn = get_db()
        cur = conn.cursor()
        month = params.get("month", [None])[0]
        line = params.get("line", [None])[0]
        size = params.get("size", [None])[0]
        glaze = params.get("glaze", [None])[0]

        where = []
        vals = []
        m_int = parse_month_int(month)
        if m_int is not None:
            where.append("month = ?")
            vals.append(m_int)
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)
        if glaze and glaze != "all":
            if glaze.lower() in ("bóng", "bong", "glossy"):
                where.append("(glaze_type LIKE '%Bóng%' OR glaze_type LIKE '%Phương Nam%' OR glaze_type LIKE '%Panson%')")
            elif glaze.lower() in ("matt", "matl"):
                where.append("glaze_type LIKE '%Matt%'")
            elif glaze.lower() in ("sugar", "sân vườn", "san vuon"):
                where.append("glaze_type LIKE '%Sugar%'")
            else:
                where.append("glaze_type = ?")
                vals.append(glaze)

        q = "SELECT * FROM data_material_consumption"
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY month, line, id"
        rows = [dict(r) for r in cur.execute(q, vals).fetchall()]
        conn.close()

        self.send_json_response({"data": rows, "count": len(rows)})

    def handle_get_coal(self, params):
        conn = get_db()
        cur = conn.cursor()
        month = params.get("month", [None])[0]
        line = params.get("line", [None])[0]
        size = params.get("size", [None])[0]
        firing_type = params.get("firing_type", [None])[0]

        where = []
        vals = []
        m_int = parse_month_int(month)
        if m_int is not None:
            where.append("month = ?")
            vals.append(m_int)
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)
        if firing_type and firing_type != "all":
            where.append("firing_type = ?")
            vals.append(firing_type)

        q = "SELECT * FROM data_coal_consumption"
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY month, line, id"
        rows = [dict(r) for r in cur.execute(q, vals).fetchall()]

        # Compute Groups (Firing vs Drying vs All)
        firing_rows = [r for r in rows if "Không" not in (r["firing_type"] or "")]
        drying_rows = [r for r in rows if "Không" in (r["firing_type"] or "")]

        def calc_group_summary(group_rows):
            issued = sum(r["issued_weight"] or 0 for r in group_rows)
            ash = sum(r["ash_weight"] or 0 for r in group_rows)
            comp = sum(r["compensation_weight"] or 0 for r in group_rows)
            excess_ash = sum(r["excess_ash_weight"] or 0 for r in group_rows)
            total_used = sum(r["total_used_weight"] or ((r["issued_weight"] or 0) + (r["ash_weight"] or 0) + (r["compensation_weight"] or 0) - (r["excess_ash_weight"] or 0)) for r in group_rows)
            prod_m2 = sum(r["production_m2"] or 0 for r in group_rows)
            
            ash_pct = (ash / (issued + ash) * 100) if (issued + ash) > 0 else 0
            rate_lump = (issued / prod_m2) if prod_m2 > 0 else 0
            rate_with_ash = ((issued + ash - excess_ash) / prod_m2) if prod_m2 > 0 else 0
            rate_total = (total_used / prod_m2) if prod_m2 > 0 else 0
            
            return {
                "issued_weight": issued,
                "ash_weight": ash,
                "ash_rate_avg": ash_pct,
                "compensation_weight": comp,
                "excess_ash_weight": excess_ash,
                "total_used_weight": total_used,
                "production_m2": prod_m2,
                "rate_lump": rate_lump,
                "rate_with_ash": rate_with_ash,
                "rate_total": rate_total
            }

        summary_firing = calc_group_summary(firing_rows)
        summary_drying = calc_group_summary(drying_rows)
        summary_all = calc_group_summary(rows)

        conn.close()

        self.send_json_response({
            "data": rows,
            "count": len(rows),
            "summary": {
                "firing": summary_firing,
                "drying": summary_drying,
                "all": summary_all
            }
        })

    def handle_get_norm_versions(self, params=None):
        params = params or {}
        line_filter = params.get("line", ["all"])[0]
        size_filter = params.get("size", ["all"])[0]

        conn = get_db()
        cur = conn.cursor()
        
        # Query all versions
        v_rows = [dict(r) for r in cur.execute("""
            SELECT v.*, 
                   COUNT(d.id) as item_count,
                   GROUP_CONCAT(DISTINCT d.line) as lines_covered,
                   GROUP_CONCAT(DISTINCT d.size) as sizes_covered
            FROM master_norms_version v 
            LEFT JOIN master_norms_detail d ON v.id = d.version_id 
            GROUP BY v.id 
            ORDER BY v.effective_from_year DESC, v.effective_from_month DESC, v.id DESC
        """).fetchall()]

        # Filter and augment matching item counts
        result = []
        for r in v_rows:
            v_id = r["id"]
            where_sub = ["version_id = ?"]
            vals_sub = [v_id]
            if line_filter != "all":
                where_sub.append("line = ?")
                vals_sub.append(line_filter)
            if size_filter != "all":
                where_sub.append("size = ?")
                vals_sub.append(size_filter)
            
            sub_count = cur.execute(f"SELECT COUNT(*) FROM master_norms_detail WHERE {' AND '.join(where_sub)}", vals_sub).fetchone()[0]
            r["filtered_item_count"] = sub_count
            
            if line_filter != "all" or size_filter != "all":
                if sub_count > 0 or (r.get("line") in (line_filter, "all") and r.get("size") in (size_filter, "all")):
                    result.append(r)
            else:
                result.append(r)

        conn.close()
        self.send_json_response({"data": result})

    def handle_get_norm_details(self, params):
        version_id = params.get("version_id", [None])[0]
        line_filter = params.get("line", ["all"])[0]
        size_filter = params.get("size", ["all"])[0]

        if not version_id:
            self.send_json_response({"error": "version_id required"}, status=400)
            return
        conn = get_db()
        cur = conn.cursor()
        v_info = dict(cur.execute("SELECT * FROM master_norms_version WHERE id = ?", (version_id,)).fetchone() or {})
        
        where = ["version_id = ?"]
        vals = [version_id]
        if line_filter != "all":
            where.append("line = ?")
            vals.append(line_filter)
        if size_filter != "all":
            where.append("size = ?")
            vals.append(size_filter)

        rows = [dict(r) for r in cur.execute(f"SELECT * FROM master_norms_detail WHERE {' AND '.join(where)} ORDER BY line, size, material_name", vals).fetchall()]
        conn.close()
        self.send_json_response({"version": v_info, "details": rows})

    def handle_create_norm_version(self, body):
        code = body.get("version_code")
        name = body.get("version_name")
        from_m = int(body.get("effective_from_month", 1))
        from_y = int(body.get("effective_from_year", 2026))
        desc = body.get("description", "")
        line = body.get("line", "all")
        size = body.get("size", "all")
        copy_from_id = body.get("copy_from_version_id")
        items = body.get("items", [])

        if not code or not name:
            self.send_json_response({"error": "Mã và Tên phiên bản là bắt buộc"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO master_norms_version 
                (version_code, version_name, effective_from_month, effective_from_year, description, is_active, line, size) 
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """, (code, name, from_m, from_y, desc, line, size))
            new_v_id = cur.lastrowid

            if items and len(items) > 0:
                for item in items:
                    m_name = item.get("material_name", "").strip()
                    m_line = item.get("line", line)
                    m_size = item.get("size", size)
                    m_unit = item.get("unit", "Kg")
                    m_val = float(item.get("norm_value", 0))
                    if m_name:
                        cur.execute("""
                            INSERT INTO master_norms_detail (version_id, material_name, line, size, unit, norm_value)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (new_v_id, m_name, m_line, m_size, m_unit, m_val))
            elif copy_from_id:
                if line != "all" or size != "all":
                    where_cp = ["version_id = ?"]
                    vals_cp = [new_v_id, copy_from_id]
                    if line != "all":
                        where_cp.append("line = ?")
                        vals_cp.append(line)
                    if size != "all":
                        where_cp.append("size = ?")
                        vals_cp.append(size)
                    q = f"INSERT INTO master_norms_detail (version_id, material_name, line, size, unit, norm_value) SELECT ?, material_name, line, size, unit, norm_value FROM master_norms_detail WHERE {' AND '.join(where_cp)}"
                    cur.execute(q, vals_cp)
                else:
                    cur.execute("INSERT INTO master_norms_detail (version_id, material_name, line, size, unit, norm_value) SELECT ?, material_name, line, size, unit, norm_value FROM master_norms_detail WHERE version_id = ?", (new_v_id, copy_from_id))

            conn.commit()
            conn.close()
            self.send_json_response({"success": True, "version_id": new_v_id, "message": "Đã tạo phiên bản định mức mới thành công"})
        except sqlite3.IntegrityError:
            conn.close()
            self.send_json_response({"error": f"Mã phiên bản '{code}' đã tồn tại!"}, status=400)

    def handle_save_norm_details(self, body):
        version_id = body.get("version_id")
        items = body.get("items", [])
        if not version_id:
            self.send_json_response({"error": "version_id required"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        for item in items:
            item_id = item.get("id")
            norm_val = float(item.get("norm_value", 0))
            if item_id:
                cur.execute("UPDATE master_norms_detail SET norm_value = ? WHERE id = ? AND version_id = ?", (norm_val, item_id, version_id))
        conn.commit()
        conn.close()
        self.send_json_response({"success": True, "message": "Đã cập nhật định mức thành công"})

    def handle_add_norm_item(self, body):
        version_id = body.get("version_id")
        name = body.get("material_name", "").strip()
        line = body.get("line", "DC1")
        size = body.get("size", "30x60")
        unit = body.get("unit", "Kg")
        val = float(body.get("norm_value", 0))

        if not version_id or not name:
            self.send_json_response({"error": "Thiếu version_id hoặc Tên vật tư"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO master_norms_detail (version_id, material_name, line, size, unit, norm_value)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (version_id, name, line, size, unit, val))
        conn.commit()
        conn.close()
        self.send_json_response({"success": True, "message": "Đã thêm chỉ tiêu định mức thành công"})


    def handle_import_monthly_multipart(self, post_data, content_type):
        boundary = content_type.split("boundary=")[1].encode("utf-8")
        parts = post_data.split(b"--" + boundary)
        
        uploaded_files = {}
        target_month = 8
        target_year = 2026

        for part in parts:
            if b"Content-Disposition" in part and b"filename=" in part:
                headers_part, file_content = part.split(b"\r\n\r\n", 1)
                file_content = file_content.rstrip(b"\r\n")
                
                filename = ""
                fieldname = ""
                for line in headers_part.decode("utf-8", errors="ignore").split("\r\n"):
                    if "filename=" in line:
                        filename = line.split('filename="')[1].split('"')[0]
                    if "name=" in line:
                        fieldname = line.split('name="')[1].split('"')[0]
                
                if filename and file_content:
                    uploaded_files[fieldname] = {"filename": filename, "bytes": file_content}
            elif b'name="month"' in part:
                _, val = part.split(b"\r\n\r\n", 1)
                try:
                    target_month = int(val.decode("utf-8").strip())
                except:
                    pass

        conn = get_db()
        from monthly_importer import import_monthly_data
        
        f_dc1 = uploaded_files.get("file_dc1", {}).get("bytes")
        f_dc2 = uploaded_files.get("file_dc2", {}).get("bytes")
        f_coal = uploaded_files.get("file_coal", {}).get("bytes")
        
        logs = import_monthly_data(
            conn=conn,
            month=target_month,
            year=target_year,
            file_dc1_bytes=f_dc1,
            file_dc2_bytes=f_dc2,
            file_coal_bytes=f_coal
        )
        conn.close()

        self.send_json_response({
            "success": True,
            "message": f"Đã phân tích, bóc tách và lưu thành công toàn bộ dữ liệu Tháng {target_month}/{target_year} vào hệ thống!",
            "logs": logs
        })

    def handle_get_form_mau(self, params):
        period_type = params.get("period_type", ["month"])[0]
        period_value = params.get("period_value", ["8"])[0]
        year = int(params.get("year", [2026])[0])

        conn = get_db()
        data = build_form_mau_payload(conn, period_type=period_type, period_value=period_value, year=year)
        conn.close()
        self.send_json_response(data)

    def handle_save_form_mau_custom(self, body):
        conn = get_db()
        res = save_form_mau_custom_data(conn, body)
        conn.close()
        self.send_json_response(res)

    def handle_import_form_mau_multipart(self, post_data, content_type):
        boundary = content_type.split("boundary=")[1].encode("utf-8")
        parts = post_data.split(b"--" + boundary)
        
        target_file_bytes = None
        period_type = "month"
        period_value = "8"
        year = 2026

        for part in parts:
            if b"Content-Disposition" in part and b"filename=" in part:
                _, file_content = part.split(b"\r\n\r\n", 1)
                target_file_bytes = file_content.rstrip(b"\r\n")
            elif b'name="period_type"' in part:
                _, val = part.split(b"\r\n\r\n", 1)
                period_type = val.decode("utf-8").strip()
            elif b'name="period_value"' in part:
                _, val = part.split(b"\r\n\r\n", 1)
                period_value = val.decode("utf-8").strip()
            elif b'name="year"' in part:
                _, val = part.split(b"\r\n\r\n", 1)
                try: year = int(val.decode("utf-8").strip())
                except: pass

        if not target_file_bytes:
            self.send_json_response({"error": "Không tìm thấy file tải lên"}, status=400)
            return

        parsed = parse_form_mau_excel_upload(target_file_bytes)
        
        # Save parsed data to DB for this period
        conn = get_db()
        body_to_save = {
            "period_type": period_type,
            "period_value": period_value,
            "year": year,
            "hr_data": parsed.get("hr_data"),
            "notes_data": {"hr_notes": parsed.get("hr_notes")},
            "goals_data": {"department_tasks": parsed.get("department_tasks")}
        }
        if parsed.get("evaluation_text"):
            body_to_save["evaluation_data"] = parsed.get("evaluation_text")
            
        save_form_mau_custom_data(conn, body_to_save)
        conn.close()

        self.send_json_response({
            "success": True,
            "message": f"Đã trích xuất và cập nhật thành công Form Mẫu cho kỳ {period_value}/{year}",
            "logs": parsed.get("logs", [])
        })

    def handle_export_sign_off_report(self, params):
        period_type = params.get("period_type", ["month"])[0]
        period_value = params.get("period_value", [params.get("month", ["8"])[0]])[0]
        year = int(params.get("year", [2026])[0])
        p_info = resolve_period(period_type, period_value, year)

        wb_orig = openpyxl.load_workbook(ORIGINAL_EXCEL_PATH, data_only=False)
        wb_out = openpyxl.Workbook()
        ws_out = wb_out.active
        ws_out.title = f"Báo cáo Form Mẫu"

        ws_template = wb_orig["Form mẫu"]
        for row in ws_template.iter_rows(values_only=False):
            for cell in row:
                c_new = ws_out.cell(row=cell.row, column=cell.column, value=cell.value)
                if cell.has_style:
                    c_new.font = Font(name=cell.font.name, size=cell.font.size, bold=cell.font.bold, italic=cell.font.italic, color=cell.font.color)
                    c_new.alignment = Alignment(horizontal=cell.alignment.horizontal, vertical=cell.alignment.vertical, wrap_text=cell.alignment.wrap_text)

        out_stream = io.BytesIO()
        wb_out.save(out_stream)
        out_stream.seek(0)
        file_bytes = out_stream.getvalue()

        clean_filename = f"Bao_Cao_Tong_Hop_KQSX_2DC_{p_info['period_key']}.xlsx"
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="{clean_filename}"')
        self.send_header("Content-Length", str(len(file_bytes)))
        self.end_headers()
        self.wfile.write(file_bytes)

    def handle_export_dashboard_excel(self, params):
        month = params.get("month", [params.get("p1_month", ["all"])[0]])[0]
        line = params.get("line", [params.get("p1_line", ["all"])[0]])[0]
        size = params.get("size", [params.get("p1_size", ["all"])[0]])[0]
        brand = params.get("brand", [params.get("p1_brand", ["all"])[0]])[0]
        year = int(params.get("year", [2026])[0])

        conn = get_db()
        file_bytes = generate_dashboard_excel_report(conn, month=month, line=line, size=size, brand=brand, year=year)
        conn.close()

        if month == "all":
            month_label = "T1_T9"
        elif "," in str(month):
            parts = [x.strip() for x in str(month).split(",") if x.strip().isdigit()]
            month_label = f"T{int(parts[0]):02d}_T{int(parts[-1]):02d}" if parts else "TongHop"
        elif "-" in str(month):
            parts = [x.strip() for x in str(month).split("-") if x.strip().isdigit()]
            month_label = f"T{int(parts[0]):02d}_T{int(parts[-1]):02d}" if parts else "TongHop"
        elif str(month).isdigit():
            month_label = f"Thang_{int(month):02d}"
        else:
            month_label = "TongHop"
        clean_filename = f"Bao_Cao_Tong_Hop_KQSX_2DC_{month_label}_{year}.xlsx"
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="{clean_filename}"')
        self.send_header("Content-Length", str(len(file_bytes)))
        self.end_headers()
        self.wfile.write(file_bytes)

    def handle_get_access_requests(self):
        conn = get_db()
        cur = conn.cursor()
        rows = [dict(r) for r in cur.execute("SELECT * FROM auth_access_requests ORDER BY id DESC").fetchall()]
        conn.close()
        self.send_json_response({"requests": rows, "count": len(rows)})

    def handle_check_access_status(self, params):
        device_id = params.get("device_id", [None])[0]
        email = params.get("email", [None])[0]
        conn = get_db()
        cur = conn.cursor()
        if email:
            r = cur.execute("SELECT * FROM auth_access_requests WHERE email = ? ORDER BY id DESC LIMIT 1", (email,)).fetchone()
        elif device_id:
            r = cur.execute("SELECT * FROM auth_access_requests WHERE device_id = ? ORDER BY id DESC LIMIT 1", (device_id,)).fetchone()
        else:
            r = None
        conn.close()
        if r:
            self.send_json_response({"found": True, "request": dict(r)})
        else:
            self.send_json_response({"found": False, "request": None})

    def handle_create_access_request(self, body):
        email = (body.get("email") or "").strip().lower()
        full_name = (body.get("full_name") or "").strip()
        department = (body.get("department") or "").strip()
        device_id = (body.get("device_id") or "").strip()
        if not email or not device_id:
            self.send_json_response({"error": "Vui lòng nhập Email và mã thiết bị"}, status=400)
            return

        pin = str(random.randint(100000, 999999))
        conn = get_db()
        cur = conn.cursor()
        
        existing = cur.execute("SELECT id, status, activation_pin FROM auth_access_requests WHERE email = ? OR device_id = ? ORDER BY id DESC LIMIT 1", (email, device_id)).fetchone()
        if existing:
            rec_id = existing["id"]
            cur.execute("""
                UPDATE auth_access_requests 
                SET email = ?, full_name = ?, department = ?, device_id = ?, activation_pin = ?, status = 'pending'
                WHERE id = ?
            """, (email, full_name, department, device_id, pin, rec_id))
        else:
            cur.execute("""
                INSERT INTO auth_access_requests (email, full_name, department, device_id, activation_pin, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            """, (email, full_name, department, device_id, pin))
            rec_id = cur.lastrowid
        conn.commit()
        conn.close()

        self.send_json_response({
            "success": True,
            "message": "Yêu cầu cấp quyền đã được gửi thành công đến Quản trị viên.",
            "pin": pin,
            "request_id": rec_id,
            "email": email
        })

    def handle_approve_access_request(self, body):
        req_id = body.get("id")
        action_type = body.get("action_type")
        conn = get_db()
        cur = conn.cursor()
        
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if action_type == "25h":
            exp_str = (datetime.datetime.now() + datetime.timedelta(hours=25)).strftime("%Y-%m-%d %H:%M:%S")
            cur.execute("UPDATE auth_access_requests SET status = 'approved_25h', granted_at = ?, expires_at = ? WHERE id = ?", (now_str, exp_str, req_id))
        elif action_type == "permanent":
            cur.execute("UPDATE auth_access_requests SET status = 'approved_permanent', granted_at = ?, expires_at = 'UNLIMITED' WHERE id = ?", (now_str, req_id))
        elif action_type == "pin_gen":
            new_pin = str(random.randint(100000, 999999))
            cur.execute("UPDATE auth_access_requests SET activation_pin = ? WHERE id = ?", (new_pin, req_id))
        elif action_type == "reject":
            cur.execute("UPDATE auth_access_requests SET status = 'rejected' WHERE id = ?", (req_id,))
        
        conn.commit()
        updated_row = cur.execute("SELECT * FROM auth_access_requests WHERE id = ?", (req_id,)).fetchone()
        conn.close()

        self.log_audit("APPROVE_ACCESS", "auth_access_requests", str(req_id), f"Action: {action_type}")

        self.send_json_response({
            "success": True,
            "message": f"Đã thực hiện thành công thao tác [{action_type}]",
            "request": dict(updated_row) if updated_row else None
        })

    def handle_verify_pin_access(self, body):
        pin = (body.get("pin") or "").strip()
        device_id = (body.get("device_id") or "").strip()
        email = (body.get("email") or "").strip().lower()

        # Secure verification: check environment master secret if configured
        admin_master_pin = os.environ.get("ADMIN_MASTER_PIN", "").strip()
        if admin_master_pin and pin == admin_master_pin:
            self.log_audit("AUTH_MASTER_PIN", "auth_access", "MASTER", email)
            self.send_json_response({
                "success": True,
                "grant_type": "permanent",
                "message": "Kích hoạt quyền truy cập thành công bằng Mã Chủ (Master Key)!",
                "user": {
                    "username": email or "admin_system",
                    "displayName": "Quản Trị Hệ Thống (Master Key)",
                    "role": "admin",
                    "roleTitle": "Quản Trị Toàn Quyền"
                }
            })
            return

        conn = get_db()
        cur = conn.cursor()
        query = "SELECT * FROM auth_access_requests WHERE (activation_pin = ? OR (email = ? AND status LIKE 'approved%')) ORDER BY id DESC LIMIT 1"
        row = cur.execute(query, (pin, email)).fetchone()
        conn.close()

        if not row:
            self.send_json_response({"success": False, "error": "Mã PIN hoặc Email không hợp lệ hoặc chưa được Admin phê duyệt."}, status=400)
            return

        r = dict(row)
        grant = "permanent" if r["status"] == "approved_permanent" else "25h"
        self.log_audit("AUTH_PIN_VERIFY", "auth_access_requests", str(r.get("id")), f"Status: {r.get('status')}")
        self.send_json_response({
            "success": True,
            "grant_type": grant,
            "request": r,
            "message": f"Xác nhận thành công! Đã cấp quyền truy cập [{grant}]."
        })

    def handle_supabase_sync(self, body):
        direction = body.get("direction", "push")
        if direction == "pull":
            success, result = supabase_sync.sync_supabase_to_sqlite()
        else:
            success, result = supabase_sync.sync_sqlite_to_supabase()
        
        self.log_audit("SUPABASE_SYNC", f"Direction: {direction}", "ALL", f"Success: {success}")
        self.send_json_response({"success": success, "result": result})

    def handle_supabase_config(self, body):
        success, message = supabase_sync.save_supabase_config(body)
        self.log_audit("SUPABASE_CONFIG", "supabase_config.json", "CONFIG", message)
        self.send_json_response({"success": success, "message": message})

    def handle_get_audit_logs(self):
        conn = get_db()
        cur = conn.cursor()
        rows = [dict(r) for r in cur.execute("SELECT * FROM system_audit_log ORDER BY id DESC LIMIT 50").fetchall()]
        conn.close()
        self.send_json_response({"data": rows, "count": len(rows)})

    def log_audit(self, action, target_table, target_id, user_info):
        try:
            client_ip = self.client_address[0] if self.client_address else "unknown"
            conn = get_db()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO system_audit_log (action, target_table, target_id, user_info, ip_address)
                VALUES (?, ?, ?, ?, ?)
            """, (action, target_table, target_id, user_info, client_ip))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Audit log error:", e)

    def handle_health_check(self):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT 1")
            db_ok = True
        except Exception:
            db_ok = False
        conn.close()

        uptime = round(time.time() - SERVER_START_TIME, 1)
        active_threads = threading.active_count()
        supa_status = supabase_sync.get_sync_status()

        self.send_json_response({
            "status": "healthy" if db_ok else "unhealthy",
            "version": "v0.3-Enterprise",
            "uptime_seconds": uptime,
            "active_threads": active_threads,
            "database": "sqlite_connected" if db_ok else "error",
            "supabase_cloud": {
                "configured": supa_status.get("configured", False),
                "connected": supa_status.get("connected", False)
            },
            "timestamp": datetime.datetime.now().isoformat()
        })

    def handle_get_approval_status(self, params):
        month = parse_month_int(params.get("month", [None])[0]) or 8
        year = int(params.get("year", [2026])[0])
        report_type = params.get("type", ["form_mau_signoff"])[0]

        conn = get_db()
        cur = conn.cursor()
        row = cur.execute("""
            SELECT * FROM report_approvals 
            WHERE month = ? AND year = ? AND report_type = ?
            ORDER BY id DESC LIMIT 1
        """, (month, year, report_type)).fetchone()
        conn.close()

        if row:
            self.send_json_response({"success": True, "approval": dict(row)})
        else:
            self.send_json_response({
                "success": True, 
                "approval": {
                    "month": month,
                    "year": year,
                    "report_type": report_type,
                    "status": "draft",
                    "submitted_by": None,
                    "approved_by": None,
                    "signature_hash": None
                }
            })

    def handle_get_approval_history(self):
        conn = get_db()
        cur = conn.cursor()
        rows = [dict(r) for r in cur.execute("SELECT * FROM report_approvals ORDER BY id DESC LIMIT 50").fetchall()]
        conn.close()
        self.send_json_response({"success": True, "history": rows, "count": len(rows)})

    def handle_submit_approval(self, body):
        month = parse_month_int(body.get("month")) or 8
        year = int(body.get("year", 2026))
        report_type = body.get("report_type", "form_mau_signoff")
        submitted_by = (body.get("submitted_by") or "Quản Đốc Phân Xưởng").strip()
        notes = (body.get("notes") or "").strip()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO report_approvals (month, year, report_type, status, submitted_by, submitted_at, notes)
            VALUES (?, ?, ?, 'submitted', ?, ?, ?)
            ON CONFLICT(month, year, report_type) DO UPDATE SET
                status = 'submitted',
                submitted_by = excluded.submitted_by,
                submitted_at = excluded.submitted_at,
                notes = excluded.notes
        """, (month, year, report_type, submitted_by, now_str, notes))
        conn.commit()
        conn.close()

        self.log_audit("APPROVAL_SUBMIT", "report_approvals", f"{month}/{year}", f"Submitted by: {submitted_by}")
        self.send_json_response({
            "success": True,
            "status": "submitted",
            "message": f"Báo cáo Tháng {month}/{year} đã được gửi trình ký Ban Giám Đốc thành công!"
        })

    def handle_sign_approval(self, body):
        month = parse_month_int(body.get("month")) or 8
        year = int(body.get("year", 2026))
        report_type = body.get("report_type", "form_mau_signoff")
        approved_by = (body.get("approved_by") or "Ban Giám Đốc").strip()
        approved_role = (body.get("approved_role") or "ptgd").strip()
        pin = (body.get("pin") or "").strip()
        notes = (body.get("notes") or "Phê duyệt thông qua số liệu sản xuất").strip()
        client_ip = self.client_address[0] if self.client_address else "unknown"

        # Rate-limiting check
        allowed, msg = check_brute_force(client_ip)
        if not allowed:
            self.send_json_response({"success": False, "error": msg}, status=429)
            return

        # Verification: PIN or Admin Role
        is_valid = False
        if pin:
            admin_master_pin = os.environ.get("ADMIN_MASTER_PIN", "").strip()
            if admin_master_pin and pin == admin_master_pin:
                is_valid = True
            else:
                conn = get_db()
                cur = conn.cursor()
                req = cur.execute("SELECT * FROM auth_access_requests WHERE activation_pin = ? AND status LIKE 'approved%'", (pin,)).fetchone()
                conn.close()
                if req:
                    is_valid = True
        else:
            # Check user role header
            user_role = self.headers.get("X-User-Role", "")
            if user_role in ["admin", "ptgd", "giam_doc"]:
                is_valid = True

        if not is_valid:
            record_auth_failure(client_ip)
            self.log_audit("APPROVAL_SIGN_FAILED", "report_approvals", f"{month}/{year}", f"Failed PIN attempt from {client_ip}")
            self.send_json_response({"success": False, "error": "Mã PIN xác thực phê duyệt không chính xác hoặc không đủ thẩm quyền."}, status=403)
            return

        record_auth_success(client_ip)
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sig_data = f"PHUONGNAM-APPROVED-{month}-{year}-{approved_by}-{int(time.time())}"
        signature_hash = hashlib.sha256(sig_data.encode()).hexdigest().upper()[:24]

        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO report_approvals (month, year, report_type, status, approved_by, approved_role, approved_at, signature_hash, notes)
            VALUES (?, ?, ?, 'approved', ?, ?, ?, ?, ?)
            ON CONFLICT(month, year, report_type) DO UPDATE SET
                status = 'approved',
                approved_by = excluded.approved_by,
                approved_role = excluded.approved_role,
                approved_at = excluded.approved_at,
                signature_hash = excluded.signature_hash,
                notes = excluded.notes
        """, (month, year, report_type, approved_by, approved_role, now_str, signature_hash, notes))
        conn.commit()
        conn.close()

        self.log_audit("APPROVAL_SIGN_SUCCESS", "report_approvals", f"{month}/{year}", f"Signed by {approved_by} ({signature_hash})")
        self.send_json_response({
            "success": True,
            "status": "approved",
            "approved_by": approved_by,
            "approved_role": approved_role,
            "approved_at": now_str,
            "signature_hash": signature_hash,
            "message": f"Ban Giám Đốc đã ký duyệt thành công Báo Cáo Tháng {month}/{year}!"
        })

    def handle_auth_login(self, body):
        username = (body.get("username") or "").strip().lower()
        pin = (body.get("pin") or "").strip()
        client_ip = self.client_address[0] if self.client_address else "unknown"

        allowed, msg = check_brute_force(f"{client_ip}:{username}")
        if not allowed:
            self.send_json_response({"success": False, "error": msg}, status=429)
            return

        conn = get_db()
        cur = conn.cursor()
        user_row = cur.execute("""
            SELECT * FROM auth_access_requests 
            WHERE (email = ? OR activation_pin = ?) AND status LIKE 'approved%'
            ORDER BY id DESC LIMIT 1
        """, (username, pin)).fetchone()
        conn.close()

        admin_pin = os.environ.get("ADMIN_MASTER_PIN", "").strip()
        is_master = admin_pin and pin == admin_pin

        if user_row or is_master:
            record_auth_success(f"{client_ip}:{username}")
            role = "admin" if is_master else "manager"
            fullname = "Quản Trị Viên Master" if is_master else (user_row["full_name"] or username)
            token = generate_session_token(username or "admin", role, duration_hours=24)
            self.log_audit("LOGIN_SUCCESS", "auth", username or "admin", f"IP: {client_ip}")
            self.send_json_response({
                "success": True,
                "token": token,
                "user": {
                    "username": username or "admin",
                    "fullname": fullname,
                    "role": role
                }
            })
        else:
            record_auth_failure(f"{client_ip}:{username}")
            self.log_audit("LOGIN_FAILED", "auth", username, f"IP: {client_ip}")
            self.send_json_response({"success": False, "error": "Tên đăng nhập hoặc mã PIN không hợp lệ."}, status=401)

    def handle_get_anomalies(self, params):
        month = parse_month_int(params.get("month", [None])[0]) or 8
        conn = get_db()
        cur = conn.cursor()

        # Query coal consumption
        coal_rows = [dict(r) for r in cur.execute("SELECT * FROM data_coal_consumption WHERE month = ?", (month,)).fetchall()]
        # Query material consumption
        mat_rows = [dict(r) for r in cur.execute("SELECT * FROM data_material_consumption WHERE month = ?", (month,)).fetchall()]
        conn.close()

        anomalies = []

        # Analyze Coal
        for c in coal_rows:
            item_name = c.get("item_name", "Than")
            line = c.get("line_name", "DC")
            actual = float(c.get("actual_rate") or 0)
            norm = float(c.get("norm_rate") or 0)

            if norm > 0 and actual > 0:
                diff_pct = round(((actual - norm) / norm) * 100, 2)
                if diff_pct > 5.0:
                    anomalies.append({
                        "category": "Nhiên liệu (Than)",
                        "item": item_name,
                        "line": line,
                        "actual": actual,
                        "norm": norm,
                        "unit": "kg/m²",
                        "variance_pct": diff_pct,
                        "severity": "high" if diff_pct > 10.0 else "medium",
                        "message": f"Tiêu hao {item_name} vượt định mức {diff_pct}% tại {line} ({actual} vs {norm} kg/m²)"
                    })
                elif diff_pct < -5.0:
                    anomalies.append({
                        "category": "Nhiên liệu (Than)",
                        "item": item_name,
                        "line": line,
                        "actual": actual,
                        "norm": norm,
                        "unit": "kg/m²",
                        "variance_pct": diff_pct,
                        "severity": "positive",
                        "message": f"Tiết kiệm {item_name} vượt trội {abs(diff_pct)}% tại {line}"
                    })

        # Analyze Materials
        for m in mat_rows:
            item_name = m.get("material_name", "Vật tư")
            line = m.get("line_name", "DC")
            actual = float(m.get("actual_consumption") or 0)
            norm = float(m.get("norm_consumption") or 0)

            if norm > 0 and actual > 0:
                diff_pct = round(((actual - norm) / norm) * 100, 2)
                if diff_pct > 7.0:
                    anomalies.append({
                        "category": "Nguyên vật liệu / Men",
                        "item": item_name,
                        "line": line,
                        "actual": actual,
                        "norm": norm,
                        "unit": m.get("unit", "kg/m²"),
                        "variance_pct": diff_pct,
                        "severity": "high" if diff_pct > 15.0 else "medium",
                        "message": f"{item_name} tiêu hao vượt mức {diff_pct}% tại {line}"
                    })

        self.send_json_response({
            "success": True,
            "month": month,
            "total_anomalies": len(anomalies),
            "high_risk_count": sum(1 for a in anomalies if a["severity"] == "high"),
            "items": anomalies
        })

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def start_auto_sync_worker(interval_seconds=1800):
    def worker():
        while True:
            time.sleep(interval_seconds)
            try:
                if supabase_sync.is_configured():
                    print("[AutoSync] Bắt đầu tự động đồng bộ định kỳ SQLite -> Supabase Cloud...")
                    success, res = supabase_sync.sync_sqlite_to_supabase()
                    print(f"[AutoSync] Hoàn tất đồng bộ: {success} - {res.get('message', '')}")
            except Exception as e:
                print(f"[AutoSync] Lỗi trong quá trình chạy nền: {e}")
    t = threading.Thread(target=worker, daemon=True)
    t.start()

def run_server():
    start_auto_sync_worker(interval_seconds=1800)
    with ThreadedTCPServer(("", PORT), ProductionAppHandler) as httpd:
        print(f"Server running at http://localhost:{PORT} (Enterprise Multi-threaded)")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
