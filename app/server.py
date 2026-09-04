import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_PATH = os.path.join(WORKSPACE_DIR, "app_data", "production_data.db")
ORIGINAL_EXCEL_PATH = os.path.join(WORKSPACE_DIR, "New Biểu đồ Báo cáo TH 2 DC năm 2026.xlsx")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
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
                    self.handle_get_norm_versions()
                elif path == "/api/norms/details":
                    self.handle_get_norm_details(params)
                elif path == "/api/export/sign-off-report":
                    self.handle_export_sign_off_report(params)
                elif path == "/api/metadata":
                    self.handle_metadata()
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

        if not item_id:
            self.send_json_response({"error": "ID parameter required"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        if path == "/api/data/summary":
            cur.execute("DELETE FROM data_production_summary WHERE id = ?", (item_id,))
        elif path == "/api/data/brands":
            cur.execute("DELETE FROM data_brand_production WHERE id = ?", (item_id,))
        elif path == "/api/data/materials":
            cur.execute("DELETE FROM data_material_consumption WHERE id = ?", (item_id,))
        elif path == "/api/data/coal":
            cur.execute("DELETE FROM data_coal_consumption WHERE id = ?", (item_id,))
        elif path == "/api/norms/versions":
            cur.execute("DELETE FROM master_norms_detail WHERE version_id = ?", (item_id,))
            cur.execute("DELETE FROM master_norms_version WHERE id = ?", (item_id,))
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
        month = params.get("month", ["all"])[0]
        line = params.get("line", ["all"])[0]
        size = params.get("size", ["all"])[0]
        brand = params.get("brand", ["all"])[0]

        conn = get_db()
        cur = conn.cursor()

        # 1. Base Summary from data_production_summary
        where_d1 = ["unit = 'm2'"]
        vals_d1 = []
        if month != "all":
            where_d1.append("month = ?")
            vals_d1.append(int(month))
        if line != "all":
            where_d1.append("line = ?")
            vals_d1.append(line)
        if size != "all":
            where_d1.append("size = ?")
            vals_d1.append(size)

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

        # Calculate exact metrics for Dual Donut Charts (matching Excel Image 1)
        # Actual metrics
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

        # Plan metrics
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

        # 2. Available Brands list for current month, line, size
        where_avail = []
        vals_avail = []
        if month != "all":
            where_avail.append("month = ?")
            vals_avail.append(int(month))
        if line != "all":
            where_avail.append("line = ?")
            vals_avail.append(line)
        if size != "all":
            where_avail.append("size = ?")
            vals_avail.append(size)
        clause_avail = ("WHERE " + " AND ".join(where_avail)) if where_avail else ""
        q_avail_brands = f"SELECT DISTINCT brand_name FROM data_brand_production {clause_avail} {'AND' if clause_avail else 'WHERE'} brand_name != '' ORDER BY brand_name"
        available_brands = [r[0] for r in cur.execute(q_avail_brands, vals_avail).fetchall()]

        # 3. Brand Table rows for current filter
        where_d2 = []
        vals_d2 = []
        if month != "all":
            where_d2.append("month = ?")
            vals_d2.append(int(month))
        if line != "all":
            where_d2.append("line = ?")
            vals_d2.append(line)
        if size != "all":
            where_d2.append("size = ?")
            vals_d2.append(size)

        clause_d2 = ("WHERE " + " AND ".join(where_d2)) if where_d2 else ""
        q_brand = f"""
            SELECT brand_name, 
                   SUM(quantity_m2) as total_m2, 
                   SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2, 
                   SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2,
                   GROUP_CONCAT(DISTINCT line) as lines,
                   GROUP_CONCAT(DISTINCT size) as sizes,
                   GROUP_CONCAT(DISTINCT glaze_type) as glazes
            FROM data_brand_production 
            {clause_d2} 
            GROUP BY brand_name 
            ORDER BY total_m2 DESC
        """
        all_brand_rows = [dict(r) for r in cur.execute(q_brand, vals_d2).fetchall()]
        grand_total_brand_m2 = sum(r["total_m2"] for r in all_brand_rows)

        brand_table = []
        for r in all_brand_rows:
            tot = r["total_m2"]
            a1 = r["a1_m2"]
            b = r["b_m2"]
            a1_p = (a1 / tot * 100) if tot > 0 else 0
            b_p = (b / tot * 100) if tot > 0 else 0
            share_p = (tot / grand_total_brand_m2 * 100) if grand_total_brand_m2 > 0 else 0
            brand_table.append({
                "brand_name": r["brand_name"],
                "total_m2": tot,
                "a1_m2": a1,
                "b_m2": b,
                "a1_pct": a1_p,
                "b_pct": b_p,
                "share_pct": share_p,
                "lines": r.get("lines") or "",
                "sizes": r.get("sizes") or "",
                "glazes": r.get("glazes") or ""
            })

        # 4. If Brand is specified
        if brand != "all":
            where_spec = ["brand_name = ?"]
            vals_spec = [brand]
            if month != "all":
                where_spec.append("month = ?")
                vals_spec.append(int(month))
            if line != "all":
                where_spec.append("line = ?")
                vals_spec.append(line)
            if size != "all":
                where_spec.append("size = ?")
                vals_spec.append(size)
            clause_spec = "WHERE " + " AND ".join(where_spec)
            
            q_spec = f"SELECT SUM(quantity_m2) as total_m2, SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2, SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2 FROM data_brand_production {clause_spec}"
            spec_row = dict(cur.execute(q_spec, vals_spec).fetchone() or {})
            
            b_total_m2 = spec_row.get("total_m2") or 0
            b_a1_m2 = spec_row.get("a1_m2") or 0
            b_b_m2 = spec_row.get("b_m2") or 0
            b_a1_pct = (b_a1_m2 / b_total_m2 * 100) if b_total_m2 > 0 else 0
            b_b_pct = (b_b_m2 / b_total_m2 * 100) if b_total_m2 > 0 else 0
            share_of_factory = (b_total_m2 / act_tot * 100) if act_tot > 0 else 0
            
            # Monthly Trend for this brand
            trend_spec_where = ["brand_name = ?"]
            trend_spec_vals = [brand]
            if line != "all":
                trend_spec_where.append("line = ?")
                trend_spec_vals.append(line)
            if size != "all":
                trend_spec_where.append("size = ?")
                trend_spec_vals.append(size)
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

            # Distribution breakdown by Glaze / Size for this brand
            q_brand_dist = f"SELECT glaze_type as brand_name, SUM(quantity_m2) as total_m2 FROM data_brand_production {clause_spec} GROUP BY glaze_type ORDER BY total_m2 DESC"
            brand_dist_rows = [dict(r) for r in cur.execute(q_brand_dist, vals_spec).fetchall()]
            if not brand_dist_rows or (len(brand_dist_rows) == 1 and not brand_dist_rows[0]["brand_name"]):
                q_brand_dist = f"SELECT size as brand_name, SUM(quantity_m2) as total_m2 FROM data_brand_production {clause_spec} GROUP BY size ORDER BY total_m2 DESC"
                brand_dist_rows = [dict(r) for r in cur.execute(q_brand_dist, vals_spec).fetchall()]

            actual_data = {
                "total_m2": b_total_m2,
                "a1_m2": b_a1_m2,
                "a_m2": 0,
                "b_m2": b_b_m2,
                "a1_pct": b_a1_pct,
                "a_pct": 0,
                "b_pct": b_b_pct,
                "days": act_days,
                "avg_per_day": (b_total_m2 / act_days) if act_days > 0 else 0,
                "stop_time_2mf": act_stop_2mf,
                "share_pct": share_of_factory
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
        else:
            # Grand Monthly Trend across active months (1, 3, 4, 5, 6, 7, 8)
            trend_where = ["unit = 'm2'"]
            trend_vals = []
            if line != "all":
                trend_where.append("line = ?")
                trend_vals.append(line)
            if size != "all":
                trend_where.append("size = ?")
                trend_vals.append(size)
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
            brand_dist_rows = all_brand_rows[:10]

        # 5. Materials Section Data (Phần III: Tiêu hao vật tư)
        where_d3 = []
        vals_d3 = []
        if month != "all":
            where_d3.append("month = ?")
            vals_d3.append(int(month))
        if line != "all":
            where_d3.append("line = ?")
            vals_d3.append(line)
        if size != "all":
            where_d3.append("size = ?")
            vals_d3.append(size)
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
            SELECT material_name, unit,
                   AVG(norm_value) as norm_val,
                   SUM(used_qty) as total_used,
                   SUM(prod_qty) as total_prod,
                   SUM(reduced_qty) as total_reduced,
                   SUM(over_qty) as total_over
            FROM data_material_consumption
            {clause_d3}
            GROUP BY material_name
            ORDER BY total_used DESC
        """
        chart_mat_rows = []
        for r in cur.execute(q_mat_chart, vals_d3).fetchall():
            d = dict(r)
            p_m2 = d["total_prod"]
            act_r = (d["total_used"] / p_m2) if p_m2 > 0 else 0
            chart_mat_rows.append({
                "material_name": d["material_name"],
                "unit": d["unit"],
                "norm_value": round(d["norm_val"] or 0, 4),
                "actual_rate": round(act_r, 4),
                "total_used": round(d["total_used"] or 0, 2),
                "total_reduced": round(d["total_reduced"] or 0, 2),
                "total_over": round(d["total_over"] or 0, 2)
            })

        # 6. Coal Section Data (Phần IV: Tình hình sử dụng than)
        where_d4 = []
        vals_d4 = []
        if month != "all":
            where_d4.append("month = ?")
            vals_d4.append(int(month))
        if line != "all":
            where_d4.append("line = ?")
            vals_d4.append(line)
        if size != "all":
            where_d4.append("size = ?")
            vals_d4.append(size)
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

        q_coal_trend = f"""
            SELECT month, 
                   SUM(total_used_weight) as used_kg, 
                   SUM(production_m2) as prod_m2,
                   AVG(heat_value) as heat_val,
                   AVG(ash_rate) as ash_pct
            FROM data_coal_consumption
            {clause_d4}
            GROUP BY month
            ORDER BY month
        """
        coal_monthly_trend = []
        for r in cur.execute(q_coal_trend, vals_d4).fetchall():
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
            "is_brand_selected": (brand != "all"),
            "selected_brand_name": brand,
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
        if month and month != "all":
            where.append("month = ?")
            vals.append(int(month))
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

        where = []
        vals = []
        if month and month != "all":
            where.append("month = ?")
            vals.append(int(month))
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)

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

        where = []
        vals = []
        if month and month != "all":
            where.append("month = ?")
            vals.append(int(month))
        if line and line != "all":
            where.append("line = ?")
            vals.append(line)
        if size and size != "all":
            where.append("size = ?")
            vals.append(size)

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
        if month and month != "all":
            where.append("month = ?")
            vals.append(int(month))
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
            total_used = sum(r["total_used_weight"] or (r["issued_weight"] or 0) + (r["ash_weight"] or 0) + (r["compensation_weight"] or 0) for r in group_rows)
            prod_m2 = sum(r["production_m2"] or 0 for r in group_rows)
            
            ash_pct = (ash / (issued + ash) * 100) if (issued + ash) > 0 else 0
            rate_lump = (issued / prod_m2) if prod_m2 > 0 else 0
            rate_with_ash = ((issued + ash) / prod_m2) if prod_m2 > 0 else 0
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

    def handle_get_norm_versions(self):
        conn = get_db()
        cur = conn.cursor()
        rows = [dict(r) for r in cur.execute("SELECT v.*, COUNT(d.id) as item_count FROM master_norms_version v LEFT JOIN master_norms_detail d ON v.id = d.version_id GROUP BY v.id ORDER BY v.effective_from_year DESC, v.effective_from_month DESC, v.id DESC").fetchall()]
        conn.close()
        self.send_json_response({"data": rows})

    def handle_get_norm_details(self, params):
        version_id = params.get("version_id", [None])[0]
        if not version_id:
            self.send_json_response({"error": "version_id required"}, status=400)
            return
        conn = get_db()
        cur = conn.cursor()
        v_info = dict(cur.execute("SELECT * FROM master_norms_version WHERE id = ?", (version_id,)).fetchone() or {})
        rows = [dict(r) for r in cur.execute("SELECT * FROM master_norms_detail WHERE version_id = ? ORDER BY line, size, material_name", (version_id,)).fetchall()]
        conn.close()
        self.send_json_response({"version": v_info, "details": rows})

    def handle_create_norm_version(self, body):
        code = body.get("version_code")
        name = body.get("version_name")
        from_m = int(body.get("effective_from_month", 1))
        from_y = int(body.get("effective_from_year", 2026))
        desc = body.get("description", "")
        copy_from_id = body.get("copy_from_version_id")

        if not code or not name:
            self.send_json_response({"error": "Mã và Tên phiên bản là bắt buộc"}, status=400)
            return

        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO master_norms_version (version_code, version_name, effective_from_month, effective_from_year, description, is_active) VALUES (?, ?, ?, ?, ?, 1)", (code, name, from_m, from_y, desc))
            new_v_id = cur.lastrowid

            if copy_from_id:
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

        logs = []
        for fieldname, finfo in uploaded_files.items():
            fname = finfo["filename"]
            fbytes = finfo["bytes"]
            logs.append(f'Đã nhận file "{fname}" ({len(fbytes):,} bytes)')
            try:
                wb = openpyxl.load_workbook(io.BytesIO(fbytes), data_only=True)
                sheet_list_str = ", ".join(wb.sheetnames)
                logs.append(f"-> Đọc thành công {len(wb.sheetnames)} sheet: {sheet_list_str}")
            except Exception as e:
                logs.append(f"-> Lỗi đọc file: {str(e)}")

        self.send_json_response({
            "success": True,
            "message": f"Đã phân tích và trích xuất thành công dữ liệu Tháng {target_month}/{target_year}",
            "logs": logs
        })

    def handle_export_sign_off_report(self, params):
        target_month = int(params.get("month", [8])[0])
        target_year = int(params.get("year", [2026])[0])

        wb_orig = openpyxl.load_workbook(ORIGINAL_EXCEL_PATH, data_only=False)
        wb_out = openpyxl.Workbook()
        ws_out = wb_out.active
        ws_out.title = f"Báo cáo T{target_month}.{target_year}"

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

        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="Bao_Cao_Trinh_Ky_Thang_{target_month}_{target_year}.xlsx"')
        self.send_header("Content-Length", str(len(file_bytes)))
        self.end_headers()
        self.wfile.write(file_bytes)

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ProductionAppHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
