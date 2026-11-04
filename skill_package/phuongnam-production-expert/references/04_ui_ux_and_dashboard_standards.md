# TIÊU CHUẨN GIAO DIỆN & THIẾT KẾ DASHBOARD (UI/UX DESIGN SYSTEM)

Giao diện người dùng của Hệ thống Quản trị Sản xuất Phương Nam được thiết kế theo phong cách hiện đại (Dark Cyberpunk & Corporate Light), tối ưu hóa trải nghiệm điều hành phân xưởng, hiển thị trực quan dữ liệu lớn và tương thích trên máy tính bảng/màn hình điều khiển tại hiện trường.

---

## 🎨 I. HỆ THỐNG MÀU SẮC (COLOR PALETTE)

### 1. Dark Mode (Chế độ mặc định - Tối ưu làm việc ca kíp)
* **Background chính:** `#0b1320` (Xanh đêm sâu)
* **Card / Container:** `#132238` (Xanh hải quân đậm)
* **Border / Divider:** `#1e3557` (Xanh thép)
* **Màu điểm nhấn (Accents):**
  * Cyan Neon: `#00f2fe`
  * Blue Gradient: `#4facfe`
  * Emerald Green (Đạt / Tốt): `#10b981`
  * Amber Yellow (Cảnh báo / Tạm dừng): `#f59e0b`
  * Crimson Red (Vượt định mức / Lỗi): `#ef4444`

### 2. Light Mode (Chế độ in ấn & Trình chiếu)
* **Background chính:** `#f8fafc`
* **Card / Container:** `#ffffff`
* **Border:** `#e2e8f0`
* **Chữ chính:** `#0f172a` (Slate 900)

---

## 🧭 II. BỐ CỤC KHÔNG GIAN ĐIỀU HÀNH (LAYOUT ARCHITECTURE)

### 1. Thanh điều hướng bên trái (Sidebar)
* **Thương hiệu:** Logo PX Gạch Men Phương Nam & khẩu hiệu *"Quản lý Xưởng Men & Xương"*.
* **Khối Quản trị Hệ thống:** Nút Quản trị viên, Đổi MK, Thoát và Nút Cài đặt ứng dụng PWA (`Add to Home Screen`).
* **Không gian điều hành:**
  1. `Dashboard Tổng Quan` (Icon Grid)
  2. `Sản lượng - Chất lượng` (Icon Activity)
  3. `Thương hiệu` (Icon Tag)
  4. `Tiêu hao vật tư` (Icon Cube)
  5. `Sử dụng than` (Icon Flame)
  6. `Báo cáo trình ký` (Icon FileText)
  7. `Quản lý Danh mục (Master)` (Icon Database)

### 2. Thanh tiêu đề trên cùng (Top Header)
* **Breadcrumb:** Điều hành sản xuất > Mục đang xem.
* **Đồng hồ đếm ngược phiên làm việc:** Hiển thị thời gian truy cập (ví dụ: `Đồng hồ 25h: 24:59:58`).
* **Bộ chọn vai trò:** Quản trị viên (Toàn quyền) / Quản đốc / Khách mời.
* **Nút đổi Tone Sáng / Tối:** Chuyển đổi mượt mà giữa Dark và Light theme.
* **Thanh tác vụ nhanh:** `In / Tải PDF`, `Xuất Excel`, `Đồng bộ 4 phần`, `Đặt lại`.

---

## 📊 III. CẤU TRÚC DASHBOARD TỔNG QUAN (4 PHẦN MỤC ĐỒNG BỘ)

### 1. Phần I: Sản Lượng - Chất Lượng - Thu Hồi Tổng
* **Bộ lọc thời gian ma trận:**
  * Các nút tháng: Tháng 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12.
  * Phím tắt chọn nhanh: `T1 - T6 (6T Đầu)`, `T7 - T9 (Quý 3)`, `T1 - T9 (Lũy kế 9T)`, `Tất cả (T1-T12)`.
  * Bộ chọn dải tháng: `Từ T[ ] Đến T[ ]` kèm nút `Áp Dụng`.
* **Bộ lọc Dây chuyền:** `Tất cả` | `DC1` | `DC2`.
* **Bộ lọc Kích thước:** `Tất cả` | `30x60` | `50x50` | `40x80` | `60x60`.
* **Biểu đồ Cột Nhóm (Grouped Bar Chart - Chart.js):** So sánh từng tháng giữa **Kế hoạch** (cột xám nhạt) vs **Thực hiện** (cột xanh lục đậm).
* **Cặp Biểu Đồ Tròn Kép (Dual Donut Charts):**
  * Donut 1: **Chất Lượng Thực Hiện (%)** - Cơ cấu $A1$ (xanh lá), $A$ (vàng cam), $B$ (đỏ). Hiển thị số liệu chi tiết: Sản lượng A1, A, B, Số ngày SX, TB/ngày, T/G Dừng 2MF.
  * Donut 2: **Chất Lượng Kế Hoạch (%)** - Đối ứng tương đương để so sánh độ lệch.

### 2. Phần II: Sản Lượng Thương Hiệu
* Bộ lọc thương hiệu động (chỉ tải thương hiệu có sản xuất trong kỳ đã chọn).
* Biểu đồ phân bổ cơ cấu top thương hiệu.
* **Bảng chi tiết 33 dòng sản phẩm:**
  * Cột thông tin: STT, Tên thương hiệu, Dây chuyền, Kích cỡ, Dòng men, Sản lượng m², A1, A, B, % Tỷ trọng đóng góp.
  * **Dòng Tổng Cộng Nổi Bật:** Nền xanh bạc hà nhạt, tính tổng toàn bộ sản lượng và cơ cấu A1-A-B.
  * **Thẻ Đối Chứng Chéo Khối I & II:** Hiển thị trạng thái so khớp đối chiếu tự động (Màu xanh nếu chênh lệch nằm trong ngưỡng dung sai kỹ thuật cho phép, màu vàng/đỏ nếu phát hiện độ lệch vượt ngưỡng kèm thông số sai số cụ thể).

### 3. Phần III: Tiêu Hao Vật Tư & Nguyên Liệu
* **4 Thẻ Chỉ Số Nhanh:** Tổng vật tư dùng (kg), Tổng lượng tiết kiệm (kg), Tổng lượng vượt (kg), Phân bổ Men & Xương.
* **Bảng 12 Cột:** Kẻ bảng chi tiết định mức, sử dụng, sản lượng m², tỷ lệ thực tế, chênh lệch.
* Cảnh báo màu: Xanh lục cho các dòng tiết kiệm, Đỏ cho các dòng vượt định mức.

### 4. Phần IV: Sử Dụng Than Khí Hóa
* **4 Thẻ Chỉ Số Nhiên Liệu:** Tổng than xuất kho, Tổng than sử dụng quy đổi, Sản lượng m² nung, Tỷ lệ tiêu hao bình quân.
* **Bảng 17 Cột Kẻ Bảng:** Chuẩn hóa theo biểu mẫu của Phân xưởng Cơ điện - Năng lượng, kẻ rõ từng lô than, độ tro $A_k$, tỷ lệ cám ($13,50\%$) và tỷ lệ xít đá ($3,63\%$).
* **Biểu đồ Đường (Trend Line Chart):** Diễn biến chỉ số tiêu hao than qua các tháng so với mức trần $2,70\text{ kg/m}^2$.

---

## ⚡ IV. NÚT ĐỒNG BỘ 4 PHẦN (GLOBAL SYNC)
Nhằm tạo sự thuận tiện tối đa cho người dùng khi phân tích dữ liệu:
* Khi bấm nút **"Đồng bộ 4 phần"** trên thanh Header:
  * Hệ thống tự động lấy bộ lọc Thời gian, Dây chuyền, Kích thước của Phần I để áp dụng đồng loạt cho Phần II, Phần III và Phần IV.
  * Toàn bộ Dashboard cập nhật đồng thời chỉ trong 1 thao tác duy nhất.
