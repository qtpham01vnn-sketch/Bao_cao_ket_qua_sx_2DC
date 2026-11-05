# HỆ THỐNG QUẢN TRỊ SẢN XUẤT 2 DÂY CHUYỀN - GẠCH MEN PHƯƠNG NAM (2026)

Ứng dụng Web App quản lý, đối soát và báo cáo tự động kết quả sản xuất 2 Dây chuyền (DC1 & DC2), tiêu hao nguyên vật liệu (Men · Xương · Vật tư) và than khí hóa theo chuẩn biểu mẫu Ban Giám đốc & Phân xưởng Cơ điện - Năng lượng Công ty Cổ phần Gạch Men Phương Nam.

---

## 📑 TÀI LIỆU QUY CHUẨN KỸ THUẬT & CÔNG THỨC
👉 Xem chi tiết toàn bộ công thức toán học, quy chuẩn đơn vị tính (ĐVT) và thuật toán đối soát tại:  
**[QUY_TAC_NGHIEP_VU_VA_CONG_THUC_TINH_TOAN.md](./QUY_TAC_NGHIEP_VU_VA_CONG_THUC_TINH_TOAN.md)**

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI NHANH (DEPLOY GUIDE)

### 1. Kiểm Tra & Build Hệ Thống (Build Verification)
```bash
# Cài đặt hoặc chạy kiểm tra toàn diện cấu trúc & cú pháp
npm run build
```
Lệnh này sẽ tự động:
1. Kiểm tra cú pháp JavaScript (`public/app.js`).
2. Kiểm tra tính toàn vẹn các phần tử DOM trên HTML.
3. Đồng bộ hóa tự động tài nguyên giữa `public/` và `app/public/`.
4. Biên dịch kiểm tra mã nguồn Python backend (`app/server.py`, `app/monthly_importer.py`).
5. Kiểm tra cơ sở dữ liệu SQLite đảm bảo 100% vật tư tuân thủ đúng quy chuẩn ĐVT (Kg / Cái).

---

### 2. Chạy Thử Local (Máy tính cá nhân)
```bash
# Khởi động Web Server tại cổng 8080
npm start
# hoặc: python app/server.py
```
👉 Mở trình duyệt truy cập: `http://localhost:8080`  
*(Nhấn `Ctrl + F5` để luôn tải giao diện mới nhất)*

---

### 3. Đẩy Code Lên GitHub & Tự Động Deploy Lên Vercel
```bash
# Thêm toàn bộ mã nguồn
git add .

# Commit phiên bản mới nhất
git commit -m "feat: cập nhật quy chuẩn ĐVT và công thức tính toán"

# Đẩy code lên nhánh chính
git push origin main
```
* Vercel đã được kết nối với repository GitHub này và sẽ tự động kích hoạt build, triển khai bản cập nhật chỉ sau 30 giây.

---

## 📊 TÍNH NĂNG NỔI BẬT ĐÃ HOÀN THIỆN
1. **Tổng Quan Dashboard:** 4 thẻ KPI động, biểu đồ Xu hướng Sản lượng (Thực hiện vs Kế hoạch) & Cơ cấu Thương hiệu (A1/B).
2. **Sản Lượng & Chất Lượng (Data I):** Chuẩn hóa Ngày SX, Thời gian dừng máy ép 2MF, tính năng suất bình quân và tỷ lệ thu hồi A1-A-B.
3. **Thương Hiệu (Data II):** 33 dòng phân loại sản phẩm, bộ lọc thông minh kèm **Hàng tính tổng A1 - A - B**, thanh trực quan hóa các tháng phát sinh sản lượng và thẻ đối chứng chéo khớp 100% Data I.
4. **Định Mức Phiên Bản:** Quản lý đa phiên bản định mức (DM-2026-V1, V2...) với ngày hiệu lực, bảo toàn lịch sử cũ.
5. **Tiêu Hao Vật Tư (Data III):** 12 cột chi tiết theo dõi định mức, lượng dùng, tiêu hao thực tế, chênh lệch vượt/giảm.
6. **Sử Dụng Than (Data IV):** 17 cột kẻ bảng chuẩn theo Báo cáo Phân xưởng Cơ điện - Năng lượng, chuẩn hóa tỷ lệ cám và xít đá, tính đủ 3 chỉ số Tiêu hao (Than cục, Có cám bù, Toàn bộ).
7. **Trung Tâm Cảnh Báo Anomaly Radar:** Tự động phát hiện các chỉ số vượt định mức, cảnh báo vật tư và than, hiển thị tách bạch `kg` và `cái`.
8. **Cổng Import 3 File Tháng:** Tự động nạp đồng thời file KQSX DC1, KQSX DC2 và Tiêu hao Than; tự động phát hiện sai lệch ĐVT và thông báo nhắc nhở lập tức.
9. **Ký Duyệt Điện Tử & Xuất Báo Cáo:** Điền dữ liệu tự động vào Form mẫu 8 phần mục và khối chữ ký trình duyệt Ban Giám đốc với con dấu điện tử SHA-256.
