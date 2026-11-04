# QUY CHUẨN XỬ LÝ EXCEL: CỔNG IMPORT 3 FILE THÁNG & ĐỘNG CƠ XUẤT FORM MẪU

Hệ thống cung cấp 2 cơ chế xử lý Excel mạnh mẽ xây dựng trên nền tảng `openpyxl`:
1. **Cổng nạp dữ liệu tự động 3 File Tháng:** `app/monthly_importer.py`
2. **Động cơ xuất Báo cáo Form Mẫu Trình Ký & Dashboard Excel:** `app/form_mau_engine.py` & `app/dashboard_excel_exporter.py`

---

## 📥 I. CỔNG IMPORT TỰ ĐỘNG 3 FILE THÁNG

Mỗi tháng, phân xưởng cung cấp 3 file Excel nguồn. Hệ thống tiếp nhận qua API `/api/import/monthly`:

### 1. File 1: Kết quả Sản xuất Dây chuyền 1 (DC1)
* **Quy ước tên file/sheet:** Thường có định dạng `Báo cáo KQSX THANG MM.YYYY.xlsx`.
* **Thuật toán quét sheet:** Tìm kiếm sheet có tên chứa `T{month}` (ví dụ `T9.26`, `T8.26`, `THÁNG 8`...).
* **Bóc tách Section I (Sản lượng & Chất lượng):**
  * Quét cột A tìm dòng chứa `"kế hoạch"` và `"30x60"`, `"thực hiện"` và `"30x60"`.
  * **Cột C (col 3):** Sản lượng ép (`sl_ep`).
  * **Cột D (col 4):** Sản lượng loại $A_1$.
  * **Cột E (col 5):** Sản lượng loại $A$.
  * **Cột F (col 6):** Sản lượng loại $B$.
  * **Cột G (col 7):** Tổng thu hồi ($A_1 + A + B$).
  * **Cột H (col 8):** Số ngày sản xuất (`prod_days`).
  * **Cột I (col 9):** Sản lượng bình quân ngày (`avg_per_day`).
  * **Dòng kế tiếp (row + 1):** Tỷ lệ phần trăm $\%A_1$, $\%A$, $\%B$.
* **Bóc tách Section II (Thương hiệu):**
  * Quét từ tiêu đề `"II. Thương hiệu"` đến `"III. Tiêu hao"`.
  * Nhận diện nhóm men (`glaze_type`): Men bóng, Vi tinh, Men matt...
  * Tách riêng cột sản lượng $A_1$ và cột $B$.
* **Bóc tách Section III (Tiêu hao vật tư):**
  * Quét các dòng vật tư: Xương, Men lót, Men phủ, Vỏ điều...
  * Đọc định mức (`norm_value`), khối lượng sử dụng (`used_qty`), sản lượng áp dụng (`prod_qty`), lượng giảm/vượt.

---

### 2. File 2: Kết quả Sản xuất Dây chuyền 2 (DC2)
* **Quy ước file:** `BAO CAO KQSX DC2 NAM 2026.xlsx`
* **Đặc thù DC2 các kỳ thông thường:** Chạy phối hợp các kích thước ($50\times50$, $40\times80$, $60\times60$).
* **Quy chuẩn bắt buộc cho Tháng 09/2026:**
  * DC2 **chỉ sản xuất duy nhất kích thước $40\times80$** ($439,864.00\text{ m}^2$).
  * Tuyệt đối không cộng bất kỳ dòng $50\times50$ nào vào sản lượng thực hiện hoặc nung than của Tháng 9. Các dòng $50\times50$ trong sheet Tháng 9 được xác định là dữ liệu kế hoạch mẫu/ngoài kỳ và phải loại bỏ khỏi phép tính.
* **Bóc tách:** Tự động tổng hợp đúng các kích thước thực tế sản xuất trong kỳ và ghi nhận chuẩn vào DB.

---

### 3. File 3: Báo cáo Tiêu hao Than Khí Hóa
* **Quy ước file:** `BC tiêu hao than tháng YYYY MM.xlsx`
* **Cấu trúc bóc tách:**
  * Lấy dữ liệu trạm khí hóa than cho DC1, DC2 và dòng **Tổng hợp 2DC**.
  * Bóc tách các thông số: Độ tro thực tế ($A_k$), Khối lượng xuất kho, Khối lượng xỉ than.
  * Tự động áp dụng chuẩn: Tỷ lệ cám **$13,50\%$**, Tỷ lệ xít đá **$3,63\%$**.
  * Tính toán 3 chỉ số tiêu hao: Than cục ($2,38$), Có cám ($2,68$), Toàn bộ ($2,70\text{ kg/m}^2$).
  * **Sản lượng nung than Tháng 09/2026:** Đúng bằng $916,306.72\text{ m}^2$ (gồm DC1 $30\times60$: $476,442.72\text{ m}^2$ và DC2 $40\times80$: $439,864.00\text{ m}^2$).

---

## 📤 II. ĐỘNG CƠ XUẤT FORM MẪU BÁO CÁO TRÌNH KÝ 8 PHẦN MỤC

Được định nghĩa trong `app/form_mau_engine.py`, tự động tổng hợp số liệu theo Tháng, Quý, 6 Tháng hoặc Cả Năm.

### Cấu trúc 8 Phần Mục Trình Ký Chuẩn:

```text
[QUỐC HIỆU & TIÊU NGỮ]
CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM
PHÂN XƯỞNG SẢN XUẤT 2 DÂY CHUYỀN
Số: ...... /BC-PXMN

BÁO CÁO KẾT QUẢ SẢN XUẤT - TIÊU HAO NGUYÊN NHIÊN VẬT TƯ
Kỳ báo cáo: THÁNG 09 NĂM 2026 (Hoặc QUÝ III / NĂM 2026)

MỤC I: TÌNH HÌNH LAO ĐỘNG & NHÂN SỰ
  - Ca 1, Ca 2, Ca 3, Tổ cơ điện, Văn phòng phân xưởng.
  - Tổng số lao động, ngày công thực tế, ngày công vắng mặt.

MỤC II: KẾ HOẠCH SẢN XUẤT & CHỈ TIÊU KỸ THUẬT KỲ TỚI
  - Dự kiến sản lượng m2 DC1 & DC2, cơ cấu thương hiệu mục tiêu.

MỤC III: KẾT QUẢ SẢN XUẤT - CHẤT LƯỢNG - THU HỒI
  - Kế hoạch vs Thực hiện (m2 ép, A1, A, B, Tổng thu hồi, %A1, %A, %B).
  - So sánh tỷ lệ hoàn thành kế hoạch (%).

MỤC IV: CƠ CẤU SẢN LƯỢNG THEO THƯƠNG HIỆU & DÒNG SẢN PHẨM
  - Bảng chi tiết 33 dòng sản phẩm, phân theo DC1 & DC2.
  - Dòng tổng cộng A1, A, B và tỷ trọng % đóng góp.

MỤC V: TÌNH HÌNH TIÊU HAO NGUYÊN VẬT LIỆU (MEN - XƯƠNG - VẬT TƯ)
  - Đánh giá theo phiên bản định mức ban hành (DM-2026-V1/V2).
  - Bảng 12 cột chi tiết: Tiết kiệm / Vượt định mức từng loại vật tư.

MỤC VI: TÌNH HÌNH SỬ DỤNG THAN KHÍ HÓA & NĂNG LƯỢNG
  - Than nung, than sấy, điện năng, dầu DO/FO.
  - 3 chỉ số tiêu hao than: Than cục, Có cám, Toàn bộ.

MỤC VII: TÌNH HÌNH THIẾT BỊ & THỜI GIAN DỪNG MÁY
  - Thời gian dừng máy ép 2MF thực tế vs định mức kế hoạch.
  - Sự cố công nghệ, sự cố cơ điện, thời gian bảo dưỡng.

MỤC VIII: ĐÁNH GIÁ CHUNG, KIẾN NGHỊ & KHỐI CHỮ KÝ TRÌNH DUYỆT
  - Nhận xét ưu/khuyết điểm trong kỳ của Quản đốc.
  - Đề xuất Ban Giám đốc về vật tư, công nghệ.
  - KHỐI CHỮ KÝ 4 BÊN:
    [Người lập biểu]   [Trưởng phòng Kỹ thuật]   [Quản đốc Phân xưởng]   [TỔNG GIÁM ĐỐC PHÊ DUYỆT]
```

---

## 🎨 III. QUY CHUẨN ĐỊNH DẠNG EXCEL (STYLING GUIDELINES)

Cả hai động cơ xuất Excel đều tuân thủ bảng mã màu và định dạng chuyên nghiệp:
* **Font chữ:** `Arial` đồng bộ toàn workbook.
* **Màu tiêu đề chính:** Xanh Navy Đậm (`#0F2A4A`).
* **Màu nền Table Header:** Xanh Thép Doanh nghiệp (`#1E3A5F`), chữ trắng, in đậm.
* **Màu nền Dòng Tổng Cộng:** Xanh Bạc Hà Nhạt (`#E6F4EA`), chữ đậm, viền kép dưới (`double bottom border`).
* **Định dạng số:**
  * Sản lượng m²: `#,##0.00`
  * Tỷ lệ phần trăm: `0.00%`
  * Khối lượng than/vật tư: `#,##0` hoặc `#,##0.00`
* **In ấn / Xuất PDF:** Đã thiết lập sẵn `FitToWidth = 1`, hướng giấy ngang (`Landscape`) cho trang bảng rộng và hướng đứng (`Portrait`) cho form ký.
