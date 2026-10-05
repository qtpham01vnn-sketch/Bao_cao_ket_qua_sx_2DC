import io
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def generate_dashboard_excel_report(conn, month="all", line="all", size="all", brand="all", year=2026):
    wb = openpyxl.Workbook()
    
    # Common Styles
    font_family = "Arial"
    
    f_company = Font(name=font_family, size=11, bold=True, color="0F172A")
    f_subdept = Font(name=font_family, size=10, bold=True, color="1E3A8A")
    f_nation = Font(name=font_family, size=11, bold=True, color="0F172A")
    f_motto = Font(name=font_family, size=10, bold=True, underline="single", color="0F172A")
    f_date = Font(name=font_family, size=9, italic=True, color="475569")
    
    f_report_title = Font(name=font_family, size=13.5, bold=True, color="0F2A4A")
    f_report_sub = Font(name=font_family, size=10, italic=True, color="334155")
    f_filter_info = Font(name=font_family, size=9.5, bold=True, color="0284C7")
    
    f_sec_header = Font(name=font_family, size=10.5, bold=True, color="FFFFFF")
    fill_sec_header = PatternFill(start_color="0F2A4A", end_color="0F2A4A", fill_type="solid")
    
    f_th = Font(name=font_family, size=9, bold=True, color="FFFFFF")
    fill_th = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    
    f_data = Font(name=font_family, size=9, color="0F172A")
    f_data_bold = Font(name=font_family, size=9, bold=True, color="0F172A")
    f_data_green = Font(name=font_family, size=9, bold=True, color="15803D")
    f_data_blue = Font(name=font_family, size=9, bold=True, color="0284C7")
    f_data_red = Font(name=font_family, size=9, bold=True, color="B91C1C")
    
    f_total = Font(name=font_family, size=9.5, bold=True, color="0F172A")
    fill_total = PatternFill(start_color="E6F4EA", end_color="E6F4EA", fill_type="solid")
    
    f_kpi_title = Font(name=font_family, size=8.5, bold=True, color="64748B")
    f_kpi_val = Font(name=font_family, size=12.5, bold=True, color="0F2A4A")
    f_kpi_sub = Font(name=font_family, size=8, italic=True, color="475569")
    fill_kpi = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    
    border_thin = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )
    border_total = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="16A34A"),
        bottom=Side(style="double", color="16A34A")
    )

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")
    
    num_fmt_qty = "#,##0.00"
    num_fmt_int = "#,##0"
    num_fmt_pct = "0.00%"
    num_fmt_rate = "#,##0.0000"

    # Helper function to style merged range safely
    def style_merged_range(ws, cell_range, font=None, fill=None, border=None, alignment=None):
        for row in ws[cell_range]:
            for cell in row:
                if font: cell.font = font
                if fill: cell.fill = fill
                if border: cell.border = border
                if alignment: cell.alignment = alignment

    # -------------------------------------------------------------
    # FETCH DATA FROM SQLITE
    # -------------------------------------------------------------
    cur = conn.cursor()
    
    # 1. Part I Data
    w_p1 = ["unit = 'm2'"]
    v_p1 = []
    if month != "all":
        w_p1.append("month = ?")
        v_p1.append(int(month))
    if line != "all":
        w_p1.append("line = ?")
        v_p1.append(line)
    if size != "all":
        w_p1.append("size = ?")
        v_p1.append(size)
    q_p1 = f"SELECT * FROM data_production_summary WHERE {' AND '.join(w_p1)} ORDER BY line, size, data_type DESC"
    p1_rows = [dict(r) for r in cur.execute(q_p1, v_p1).fetchall()]

    # 2. Part II Data (Brands)
    w_p2 = []
    v_p2 = []
    if month != "all":
        w_p2.append("month = ?")
        v_p2.append(int(month))
    if line != "all":
        w_p2.append("line = ?")
        v_p2.append(line)
    if size != "all":
        w_p2.append("size = ?")
        v_p2.append(size)
    if brand != "all":
        w_p2.append("brand_name = ?")
        v_p2.append(brand)
    clause_p2 = ("WHERE " + " AND ".join(w_p2)) if w_p2 else ""
    q_p2 = f"""
        SELECT brand_name, line, size, glaze_type,
               SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as a1_m2,
               SUM(CASE WHEN grade = 'A' THEN quantity_m2 ELSE 0 END) as a_m2,
               SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as b_m2,
               SUM(quantity_m2) as total_m2
        FROM data_brand_production
        {clause_p2}
        GROUP BY brand_name, line, size, glaze_type
        ORDER BY total_m2 DESC
    """
    p2_rows = [dict(r) for r in cur.execute(q_p2, v_p2).fetchall()]
    p2_grand_total = sum(r["total_m2"] for r in p2_rows)

    # 3. Part III Data (Materials)
    w_p3 = []
    v_p3 = []
    if month != "all":
        w_p3.append("month = ?")
        v_p3.append(int(month))
    if line != "all":
        w_p3.append("line = ?")
        v_p3.append(line)
    if size != "all":
        w_p3.append("size = ?")
        v_p3.append(size)
    clause_p3 = ("WHERE " + " AND ".join(w_p3)) if w_p3 else ""
    q_p3 = f"SELECT * FROM data_material_consumption {clause_p3} ORDER BY id ASC"
    p3_rows = [dict(r) for r in cur.execute(q_p3, v_p3).fetchall()]

    # 4. Part IV Data (Coal)
    w_p4 = []
    v_p4 = []
    if month != "all":
        w_p4.append("month = ?")
        v_p4.append(int(month))
    if line != "all":
        w_p4.append("line = ?")
        v_p4.append(line)
    if size != "all":
        w_p4.append("size = ?")
        v_p4.append(size)
    clause_p4 = ("WHERE " + " AND ".join(w_p4)) if w_p4 else ""
    q_p4 = f"SELECT * FROM data_coal_consumption {clause_p4} ORDER BY id ASC"
    p4_rows = [dict(r) for r in cur.execute(q_p4, v_p4).fetchall()]

    # Calculate KPIs
    act_rows = [r for r in p1_rows if r.get("data_type") == "Thực hiện"]
    pln_rows = [r for r in p1_rows if r.get("data_type") == "Kế hoạch"]
    
    tot_act_m2 = sum(r.get("recovery_total", 0) or 0 for r in act_rows)
    tot_pln_m2 = sum(r.get("recovery_total", 0) or 0 for r in pln_rows)
    tot_act_a1 = sum(r.get("a1", 0) or 0 for r in act_rows)
    tot_pln_a1 = sum(r.get("a1", 0) or 0 for r in pln_rows)
    
    pct_complete = (tot_act_m2 / tot_pln_m2 * 100) if tot_pln_m2 > 0 else 0
    pct_a1_act = (tot_act_a1 / tot_act_m2 * 100) if tot_act_m2 > 0 else 0
    pct_a1_pln = (tot_pln_a1 / tot_pln_m2 * 100) if tot_pln_m2 > 0 else 0
    
    tot_coal_used = sum(r.get("total_used_weight", 0) or 0 for r in p4_rows)
    tot_coal_prod_m2 = sum(r.get("production_m2", 0) or 0 for r in p4_rows)
    avg_coal_rate = (tot_coal_used / tot_coal_prod_m2) if tot_coal_prod_m2 > 0 else (tot_coal_used / tot_act_m2 if tot_act_m2 > 0 else 0)
    
    tot_stop_2mf = sum(r.get("stop_time_2mf", 0) or 0 for r in act_rows)
    tot_prod_days = sum(r.get("prod_days", 0) or 0 for r in act_rows)

    # Period Title String
    month_title_str = f"THÁNG {int(month):02d}/{year}" if month != "all" else f"NĂM {year} (TỪ THÁNG 01 ĐẾN THÁNG 09)"
    now = datetime.datetime.now()
    date_signed_str = f"Đồng Nai, ngày {now.day:02d} tháng {now.month:02d} năm {now.year}"
    
    line_label = "Toàn bộ Nhà máy (DC1 & DC2)" if line == "all" else f"Dây chuyền {line}"
    size_label = "Tất cả kích thước" if size == "all" else f"Kích thước {size}"
    filter_desc = f"Kỳ: {month_title_str}   |   Dây chuyền: {line_label}   |   Kích thước: {size_label}"

    # =============================================================
    # SHEET 1: BÁO CÁO TỔNG HỢP (TRÌNH KÝ BAN GIÁM ĐỐC)
    # =============================================================
    ws1 = wb.active
    ws1.title = "Báo cáo Tổng hợp"
    ws1.views.sheetView[0].showGridLines = True

    # 1. Header block
    ws1["A1"] = "CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM"
    ws1["A2"] = "PHÂN XƯỞNG SẢN XUẤT MEN & XƯƠNG"
    ws1["A3"] = "❖ ❖ ❖"

    ws1["I1"] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
    ws1["I2"] = "Độc lập - Tự do - Hạnh phúc"
    ws1["I3"] = date_signed_str

    ws1.merge_cells("A1:E1")
    ws1.merge_cells("A2:E2")
    ws1.merge_cells("A3:E3")
    ws1.merge_cells("I1:M1")
    ws1.merge_cells("I2:M2")
    ws1.merge_cells("I3:M3")

    style_merged_range(ws1, "A1:E1", font=f_company, alignment=align_center)
    style_merged_range(ws1, "A2:E2", font=f_subdept, alignment=align_center)
    style_merged_range(ws1, "A3:E3", font=Font(name=font_family, size=9), alignment=align_center)
    style_merged_range(ws1, "I1:M1", font=f_nation, alignment=align_center)
    style_merged_range(ws1, "I2:M2", font=f_motto, alignment=align_center)
    style_merged_range(ws1, "I3:M3", font=f_date, alignment=align_center)

    # Title
    ws1["A5"] = f"BÁO CÁO TỔNG HỢP KẾT QUẢ SẢN XUẤT {month_title_str}"
    ws1["A6"] = "Dây chuyền 1 & Dây chuyền 2 - Tiêu chuẩn Kỹ thuật & Chất lượng TCVN"
    ws1["A7"] = filter_desc

    ws1.merge_cells("A5:M5")
    ws1.merge_cells("A6:M6")
    ws1.merge_cells("A7:M7")

    style_merged_range(ws1, "A5:M5", font=f_report_title, alignment=align_center)
    style_merged_range(ws1, "A6:M6", font=f_report_sub, alignment=align_center)
    style_merged_range(ws1, "A7:M7", font=f_filter_info, alignment=align_center)

    # KPI Cards Block (Rows 9-11)
    kpi_cards = [
        ("A9:C9", "A10:C10", "A11:C11", "TỔNG SẢN LƯỢNG THU HỒI", f"{tot_act_m2:,.2f} m²", f"Đạt {pct_complete:.1f}% KH ({tot_pln_m2:,.2f} m²)"),
        ("D9:F9", "D10:F10", "D11:F11", "TỶ LỆ A1 BÌNH QUÂN", f"{pct_a1_act:.2f}%", f"KH: {pct_a1_pln:.2f}% | CL: {pct_a1_act - pct_a1_pln:+.2f}%"),
        ("G9:I9", "G10:I10", "G11:I11", "TIÊU HAO THAN CỤC BQ", f"{avg_coal_rate:.3f} kg/m²", f"Tổng than: {tot_coal_used:,.0f} kg"),
        ("J9:M9", "J10:M10", "J11:M11", "THỜI GIAN DỪNG MÁY 2MF", f"{tot_stop_2mf:,.0f} phút", f"Chạy {tot_prod_days:.1f} ngày ({tot_stop_2mf/60:.1f} giờ)")
    ]
    for top_r, mid_r, bot_r, title_k, val_k, sub_k in kpi_cards:
        c_top_cell = top_r.split(":")[0]
        c_mid_cell = mid_r.split(":")[0]
        c_bot_cell = bot_r.split(":")[0]

        ws1[c_top_cell] = title_k
        ws1[c_mid_cell] = val_k
        ws1[c_bot_cell] = sub_k

        ws1.merge_cells(top_r)
        ws1.merge_cells(mid_r)
        ws1.merge_cells(bot_r)

        style_merged_range(ws1, top_r, font=f_kpi_title, fill=fill_kpi, alignment=align_center, border=border_thin)
        style_merged_range(ws1, mid_r, font=f_kpi_val, fill=fill_kpi, alignment=align_center, border=border_thin)
        style_merged_range(ws1, bot_r, font=f_kpi_sub, fill=fill_kpi, alignment=align_center, border=border_thin)

    curr_row = 13

    # -------------------------------------------------------------
    # KHỐI I: SẢN LƯỢNG - CHẤT LƯỢNG - THU HỒI TỔNG HỢP
    # -------------------------------------------------------------
    ws1[f"A{curr_row}"] = "PHẦN I: KẾT QUẢ SẢN XUẤT, CHẤT LƯỢNG & THU HỒI TỔNG HỢP (M²)"
    ws1.merge_cells(f"A{curr_row}:M{curr_row}")
    style_merged_range(ws1, f"A{curr_row}:M{curr_row}", font=f_sec_header, fill=fill_sec_header, alignment=Alignment(horizontal="left", vertical="center", indent=1))
    curr_row += 1

    headers_p1 = ["STT", "Dòng Men / Sản Phẩm", "DC", "Kích Thước", "Loại Số Liệu", "SL Ép (m²)", "A1 (m²)", "A (m²)", "B (m²)", "Tổng Thu Hồi (m²)", "Tỷ Lệ A1 (%)", "Ngày SX", "Dừng Máy (p)"]
    for col_idx, h in enumerate(headers_p1, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=h)
        cell.font = f_th
        cell.fill = fill_th
        cell.alignment = align_center
        cell.border = border_thin
    curr_row += 1

    sum_ep = sum_a1 = sum_a = sum_b = sum_tong = sum_days = sum_stop = 0
    for idx, r in enumerate(p1_rows, start=1):
        sl_ep = r.get("sl_ep", 0) or 0
        a1 = r.get("a1", 0) or 0
        a = r.get("a", 0) or 0
        b = r.get("b", 0) or 0
        tong = r.get("recovery_total", 0) or (a1 + a + b)
        pct_a1 = (a1 / tong * 100) if tong > 0 else 0
        days = r.get("prod_days", 0) or 0
        stop = r.get("stop_time_2mf", 0) or 0

        sum_ep += sl_ep
        sum_a1 += a1
        sum_a += a
        sum_b += b
        sum_tong += tong
        sum_days += days
        sum_stop += stop

        row_vals = [
            idx, r.get("product_line", "Phương Nam"), r.get("line", ""), r.get("size", ""),
            r.get("data_type", "Thực hiện"), sl_ep, a1, a, b, tong, pct_a1 / 100.0, days, stop
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws1.cell(row=curr_row, column=col_idx, value=val)
            cell.font = f_data
            cell.border = border_thin
            if col_idx in [1, 3, 4, 5]:
                cell.alignment = align_center
            elif col_idx == 2:
                cell.alignment = align_left
            elif col_idx == 11:
                cell.alignment = align_right
                cell.number_format = num_fmt_pct
                cell.font = f_data_green
            elif col_idx in [12, 13]:
                cell.alignment = align_right
                cell.number_format = num_fmt_int
            else:
                cell.alignment = align_right
                cell.number_format = num_fmt_qty
        curr_row += 1

    # Part I Total Row
    pct_a1_tot = (sum_a1 / sum_tong) if sum_tong > 0 else 0
    tot_p1_vals = ["TỔNG CỘNG PHẦN I", "", "", "", "", sum_ep, sum_a1, sum_a, sum_b, sum_tong, pct_a1_tot, sum_days, sum_stop]
    for col_idx, val in enumerate(tot_p1_vals, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=val)
        cell.font = f_total
        cell.fill = fill_total
        cell.border = border_total
        if col_idx == 1:
            cell.alignment = align_center
        elif col_idx == 11:
            cell.alignment = align_right
            cell.number_format = num_fmt_pct
        elif col_idx in [12, 13]:
            cell.alignment = align_right
            cell.number_format = num_fmt_int
        elif col_idx > 5:
            cell.alignment = align_right
            cell.number_format = num_fmt_qty
    ws1.merge_cells(f"A{curr_row}:E{curr_row}")
    curr_row += 2

    # -------------------------------------------------------------
    # KHỐI II: CƠ CẤU THƯƠNG HIỆU
    # -------------------------------------------------------------
    ws1[f"A{curr_row}"] = "PHẦN II: CƠ CẤU SẢN LƯỢNG THỰC HIỆN THEO CÁC THƯƠNG HIỆU"
    ws1.merge_cells(f"A{curr_row}:M{curr_row}")
    style_merged_range(ws1, f"A{curr_row}:M{curr_row}", font=f_sec_header, fill=fill_sec_header, alignment=Alignment(horizontal="left", vertical="center", indent=1))
    curr_row += 1

    headers_p2 = ["STT", "Thương Hiệu / Nhãn Hàng", "DC", "Kích Thước", "Dòng Men", "Loại A1 (m²)", "Loại A (m²)", "Loại B (m²)", "Tổng Sản Lượng (m²)", "Tỷ Lệ A1 (%)", "Cơ Cấu (%)", "", ""]
    for col_idx, h in enumerate(headers_p2, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=h)
        cell.font = f_th
        cell.fill = fill_th
        cell.alignment = align_center
        cell.border = border_thin
    ws1.merge_cells(f"K{curr_row}:M{curr_row}")
    curr_row += 1

    sum_p2_a1 = sum_p2_a = sum_p2_b = sum_p2_tot = 0
    for idx, r in enumerate(p2_rows, start=1):
        a1 = r.get("a1_m2", 0) or 0
        a = r.get("a_m2", 0) or 0
        b = r.get("b_m2", 0) or 0
        tot = r.get("total_m2", 0) or (a1 + a + b)
        pct_a1 = (a1 / tot) if tot > 0 else 0
        share_pct = (tot / p2_grand_total) if p2_grand_total > 0 else 0

        sum_p2_a1 += a1
        sum_p2_a += a
        sum_p2_b += b
        sum_p2_tot += tot

        row_vals = [
            idx, r.get("brand_name", ""), r.get("line", ""), r.get("size", ""),
            r.get("glaze_type", "Phương Nam"), a1, a, b, tot, pct_a1, share_pct, "", ""
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws1.cell(row=curr_row, column=col_idx, value=val)
            cell.font = f_data
            cell.border = border_thin
            if col_idx in [1, 3, 4]:
                cell.alignment = align_center
            elif col_idx in [2, 5]:
                cell.alignment = align_left
            elif col_idx in [10, 11]:
                cell.alignment = align_right
                cell.number_format = num_fmt_pct
                if col_idx == 10: cell.font = f_data_green
            elif col_idx in [6, 7, 8, 9]:
                cell.alignment = align_right
                cell.number_format = num_fmt_qty
        
        ws1.merge_cells(f"K{curr_row}:M{curr_row}")
        curr_row += 1

    # Part II Total Row
    pct_p2_a1_tot = (sum_p2_a1 / sum_p2_tot) if sum_p2_tot > 0 else 0
    tot_p2_vals = ["TỔNG CỘNG PHẦN II (KHỚP 100% PHẦN I)", "", "", "", "", sum_p2_a1, sum_p2_a, sum_p2_b, sum_p2_tot, pct_p2_a1_tot, 1.0, "", ""]
    for col_idx, val in enumerate(tot_p2_vals, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=val)
        cell.font = f_total
        cell.fill = fill_total
        cell.border = border_total
        if col_idx == 1:
            cell.alignment = align_center
        elif col_idx in [10, 11]:
            cell.alignment = align_right
            cell.number_format = num_fmt_pct
        elif col_idx in [6, 7, 8, 9]:
            cell.alignment = align_right
            cell.number_format = num_fmt_qty
    ws1.merge_cells(f"A{curr_row}:E{curr_row}")
    ws1.merge_cells(f"K{curr_row}:M{curr_row}")
    curr_row += 2

    # -------------------------------------------------------------
    # KHỐI III: TIÊU HAO NGUYÊN LIỆU & VẬT TƯ
    # -------------------------------------------------------------
    ws1[f"A{curr_row}"] = "PHẦN III: TỔNG HỢP TIÊU HAO NGUYÊN LIỆU, VẬT TƯ & HAO HỤT"
    ws1.merge_cells(f"A{curr_row}:M{curr_row}")
    style_merged_range(ws1, f"A{curr_row}:M{curr_row}", font=f_sec_header, fill=fill_sec_header, alignment=Alignment(horizontal="left", vertical="center", indent=1))
    curr_row += 1

    headers_p3 = ["STT", "Tên Nguyên Liệu / Vật Tư", "DC", "Kích Thước", "ĐVT", "Định Mức Kỳ", "Lượng Sử Dụng", "SL Tính ĐM (m²)", "Tiêu Hao Thực Tế", "Chênh Lệch Vượt/Giảm", "Đánh Giá", "", ""]
    for col_idx, h in enumerate(headers_p3, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=h)
        cell.font = f_th
        cell.fill = fill_th
        cell.alignment = align_center
        cell.border = border_thin
    ws1.merge_cells(f"K{curr_row}:M{curr_row}")
    curr_row += 1

    for idx, r in enumerate(p3_rows, start=1):
        norm_v = r.get("norm_value", 0) or 0
        used_q = r.get("used_qty", 0) or 0
        prod_m2 = r.get("prod_qty", 0) or 0
        act_r = r.get("actual_rate", 0) or 0
        diff_q = r.get("diff_qty", 0) or 0
        status_txt = "Đạt ĐM ✓" if diff_q <= 0 else "Vượt ĐM ✗"
        if used_q == 0 and act_r == 0:
            status_txt = "Chưa nhập"

        row_vals = [
            idx, r.get("material_name", ""), r.get("line", ""), r.get("size", ""),
            r.get("unit", "Kg"), norm_v, used_q, prod_m2, act_r, diff_q, status_txt, "", ""
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws1.cell(row=curr_row, column=col_idx, value=val)
            cell.font = f_data
            cell.border = border_thin
            if col_idx in [1, 3, 4, 5]:
                cell.alignment = align_center
            elif col_idx == 2:
                cell.alignment = align_left
            elif col_idx in [6, 9]:
                cell.alignment = align_right
                cell.number_format = num_fmt_rate
            elif col_idx in [7, 8, 10]:
                cell.alignment = align_right
                cell.number_format = num_fmt_qty
                if col_idx == 10:
                    cell.font = f_data_green if diff_q <= 0 else f_data_red
            elif col_idx == 11:
                cell.alignment = align_center
                cell.font = f_data_green if diff_q <= 0 else f_data_red
        
        ws1.merge_cells(f"K{curr_row}:M{curr_row}")
        curr_row += 1

    curr_row += 1

    # -------------------------------------------------------------
    # KHỐI IV: SỬ DỤNG THAN KHÍ HÓA & NĂNG LƯỢNG
    # -------------------------------------------------------------
    ws1[f"A{curr_row}"] = "PHẦN IV: TÌNH HÌNH SỬ DỤNG THAN KHÍ HÓA & NĂNG LƯỢNG"
    ws1.merge_cells(f"A{curr_row}:M{curr_row}")
    style_merged_range(ws1, f"A{curr_row}:M{curr_row}", font=f_sec_header, fill=fill_sec_header, alignment=Alignment(horizontal="left", vertical="center", indent=1))
    curr_row += 1

    headers_p4 = ["STT", "Nhà Cung Cấp / Lô Than", "DC", "Công Đoạn", "Nhiệt Trị (Kcal)", "% Cám TT", "% Cám TC", "KL Lĩnh (kg)", "Xuất Cám (kg)", "Lĩnh Bù (kg)", "Tổng Dùng (kg)", "SL Gạch (m²)", "Suất Cục / Tổng (kg/m²)"]
    for col_idx, h in enumerate(headers_p4[:12], start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=h)
        cell.font = f_th
        cell.fill = fill_th
        cell.alignment = align_center
        cell.border = border_thin
    ws1.merge_cells(f"L{curr_row}:M{curr_row}")
    curr_row += 1

    sum_p4_issued = sum_p4_ash = sum_p4_comp = sum_p4_used = sum_p4_m2 = 0
    for idx, r in enumerate(p4_rows, start=1):
        heat = r.get("heat_value", 0) or 0
        ash_p = (r.get("ash_rate", 0) or 0) / 100.0
        std_ash_p = (r.get("std_ash_rate", 0) or 0) / 100.0
        iss = r.get("issued_weight", 0) or 0
        ash_w = r.get("ash_weight", 0) or 0
        comp = r.get("compensation_weight", 0) or 0
        used = r.get("total_used_weight", 0) or (iss + ash_w + comp)
        m2 = r.get("production_m2", 0) or 0
        r_lump = r.get("rate_lump", 0) or ((iss / m2) if m2 > 0 else 0)
        r_tot = r.get("rate_total", 0) or ((used / m2) if m2 > 0 else 0)

        sum_p4_issued += iss
        sum_p4_ash += ash_w
        sum_p4_comp += comp
        sum_p4_used += used
        sum_p4_m2 += m2

        row_vals = [
            idx, r.get("coal_supplier", ""), r.get("line", ""), r.get("firing_type", "Nung"),
            heat, ash_p, std_ash_p, iss, ash_w, comp, used, m2, r_tot
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws1.cell(row=curr_row, column=col_idx, value=val)
            cell.font = f_data
            cell.border = border_thin
            if col_idx in [1, 3, 4]:
                cell.alignment = align_center
            elif col_idx == 2:
                cell.alignment = align_left
            elif col_idx == 5:
                cell.alignment = align_right
                cell.number_format = num_fmt_int
            elif col_idx in [6, 7]:
                cell.alignment = align_right
                cell.number_format = num_fmt_pct
            elif col_idx in [8, 9, 10, 11, 12]:
                cell.alignment = align_right
                cell.number_format = num_fmt_qty
            elif col_idx == 13:
                cell.alignment = align_right
                cell.number_format = num_fmt_rate
                cell.font = f_data_blue
        
        ws1.merge_cells(f"L{curr_row}:M{curr_row}")
        curr_row += 1

    # Part IV Total Row
    tot_r_tot = (sum_p4_used / sum_p4_m2) if sum_p4_m2 > 0 else 0
    tot_p4_vals = ["TỔNG CỘNG PHẦN IV", "", "", "", "", "", "", sum_p4_issued, sum_p4_ash, sum_p4_comp, sum_p4_used, sum_p4_m2, tot_r_tot]
    for col_idx, val in enumerate(tot_p4_vals, start=1):
        cell = ws1.cell(row=curr_row, column=col_idx, value=val)
        cell.font = f_total
        cell.fill = fill_total
        cell.border = border_total
        if col_idx == 1:
            cell.alignment = align_center
        elif col_idx in [8, 9, 10, 11, 12]:
            cell.alignment = align_right
            cell.number_format = num_fmt_qty
        elif col_idx == 13:
            cell.alignment = align_right
            cell.number_format = num_fmt_rate
    ws1.merge_cells(f"A{curr_row}:G{curr_row}")
    ws1.merge_cells(f"L{curr_row}:M{curr_row}")
    curr_row += 3

    # -------------------------------------------------------------
    # FOOTER: CHỮ KÝ PHÊ DUYỆT (4 CỘT CHUẨN NGHỊ ĐỊNH 30/2020)
    # -------------------------------------------------------------
    sig_positions = [
        ("A", "C", "NGƯỜI LẬP BIỂU", "(Ký, ghi rõ họ tên)"),
        ("D", "F", "PT.BP TỔNG HỢP / THK", "(Ký, ghi rõ họ tên)"),
        ("G", "I", "QUẢN ĐỐC PHÂN XƯỞNG", "(Ký, ghi rõ họ tên)"),
        ("J", "M", "BAN GIÁM ĐỐC DUYỆT", "(Ký, đóng dấu)")
    ]
    for c_s, c_e, title_sig, sub_sig in sig_positions:
        ws1[f"{c_s}{curr_row}"] = title_sig
        ws1[f"{c_s}{curr_row+1}"] = sub_sig
        ws1.merge_cells(f"{c_s}{curr_row}:{c_e}{curr_row}")
        ws1.merge_cells(f"{c_s}{curr_row+1}:{c_e}{curr_row+1}")
        style_merged_range(ws1, f"{c_s}{curr_row}:{c_e}{curr_row}", font=Font(name=font_family, size=10, bold=True, color="0F172A"), alignment=align_center)
        style_merged_range(ws1, f"{c_s}{curr_row+1}:{c_e}{curr_row+1}", font=Font(name=font_family, size=8.5, italic=True, color="64748B"), alignment=align_center)

    # Column Widths Auto-Adjustment for Sheet 1 (Optimal Proportions)
    col_widths = {
        "A": 5, "B": 30, "C": 6, "D": 11, "E": 12, "F": 13, "G": 13, "H": 12, "I": 12, "J": 14, "K": 12, "L": 11, "M": 11
    }
    for col_letter, width in col_widths.items():
        ws1.column_dimensions[col_letter].width = width

    # =============================================================
    # SHEET 2: RAW DATA I - SẢN LƯỢNG
    # =============================================================
    ws2 = wb.create_sheet(title="Data I - Sản Lượng")
    ws2.views.sheetView[0].showGridLines = True
    cols_s2 = ["ID", "STT", "Tháng", "Năm", "Dây Chuyền", "Kích Thước", "Dòng Men", "Loại Số Liệu", "SL Ép (m²)", "A1 (m²)", "A (m²)", "B (m²)", "Tổng Thu Hồi (m²)", "% A1", "% A", "% B", "Ngày SX", "Dừng 2MF (p)", "Tổng Dừng (p)"]
    for c_idx, h in enumerate(cols_s2, 1):
        c = ws2.cell(row=1, column=c_idx, value=h)
        c.font = f_th
        c.fill = fill_th
        c.alignment = align_center
        c.border = border_thin
    for r_idx, r in enumerate(p1_rows, 2):
        vals = [
            r.get("id"), r.get("stt"), r.get("month"), r.get("year"), r.get("line"), r.get("size"),
            r.get("product_line"), r.get("data_type"), r.get("sl_ep"), r.get("a1"), r.get("a"), r.get("b"),
            r.get("recovery_total"), r.get("pct_a1"), r.get("pct_a"), r.get("pct_b"), r.get("prod_days"),
            r.get("stop_time_2mf"), r.get("stop_time_total")
        ]
        for c_idx, v in enumerate(vals, 1):
            c = ws2.cell(row=r_idx, column=c_idx, value=v)
            c.font = f_data
            c.border = border_thin
            if c_idx in [9, 10, 11, 12, 13]:
                c.number_format = num_fmt_qty
                c.alignment = align_right
            elif c_idx in [14, 15, 16]:
                c.number_format = num_fmt_pct
                c.alignment = align_right
            elif c_idx in [17, 18, 19]:
                c.number_format = num_fmt_qty
                c.alignment = align_right
            else:
                c.alignment = align_center if c_idx in [1,2,3,4,5,6,8] else align_left

    # =============================================================
    # SHEET 3: RAW DATA II - THƯƠNG HIỆU
    # =============================================================
    ws3 = wb.create_sheet(title="Data II - Thương Hiệu")
    ws3.views.sheetView[0].showGridLines = True
    q_raw_p2 = f"SELECT * FROM data_brand_production {clause_p2} ORDER BY id ASC"
    raw_p2_rows = [dict(r) for r in cur.execute(q_raw_p2, v_p2).fetchall()]
    cols_s3 = ["ID", "STT", "Tháng", "Năm", "Dây Chuyền", "Kích Thước", "Dòng Men", "Thương Hiệu / Nhãn Hàng", "Phân Loại", "Sản Lượng (m²)"]
    for c_idx, h in enumerate(cols_s3, 1):
        c = ws3.cell(row=1, column=c_idx, value=h)
        c.font = f_th
        c.fill = fill_th
        c.alignment = align_center
        c.border = border_thin
    for r_idx, r in enumerate(raw_p2_rows, 2):
        vals = [
            r.get("id"), r.get("stt"), r.get("month"), r.get("year"), r.get("line"), r.get("size"),
            r.get("glaze_type"), r.get("brand_name"), r.get("grade"), r.get("quantity_m2")
        ]
        for c_idx, v in enumerate(vals, 1):
            c = ws3.cell(row=r_idx, column=c_idx, value=v)
            c.font = f_data
            c.border = border_thin
            if c_idx == 10:
                c.number_format = num_fmt_qty
                c.alignment = align_right
            elif c_idx in [1,2,3,4,5,6,9]:
                c.alignment = align_center
            else:
                c.alignment = align_left

    # =============================================================
    # SHEET 4: RAW DATA III - TIÊU HAO VẬT TƯ
    # =============================================================
    ws4 = wb.create_sheet(title="Data III - Tiêu Hao Vật Tư")
    ws4.views.sheetView[0].showGridLines = True
    cols_s4 = ["ID", "STT", "Tháng", "Năm", "Dây Chuyền", "Kích Thước", "Tên Nguyên Liệu / Vật Tư", "ĐVT", "Định Mức", "Lượng Sử Dụng", "SL Tính Tiêu Hao (m²)", "Tiêu Hao Thực Tế", "Lượng Giảm", "Lượng Vượt", "Chênh Lệch", "Trạng Thái"]
    for c_idx, h in enumerate(cols_s4, 1):
        c = ws4.cell(row=1, column=c_idx, value=h)
        c.font = f_th
        c.fill = fill_th
        c.alignment = align_center
        c.border = border_thin
    for r_idx, r in enumerate(p3_rows, 2):
        vals = [
            r.get("id"), r.get("stt"), r.get("month"), r.get("year"), r.get("line"), r.get("size"),
            r.get("material_name"), r.get("unit"), r.get("norm_value"), r.get("used_qty"),
            r.get("prod_qty"), r.get("actual_rate"), r.get("reduced_qty"), r.get("over_qty"),
            r.get("diff_qty"), r.get("status_text")
        ]
        for c_idx, v in enumerate(vals, 1):
            c = ws4.cell(row=r_idx, column=c_idx, value=v)
            c.font = f_data
            c.border = border_thin
            if c_idx in [9, 12]:
                c.number_format = num_fmt_rate
                c.alignment = align_right
            elif c_idx in [10, 11, 13, 14, 15]:
                c.number_format = num_fmt_qty
                c.alignment = align_right
            elif c_idx in [1,2,3,4,5,6,8,16]:
                c.alignment = align_center
            else:
                c.alignment = align_left

    # =============================================================
    # SHEET 5: RAW DATA IV - SỬ DỤNG THAN
    # =============================================================
    ws5 = wb.create_sheet(title="Data IV - Sử Dụng Than")
    ws5.views.sheetView[0].showGridLines = True
    cols_s5 = ["ID", "STT", "Tháng", "Năm", "Dây Chuyền", "Kích Thước", "Nhà Cung Cấp", "Kho Than", "Ngày Nhập", "Công Đoạn", "Nhiệt Trị", "% Cám TT", "% Cám TC", "% Đá", "KL Lĩnh (kg)", "Xuất Cám (kg)", "% Xuất Cám", "Lĩnh Bù (kg)", "Cám Vượt (kg)", "Tổng Dùng (kg)", "Sản Lượng (m²)", "Suất Cục", "Suất Kèm Cám", "Suất Tổng", "Ghi Chú"]
    for c_idx, h in enumerate(cols_s5, 1):
        c = ws5.cell(row=1, column=c_idx, value=h)
        c.font = f_th
        c.fill = fill_th
        c.alignment = align_center
        c.border = border_thin
    for r_idx, r in enumerate(p4_rows, 2):
        vals = [
            r.get("id"), r.get("stt"), r.get("month"), r.get("year"), r.get("line"), r.get("size"),
            r.get("coal_supplier"), r.get("warehouse"), r.get("import_date"), r.get("firing_type"),
            r.get("heat_value"), r.get("ash_rate"), r.get("std_ash_rate"), r.get("stone_rate"),
            r.get("issued_weight"), r.get("ash_weight"), r.get("ash_export_rate"), r.get("compensation_weight"),
            r.get("excess_ash_weight"), r.get("total_used_weight"), r.get("production_m2"),
            r.get("rate_lump"), r.get("rate_with_ash"), r.get("rate_total"), r.get("note")
        ]
        for c_idx, v in enumerate(vals, 1):
            c = ws5.cell(row=r_idx, column=c_idx, value=v)
            c.font = f_data
            c.border = border_thin
            if c_idx in [11, 15, 16, 18, 19, 20, 21]:
                c.number_format = num_fmt_qty
                c.alignment = align_right
            elif c_idx in [12, 13, 14, 17]:
                c.number_format = num_fmt_pct
                c.alignment = align_right
            elif c_idx in [22, 23, 24]:
                c.number_format = num_fmt_rate
                c.alignment = align_right
            elif c_idx in [1,2,3,4,5,6,8,9,10]:
                c.alignment = align_center
            else:
                c.alignment = align_left

    # Auto-adjust column widths for Raw Data Sheets
    for ws in [ws2, ws3, ws4, ws5]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

    out_stream = io.BytesIO()
    wb.save(out_stream)
    out_stream.seek(0)
    return out_stream.getvalue()
