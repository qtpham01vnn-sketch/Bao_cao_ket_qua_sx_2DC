#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Kiểm Thử Khép Kín Theo Chế Độ Không Phá Hủy (Non-Destructive Sandbox Test)
Mục đích:
- Tạo bản sao cách ly của database trong sandbox
- Chạy toàn bộ quy trình kiểm tra trên bản sao
- So sánh hash SHA-256 của file database gốc để chứng minh tuyệt đối không bị tác động
"""

import os
import sys
import shutil
import hashlib
import sqlite3

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def run_sandbox_test():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    original_db = os.path.join(base_dir, "app_data", "production_data.db")
    sandbox_dir = os.path.join(base_dir, "_test_sandbox")
    sandbox_db = os.path.join(sandbox_dir, "sandbox_production_data.db")

    print("=" * 70)
    print(" CHẠY THỬ NGHIỆM SANDBOX KHÔNG PHÁ HỦY (NON-DESTRUCTIVE TEST)")
    print("=" * 70)

    # 1. Đo lường SHA-256 ban đầu của DB gốc
    initial_hash = compute_sha256(original_db)
    initial_size = os.path.getsize(original_db)
    print(f"\n[1] File DB gốc: {original_db}")
    print(f"    - Kích thước ban đầu: {initial_size:,} bytes")
    print(f"    - Mã băm SHA-256 ban đầu: {initial_hash}")

    # 2. Tạo bản sao DB vào sandbox
    os.makedirs(sandbox_dir, exist_ok=True)
    shutil.copy2(original_db, sandbox_db)
    print(f"\n[2] Đã nhân bản DB sang Sandbox cách ly: {sandbox_db}")

    # 3. Chạy kiểm tra trên bản sao sandbox
    print("\n[3] Thực thi đối soát trên Database Sandbox:")
    sys.path.insert(0, os.path.dirname(__file__))
    from verify_data_integrity import check_integrity
    passed = check_integrity(sandbox_db)

    # 4. Kiểm tra lại DB gốc để bảo đảm không có bất kỳ thay đổi nào
    final_hash = compute_sha256(original_db)
    final_size = os.path.getsize(original_db)
    print("\n[4] Xác minh bảo toàn tuyệt đối cho File DB gốc:")
    print(f"    - Kích thước hiện tại: {final_size:,} bytes")
    print(f"    - Mã băm SHA-256 hiện tại: {final_hash}")

    if initial_hash == final_hash and initial_size == final_size:
        print("\n  >>> CHỨNG NHẬN AN TOÀN: 100% KHÔNG CÓ BẤT KỲ FILE GỐC NÀO BỊ THAY ĐỔI! <<<")
    else:
        print("\n  >>> CẢNH BÁO: Phát hiện sự thay đổi trên file gốc! <<<")
        return False

    return passed

if __name__ == "__main__":
    success = run_sandbox_test()
    sys.exit(0 if success else 1)
