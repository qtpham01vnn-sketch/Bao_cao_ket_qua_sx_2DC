# HỆ THỐNG QUẢN TRỊ SẢN XUẤT 2 DÂY CHUYỀN - GẠCH MEN PHƯƠNG NAM (2026)

Ứng dụng Web App quản lý, đối soát và báo cáo tự động kết quả sản xuất 2 Dây chuyền (DC1 & DC2), tiêu hao nguyên vật liệu (Men · Xương · Vật tư) và than khí hóa theo chuẩn biểu mẫu Ban Giám đốc & Phân xưởng Cơ điện - Năng lượng.

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI NHANH (DEPLOY GUIDE)

### 1. Chạy Thử Local (Máy tính cá nhân)
```bash
# Khởi động Web Server tại cổng 8080
python3 app/server.py
```
👉 Truy cập: `http://localhost:8080`

---

### 2. Đẩy Code Lên GitHub (Push to GitHub)
```bash
# Thêm toàn bộ mã nguồn
git add .

# Commit phiên bản hoàn chỉnh
git commit -m "feat: Hoàn thiện Web App Quản Trị SX Phương Nam 2026 (Full 4 Khối Data & Than)"

# Đặt nhánh chính là main
git branch -M main

# Thêm remote repository GitHub của bạn (thay URL bằng link repo của bạn)
# git remote add origin https://github.com/<tai-khoan-cua-ban>/Bao_cao_ket_qua_sx_2DC.git

# Đẩy code lên GitHub
# git push -u origin main
```

---

### 3. Deploy Lên Vercel (1 Click Deploy)
1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập bằng tài khoản **GitHub**.
2. Chọn **"Add New Project"** ➔ Chọn repository `Bao_cao_ket_qua_sx_2DC`.
3. Vercel sẽ tự động nhận diện file `vercel.json` và cấu hình Serverless Python (`@vercel/python`) + Static Frontend.
4. Nhấn **"Deploy"** ➔ Chỉ sau 30 giây là bạn đã có link web online để truy cập trên mọi thiết bị (máy tính, điện thoại, máy tính bảng)!

---

### 4. Kết Nối Supabase Cloud Database (Tùy Chọn)
Nếu muốn đồng bộ dữ liệu lên đám mây Supabase PostgreSQL:
1. Tạo một dự án mới trên [Supabase.com](https://supabase.com).
2. Vào mục **SQL Editor** trên Supabase ➔ Mở và chạy file:
   - `app_data/supabase_schema.sql` (Tạo toàn bộ bảng và phân quyền bảo mật)
   - `app_data/supabase_seed.sql` (Nạp toàn bộ dữ liệu từ Tháng 1 đến Tháng 8/2026)
3. Toàn bộ cơ sở dữ liệu đã sẵn sàng trên Cloud!

---

## 📊 TÍNH NĂNG NỔI BẬT ĐÃ HOÀN THIỆN
1. **Tổng Quan Dashboard:** 4 thẻ KPI động, biểu đồ Xu hướng Sản lượng (Thực hiện vs Kế hoạch) & Cơ cấu Thương hiệu (A1/B).
2. **Sản Lượng & Chất Lượng (Data I):** Chuẩn hóa Ngày SX ($30, 4, 8, 18	ext{ ngày}$), Thời gian dừng máy ép 2MF ($40, 16, 100, 48, 13	ext{ p/ng}$).
3. **Thương Hiệu (Data II):** 33 dòng phân loại sản phẩm Tháng 8 DC1, bộ lọc thông minh kèm **Hàng tính tổng $A1 - A - B$** và thẻ đối chứng chéo khớp $100\%$ Data I.
4. **Định Mức Phiên Bản:** Quản lý đa phiên bản định mức (DM-2026-V1, V2...) với ngày hiệu lực, bảo toàn lịch sử cũ, chuẩn hóa mức xương DC1 30x60 = $19,04	ext{ kg/m}^2$.
5. **Tiêu Hao Vật Tư (Data III):** 12 cột chi tiết theo dõi định mức, lượng dùng, tiêu hao thực tế, chênh lệch vượt/giảm.
6. **Sử Dụng Than (Data IV):** 17 cột kẻ bảng chuẩn theo Báo cáo Phân xưởng Cơ điện - Năng lượng, chuẩn hóa tỷ lệ cám ($13,50\%$) và xít đá ($3,63\%$), tính đủ 3 chỉ số Tiêu hao (Than cục $2,38	ext{ kg/m}^2$, Có cám $2,68	ext{ kg/m}^2$, Toàn bộ $2,70	ext{ kg/m}^2$).
7. **Cổng Import 3 File Tháng:** Tự động nạp đồng thời file KQSX DC1, KQSX DC2 và Tiêu hao Than.
8. **Xuất Báo Cáo Trình Ký:** Điền dữ liệu tự động vào Form mẫu 8 phần mục và khối chữ ký trình duyệt Ban Giám đốc.
