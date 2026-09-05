import sqlite3
import json
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

def init_form_mau_db(conn):
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS report_form_mau_custom (
            period_key TEXT PRIMARY KEY,
            period_type TEXT,
            period_value TEXT,
            year INTEGER DEFAULT 2026,
            hr_data TEXT,
            plan_data TEXT,
            goals_data TEXT,
            notes_data TEXT,
            evaluation_data TEXT,
            signatures_data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

def resolve_period(period_type="month", period_value="8", year=2026):
    if period_type == "month":
        m_int = int(period_value) if str(period_value).isdigit() else 8
        months = [m_int]
        period_title = f"THÁNG {m_int:02d} NĂM {year}"
        period_key = f"M{m_int:02d}_{year}"
        next_period_title = f"Tháng {(m_int % 12) + 1:02d}/{year if m_int < 12 else year + 1}"
    elif period_type == "quarter":
        q_val = str(period_value).upper()
        q_map = {"Q1": [1,2,3], "Q2": [4,5,6], "Q3": [7,8,9], "Q4": [10,11,12], "1": [1,2,3], "2": [4,5,6], "3": [7,8,9], "4": [10,11,12]}
        months = q_map.get(q_val, [7,8,9])
        clean_q = q_val if q_val.startswith("Q") else f"Q{q_val}"
        period_title = f"QUÝ {clean_q[-1]} NĂM {year}"
        period_key = f"Q_{clean_q}_{year}"
        next_q_num = (int(clean_q[-1]) % 4) + 1
        next_period_title = f"Quý {next_q_num} Năm {year if next_q_num > 1 else year + 1}"
    elif period_type == "half_year":
        if "2" in str(period_value) or "CUOI" in str(period_value).upper():
            months = [7,8,9,10,11,12]
            period_title = f"6 THÁNG CUỐI NĂM {year}"
            period_key = f"H2_{year}"
            next_period_title = f"6 Tháng đầu năm {year + 1}"
        else:
            months = [1,2,3,4,5,6]
            period_title = f"6 THÁNG ĐẦU NĂM {year}"
            period_key = f"H1_{year}"
            next_period_title = f"6 Tháng cuối năm {year}"
    else: # full_year
        months = list(range(1, 13))
        period_title = f"CẢ NĂM {year}"
        period_key = f"Y_{year}"
        next_period_title = f"Năm {year + 1}"

    return {
        "period_type": period_type,
        "period_value": period_value,
        "year": int(year),
        "period_key": period_key,
        "period_title": period_title,
        "next_period_title": next_period_title,
        "months": months
    }

def get_default_hr_data():
    return [
        {"stt": 1, "position": "Văn Phòng", "dinhbien_dc1": 3, "dinhbien_dc2": 3, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 3, "hientai_dc2": 3},
        {"stt": 2, "position": "Đốc công", "dinhbien_dc1": 4, "dinhbien_dc2": 5, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 4, "hientai_dc2": 5},
        {"stt": 3, "position": "Ép - TM", "dinhbien_dc1": 27, "dinhbien_dc2": 30, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 2, "nghi_dc2": 0, "hientai_dc1": 25, "hientai_dc2": 30},
        {"stt": 4, "position": "Lò nung", "dinhbien_dc1": 15, "dinhbien_dc2": 23, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 15, "hientai_dc2": 23},
        {"stt": 5, "position": "PLĐG", "dinhbien_dc1": 45, "dinhbien_dc2": 33, "tuyenmoi_dc1": 2, "tuyenmoi_dc2": 4, "chuyen_dc1": 5, "chuyen_dc2": 0, "nghi_dc1": 3, "nghi_dc2": 3, "hientai_dc1": 39, "hientai_dc2": 34},
        {"stt": 6, "position": "Xe nâng", "dinhbien_dc1": 6, "dinhbien_dc2": 6, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 6, "hientai_dc2": 6},
        {"stt": 7, "position": "VSCN", "dinhbien_dc1": 2, "dinhbien_dc2": 2, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 2, "hientai_dc2": 2},
        {"stt": 8, "position": "Tạo Bột - Tạo Men", "dinhbien_dc1": 62, "dinhbien_dc2": 0, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 62, "hientai_dc2": 0},
        {"stt": 9, "position": "Trạm Than Hoá Khí", "dinhbien_dc1": 26, "dinhbien_dc2": 0, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 7, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 26, "hientai_dc2": 0},
        {"stt": 10, "position": "Phòng KT - CN", "dinhbien_dc1": 24, "dinhbien_dc2": 0, "tuyenmoi_dc1": 0, "tuyenmoi_dc2": 0, "chuyen_dc1": 0, "chuyen_dc2": 0, "nghi_dc1": 0, "nghi_dc2": 0, "hientai_dc1": 24, "hientai_dc2": 0}
    ]

def get_default_hr_notes():
    return "- DC1 ngày 03/06 chuyển 02 đốc công và 05 công nhân PLĐG sang THK hỗ trợ. Đề nghị P.TC-HC tuyển bổ sung đủ định biên tối thiểu 102 người.\n- DC2 tuyển mới 4 người, nghỉ việc 3 người. Nhân sự cơ bản đáp ứng sản xuất.\n- Bộ phận TB-TM định biên 62/62 đủ nhân sự; Phòng KT-CN định biên 24/24 đủ nhân sự."

def get_default_department_tasks():
    return [
        {"dept": "1. Dây chuyền số 1", "tasks": "- Hoạt động ổn định chu kỳ ép 15.5 nhịp/phút đạt sản lượng 15.300 m²/ngày.\n- Tăng cường kiểm soát thu hồi A1 đạt trên 91%.\n- Giảm thiểu thời gian dừng máy ép 2MF dưới 20 phút/ngày."},
        {"dept": "2. Dây chuyền số 2", "tasks": "- Chạy ổn định các dòng kích thước 50x50 và 40x80 men Panson.\n- Kiểm soát triệt để lỗi giọt nước và rách màng men.\n- Phối hợp nhịp nhàng các đợt chuyển đổi kích thước."},
        {"dept": "3. Bộ phận Tạo Bột - Tạo Men", "tasks": "- Nghiền riêng đơn đất sét và trường thạch, đảm bảo cung ứng đủ hồ xương và hồ men đạt chuẩn tỷ trọng, độ nhớt.\n- Vệ sinh silo, hầm hồ và bảo dưỡng định kỳ các cối nghiền."},
        {"dept": "4. Phòng Kỹ Thuật Công Nghệ", "tasks": "- Duy trì kiểm soát nguyên nhiên liệu đầu vào, kho bãi mùa mưa.\n- Tối ưu hóa đơn bài phối liệu xương - men nhằm hạ giá thành và nâng cao chất lượng A1."},
        {"dept": "5. Bộ phận Than Hoá Khí", "tasks": "- Vận hành ổn định các lò trạm khí hoá cấp đủ áp lực và nhiệt trị khí cho 2 dây chuyền.\n- Kiểm soát chặt chẽ tỷ lệ xỉ và suất tiêu hao than cục/than cám theo định mức."}
    ]

def build_form_mau_payload(conn, period_type="month", period_value="8", year=2026):
    conn.row_factory = sqlite3.Row
    init_form_mau_db(conn)
    cur = conn.cursor()
    p_info = resolve_period(period_type, period_value, year)
    months = p_info["months"]
    placeholders = ",".join(["?"] * len(months))

    # 1. SECTION I: SẢN LƯỢNG - THU HỒI TỔNG A1+A+B/ÉP
    q_sec1 = f'''
        SELECT line, size, product_line, data_type,
               SUM(sl_ep) as sl_ep,
               SUM(a1) as a1,
               SUM(a) as a,
               SUM(b) as b,
               SUM(recovery_total) as recovery_total,
               SUM(prod_days) as prod_days,
               AVG(stop_time_2mf) as stop_time_2mf
        FROM data_production_summary
        WHERE month IN ({placeholders}) AND unit = 'm2'
        GROUP BY line, size, data_type
        ORDER BY line, size, data_type DESC
    '''
    sec1_raw = [dict(r) for r in cur.execute(q_sec1, months).fetchall()]

    target_groups = [
        {"line": "DC1", "size": "30x60", "name": "DC1 30x60"},
        {"line": "DC2", "size": "50x50", "name": "DC2 50x50"},
        {"line": "DC2", "size": "60x60", "name": "DC2 60x60"},
        {"line": "DC2", "size": "40x80", "name": "DC2 40x80"}
    ]

    sec1_items = []
    total_plan_dc2 = {"sl_ep": 0, "a1": 0, "a": 0, "b": 0, "recovery_total": 0, "prod_days": 0, "stop_time_2mf": 0}
    total_actual_dc2 = {"sl_ep": 0, "a1": 0, "a": 0, "b": 0, "recovery_total": 0, "prod_days": 0, "stop_time_2mf": 0}
    total_plan_all = {"sl_ep": 0, "a1": 0, "a": 0, "b": 0, "recovery_total": 0, "prod_days": 0, "stop_time_2mf": 0}
    total_actual_all = {"sl_ep": 0, "a1": 0, "a": 0, "b": 0, "recovery_total": 0, "prod_days": 0, "stop_time_2mf": 0}

    for tg in target_groups:
        plan_row = next((r for r in sec1_raw if r["line"] == tg["line"] and r["size"] == tg["size"] and "kế hoạch" in (r["data_type"] or "").lower()), None)
        actual_row = next((r for r in sec1_raw if r["line"] == tg["line"] and r["size"] == tg["size"] and "thực hiện" in (r["data_type"] or "").lower()), None)

        def make_row_data(r):
            if not r:
                return {"sl_ep": 0, "a1": 0, "a": 0, "b": 0, "recovery_total": 0, "pct_a1": 0, "pct_a": 0, "pct_b": 0, "prod_days": 0, "avg_per_day": 0, "a_ep": 0, "c_ep": 0, "huy_ep": 0, "stop_time_2mf": 0}
            sl_ep = r["sl_ep"] or 0
            a1 = r["a1"] or 0
            a = r["a"] or 0
            b = r["b"] or 0
            rec = r["recovery_total"] or (a1 + a + b)
            days = r["prod_days"] or 0
            stop_mf = r["stop_time_2mf"] or 0

            return {
                "sl_ep": sl_ep,
                "a1": a1,
                "a": a,
                "b": b,
                "recovery_total": rec,
                "pct_a1": (a1 / rec * 100) if rec > 0 else 0,
                "pct_a": (a / rec * 100) if rec > 0 else 0,
                "pct_b": (b / rec * 100) if rec > 0 else 0,
                "prod_days": days,
                "avg_per_day": (rec / days) if days > 0 else 0,
                "a_ep": (rec / sl_ep * 100) if sl_ep > 0 else 0,
                "c_ep": (b / sl_ep * 100) if sl_ep > 0 else 0,
                "huy_ep": ((sl_ep - rec) / sl_ep * 100) if sl_ep > 0 else 0,
                "stop_time_2mf": stop_mf
            }

        p_data = make_row_data(plan_row)
        a_data = make_row_data(actual_row)

        if tg["line"] == "DC2":
            for k in total_plan_dc2: total_plan_dc2[k] += p_data.get(k, 0)
            for k in total_actual_dc2: total_actual_dc2[k] += a_data.get(k, 0)
        for k in total_plan_all: total_plan_all[k] += p_data.get(k, 0)
        for k in total_actual_all: total_actual_all[k] += a_data.get(k, 0)

        diff_m2 = {
            "sl_ep": a_data["sl_ep"] - p_data["sl_ep"],
            "a1": a_data["a1"] - p_data["a1"],
            "a": a_data["a"] - p_data["a"],
            "b": a_data["b"] - p_data["b"],
            "recovery_total": a_data["recovery_total"] - p_data["recovery_total"],
            "prod_days": a_data["prod_days"] - p_data["prod_days"],
            "avg_per_day": a_data["avg_per_day"] - p_data["avg_per_day"],
            "stop_time_2mf": a_data["stop_time_2mf"] - p_data["stop_time_2mf"]
        }
        rate_pct = {
            "sl_ep": (a_data["sl_ep"] / p_data["sl_ep"] * 100) if p_data["sl_ep"] > 0 else 0,
            "a1": (a_data["a1"] / p_data["a1"] * 100) if p_data["a1"] > 0 else 0,
            "a": (a_data["a"] / p_data["a"] * 100) if p_data["a"] > 0 else 0,
            "b": (a_data["b"] / p_data["b"] * 100) if p_data["b"] > 0 else 0,
            "recovery_total": (a_data["recovery_total"] / p_data["recovery_total"] * 100) if p_data["recovery_total"] > 0 else 0,
            "a_ep": a_data["a_ep"] - p_data["a_ep"],
            "c_ep": a_data["c_ep"] - p_data["c_ep"],
            "huy_ep": a_data["huy_ep"] - p_data["huy_ep"]
        }

        sec1_items.append({
            "group_name": tg["name"],
            "line": tg["line"],
            "size": tg["size"],
            "plan": p_data,
            "actual": a_data,
            "diff_m2": diff_m2,
            "rate_pct": rate_pct
        })

    def finalize_total_group(p, a, name):
        p_rec = p["recovery_total"] or (p["a1"] + p["a"] + p["b"])
        a_rec = a["recovery_total"] or (a["a1"] + a["a"] + a["b"])
        p_days = p["prod_days"]
        a_days = a["prod_days"]
        p_ep = p["sl_ep"]
        a_ep = a["sl_ep"]

        p_res = {
            "sl_ep": p_ep, "a1": p["a1"], "a": p["a"], "b": p["b"], "recovery_total": p_rec,
            "pct_a1": (p["a1"] / p_rec * 100) if p_rec > 0 else 0,
            "pct_a": (p["a"] / p_rec * 100) if p_rec > 0 else 0,
            "pct_b": (p["b"] / p_rec * 100) if p_rec > 0 else 0,
            "prod_days": p_days, "avg_per_day": (p_rec / p_days) if p_days > 0 else 0,
            "a_ep": (p_rec / p_ep * 100) if p_ep > 0 else 0,
            "c_ep": (p["b"] / p_ep * 100) if p_ep > 0 else 0,
            "huy_ep": ((p_ep - p_rec) / p_ep * 100) if p_ep > 0 else 0,
            "stop_time_2mf": p["stop_time_2mf"]
        }
        a_res = {
            "sl_ep": a_ep, "a1": a["a1"], "a": a["a"], "b": a["b"], "recovery_total": a_rec,
            "pct_a1": (a["a1"] / a_rec * 100) if a_rec > 0 else 0,
            "pct_a": (a["a"] / a_rec * 100) if a_rec > 0 else 0,
            "pct_b": (a["b"] / a_rec * 100) if a_rec > 0 else 0,
            "prod_days": a_days, "avg_per_day": (a_rec / a_days) if a_days > 0 else 0,
            "a_ep": (a_rec / a_ep * 100) if a_ep > 0 else 0,
            "c_ep": (a["b"] / a_ep * 100) if a_ep > 0 else 0,
            "huy_ep": ((a_ep - a_rec) / a_ep * 100) if a_ep > 0 else 0,
            "stop_time_2mf": a["stop_time_2mf"]
        }
        return {
            "name": name,
            "plan": p_res,
            "actual": a_res,
            "diff_m2": {
                "sl_ep": a_res["sl_ep"] - p_res["sl_ep"],
                "a1": a_res["a1"] - p_res["a1"],
                "a": a_res["a"] - p_res["a"],
                "b": a_res["b"] - p_res["b"],
                "recovery_total": a_res["recovery_total"] - p_res["recovery_total"],
                "prod_days": a_res["prod_days"] - p_res["prod_days"],
                "avg_per_day": a_res["avg_per_day"] - p_res["avg_per_day"],
                "stop_time_2mf": a_res["stop_time_2mf"] - p_res["stop_time_2mf"]
            },
            "rate_pct": {
                "sl_ep": (a_res["sl_ep"] / p_res["sl_ep"] * 100) if p_res["sl_ep"] > 0 else 0,
                "a1": (a_res["a1"] / p_res["a1"] * 100) if p_res["a1"] > 0 else 0,
                "a": (a_res["a"] / p_res["a"] * 100) if p_res["a"] > 0 else 0,
                "b": (a_res["b"] / p_res["b"] * 100) if p_res["b"] > 0 else 0,
                "recovery_total": (a_res["recovery_total"] / p_res["recovery_total"] * 100) if p_res["recovery_total"] > 0 else 0,
                "a_ep": a_res["a_ep"] - p_res["a_ep"],
                "c_ep": a_res["c_ep"] - p_res["c_ep"],
                "huy_ep": a_res["huy_ep"] - p_res["huy_ep"]
            }
        }

    total_dc2_obj = finalize_total_group(total_plan_dc2, total_actual_dc2, "TỔNG DC 2")
    total_2dc_obj = finalize_total_group(total_plan_all, total_actual_all, "TỔNG 2 DC")

    # 2. SECTION II: THƯƠNG HIỆU & CƠ CẤU MEN
    q_sec2 = f'''
        SELECT line, size, glaze_type, brand_name,
               SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2,
               SUM(CASE WHEN grade = 'A' THEN quantity_m2 ELSE 0 END) as a_m2,
               SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2,
               SUM(quantity_m2) as total_m2
        FROM data_brand_production
        WHERE month IN ({placeholders})
        GROUP BY line, size, glaze_type, brand_name
        ORDER BY line, size, total_m2 DESC
    '''
    sec2_raw = [dict(r) for r in cur.execute(q_sec2, months).fetchall()]

    dc1_brands = [r for r in sec2_raw if r["line"] == "DC1"]
    sum_dc1_brands = {
        "a1": sum(r["a1_m2"] for r in dc1_brands),
        "a": sum(r["a_m2"] for r in dc1_brands),
        "b": sum(r["b_m2"] for r in dc1_brands),
        "total": sum(r["total_m2"] for r in dc1_brands)
    }

    q_glaze = f'''
        SELECT glaze_type, size,
               SUM(quantity_m2) as prod_m2,
               COUNT(DISTINCT month) as months_active
        FROM data_brand_production
        WHERE month IN ({placeholders}) AND line = 'DC1'
        GROUP BY glaze_type, size
        ORDER BY prod_m2 DESC
    '''
    dc1_glazes = [dict(r) for r in cur.execute(q_glaze, months).fetchall()]
    sum_dc1_glazes = sum(r["prod_m2"] for r in dc1_glazes)
    for g in dc1_glazes:
        g["pct"] = (g["prod_m2"] / sum_dc1_glazes * 100) if sum_dc1_glazes > 0 else 0

    dc2_50x50_brands = [r for r in sec2_raw if r["line"] == "DC2" and r["size"] == "50x50"]
    dc2_60x60_brands = [r for r in sec2_raw if r["line"] == "DC2" and r["size"] == "60x60"]
    dc2_40x80_brands = [r for r in sec2_raw if r["line"] == "DC2" and r["size"] == "40x80"]

    # 3. SECTION III: TIÊU HAO VẬT TƯ (DC1 30x60, DC2 50x50, 60x60, 40x80)
    q_sec3 = f'''
        SELECT line, size, material_name, unit,
               AVG(norm_value) as norm_value,
               SUM(used_qty) as used_qty,
               SUM(prod_qty) as prod_qty,
               AVG(actual_rate) as actual_rate,
               SUM(diff_qty) as diff_qty
        FROM data_material_consumption
        WHERE month IN ({placeholders})
        GROUP BY line, size, material_name
        ORDER BY line, size, id ASC
    '''
    sec3_raw = [dict(r) for r in cur.execute(q_sec3, months).fetchall()]
    mat_dc1_30x60 = [r for r in sec3_raw if r["line"] == "DC1" and r["size"] == "30x60"]
    mat_dc2_50x50 = [r for r in sec3_raw if r["line"] == "DC2" and r["size"] == "50x50"]
    mat_dc2_60x60 = [r for r in sec3_raw if r["line"] == "DC2" and r["size"] == "60x60"]
    mat_dc2_40x80 = [r for r in sec3_raw if r["line"] == "DC2" and r["size"] == "40x80"]

    # 4. SECTION IV: SỬ DỤNG THAN
    q_sec4 = f'''
        SELECT line, size, firing_type,
               SUM(issued_weight) as issued_weight,
               SUM(ash_weight) as ash_weight,
               SUM(compensation_weight) as compensation_weight,
               SUM(excess_ash_weight) as excess_ash_weight,
               SUM(total_used_weight) as total_used_weight,
               SUM(production_m2) as production_m2
        FROM data_coal_consumption
        WHERE month IN ({placeholders})
        GROUP BY line, size, firing_type
        ORDER BY line, size
    '''
    sec4_raw = [dict(r) for r in cur.execute(q_sec4, months).fetchall()]

    def summarize_coal_group(rows_list):
        issued = sum(r["issued_weight"] or 0 for r in rows_list)
        ash = sum(r["ash_weight"] or 0 for r in rows_list)
        total_used = sum(r["total_used_weight"] or 0 for r in rows_list)
        prod_m2 = sum(r["production_m2"] or 0 for r in rows_list)
        return {
            "issued_weight": issued,
            "ash_weight": ash,
            "total_used_weight": total_used,
            "production_m2": prod_m2,
            "rate_kg_m2": (total_used / prod_m2) if prod_m2 > 0 else 0
        }

    coal_dc1_30x60 = summarize_coal_group([r for r in sec4_raw if r["line"] == "DC1"])
    coal_dc2_50x50 = summarize_coal_group([r for r in sec4_raw if r["line"] == "DC2" and r["size"] == "50x50"])
    coal_dc2_60x60 = summarize_coal_group([r for r in sec4_raw if r["line"] == "DC2" and r["size"] == "60x60"])
    coal_dc2_40x80 = summarize_coal_group([r for r in sec4_raw if r["line"] == "DC2" and r["size"] == "40x80"])
    coal_dc2_total = summarize_coal_group([r for r in sec4_raw if r["line"] == "DC2"])
    coal_all_total = summarize_coal_group(sec4_raw)

    # 5, 6, 7, 8: FETCH CUSTOM DATA FROM DB OR DEFAULTS
    saved_custom = cur.execute("SELECT * FROM report_form_mau_custom WHERE period_key = ?", (p_info["period_key"],)).fetchone()
    
    hr_data = get_default_hr_data()
    hr_notes = get_default_hr_notes()
    dept_tasks = get_default_department_tasks()
    eval_text = "- Toàn bộ 2 dây chuyền trong kỳ cơ bản hoàn thành các chỉ tiêu sản xuất, chất lượng và thu hồi.\n- Các sự cố dừng máy điện lưới, bảo dưỡng cơ điện và chuyển đổi kích thước được xử lý nhanh chóng, an toàn tuyệt đối.\n- Đề nghị Ban Giám Đốc và các Phòng ban tiếp tục hỗ trợ nhân sự và cung ứng vật tư kịp thời để phân xưởng hoàn thành vượt mức mục tiêu kỳ tới."
    signatures = {
        "signer_1_title": "NGƯỜI LẬP BIỂU", "signer_1_name": "Nguyễn Văn Tuấn",
        "signer_2_title": "TRƯỞNG CA SẢN XUẤT", "signer_2_name": "Phạm Văn Nam",
        "signer_3_title": "QUẢN ĐỐC PHÂN XƯỞNG", "signer_3_name": "Đỗ Văn Hùng",
        "signer_4_title": "BAN GIÁM ĐỐC PHÊ DUYỆT", "signer_4_name": "Phó Tổng Giám Đốc"
    }

    if saved_custom:
        s_dict = dict(saved_custom)
        if s_dict.get("hr_data"):
            try: hr_data = json.loads(s_dict["hr_data"])
            except: pass
        if s_dict.get("notes_data"):
            try:
                n_data = json.loads(s_dict["notes_data"])
                hr_notes = n_data.get("hr_notes", hr_notes)
            except: pass
        if s_dict.get("goals_data"):
            try:
                g_data = json.loads(s_dict["goals_data"])
                dept_tasks = g_data.get("department_tasks", dept_tasks)
            except: pass
        if s_dict.get("evaluation_data"):
            eval_text = s_dict["evaluation_data"]
        if s_dict.get("signatures_data"):
            try: signatures = json.loads(s_dict["signatures_data"])
            except: pass

    return {
        "period_info": p_info,
        "section_1_production": {
            "items": sec1_items,
            "total_dc2": total_dc2_obj,
            "total_2dc": total_2dc_obj,
            "notes": "- DC1 chạy ổn định chu kỳ ép 15.5 lần/phút.\n- DC2 sản xuất các dòng kích thước 50x50, 60x60 và 40x80 đảm bảo kế hoạch."
        },
        "section_2_brands": {
            "dc1_30x60": dc1_brands,
            "dc1_30x60_sum": sum_dc1_brands,
            "dc1_glazes": dc1_glazes,
            "dc2_50x50": dc2_50x50_brands,
            "dc2_60x60": dc2_60x60_brands,
            "dc2_40x80": dc2_40x80_brands
        },
        "section_3_materials": {
            "dc1_30x60": mat_dc1_30x60,
            "dc2_50x50": mat_dc2_50x50,
            "dc2_60x60": mat_dc2_60x60,
            "dc2_40x80": mat_dc2_40x80
        },
        "section_4_coal": {
            "dc1_30x60": coal_dc1_30x60,
            "dc2_50x50": coal_dc2_50x50,
            "dc2_60x60": coal_dc2_60x60,
            "dc2_40x80": coal_dc2_40x80,
            "total_dc2": coal_dc2_total,
            "total_2dc": coal_all_total
        },
        "section_5_hr": {
            "table": hr_data,
            "notes": hr_notes
        },
        "section_6_plan": {
            "next_title": p_info["next_period_title"],
            "items": sec1_items
        },
        "section_7_goals": {
            "next_title": p_info["next_period_title"],
            "department_tasks": dept_tasks
        },
        "section_8_evaluation": {
            "content": eval_text,
            "signatures": signatures
        }
    }

def save_form_mau_custom_data(conn, body):
    conn.row_factory = sqlite3.Row
    init_form_mau_db(conn)
    cur = conn.cursor()
    p_type = body.get("period_type", "month")
    p_val = str(body.get("period_value", "8"))
    year = int(body.get("year", 2026))
    p_info = resolve_period(p_type, p_val, year)
    p_key = p_info["period_key"]

    hr_data = json.dumps(body.get("hr_data", []), ensure_ascii=False) if body.get("hr_data") else None
    plan_data = json.dumps(body.get("plan_data", []), ensure_ascii=False) if body.get("plan_data") else None
    goals_data = json.dumps(body.get("goals_data", {}), ensure_ascii=False) if body.get("goals_data") else None
    notes_data = json.dumps(body.get("notes_data", {}), ensure_ascii=False) if body.get("notes_data") else None
    eval_text = body.get("evaluation_data", "")
    signatures = json.dumps(body.get("signatures_data", {}), ensure_ascii=False) if body.get("signatures_data") else None

    cur.execute('''
        INSERT INTO report_form_mau_custom
        (period_key, period_type, period_value, year, hr_data, plan_data, goals_data, notes_data, evaluation_data, signatures_data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(period_key) DO UPDATE SET
            hr_data = coalesce(excluded.hr_data, report_form_mau_custom.hr_data),
            plan_data = coalesce(excluded.plan_data, report_form_mau_custom.plan_data),
            goals_data = coalesce(excluded.goals_data, report_form_mau_custom.goals_data),
            notes_data = coalesce(excluded.notes_data, report_form_mau_custom.notes_data),
            evaluation_data = coalesce(excluded.evaluation_data, report_form_mau_custom.evaluation_data),
            signatures_data = coalesce(excluded.signatures_data, report_form_mau_custom.signatures_data),
            updated_at = CURRENT_TIMESTAMP
    ''', (p_key, p_type, p_val, year, hr_data, plan_data, goals_data, notes_data, eval_text, signatures))
    conn.commit()
    return {"success": True, "period_key": p_key}

def parse_form_mau_excel_upload(file_bytes):
    logs = []
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    logs.append(f"Đọc thành công file Excel gồm {len(wb.sheetnames)} sheet: {', '.join(wb.sheetnames)}")
    
    ws = None
    for name in ["Form mẫu", "FORM MẪU", "Form Mau", "Báo cáo", "Bao cao"]:
        if name in wb.sheetnames:
            ws = wb[name]
            break
    if not ws:
        ws = wb.active
    
    logs.append(f"-> Đang bóc tách dữ liệu từ sheet: '{ws.title}' (Tổng {ws.max_row} hàng)")
    
    # Try to find Section V (Nhân sự), Section VI, VII, VIII
    hr_rows = []
    hr_notes = []
    dept_tasks = []
    eval_lines = []
    
    current_sec = None
    for r in range(1, ws.max_row + 1):
        v1 = str(ws.cell(r, 1).value or '').strip()
        v2 = str(ws.cell(r, 2).value or '').strip()
        line_text = (v1 + " " + v2).strip()
        
        if "V. Nhân sự" in line_text or "V. NHÂN SỰ" in line_text:
            current_sec = "HR"
            continue
        elif "VI. Kế hoạch" in line_text or "VI. KẾ HOẠCH" in line_text:
            current_sec = "PLAN"
            continue
        elif "VII. Mục tiêu" in line_text or "VII. MỤC TIÊU" in line_text:
            current_sec = "GOALS"
            continue
        elif "VIII. Đánh giá" in line_text or "VIII. ĐÁNH GIÁ" in line_text:
            current_sec = "EVAL"
            continue
            
        if current_sec == "HR":
            # Check for HR table row
            c_pos = ws.cell(r, 2).value
            if c_pos and isinstance(c_pos, str) and any(kw in c_pos for kw in ["Văn Phòng", "Đốc công", "Ép", "Lò", "PLĐG", "Xe nâng", "VSCN", "Tạo Bột", "TB-TM", "Than", "KT"]):
                stt_val = ws.cell(r, 1).value or len(hr_rows) + 1
                try: stt_val = int(stt_val)
                except: stt_val = len(hr_rows) + 1
                
                hr_rows.append({
                    "stt": stt_val,
                    "position": str(c_pos).strip(),
                    "dinhbien_dc1": float(ws.cell(r, 3).value or 0),
                    "dinhbien_dc2": float(ws.cell(r, 4).value or 0),
                    "tuyenmoi_dc1": float(ws.cell(r, 5).value or 0),
                    "tuyenmoi_dc2": float(ws.cell(r, 6).value or 0),
                    "chuyen_dc1": float(ws.cell(r, 7).value or 0),
                    "chuyen_dc2": float(ws.cell(r, 8).value or 0),
                    "nghi_dc1": float(ws.cell(r, 9).value or 0),
                    "nghi_dc2": float(ws.cell(r, 10).value or 0),
                    "hientai_dc1": float(ws.cell(r, 11).value or 0),
                    "hientai_dc2": float(ws.cell(r, 12).value or 0)
                })
            elif v1.startswith("-") or v1.startswith("*"):
                hr_notes.append(v1)
        elif current_sec == "GOALS":
            if any(dept_kw in v1 for dept_kw in ["Dây chuyền số 1", "Dây chuyền 1", "Dây chuyền số 2", "Dây chuyền 2", "Tạo bột", "KT-CN", "Kỹ thuật", "Than Hoá", "THK"]):
                dept_tasks.append({"dept": v1, "tasks": ""})
            elif dept_tasks and (v1.startswith("-") or v1.startswith("+")):
                dept_tasks[-1]["tasks"] += ("\n" if dept_tasks[-1]["tasks"] else "") + v1
        elif current_sec == "EVAL":
            if v1.startswith("-") or v1.startswith("+"):
                eval_lines.append(v1)

    if hr_rows:
        logs.append(f"-> Bóc tách thành công {len(hr_rows)} dòng nhân sự các bộ phận")
    if dept_tasks:
        logs.append(f"-> Bóc tách thành công nhiệm vụ kế hoạch của {len(dept_tasks)} phòng ban")
    if eval_lines:
        logs.append(f"-> Bóc tách thành công nội dung đánh giá tình hình sản xuất")

    return {
        "success": True,
        "logs": logs,
        "hr_data": hr_rows if hr_rows else get_default_hr_data(),
        "hr_notes": "\n".join(hr_notes) if hr_notes else get_default_hr_notes(),
        "department_tasks": dept_tasks if dept_tasks else get_default_department_tasks(),
        "evaluation_text": "\n".join(eval_lines) if eval_lines else None
    }
