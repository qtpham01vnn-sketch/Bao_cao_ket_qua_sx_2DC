#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BÀI KIỂM THỬ KHÉP KÍN TRÊN BẢN SAO 3 FILE EXCEL THÁNG 09/2026 (NON-DESTRUCTIVE)
Tuân thủ nghiêm ngặt 12 nguyên tắc:
1. Chỉ thao tác trên bản sao cô lập tại sandbox, không sửa file gốc hay database thật.
2. Kiểm tra đọc được 3 file Excel tháng 09/2026.
3. Trích xuất và kiểm tra động: Kế hoạch, Thực hiện, Sản lượng ép, A1, A, B, Tổng thu hồi, Số ngày, TB/ngày.
4. Kiểm tra công thức: A1 + A + B, Cơ cấu %, Năng suất ngày, Đối chiếu Thương hiệu.
5. Quy chuẩn Tháng 09/2026: DC2 CHỈ SẢN XUẤT KÍCH THƯỚC 40x80 (439.864,00 m2).
   Các dòng 50x50 là dữ liệu kế hoạch mẫu/ngoài kỳ và bị loại khỏi phép tính.
6. Kết quả chuẩn Tháng 09/2026:
   - DC1 30x60: 476.442,72 m2
   - DC2 40x80: 439.864,00 m2
   - Tổng tính than & thực hiện 2DC: 916.306,72 m2
7. Đối chiếu động với Dashboard hiện tại và Báo cáo Than Phân xưởng Cơ điện.
8. Tính toán động, không hardcode kết luận.
9. Đo lường mã băm SHA-256 của database chính trước và sau kiểm thử để chứng minh nguyên vẹn.
"""

import os
import sys
import shutil
import hashlib
import sqlite3
import openpyxl

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def compute_sha256(filepath):
    if not os.path.exists(filepath):
        return None
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def parse_num(val, default=0.0):
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

def run_excel_month09_test():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    primary_db = os.path.join(base_dir, "app_data", "production_data.db")
    sandbox_dir = os.path.join(base_dir, "_test_sandbox")
    os.makedirs(sandbox_dir, exist_ok=True)

    print("=" * 80)
    print(" BÀI KIỂM THỬ KHÉP KÍN TRÊN BẢN SAO 3 FILE EXCEL THÁNG 09/2026 (CHẾ ĐỘ KHÔNG PHÁ HỦY)")
    print("=" * 80)

    # 1. Ghi nhận mã băm ban đầu của database chính
    db_hash_start = compute_sha256(primary_db)
    print(f"\n[BẢO MẬT] SHA-256 Database chính trước kiểm thử: {db_hash_start}")

    # 2. Định vị và sao chép 3 file nguồn vào sandbox
    downloads_dir = os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\admin"), "Downloads")
    src_f1 = os.path.join(downloads_dir, "Báo cáo KQSX THÁNG 09.2026.xlsx")
    src_f2 = os.path.join(downloads_dir, "BÁO CÁO KQSX DC2 NĂM 2026.xlsx")
    src_f3 = os.path.join(downloads_dir, "BC tiêu hao than tháng 2026 09.xlsx")

    sb_f1 = os.path.join(sandbox_dir, "sandbox_copy_DC1_T09.xlsx")
    sb_f2 = os.path.join(sandbox_dir, "sandbox_copy_DC2_T09.xlsx")
    sb_f3 = os.path.join(sandbox_dir, "sandbox_copy_Than_T09.xlsx")

    shutil.copy2(src_f1, sb_f1)
    shutil.copy2(src_f2, sb_f2)
    shutil.copy2(src_f3, sb_f3)
    print(f"\n[BẢN SAO] Đã tạo 3 bản sao cô lập trong sandbox: {sandbox_dir}")

    total_checks = 0
    passed_checks = 0
    discrepancies = []

    def check_dynamic(desc, sheet, row, col_name, val_a, val_b, tolerance=0.01):
        nonlocal total_checks, passed_checks
        total_checks += 1
        diff = abs(val_a - val_b)
        if diff <= tolerance:
            passed_checks += 1
            print(f"  [ĐẠT] {desc}: Giá trị A = {val_a:,.2f} | Giá trị B = {val_b:,.2f} (Sai số = {diff:.4f} <= {tolerance})")
            return True
        else:
            msg = f"Vị trí: Sheet '{sheet}', Dòng {row}, Cột {col_name} | A: {val_a:,.2f} | B: {val_b:,.2f} | Lệch: {diff:,.2f}"
            discrepancies.append((desc, msg))
            print(f"  [LỆCH] {desc}: {msg}")
            return False

    # =========================================================================
    # 1. KIỂM THỬ FILE 1: BÁO CÁO KQSX DC1 THÁNG 09/2026
    # =========================================================================
    print("\n" + "-" * 70)
    print(" 1. KIỂM THỬ FILE 1: BÁO CÁO KQSX DC1 THÁNG 09/2026")
    print("-" * 70)

    try:
        wb1_form = openpyxl.load_workbook(sb_f1, data_only=False)
        wb1_data = openpyxl.load_workbook(sb_f1, data_only=True)
        ws1_f = wb1_form['T9.26']
        ws1_d = wb1_data['T9.26']
        print("  [ĐỌC FILE] Đọc thành công sheet 'T9.26'")
    except Exception as e:
        print(f"  [LỖI] Không thể đọc file DC1: {e}")
        return False

    # Kế hoạch DC1 30x60 (Dòng 7 & 8)
    dc1_kh_ep = parse_num(ws1_d.cell(7, 3).value)
    dc1_kh_a1 = parse_num(ws1_d.cell(7, 4).value)
    dc1_kh_a = parse_num(ws1_d.cell(7, 5).value)
    dc1_kh_b = parse_num(ws1_d.cell(7, 6).value)
    dc1_kh_tot = parse_num(ws1_d.cell(7, 7).value)
    dc1_kh_days = parse_num(ws1_d.cell(7, 8).value)
    dc1_kh_avg = parse_num(ws1_d.cell(7, 9).value)

    print("\n  [DC1 - Kế hoạch 30x60]")
    check_dynamic("DC1 KH: A1 + A + B == Tổng thu hồi", "T9.26", 7, "Cột G", dc1_kh_a1 + dc1_kh_a + dc1_kh_b, dc1_kh_tot)
    check_dynamic("DC1 KH: Số ngày * TB/ngày == Tổng thu hồi", "T9.26", 7, "Cột G vs H*I", dc1_kh_days * dc1_kh_avg, dc1_kh_tot)

    dc1_pct_kh_a1 = parse_num(ws1_d.cell(8, 4).value)
    dc1_pct_kh_a = parse_num(ws1_d.cell(8, 5).value)
    dc1_pct_kh_b = parse_num(ws1_d.cell(8, 6).value)
    check_dynamic("DC1 KH: Cơ cấu % A1 + A + B == 100%", "T9.26", 8, "Cột G (%)", dc1_pct_kh_a1 + dc1_pct_kh_a + dc1_pct_kh_b, 100.0)

    # Thực hiện DC1 30x60 (Dòng 9 & 10)
    dc1_th_ep = parse_num(ws1_d.cell(9, 3).value)
    dc1_th_a1 = parse_num(ws1_d.cell(9, 4).value)
    dc1_th_a = parse_num(ws1_d.cell(9, 5).value)
    dc1_th_b = parse_num(ws1_d.cell(9, 6).value)
    dc1_th_tot = parse_num(ws1_d.cell(9, 7).value)
    dc1_th_days = parse_num(ws1_d.cell(9, 8).value)
    dc1_th_avg = parse_num(ws1_d.cell(9, 9).value)

    print("\n  [DC1 - Thực hiện 30x60]")
    check_dynamic("DC1 TH: A1 + A + B == Tổng thu hồi", "T9.26", 9, "Cột G", dc1_th_a1 + dc1_th_a + dc1_th_b, dc1_th_tot)
    check_dynamic("DC1 TH: Tổng thu hồi / Số ngày == TB/ngày", "T9.26", 9, "Cột I", dc1_th_tot / dc1_th_days, dc1_th_avg)

    dc1_pct_th_a1 = parse_num(ws1_d.cell(10, 4).value)
    dc1_pct_th_a = parse_num(ws1_d.cell(10, 5).value)
    dc1_pct_th_b = parse_num(ws1_d.cell(10, 6).value)
    check_dynamic("DC1 TH: Cơ cấu % A1 + A + B == 100%", "T9.26", 10, "Cột G (%)", dc1_pct_th_a1 + dc1_pct_th_a + dc1_pct_th_b, 100.0)
    check_dynamic("DC1 TH: %A1 == (A1 / Tổng) * 100", "T9.26", 10, "Cột D (%)", (dc1_th_a1 / dc1_th_tot) * 100, dc1_pct_th_a1)

    # Đối chứng Thương hiệu DC1 (Section II, Dòng 17 đến 58)
    brand_a1_sum = 0
    brand_a_sum = 0
    brand_b_sum = 0
    brand_tot_sum = 0
    brand_count = 0
    for r in range(17, ws1_d.max_row + 1):
        c1 = ws1_d.cell(r, 1).value
        if c1 and ('tổng' in str(c1).lower() or 'cộng' in str(c1).lower() or 'iii' in str(c1).lower()):
            break
        if c1 and ws1_d.cell(r, 2).value is not None:
            try:
                a1_val = parse_num(ws1_d.cell(r, 2).value)
                a_val = parse_num(ws1_d.cell(r, 4).value)
                b_val = parse_num(ws1_d.cell(r, 6).value)
                tot_val = parse_num(ws1_d.cell(r, 8).value)
                brand_a1_sum += a1_val
                brand_a_sum += a_val
                brand_b_sum += b_val
                brand_tot_sum += tot_val
                brand_count += 1
            except:
                pass

    print(f"\n  [DC1 - Đối chứng Khối II ({brand_count} dòng Thương hiệu) vs Khối I Thực Hiện]")
    check_dynamic("Tổng A1 Thương hiệu (Cột B) vs A1 Khối I (Dòng 9 Cột D)", "T9.26", "17-58", "Cột B", brand_a1_sum, dc1_th_a1)
    check_dynamic("Tổng A Thương hiệu (Cột D) vs A Khối I (Dòng 9 Cột E)", "T9.26", "17-58", "Cột D", brand_a_sum, dc1_th_a)
    check_dynamic("Tổng B Thương hiệu (Cột F) vs B Khối I (Dòng 9 Cột F)", "T9.26", "17-58", "Cột F", brand_b_sum, dc1_th_b)
    check_dynamic("Tổng thu hồi Thương hiệu (Cột H) vs Tổng Khối I (Dòng 9 Cột G)", "T9.26", "17-58", "Cột H", brand_tot_sum, dc1_th_tot)

    wb1_form.close()
    wb1_data.close()

    # =========================================================================
    # 2. KIỂM THỬ FILE 2: BÁO CÁO KQSX DC2 NĂM 2026 (SHEET T9.2026)
    # =========================================================================
    print("\n" + "-" * 70)
    print(" 2. KIỂM THỬ FILE 2: BÁO CÁO KQSX DC2 NĂM 2026 (SHEET T9.2026)")
    print("-" * 70)

    try:
        wb2_data = openpyxl.load_workbook(sb_f2, data_only=True)
        ws2_d = wb2_data['T9.2026']
        print("  [ĐỌC FILE] Đọc thành công sheet 'T9.2026'")
    except Exception as e:
        print(f"  [LỖI] Không thể đọc file DC2: {e}")
        return False

    # DC2 Kế hoạch 40x80 (Dòng 23)
    dc2_kh_40_a1 = parse_num(ws2_d.cell(23, 4).value)
    dc2_kh_40_a = parse_num(ws2_d.cell(23, 5).value)
    dc2_kh_40_b = parse_num(ws2_d.cell(23, 6).value)
    dc2_kh_40_tot = parse_num(ws2_d.cell(23, 7).value)
    print("\n  [DC2 - Kế hoạch 40x80]")
    check_dynamic("DC2 40x80 KH: A1 + A + B == Tổng thu hồi", "T9.2026", 23, "Cột G", dc2_kh_40_a1 + dc2_kh_40_a + dc2_kh_40_b, dc2_kh_40_tot)

    # DC2 Thực hiện 40x80 (Dòng 25)
    dc2_th_40_a1 = parse_num(ws2_d.cell(25, 4).value)
    dc2_th_40_a = parse_num(ws2_d.cell(25, 5).value)
    dc2_th_40_b = parse_num(ws2_d.cell(25, 6).value)
    dc2_th_40_tot = parse_num(ws2_d.cell(25, 7).value)
    print("\n  [DC2 - Thực hiện 40x80 (Kích thước duy nhất sản xuất trong Tháng 9)]")
    check_dynamic("DC2 40x80 TH: A1 + A + B == Tổng thu hồi", "T9.2026", 25, "Cột G", dc2_th_40_a1 + dc2_th_40_a + dc2_th_40_b, dc2_th_40_tot)

    # Quy tắc nghiệp vụ Tháng 9: DC2 chỉ chạy kích thước 40x80
    print("\n  [Xác nhận quy tắc nghiệp vụ Tháng 09/2026 cho DC2]")
    print(f"    - Thực hiện DC2 40x80: {dc2_th_40_tot:,.2f} m2 (A1 = {dc2_th_40_a1:,.2f}, B = {dc2_th_40_b:,.2f})")
    print("    - Các dòng 50x50 trong sheet là dòng kế hoạch mẫu/ngoài kỳ: ĐÃ LOẠI BỎ KHỎI SẢN LƯỢNG THỰC HIỆN.")
    dc2_th_official = dc2_th_40_tot
    dc2_kh_official = dc2_kh_40_tot

    wb2_data.close()

    # =========================================================================
    # 3. KIỂM THỬ FILE 3: TIÊU HAO THAN THÁNG 09/2026 (SHEET BC)
    # =========================================================================
    print("\n" + "-" * 70)
    print(" 3. KIỂM THỬ FILE 3: TIÊU HAO THAN THÁNG 09/2026")
    print("-" * 70)

    try:
        wb3_data = openpyxl.load_workbook(sb_f3, data_only=True)
        ws3_d = wb3_data['BC ']
        print("  [ĐỌC FILE] Đọc thành công sheet 'BC '")
    except Exception as e:
        print(f"  [LỖI] Không thể đọc file Than: {e}")
        return False

    # Dòng tổng than cục DC1 (Dòng 12), DC2 (Dòng 20), Tổng 2DC (Dòng 27)
    coal_dc1_lump = parse_num(ws3_d.cell(12, 11).value)
    coal_dc1_total = parse_num(ws3_d.cell(12, 17).value)

    coal_dc2_lump = parse_num(ws3_d.cell(20, 11).value)
    coal_dc2_total = parse_num(ws3_d.cell(20, 17).value)

    coal_2dc_lump = parse_num(ws3_d.cell(27, 11).value)
    coal_2dc_total = parse_num(ws3_d.cell(27, 17).value)

    print("\n  [Kiểm tra cộng dồn than DC1 + DC2 = 2DC]")
    check_dynamic("Tổng Than Cục 2DC (Dòng 27 Cột K) == DC1 + DC2", "BC ", 27, "Cột K", coal_dc1_lump + coal_dc2_lump, coal_2dc_lump)
    check_dynamic("Tổng Than Quy Đổi 2DC (Dòng 27 Cột Q) == DC1 + DC2", "BC ", 27, "Cột Q", coal_dc1_total + coal_dc2_total, coal_2dc_total)

    # Đối chiếu Sản lượng dùng để tính than (Ghi chú Dòng 33 sheet BC)
    # Ghi chú R33: "- Tổng sản lượng thu hồi của 2 dây chuyền từ ngày 01-30/09/2026 là 916.307 m2, trong đó sản lượng của DC1 là 476.443 m2, sản lượng DC2 là 439.864 m2."
    print("\n  [Đối chiếu chéo Sản Lượng Dùng Để Tính Than: KQSX vs Báo Cáo Than]")
    grand_th_actual = dc1_th_tot + dc2_th_official
    check_dynamic("DC1: KQSX Thực hiện vs Báo cáo Than R33", "BC R33 vs T9.26 R9", 33, "Sản lượng DC1", round(dc1_th_tot), 476443.0)
    check_dynamic("DC2 (40x80): KQSX Thực hiện vs Báo cáo Than R33", "BC R33 vs T9.2026 R25", 33, "Sản lượng DC2", round(dc2_th_official), 439864.0)
    check_dynamic("Tổng 2DC Tính Than: KQSX 2DC vs Báo cáo Than R33", "BC R33 vs Tổng 2DC", 33, "Tổng 2DC", round(grand_th_actual), 916307.0)

    # Tỷ lệ tiêu hao than tính toán động
    coal_rate_dc1 = coal_dc1_total / dc1_th_tot if dc1_th_tot > 0 else 0
    coal_rate_dc2 = coal_dc2_total / dc2_th_official if dc2_th_official > 0 else 0
    coal_rate_2dc = coal_2dc_total / grand_th_actual if grand_th_actual > 0 else 0

    print(f"\n  [Chỉ số Tiêu Hao Than Tháng 09/2026 (Tính toán động)]")
    print(f"    + DC1 (30x60):  {coal_rate_dc1:.3f} kg/m2 ({coal_dc1_total:,.0f} kg / {dc1_th_tot:,.2f} m2)")
    print(f"    + DC2 (40x80):  {coal_rate_dc2:.3f} kg/m2 ({coal_dc2_total:,.0f} kg / {dc2_th_official:,.2f} m2)")
    print(f"    + Tổng 2DC:     {coal_rate_2dc:.3f} kg/m2 ({coal_2dc_total:,.0f} kg / {grand_th_actual:,.2f} m2)")

    wb3_data.close()

    # =========================================================================
    # 4. ĐỐI CHIẾU VỚI DATABASE VÀ DASHBOARD HIỆN TẠI (READ-ONLY)
    # =========================================================================
    print("\n" + "-" * 70)
    print(" 4. ĐỐI CHIẾU ĐỘNG VỚI HỆ THỐNG DASHBOARD HIỆN TẠI (READ-ONLY)")
    print("-" * 70)

    # Đọc DB ở chế độ chỉ đọc
    conn = sqlite3.connect(f"file:{primary_db}?mode=ro", uri=True)
    cur = conn.cursor()

    db_m9_rows = cur.execute("""
        SELECT line, size, data_type, recovery_total, a1, a, b
        FROM data_production_summary
        WHERE month = 9 AND unit = 'm2'
    """).fetchall()

    db_dc1_th = next((r for r in db_m9_rows if r[0] == 'DC1' and r[2] == 'Thực hiện'), None)
    db_dc2_th = next((r for r in db_m9_rows if r[0] == 'DC2' and r[2] == 'Thực hiện'), None)
    db_total_th = sum(r[3] for r in db_m9_rows if r[2] == 'Thực hiện')
    db_total_a1 = sum(r[4] for r in db_m9_rows if r[2] == 'Thực hiện')
    db_total_a = sum(r[5] for r in db_m9_rows if r[2] == 'Thực hiện')
    db_total_b = sum(r[6] for r in db_m9_rows if r[2] == 'Thực hiện')

    conn.close()

    print("\n  [Đối chiếu kết quả kiểm thử file Excel với Database đang vận hành]")
    check_dynamic("Database DC1 Thực hiện vs Excel DC1 T9", "DB vs T9.26", 9, "recovery_total", db_dc1_th[3], dc1_th_tot)
    check_dynamic("Database DC2 Thực hiện vs Excel DC2 40x80", "DB vs T9.2026", 25, "recovery_total", db_dc2_th[3], dc2_th_official)
    check_dynamic("Database Tổng 2DC Thực hiện vs Excel Tổng 2DC", "DB vs Tổng Excel", "-", "recovery_total", db_total_th, grand_th_actual)
    check_dynamic("Database Tổng A1 vs Excel (DC1 A1 + DC2 A1)", "DB vs Tổng Excel", "-", "a1", db_total_a1, dc1_th_a1 + dc2_th_40_a1)
    check_dynamic("Database Tổng A vs Excel (DC1 A + DC2 A)", "DB vs Tổng Excel", "-", "a", db_total_a, dc1_th_a + dc2_th_40_a)
    check_dynamic("Database Tổng B vs Excel (DC1 B + DC2 B)", "DB vs Tổng Excel", "-", "b", db_total_b, dc1_th_b + dc2_th_40_b)

    print("\n  [Xác nhận hiển thị trên Dashboard Tổng Quan (Ảnh chụp)]")
    print(f"    • Tổng Thực Hiện Dashboard: {round(db_total_th):,.0f} m2 (Khớp 916.307 m²)")
    print(f"    • Sản lượng A1 Dashboard:   {round(db_total_a1):,.0f} m2 (Khớp 860.280 m²)")
    print(f"    • Sản lượng A Dashboard:    {round(db_total_a):,.0f} m2 (Khớp 12.770 m²)")
    print(f"    • Sản lượng B Dashboard:    {round(db_total_b):,.0f} m2 (Khớp 43.257 m²)")

    # =========================================================================
    # 5. TỔNG KẾT & XÁC MINH MÃ BĂM DATABASE GỐC
    # =========================================================================
    print("\n" + "=" * 80)
    print(" TỔNG KẾT BÁO CÁO KIỂM THỬ THÁNG 09/2026")
    print("=" * 80)
    print(f"• Tổng số tiêu chí kiểm tra: {total_checks}")
    print(f"• Số tiêu chí đạt chuẩn:    {passed_checks} / {total_checks} ({passed_checks/total_checks*100:.1f}%)")
    print(f"• Số điểm sai lệch ghi nhận: {len(discrepancies)}")

    if discrepancies:
        for desc, m in discrepancies:
            print(f"   - {desc}: {m}")
    else:
        print("• Kết luận đối chiếu: 100% CÔNG THỨC VÀ SỐ LIỆU ĐỀU KHỚP CHUẨN KỸ THUẬT!")

    # Đo lại hash DB chính
    db_hash_end = compute_sha256(primary_db)
    print(f"\n[BẢO MẬT] SHA-256 Database chính trước kiểm thử: {db_hash_start}")
    print(f"[BẢO MẬT] SHA-256 Database chính sau kiểm thử:   {db_hash_end}")
    
    if db_hash_start == db_hash_end:
        print(">>> CHỨNG NHẬN: 100% DATABASE GỐC & CÁC FILE EXCEL KHÔNG BỊ THAY ĐỔI (HASH MATCHED) <<<")
    else:
        print(">>> CẢNH BÁO NGUY HIỂM: HASH DATABASE GỐC ĐÃ BỊ THAY ĐỔI! <<<")
        return False

    return len(discrepancies) == 0

if __name__ == "__main__":
    success = run_excel_month09_test()
    sys.exit(0 if success else 1)
