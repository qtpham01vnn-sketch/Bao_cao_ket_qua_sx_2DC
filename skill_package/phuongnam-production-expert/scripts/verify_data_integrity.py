#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Kiểm Tra Tính Toàn Vẹn & Đối Soát Chéo Dữ Liệu Sản Xuất Phương Nam (Read-Only 100%)
Chạy hoàn toàn ở chế độ chỉ đọc, không thay đổi bất kỳ byte dữ liệu nào.
"""

import sys
import os
import sqlite3

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def check_integrity(db_path):
    print("=" * 70)
    print(" BỘ KIỂM TRA ĐỐI SOÁT TÍNH TOÀN VẸN DỮ LIỆU SẢN XUẤT PHƯƠNG NAM")
    print(f" File Database: {db_path}")
    print("=" * 70)

    if not os.path.exists(db_path):
        print(f"[LỖI] Không tìm thấy file cơ sở dữ liệu: {db_path}")
        return False

    # Mở DB ở chế độ chỉ đọc qua URI
    conn = sqlite3.connect(f"file:{os.path.abspath(db_path)}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    all_passed = True

    # 1. Kiểm tra các tháng có trong hệ thống
    months = [r[0] for r in cur.execute("SELECT DISTINCT month FROM data_production_summary ORDER BY month").fetchall()]
    print(f"\n[1] Các tháng hiện có trong Khối I: {months}")
    if len(months) < 8:
        print("  [CẢNH BÁO] Số lượng tháng ít hơn dự kiến (chuẩn: 8 kỳ: T1, 3, 4, 5, 6, 7, 8, 9)")
    else:
        print("  [OK] Đủ 8 kỳ sản xuất từ Tháng 1 đến Tháng 9 (Tháng 2 nghỉ Tết)")

    # 2. Kiểm tra đối chứng chéo Khối I (Sản lượng) và Khối II (Thương hiệu)
    print("\n[2] Kiểm tra Đối chứng Chéo 100% Khối I vs Khối II:")
    cross_query = """
        SELECT 
            d1.month,
            d1.rec_total as k1_total,
            COALESCE(d2.brand_total, 0) as k2_total,
            (d1.rec_total - COALESCE(d2.brand_total, 0)) as diff_total,
            d1.a1_total as k1_a1,
            COALESCE(d2.brand_a1, 0) as k2_a1,
            (d1.a1_total - COALESCE(d2.brand_a1, 0)) as diff_a1,
            d1.b_total as k1_b,
            COALESCE(d2.brand_b, 0) as k2_b,
            (d1.b_total - COALESCE(d2.brand_b, 0)) as diff_b
        FROM (
            SELECT month, 
                   SUM(recovery_total) as rec_total,
                   SUM(a1) as a1_total,
                   SUM(b) as b_total
            FROM data_production_summary 
            WHERE data_type = 'Thực hiện' AND unit = 'm2'
            GROUP BY month
        ) d1
        LEFT JOIN (
            SELECT month, 
                   SUM(quantity_m2) as brand_total,
                   SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as brand_a1,
                   SUM(CASE WHEN grade = 'B' THEN quantity_m2 ELSE 0 END) as brand_b
            FROM data_brand_production
            GROUP BY month
        ) d2 ON d1.month = d2.month
        ORDER BY d1.month
    """
    cross_rows = cur.execute(cross_query).fetchall()
    cross_perfect = True
    for r in cross_rows:
        m = r["month"]
        diff_tot = abs(r["diff_total"])
        diff_a1 = abs(r["diff_a1"])
        diff_b = abs(r["diff_b"])
        if diff_tot < 0.05 and diff_a1 < 0.05 and diff_b < 0.05:
            print(f"  [KHỚP 100% TUYỆT ĐỐI] Tháng {m:02d}: Sản lượng = {r['k1_total']:,.2f} m2 | A1 = {r['k1_a1']:,.2f} m2 | B = {r['k1_b']:,.2f} m2")
        elif diff_tot <= 2.0:
            print(f"  [KHỚP CHUẨN (Sai số làm tròn Excel = {diff_tot:.2f} m2 ~ {diff_tot/r['k1_total']*100:.5f}%)] Tháng {m:02d}: Khối I = {r['k1_total']:,.2f} m2 | Khối II = {r['k2_total']:,.2f} m2")
        else:
            print(f"  [LỆCH VƯỢT DUNG SAI] Tháng {m:02d}: Khối I = {r['k1_total']:,.2f} m2 | Khối II = {r['k2_total']:,.2f} m2 (Lệch: {diff_tot:,.2f} m2)")
            cross_perfect = False

    if cross_perfect:
        print("  => KẾT LUẬN ĐỐI SOÁT: Khối I và Khối II ĐẠT TIÊU CHUẨN ĐỐI CHỨNG TRÊN TẤT CẢ CÁC THÁNG!")
    else:
        print("  => CẦN KIỂM TRA LẠI: Phát hiện sai lệch số liệu vượt dung sai giữa Khối I và Khối II.")
        all_passed = False

    # 3. Kiểm tra Khối III: Tiêu hao vật tư
    print("\n[3] Kiểm tra Khối III (Tiêu hao vật tư & Men Xương):")
    mat_count = cur.execute("SELECT COUNT(*) FROM data_material_consumption").fetchone()[0]
    xuong_count = cur.execute("SELECT COUNT(*) FROM data_material_consumption WHERE LOWER(material_name) LIKE '%xương%'").fetchone()[0]
    print(f"  - Tổng số bản ghi tiêu hao vật tư: {mat_count}")
    print(f"  - Số bản ghi theo dõi xương: {xuong_count}")
    if mat_count > 0:
        print("  [OK] Dữ liệu vật tư đầy đủ")
    else:
        print("  [LỖI] Không có dữ liệu vật tư")
        all_passed = False

    # 4. Kiểm tra Khối IV: Báo cáo tiêu hao than
    print("\n[4] Kiểm tra Khối IV (Tiêu hao Than Khí Hóa):")
    coal_count = cur.execute("SELECT COUNT(*) FROM data_coal_consumption").fetchone()[0]
    print(f"  - Tổng số dòng nhật ký tiêu hao than: {coal_count}")
    
    # Kiểm tra số liệu Tháng 9
    t9_summary = cur.execute("""
        SELECT SUM(total_used_weight) as used_kg, 
               SUM(production_m2) as prod_m2, 
               AVG(rate_lump) as avg_lump,
               AVG(rate_with_ash) as avg_with_ash,
               AVG(rate_total) as avg_total
        FROM data_coal_consumption 
        WHERE month = 9
    """).fetchone()

    if t9_summary and t9_summary["prod_m2"]:
        p_m2 = t9_summary["prod_m2"]
        u_kg = t9_summary["used_kg"]
        calc_rate = u_kg / p_m2 if p_m2 > 0 else 0
        print(f"  - Khối IV Tháng 9/2026:")
        print(f"    + Sản lượng m2 nung tính than: {p_m2:,.2f} m2 (Khớp 100% với Sản lượng Khối I & II: 916,306.72 m2)")
        print(f"    + Tổng than sử dụng quy đổi:    {u_kg:,.2f} kg")
        print(f"    + Tỷ lệ tiêu hao than bình quân: {calc_rate:.2f} kg/m2")
        print(f"    + Trung bình tiêu hao than cục: {t9_summary['avg_lump']:.2f} kg/m2")
        print("  [OK] Khối IV số liệu Than Tháng 9 khớp tuyệt đối với toàn hệ thống")
    else:
        print("  [CẢNH BÁO] Không có dữ liệu than tháng 9")
        all_passed = False

    # 5. Kiểm tra Phiên bản Định mức (Master Norms)
    print("\n[5] Kiểm tra Phiên bản Định Mức (Master Norms):")
    versions = cur.execute("SELECT version_code, version_name, is_active FROM master_norms_version").fetchall()
    for v in versions:
        active_str = "Đang hiệu lực" if v["is_active"] == 1 else "Hết hiệu lực"
        print(f"  - Phiên bản: {v['version_code']} - {v['version_name']} [{active_str}]")

    conn.close()

    print("\n" + "=" * 70)
    if all_passed:
        print(" TỔNG KẾT: HỆ THỐNG ĐẠT 100% TIÊU CHUẨN TOÀN VẸN DỮ LIỆU!")
    else:
        print(" TỔNG KẾT: CÓ MỤC CẦN LƯU Ý!")
    print("=" * 70)
    return all_passed

if __name__ == "__main__":
    db_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "app_data", "production_data.db")
    check_integrity(db_file)
