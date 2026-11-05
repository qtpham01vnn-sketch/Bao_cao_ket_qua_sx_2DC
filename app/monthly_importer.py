import os
import io
import re
import sqlite3
import openpyxl


def get_standard_material_unit(mat_name: str, raw_unit: str = "Kg") -> str:
    """
    Quy chuẩn ĐVT Công ty Gạch Men Phương Nam (theo bảng chuẩn nhà máy & Ảnh 1):
    - Bi cao nhôm, Bi trung nhôm (mọi chủng loại): Kg (TUYỆT ĐỐI KHÔNG DÙNG 'CÁI')
    - Men các loại (EWP, GWP, EWM, GWM, EFB, EFM, GFM, GFB, EFSV, SFSV, EWB, GWB, Matt, Bóng, Sugar...): Kg
    - Nguyên liệu xương (xương PCL, xương DC1...): Kg
    - Vỏ Điều / Vỏ điều: Kg
    - Dây đai pét / Dây đai pet: Kg
    - Nan Nẹp / Nan nẹp: Kg
    - Màng co PE khổ 500mm / Màng co: Kg
    - Ke góc / Ke góc 5V: Kg
    - Dây đai hộp: Kg
    - Pallet các loại (1100x1100, cũ, mới...): Cái
    - Bao bì các loại (hộp carton đóng gói): Cái
    """
    n = (mat_name or "").lower().strip()
    
    if "pallet" in n:
        return "Cái"
    if "bao bì" in n or "bao bi" in n:
        return "Cái"
    if "bi cao nhôm" in n or "bi trung nhôm" in n or "bi nhôm" in n:
        return "Kg"
    if "men " in n or n.startswith("men"):
        return "Kg"
    if "xương" in n or "xuong" in n:
        return "Kg"
    if any(k in n for k in ["vỏ điều", "vo dieu", "dây đai", "day dai", "nan nẹp", "nan nep", "màng co", "mang co", "ke góc", "ke goc"]):
        return "Kg"
        
    u = (raw_unit or "Kg").strip()
    if u.lower() in ("kg", "kilo"):
        return "Kg"
    if u.lower() in ("cái", "cai"):
        return "Cái"
    return u


def parse_number(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '').replace('%', '')
    if s.startswith('#') or s == '-' or not s:
        return default
    try:
        return float(s)
    except:
        return default

def find_monthly_sheet(sheetnames, month, year=None):
    """
    Tìm sheet báo cáo tháng chính xác tuyệt đối, tránh nhầm lẫn giữa T1 và T10/T11/T12.
    Hỗ trợ các định dạng: T10.2026, T10.26, T10, THÁNG 10, THANG 10, T 10...
    """
    pats = [
        rf"(?i)\bt0?{month}\.(?:20)?\d{{2}}\b",
        rf"(?i)\btháng\s*0?{month}\b",
        rf"(?i)\bthang\s*0?{month}\b",
        rf"(?i)\bt\s*0?{month}(?!\d)",
    ]
    for pat in pats:
        for s in sheetnames:
            if re.search(pat, s.strip()):
                return s
    # Fallback to word token search
    for s in sheetnames:
        clean = re.sub(r'[^a-zA-Z0-9]', ' ', s.lower())
        tokens = clean.split()
        if f"t{month}" in tokens or f"{month}" in tokens:
            return s
    return sheetnames[0] if sheetnames else None

def detect_production_columns(ws, start_row=1, max_row=20):
    """
    Tự động quét dòng tiêu đề để nhận diện vị trí các cột trong Section I:
    sl_ep, a1, a, b, total, days, avg_day, stop_2mf.
    Hoàn toàn linh hoạt trước mọi sự dịch chuyển cột trong các tháng.
    """
    col_map = {
        'sl_ep': 3,
        'a1': 4,
        'a': 5,
        'b': 6,
        'total': 7,
        'days': 8,
        'avg_day': 9,
        'stop_2mf': 13
    }
    for r in range(start_row, min(max_row + 1, ws.max_row + 1)):
        for c in range(1, min(25, ws.max_column + 1)):
            val = str(ws.cell(r, c).value or '').strip().lower()
            if not val:
                continue
            if 'số ngày' in val or 'ngay sx' in val or 'ngày sx' in val:
                col_map['days'] = c
            elif 'tb/ngày' in val or 'tb/ngay' in val or 'm2/ngày' in val or 'm2/ngay' in val:
                col_map['avg_day'] = c
            elif 'tổng' in val and ('a1' in val or 'ab' in val or '+' in val):
                col_map['total'] = c
            elif 'sản lượng ép' in val or 'sl ép' in val or 'sl ep' in val:
                col_map['sl_ep'] = c
            elif 'dừng ép' in val or 'dung ep' in val:
                col_map['stop_2mf'] = c
            elif val == 'a1':
                col_map['a1'] = c
            elif val == 'a':
                col_map['a'] = c
            elif val == 'b':
                col_map['b'] = c
    return col_map

def extract_size_from_text(text, default="40x80"):
    """
    Tự động nhận diện kích thước gạch từ văn bản bất kỳ (hỗ trợ dấu x, *, hoặc kích thước mm).
    """
    t = str(text or "").lower()
    if "30*60" in t or "30x60" in t or "300x600" in t:
        return "30x60"
    if "50*50" in t or "50x50" in t or "500x500" in t:
        return "50x50"
    if "60*60" in t or "60x60" in t or "600x600" in t:
        return "60x60"
    if "40*80" in t or "40x80" in t or "400x800" in t:
        return "40x80"
    if "80*80" in t or "80x80" in t or "800x800" in t:
        return "80x80"
    if "60*120" in t or "60x120" in t or "600x1200" in t:
        return "60x120"
    return default

def import_monthly_data(conn, month, year, file_dc1_bytes=None, file_dc2_bytes=None, file_coal_bytes=None):
    cur = conn.cursor()
    logs = []
    unit_warnings = []
    
    # 1. Xóa dữ liệu cũ của tháng này (nếu có) để nạp mới/cập nhật sạch sẽ
    if file_dc1_bytes:
        cur.execute("DELETE FROM data_production_summary WHERE month = ? AND year = ? AND line = 'DC1'", (month, year))
        cur.execute("DELETE FROM data_brand_production WHERE month = ? AND year = ? AND line = 'DC1'", (month, year))
        cur.execute("DELETE FROM data_material_consumption WHERE month = ? AND year = ? AND line = 'DC1'", (month, year))
        logs.append(f"Đã dọn dẹp dữ liệu cũ DC1 Tháng {month}/{year}")
        
    if file_dc2_bytes:
        cur.execute("DELETE FROM data_production_summary WHERE month = ? AND year = ? AND line = 'DC2'", (month, year))
        cur.execute("DELETE FROM data_brand_production WHERE month = ? AND year = ? AND line = 'DC2'", (month, year))
        cur.execute("DELETE FROM data_material_consumption WHERE month = ? AND year = ? AND line = 'DC2'", (month, year))
        logs.append(f"Đã dọn dẹp dữ liệu cũ DC2 Tháng {month}/{year}")

    if file_coal_bytes:
        cur.execute("DELETE FROM data_coal_consumption WHERE month = ? AND year = ?", (month, year))
        logs.append(f"Đã dọn dẹp dữ liệu cũ Than Tháng {month}/{year}")

    # =========================================================================
    # BÓC TÁCH FILE DÂY CHUYỀN 1 (DC1)
    # =========================================================================
    if file_dc1_bytes:
        wb1 = openpyxl.load_workbook(io.BytesIO(file_dc1_bytes), data_only=True)
        target_sheet = find_monthly_sheet(wb1.sheetnames, month, year)
        ws1 = wb1[target_sheet]
        logs.append(f"[DC1] Đang bóc tách sheet: '{target_sheet}'...")

        col_map1 = detect_production_columns(ws1, start_row=1, max_row=20)

        # Quét Section I: Sản lượng - Chất lượng DC1 linh hoạt
        for r in range(1, min(35, ws1.max_row + 1)):
            c1 = str(ws1.cell(r, 1).value or "").strip().lower()
            if not c1:
                continue

            line_size = extract_size_from_text(c1, default="30x60")
            prod_line = "Phương Nam"
            if "matt" in c1:
                prod_line = "Matt"
            elif "panson" in c1:
                prod_line = "Panson"

            if c1.startswith("kế hoạch") or ("kế hoạch" in c1 and ("30" in c1 or "40" in c1 or "50" in c1 or "60" in c1)):
                sl_ep = parse_number(ws1.cell(r, col_map1['sl_ep']).value)
                a1 = parse_number(ws1.cell(r, col_map1['a1']).value)
                a = parse_number(ws1.cell(r, col_map1['a']).value)
                b = parse_number(ws1.cell(r, col_map1['b']).value)
                tot = parse_number(ws1.cell(r, col_map1['total']).value)
                p_days = parse_number(ws1.cell(r, col_map1['days']).value)
                avg_d = parse_number(ws1.cell(r, col_map1['avg_day']).value)

                if sl_ep == 0 and a1 == 0 and tot == 0 and p_days == 0:
                    continue

                pct_a1 = parse_number(ws1.cell(r + 1, col_map1['a1']).value)
                pct_a = parse_number(ws1.cell(r + 1, col_map1['a']).value)
                pct_b = parse_number(ws1.cell(r + 1, col_map1['b']).value)

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC1', ?, ?, 'Kế hoạch', 'm2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 40, ?, ?)
                """, (month, year, line_size, prod_line, sl_ep, a1, a, b, tot, pct_a1, pct_a, pct_b, p_days, avg_d, p_days * 40, f"Import DC1 T{month} Row {r} KH m2"))

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC1', ?, ?, 'Kế hoạch', '%', 0, ?, ?, ?, 100, ?, ?, ?, 0, 0, 0, 0, ?)
                """, (month, year, line_size, prod_line, pct_a1, pct_a, pct_b, pct_a1, pct_a, pct_b, f"Import DC1 T{month} Row {r} KH %"))

            elif c1.startswith("thực hiện") or ("thực hiện" in c1 and ("30" in c1 or "40" in c1 or "50" in c1 or "60" in c1)):
                sl_ep = parse_number(ws1.cell(r, col_map1['sl_ep']).value)
                a1 = parse_number(ws1.cell(r, col_map1['a1']).value)
                a = parse_number(ws1.cell(r, col_map1['a']).value)
                b = parse_number(ws1.cell(r, col_map1['b']).value)
                tot = parse_number(ws1.cell(r, col_map1['total']).value)
                p_days = parse_number(ws1.cell(r, col_map1['days']).value)
                avg_d = parse_number(ws1.cell(r, col_map1['avg_day']).value)

                if sl_ep == 0 and a1 == 0 and tot == 0 and p_days == 0:
                    continue

                pct_a1 = parse_number(ws1.cell(r + 1, col_map1['a1']).value)
                pct_a = parse_number(ws1.cell(r + 1, col_map1['a']).value)
                pct_b = parse_number(ws1.cell(r + 1, col_map1['b']).value)
                stop_2mf = parse_number(ws1.cell(r + 1, col_map1.get('stop_2mf', 13)).value, 20.0)

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC1', ?, ?, 'Thực hiện', 'm2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (month, year, line_size, prod_line, sl_ep, a1, a, b, tot, pct_a1, pct_a, pct_b, p_days, avg_d, stop_2mf, p_days * stop_2mf, f"Import DC1 T{month} Row {r} TH m2"))

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC1', ?, ?, 'Thực hiện', '%', 0, ?, ?, ?, 100, ?, ?, ?, 0, 0, 0, 0, ?)
                """, (month, year, line_size, prod_line, pct_a1, pct_a, pct_b, pct_a1, pct_a, pct_b, f"Import DC1 T{month} Row {r} TH %"))

        # Section II: Thương hiệu DC1
        sec2_start = None
        sec3_start = None
        for r in range(1, ws1.max_row + 1):
            c1 = str(ws1.cell(r, 1).value or "").strip().lower()
            if "ii." in c1 and "thương hiệu" in c1:
                sec2_start = r
            elif "iii." in c1 and "tiêu hao" in c1:
                sec3_start = r
                break

        if sec2_start and sec3_start:
            current_glaze = "Phương Nam"
            for r in range(sec2_start + 1, sec3_start):
                c1 = ws1.cell(r, 1).value
                if c1 is None:
                    continue
                brand_name = str(c1).strip()
                if brand_name.lower() in ["kh/th", "tổng", "ghi chú", "thực hiện", ""] or brand_name.startswith("II."):
                    continue
                
                row_text = " ".join([str(ws1.cell(r, c).value or "") for c in range(1, 15)]).lower()
                if "men matt" in row_text:
                    current_glaze = "Matt"
                elif "men phương nam" in row_text or "men phuong nam" in row_text:
                    current_glaze = "Phương Nam"
                elif "men panson" in row_text:
                    current_glaze = "Panson"
                elif "men" in brand_name.lower():
                    current_glaze = brand_name
                    continue

                a1_qty = parse_number(ws1.cell(r, 2).value)
                a_qty = parse_number(ws1.cell(r, 4).value)
                b_qty = parse_number(ws1.cell(r, 6).value)

                if a1_qty > 0 or a_qty > 0 or b_qty > 0:
                    for gr, qty in [('A1', a1_qty), ('A', a_qty), ('B', b_qty)]:
                        cur.execute("""
                            INSERT INTO data_brand_production (
                                month, year, line, size, glaze_type, brand_name, grade, quantity_m2, source_row
                            ) VALUES (?, ?, 'DC1', '30x60', ?, ?, ?, ?, ?)
                        """, (month, year, current_glaze, brand_name, gr, qty, f"Import DC1 T{month} Row {r}"))

        # Section III: Tiêu hao vật tư DC1
        if sec3_start:
            for r in range(sec3_start + 1, min(sec3_start + 30, ws1.max_row + 1)):
                mat_name = str(ws1.cell(r, 2).value or "").strip()
                if not mat_name or mat_name.lower() in ["nguyên liệu vật tư", "tổng", "ghi chú:"] or mat_name.startswith("IV."):
                    continue
                raw_unit = str(ws1.cell(r, 4).value or "Kg").strip()
                std_unit = get_standard_material_unit(mat_name, raw_unit)
                if raw_unit and raw_unit.lower() != std_unit.lower():
                    warn_msg = f"⚠️ [LỆCH QUY TẮC ĐVT] DC1 Dòng {r} (30x60): Vật tư '{mat_name}' trong file Excel ghi là '{raw_unit}', SAI quy chuẩn Công ty (chuẩn là '{std_unit}'). Hệ thống đã tự động chuyển về '{std_unit}'."
                    logs.append(warn_msg)
                    unit_warnings.append({
                        "line": "DC1",
                        "size": "30x60",
                        "material": mat_name,
                        "found_unit": raw_unit,
                        "standard_unit": std_unit,
                        "row": r,
                        "message": f"Vật tư '{mat_name}' ghi là '{raw_unit}' ➔ Chuẩn hóa thành '{std_unit}'"
                    })
                unit = std_unit

                norm = parse_number(ws1.cell(r, 5).value)
                act_rate = parse_number(ws1.cell(r, 6).value)
                used_qty = parse_number(ws1.cell(r, 7).value)
                giam_dm = parse_number(ws1.cell(r, 9).value)
                vuot_dm = parse_number(ws1.cell(r, 10).value)
                diff = giam_dm if giam_dm != 0 else -vuot_dm
                
                cur.execute("""
                    INSERT INTO data_material_consumption (
                        month, year, line, size, material_name, unit, norm_value, used_qty,
                        prod_qty, actual_rate, reduced_qty, over_qty, diff_qty, status_text, source_row
                    ) VALUES (?, ?, 'DC1', '30x60', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Có số liệu', ?)
                """, (month, year, mat_name, unit, norm, used_qty, 476442.72, act_rate, giam_dm, vuot_dm, diff, f"Import DC1 T{month} Row {r}"))

        logs.append(f"[DC1] Hoàn tất bóc tách DC1 Tháng {month}/{year}")

    # =========================================================================
    # BÓC TÁCH FILE DÂY CHUYỀN 2 (DC2)
    # =========================================================================
    if file_dc2_bytes:
        wb2 = openpyxl.load_workbook(io.BytesIO(file_dc2_bytes), data_only=True)
        target_sheet = find_monthly_sheet(wb2.sheetnames, month, year)
        ws2 = wb2[target_sheet]
        logs.append(f"[DC2] Đang bóc tách sheet: '{target_sheet}'...")

        col_map2 = detect_production_columns(ws2, start_row=1, max_row=20)

        # Section I: Quét các khối Kế hoạch & Thực hiện trong DC2 hoàn toàn động
        for r in range(1, min(35, ws2.max_row + 1)):
            c1 = str(ws2.cell(r, 1).value or "").strip().lower()
            if not c1:
                continue
            
            line_size = extract_size_from_text(c1, default="40x80")

            prod_line = "Panson"
            if line_size == "50x50":
                if "bóng" in c1 or "bong" in c1:
                    prod_line = "Bóng"
                else:
                    prod_line = "Sugar Sân vườn"
            elif line_size == "60x60":
                if "matt" in c1:
                    prod_line = "Matt"
                else:
                    prod_line = "Bóng"
            elif line_size == "40x80":
                if "matt" in c1:
                    prod_line = "Matt"
                else:
                    prod_line = "Panson"

            if c1.startswith("kế hoạch") or ("kế hoạch" in c1 and ("40" in c1 or "50" in c1 or "60" in c1 or "30" in c1 or "80" in c1)):
                sl_ep = parse_number(ws2.cell(r, col_map2['sl_ep']).value)
                a1 = parse_number(ws2.cell(r, col_map2['a1']).value)
                a = parse_number(ws2.cell(r, col_map2['a']).value)
                b = parse_number(ws2.cell(r, col_map2['b']).value)
                tot = parse_number(ws2.cell(r, col_map2['total']).value)
                p_days = parse_number(ws2.cell(r, col_map2['days']).value)
                avg_d = parse_number(ws2.cell(r, col_map2['avg_day']).value)

                # Bỏ qua dòng mẫu không phát sinh sản lượng hoặc ngày chạy
                if sl_ep == 0 and a1 == 0 and tot == 0 and p_days == 0:
                    continue

                pct_a1 = parse_number(ws2.cell(r + 1, col_map2['a1']).value)
                pct_a = parse_number(ws2.cell(r + 1, col_map2['a']).value)
                pct_b = parse_number(ws2.cell(r + 1, col_map2['b']).value)

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC2', ?, ?, 'Kế hoạch', 'm2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 40, ?, ?)
                """, (month, year, line_size, prod_line, sl_ep, a1, a, b, tot, pct_a1, pct_a, pct_b, p_days, avg_d, p_days * 40, f"Import DC2 T{month} Row {r} KH m2"))

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC2', ?, ?, 'Kế hoạch', '%', 0, ?, ?, ?, 100, ?, ?, ?, 0, 0, 0, 0, ?)
                """, (month, year, line_size, prod_line, pct_a1, pct_a, pct_b, pct_a1, pct_a, pct_b, f"Import DC2 T{month} Row {r} KH %"))

            elif c1.startswith("thực hiện") or ("thực hiện" in c1 and ("40" in c1 or "50" in c1 or "60" in c1 or "30" in c1 or "80" in c1)):
                sl_ep = parse_number(ws2.cell(r, col_map2['sl_ep']).value)
                a1 = parse_number(ws2.cell(r, col_map2['a1']).value)
                a = parse_number(ws2.cell(r, col_map2['a']).value)
                b = parse_number(ws2.cell(r, col_map2['b']).value)
                tot = parse_number(ws2.cell(r, col_map2['total']).value)
                p_days = parse_number(ws2.cell(r, col_map2['days']).value)
                avg_d = parse_number(ws2.cell(r, col_map2['avg_day']).value)

                # Bỏ qua dòng mẫu không phát sinh sản lượng hoặc ngày chạy
                if sl_ep == 0 and a1 == 0 and tot == 0 and p_days == 0:
                    continue

                pct_a1 = parse_number(ws2.cell(r + 1, col_map2['a1']).value)
                pct_a = parse_number(ws2.cell(r + 1, col_map2['a']).value)
                pct_b = parse_number(ws2.cell(r + 1, col_map2['b']).value)
                stop_2mf = parse_number(ws2.cell(r + 1, col_map2.get('stop_2mf', 13)).value, 30.0)

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC2', ?, ?, 'Thực hiện', 'm2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (month, year, line_size, prod_line, sl_ep, a1, a, b, tot, pct_a1, pct_a, pct_b, p_days, avg_d, stop_2mf, p_days * stop_2mf, f"Import DC2 T{month} Row {r} TH m2"))

                cur.execute("""
                    INSERT INTO data_production_summary (
                        month, year, line, size, product_line, data_type, unit,
                        sl_ep, a1, a, b, recovery_total, pct_a1, pct_a, pct_b,
                        prod_days, avg_per_day, stop_time_2mf, stop_time_total, source_row
                    ) VALUES (?, ?, 'DC2', ?, ?, 'Thực hiện', '%', 0, ?, ?, ?, 100, ?, ?, ?, 0, 0, 0, 0, ?)
                """, (month, year, line_size, prod_line, pct_a1, pct_a, pct_b, pct_a1, pct_a, pct_b, f"Import DC2 T{month} Row {r} TH %"))

        # Section II & III: Thương hiệu và Tiêu hao DC2
        cur_size = "40x80"
        cur_glaze = "Panson"
        is_mat_sec = False
        
        # Lấy danh sách kích thước thực tế sản xuất trong Tháng (Data I) để tự động lọc bỏ các bảng rác cũ sót lại trong template
        cur.execute("SELECT DISTINCT size FROM data_production_summary WHERE month = ? AND year = ? AND line = 'DC2'", (month, year))
        active_sizes_sec1 = [r[0] for r in cur.fetchall()]
        if not active_sizes_sec1:
            active_sizes_sec1 = ["40x80", "50x50", "60x60"]

        for r in range(25, ws2.max_row + 1):
            c1 = ws2.cell(r, 1).value
            c2 = ws2.cell(r, 2).value
            line_str = str(c1 or c2 or "").strip()

            detected_sz = extract_size_from_text(line_str, default=None)
            if detected_sz:
                cur_size = detected_sz

            if "men matt" in line_str.lower():
                cur_glaze = "Matt"
            elif "men bóng" in line_str.lower() or "men bong" in line_str.lower():
                cur_glaze = "Bóng"
            elif "panson" in line_str.lower():
                cur_glaze = "Panson"

            if "tiêu hao vật tư" in line_str.lower():
                is_mat_sec = True
                continue
            if "nhân sự" in line_str.lower() or "khiếu nại" in line_str.lower() or "iv." in line_str.lower():
                is_mat_sec = False
                continue

            if not is_mat_sec:
                # Bóc tách Thương hiệu: Bỏ qua kích thước không có trong kế hoạch/thực hiện của tháng
                if cur_size not in active_sizes_sec1:
                    continue
                brand = str(c1 or "").strip()
                if brand and not brand.lower().startswith("kh/") and not brand.lower().startswith("tổng") and not brand.lower().startswith("➢") and not brand.lower().startswith("1.") and not brand.lower().startswith("2."):
                    a1 = parse_number(ws2.cell(r, 2).value)
                    a = parse_number(ws2.cell(r, 4).value)
                    b = parse_number(ws2.cell(r, 6).value)
                    if a1 > 0 or a > 0 or b > 0:
                        for gr, qty in [('A1', a1), ('A', a), ('B', b)]:
                            cur.execute("""
                                INSERT INTO data_brand_production (
                                    month, year, line, size, glaze_type, brand_name, grade, quantity_m2, source_row
                                ) VALUES (?, ?, 'DC2', ?, ?, ?, ?, ?, ?)
                            """, (month, year, cur_size, cur_glaze, brand, gr, qty, f"Import DC2 T{month} Brand Row {r}"))
            else:
                # Bóc tách Vật tư DC2: Bỏ qua kích thước không có trong kế hoạch/thực hiện của tháng
                if cur_size not in active_sizes_sec1:
                    continue
                mat_name = str(c2 or "").strip()
                if mat_name and not mat_name.lower().startswith("nguyên liệu") and not mat_name.lower().startswith("➢") and not mat_name.lower().startswith("stt") and not mat_name.lower().startswith("*"):
                    raw_unit = str(ws2.cell(r, 4).value or "kg").strip()
                    std_unit = get_standard_material_unit(mat_name, raw_unit)
                    if raw_unit and raw_unit.lower() != std_unit.lower():
                        warn_msg = f"⚠️ [LỆCH QUY TẮC ĐVT] DC2 Dòng {r} ({cur_size}): Vật tư '{mat_name}' trong file Excel ghi là '{raw_unit}', SAI quy chuẩn Công ty (chuẩn là '{std_unit}'). Hệ thống đã tự động chuyển về '{std_unit}'."
                        logs.append(warn_msg)
                        unit_warnings.append({
                            "line": "DC2",
                            "size": cur_size,
                            "material": mat_name,
                            "found_unit": raw_unit,
                            "standard_unit": std_unit,
                            "row": r,
                            "message": f"Vật tư '{mat_name}' ({cur_size}) ghi là '{raw_unit}' ➔ Chuẩn hóa thành '{std_unit}'"
                        })
                    unit = std_unit

                    norm = parse_number(ws2.cell(r, 5).value)
                    act_rate = parse_number(ws2.cell(r, 6).value)
                    used_qty = parse_number(ws2.cell(r, 7).value)
                    giam_dm = parse_number(ws2.cell(r, 9).value)
                    vuot_dm = parse_number(ws2.cell(r, 10).value)
                    diff = giam_dm if giam_dm != 0 else -vuot_dm

                    cur.execute("""
                        INSERT INTO data_material_consumption (
                            month, year, line, size, material_name, unit, norm_value, used_qty,
                            prod_qty, actual_rate, reduced_qty, over_qty, diff_qty, status_text, source_row
                        ) VALUES (?, ?, 'DC2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Có số liệu', ?)
                    """, (month, year, cur_size, mat_name, unit, norm, used_qty, 0.0, act_rate, giam_dm, vuot_dm, diff, f"Import DC2 T{month} Mat Row {r}"))

        logs.append(f"[DC2] Hoàn tất bóc tách DC2 Tháng {month}/{year}")

    # =========================================================================
    # BÓC TÁCH FILE THAN (DATA IV)
    # =========================================================================
    if file_coal_bytes:
        wb_c = openpyxl.load_workbook(io.BytesIO(file_coal_bytes), data_only=True)
        ws_c = wb_c[wb_c.sheetnames[0]]
        logs.append(f"[Than] Đang bóc tách file than sheet '{wb_c.sheetnames[0]}'...")

        # Tự động nhận diện cấu trúc cột theo tiêu đề (Hỗ trợ định dạng cũ T08 và định dạng rút gọn T10)
        def detect_coal_columns(ws):
            h_row = 7
            for r in range(1, 15):
                txt = " ".join([str(ws.cell(r, c).value or "") for c in range(1, 15)]).lower()
                if "tên loại than" in txt or "chất lượng" in txt or "nhiệt trị" in txt:
                    h_row = r
                    break

            cols_map = {}
            r_top = {c: str(ws.cell(h_row, c).value or "").strip().lower() for c in range(1, 26)}
            r_sub = {c: str(ws.cell(h_row + 1, c).value or "").strip().lower() for c in range(1, 26)}

            for c in range(1, 26):
                h1 = r_top.get(c, "")
                h2 = r_sub.get(c, "")
                comb = f"{h1} {h2}".strip()

                if "tên loại than" in comb or "loại than" in comb:
                    cols_map["supplier"] = c
                elif "nhiệt trị" in comb:
                    cols_map["heat"] = c
                elif "cám thực tế" in comb or ("thực tế" in comb and "%" in comb):
                    cols_map["ash_rate"] = c
                elif "cám tiêu chuẩn" in comb:
                    cols_map["std_ash_rate"] = c
                elif "xít" in comb or "đá" in comb:
                    cols_map["stone_rate"] = c
                elif ("kl lĩnh" in comb or "khối lượng lĩnh" in comb or h1 == "kl lĩnh") and "bù" not in comb:
                    cols_map["issued"] = c
                elif "tổng sử dụng" in comb or (h1.startswith("tổng") and "sử dụng" in comb):
                    cols_map["tot_used"] = c
                elif "lĩnh bù" in comb and "tiêu hao" not in comb and "tổng" not in comb:
                    cols_map["comp"] = c
                elif "vượt tiêu chuẩn" in comb or "vượt tc" in comb:
                    cols_map["excess"] = c
                elif "sản lượng" in comb:
                    cols_map["prod_m2"] = c
                elif "xuất cám" in h1 or "cám (kg)" in h1:
                    if "sl" in h2 or not h2:
                        cols_map["ash_w"] = c
                    if "%" in h2:
                        cols_map["ash_pct"] = c
                elif "% cám" in comb and "ash_pct" not in cols_map:
                    cols_map["ash_pct"] = c
                elif "tiêu hao" in comb:
                    if "có cám" in comb or "kẹp" in comb:
                        cols_map["rate_with_ash"] = c
                    elif "cục+" in comb or "cục +" in comb or "lĩnh bù" in comb or "tổng" in comb:
                        cols_map["rate_tot"] = c
                    elif "cục" in comb or "kg/m2" in comb or "rate_lump" not in cols_map:
                        if "rate_lump" not in cols_map:
                            cols_map["rate_lump"] = c
                elif "ghi chú" in comb:
                    cols_map["note"] = c

            if "ash_w" not in cols_map and "issued" in cols_map:
                for c in range(cols_map["issued"] + 1, cols_map.get("tot_used", cols_map.get("prod_m2", 25))):
                    h = r_top.get(c, "")
                    if "cám" in h:
                        cols_map["ash_w"] = c
                        break

            return h_row, cols_map

        h_row, coal_cols = detect_coal_columns(ws_c)
        logs.append(f"[Than] Đã nhận diện tự động cột than: {coal_cols}")

        cur_line = "DC1"
        cur_size = "30x60"
        last_sup_name = ""
        last_heat = 0.0
        last_ash = 0.0
        last_std_ash = 0.0
        last_stone = 0.0

        for r in range(h_row + 2, ws_c.max_row + 1):
            c1_val = str(ws_c.cell(r, 1).value or "").strip().lower()
            c2_val = str(ws_c.cell(r, 2).value or "").strip().lower()
            c3_raw = str(ws_c.cell(r, coal_cols.get("supplier", 3)).value or "").strip()
            c3_val = c3_raw.lower()

            line_check = f"{c1_val} {c2_val} {c3_val}"

            # FIRST: Stop when reaching Summary Tables or Notes
            if any(kw in line_check for kw in ["iii.", "iv.", "tổng dây chuyền 2", "tổng 2 dây chuyền", "tổng hợp 2 dc", "ghi chú"]):
                break

            # SECOND: Section & Size detection
            if "dây chuyền 1" in line_check or "i. dc1" in line_check:
                cur_line = "DC1"
                cur_size = "30x60"
                last_sup_name = ""
                continue
            elif "500*500" in line_check or "500x500" in line_check or "50x50" in line_check:
                cur_line = "DC2"
                cur_size = "50x50"
                last_sup_name = ""
                continue
            elif "400*800" in line_check or "400x800" in line_check or "40x80" in line_check:
                cur_line = "DC2"
                cur_size = "40x80"
                last_sup_name = ""
                continue
            elif "600*600" in line_check or "600x600" in line_check or "60x60" in line_check:
                cur_line = "DC2"
                cur_size = "60x60"
                last_sup_name = ""
                continue

            # Skip header or total rows
            if any(kw in line_check for kw in ["tên loại than", "chất lượng", "nhiệt trị", "tổng sấy lò", "tổng tiêu hao", "tổng + sấy lò", "cộng"]):
                continue

            supplier_name = c3_raw
            issued = parse_number(ws_c.cell(r, coal_cols.get("issued", 11)).value) if "issued" in coal_cols else 0.0
            ash_w = parse_number(ws_c.cell(r, coal_cols.get("ash_w", 13)).value) if "ash_w" in coal_cols else 0.0
            ash_rate = parse_number(ws_c.cell(r, coal_cols.get("ash_pct", 14)).value) if "ash_pct" in coal_cols else 0.0
            comp = parse_number(ws_c.cell(r, coal_cols.get("comp", 15)).value) if "comp" in coal_cols else 0.0
            excess = parse_number(ws_c.cell(r, coal_cols.get("excess", 16)).value) if "excess" in coal_cols else 0.0
            tot_used = parse_number(ws_c.cell(r, coal_cols.get("tot_used", 17)).value) if "tot_used" in coal_cols else 0.0
            prod_val = ws_c.cell(r, coal_cols.get("prod_m2", 18)).value if "prod_m2" in coal_cols else 0.0
            prod_m2 = parse_number(prod_val)
            r_lump = parse_number(ws_c.cell(r, coal_cols.get("rate_lump", 19)).value) if "rate_lump" in coal_cols else 0.0
            r_with_ash = parse_number(ws_c.cell(r, coal_cols.get("rate_with_ash", 20)).value) if "rate_with_ash" in coal_cols else 0.0
            r_tot = parse_number(ws_c.cell(r, coal_cols.get("rate_tot", 21)).value) if "rate_tot" in coal_cols else 0.0
            note = str(ws_c.cell(r, coal_cols.get("note", 22)).value or "").strip() if "note" in coal_cols else ""

            heat = parse_number(ws_c.cell(r, coal_cols.get("heat", 7)).value) if "heat" in coal_cols else 0.0
            ash = parse_number(ws_c.cell(r, coal_cols.get("ash_rate", 8)).value) if "ash_rate" in coal_cols else 0.0
            std_ash = parse_number(ws_c.cell(r, coal_cols.get("std_ash_rate", 9)).value) if "std_ash_rate" in coal_cols else 0.0
            stone = parse_number(ws_c.cell(r, coal_cols.get("stone_rate", 10)).value) if "stone_rate" in coal_cols else 0.0

            if supplier_name:
                last_sup_name = supplier_name
                last_heat = heat
                last_ash = ash
                last_std_ash = std_ash
                last_stone = stone
            elif issued > 0 and last_sup_name:
                supplier_name = last_sup_name
                heat = last_heat
                ash = last_ash
                std_ash = last_std_ash
                stone = last_stone
            else:
                continue

            prod_val_str = str(prod_val or "").strip().lower()
            is_drying = (
                ("sấy" in prod_val_str) or 
                ("sấy" in note.lower()) or 
                ("không tính" in prod_val_str) or
                ("sấy" in supplier_name.lower()) or
                (prod_m2 == 0 and ("sấy" in line_check or "không tính" in line_check))
            )
            firing = "Không tính tiêu hao" if is_drying else "Có tính tiêu hao"
            if is_drying:
                prod_m2 = 0.0
                r_lump = 0.0
                r_with_ash = 0.0
                r_tot = 0.0
            else:
                if r_lump == 0 and prod_m2 > 0 and issued > 0:
                    r_lump = round(issued / prod_m2, 2)
                if r_with_ash == 0 and prod_m2 > 0 and (issued + ash_w) > 0:
                    r_with_ash = round((issued + ash_w - excess) / prod_m2, 2)
                if r_tot == 0 and prod_m2 > 0 and tot_used > 0:
                    r_tot = round(tot_used / prod_m2, 2)

            if issued > 0 or tot_used > 0:
                cur.execute("""
                    INSERT INTO data_coal_consumption (
                        excel_row, month, year, line, size, coal_supplier, warehouse, import_date, firing_type,
                        heat_value, ash_rate, std_ash_rate, stone_rate, issued_weight, ash_weight,
                        ash_export_rate, compensation_weight, excess_ash_weight, total_used_weight,
                        production_m2, rate_lump, rate_with_ash, rate_total, note
                    ) VALUES (?, ?, ?, ?, ?, ?, 'Kho', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (r, month, year, cur_line, cur_size, supplier_name, firing, heat, ash, std_ash, stone, issued, ash_w, ash_rate, comp, excess, tot_used, prod_m2, r_lump, r_with_ash, r_tot, note))

        logs.append(f"[Than] Hoàn tất nạp dữ liệu Than Tháng {month}/{year}")

    conn.commit()
    logs.append(f"✅ ĐÃ LƯU TOÀN BỘ DỮ LIỆU THÁNG {month}/{year} VÀO HỆ THỐNG THÀNH CÔNG!")
    if unit_warnings:
        logs.append(f"⚠️ ĐÃ PHÁT HIỆN VÀ TỰ ĐỘNG CHUẨN HÓA {len(unit_warnings)} MỤC GHI SAI QUY TẮC ĐVT TRONG FILE EXCEL!")
    return logs, unit_warnings
