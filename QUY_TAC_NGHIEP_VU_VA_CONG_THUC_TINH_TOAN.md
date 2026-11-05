# QUY TẮC NGHIỆP VỤ, CÔNG THỨC TÍNH TOÁN & HIỂN THỊ DỮ LIỆU
## HỆ THỐNG QUẢN TRỊ SẢN XUẤT 2 DÂY CHUYỀN - CÔNG TY GẠCH MEN PHƯƠNG NAM (2026)

---

### PHẦN I: KIẾN TRÚC TỔNG THỂ & QUY MÔ DÂY CHUYỀN
Hệ thống quản lý, đối soát và trích xuất tự động dữ liệu từ 3 phân xưởng chủ lực của Công ty Cổ phần Gạch Men Phương Nam:
* **Dây Chuyền 1 (DC1):** Chuyên sản xuất dòng gạch ốp tường kích thước **30x60** (các dòng men Bóng Phương Nam/Panson, men Matt Grand/Crovina/Crown/Top One/Havira/Luxury...).
* **Dây Chuyền 2 (DC2):** Chuyên sản xuất đa kích thước: **40x80**, **50x50**, **60x60**, **80x80** (men Bóng, men Matt, men Sân vườn Sugar...).
* **Phân xưởng Khí hóa Than:** Cung cấp than khí hóa nung cho lò nung DC1, DC2 và sấy lò 5 tầng.

---

### PHẦN II: QUY CHUẨN ĐƠN VỊ TÍNH (ĐVT) NHÀ MÁY (CHUẨN HÓA 100%)

Hệ thống tuân thủ nghiêm ngặt danh mục ĐVT quy định của Nhà máy Gạch Men Phương Nam (cập nhật theo bảng chuẩn đối soát kỹ thuật):

| Nhóm danh mục | Danh mục chi tiết | Đơn vị tính (ĐVT) | Quy tắc kiểm soát bắt buộc |
| :--- | :--- | :---: | :--- |
| **Bi nghiền nhôm** | `Bi cao nhôm (Grand, Luxury, MB...)`, `Bi trung nhôm` | **Kg** | ❌ **Tuyệt đối KHÔNG ghi là `cái`**. Cân đo theo khối lượng thực tế nạp cối nghiền. |
| **Nguyên liệu nung** | `Vỏ Điều`, `Than các nhà cung cấp` (Hải Thành, Hưng Tam Long, Huyền Trang...) | **Kg** | Cân khối lượng xuất kho phục vụ cấp nhiệt lò sấy và lò nung. |
| **Vật tư đóng gói & đai** | `Dây đai pét`, `Nan Nẹp`, `Dây đai hộp`, `Ke góc`, `Ke góc (5V)`, `Màng co PE khổ 500mm` | **Kg** | Xuất nhập và tính định mức theo khối lượng Kg. |
| **Nguyên liệu xương** | `Nguyên liệu xương DC1`, `Nguyên liệu xương PCL` | **Kg** | Cân đo khối lượng phối liệu nạp cối nghiền xương. |
| **Men các loại** | `Men EWP`, `Men GWP`, `Men EWM`, `Men GWM`, `Men EFB`, `Men EFM`, `Men GFM`, `Men GFB`, `Men EFSV`, `Men SFSV`, `Men EWB`, `Men GWB`, `Men Matt`, `Men Bóng`, `Men Sugar`... | **Kg** | 100% tính theo Kg men nghiền và nạp tráng men. |
| **Pallet** | `Pallet`, `Pallet 1100x1100 cũ/mới`, `Pallet 1100x1100x60`, `x90` | **Cái** | Đếm theo số lượng tấm pallet kê đóng gói. |
| **Bao bì** | `Bao bì`, `Bao bì (5V)` (Vỏ hộp carton) | **Cái** | Tính theo số vỏ hộp carton đóng gói xuất dùng. |

#### 🛡️ Cơ chế Bắt Lỗi & Cảnh Báo Khi Import File Excel:
* Khi file Excel của phân xưởng đưa vào bị ghi sai ĐVT (ví dụ: `Bi trung nhôm` ghi là `cái`, `Nan nẹp` ghi là `cái`):
  1. Hệ thống **tự động chuẩn hóa về ĐVT chuẩn** (`Kg` hoặc `Cái`) khi lưu vào Database để bảo đảm tính toán chính xác.
  2. Bật khung cảnh báo màu cam hổ phách **ngay lập tức trên giao diện** và thông báo chi tiết dòng, kích thước, tên vật tư bị ghi sai để nhắc nhở bộ phận nhập liệu sửa file gốc.

---

### PHẦN III: CÔNG THỨC TÍNH TOÁN CỐT LÕI

#### 1. Khối I: Sản Lượng & Chất Lượng Thu Hồi (Data Production Summary)
* **Tổng sản lượng thu hồi (m²):**
  $$\text{Tổng thu hồi} = A1 + A + B$$
* **Tỷ lệ thu hồi loại A1 (%):**
  $$\%A1 = \frac{A1}{\text{Tổng thu hồi}} \times 100$$
* **Tỷ lệ thu hồi loại A (%):**
  $$\%A = \frac{A}{\text{Tổng thu hồi}} \times 100$$
* **Tỷ lệ thu hồi loại B (%):**
  $$\%B = \frac{B}{\text{Tổng thu hồi}} \times 100$$
* **Tỷ lệ hoàn thành kế hoạch (%):**
  $$\% \text{Hoàn thành KH} = \frac{\text{Tổng Thực Hiện (m²)}}{\text{Tổng Kế Hoạch (m²)}} \times 100$$
* **Năng suất bình quân ngày (m²/ngày):**
  $$\text{Năng suất TB/ngày} = \frac{\text{Tổng sản lượng (m²)}}{\text{Số ngày sản xuất}}$$
* **Thời gian dừng máy ép 2MF quy đổi (phút):**
  $$\text{Thời gian dừng 2MF (tổng)} = \text{Số ngày sản xuất} \times \text{Định mức dừng máy (phút/ngày)}$$

#### 2. Khối II: Cơ Cấu Thương Hiệu & Đối Soát Đa Tầng (Brand Production)
* **Quy tắc đối soát chéo (Reconciliation Gate):**
  $$\sum \text{Sản lượng tất cả Thương hiệu (Phần II)} \equiv \text{Tổng Thực Hiện của Phân Xưởng (Phần I)} \quad (\text{Sai số cho phép } \le 0,01\text{ m}^2)$$
* **Tỷ trọng thương hiệu (%):**
  $$\text{Tỷ trọng thương hiệu } i = \frac{\text{Sản lượng thương hiệu } i}{\text{Tổng sản lượng nhóm lọc}} \times 100$$
* **Thanh trực quan hóa các tháng phát sinh sản lượng:**
  * Tự động quét và gom nhóm các tháng thực tế có sản xuất dòng men/kích thước được chọn.
  * Hiển thị thẻ từng tháng kèm sản lượng m² và số thương hiệu chạy.
  * Click 1 chạm để lọc sâu vào từng tháng và nút "Quay lại Tất cả tháng".

#### 3. Khối III: Báo Cáo Định Mức & Tiêu Hao Vật Tư (Material Consumption)
* **Suất tiêu hao thực tế:**
  $$\text{Suất tiêu hao thực tế} = \frac{\text{Lượng sử dụng (Kg hoặc Cái)}}{\text{Sản lượng nung hoàn thành (m²)}}$$
* **Chênh lệch định mức (Giảm / Vượt):**
  $$\Delta = \text{Lượng thực tế sử dụng} - \text{Lượng định mức quy định}$$
  * Nếu $\Delta > 0$: **VƯỢT ĐỊNH MỨC** (Ghi nhận `over_qty` và đưa vào Smart Radar cảnh báo).
  * Nếu $\Delta < 0$: **GIẢM / TIẾT KIỆM ĐỊNH MỨC** (Ghi nhận `reduced_qty`).
* **Tỷ lệ lệch định mức (%):**
  $$\% \text{Lệch ĐM} = \frac{\text{Suất thực tế} - \text{Suất định mức}}{\text{Suất định mức}} \times 100$$

#### 4. Khối IV: Tiêu Hao Than Khí Hóa Lò Nung & Sấy Lò (Coal Consumption)
* **1. Suất tiêu hao than cục nung (kg/m²):**
  $$\text{Suất Than Cục} = \frac{\text{Khối lượng than cục xuất nung (kg)}}{\text{Sản lượng nung hoàn thành (m²)}}$$
* **2. Suất tiêu hao than có cám (kg/m²):**
  $$\text{Suất Than Có Cám} = \frac{\text{Than cục} + \text{Khối lượng cám tro} - \text{Khối lượng than quy bù}}{\text{Sản lượng nung hoàn thành (m²)}}$$
* **3. Suất tiêu hao than toàn bộ (Cục + Cám + Sấy Lò) (kg/m²):**
  $$\text{Suất Than Toàn Bộ} = \frac{\text{Tổng than cục} + \text{Tổng tro/cám} + \text{Than sấy lò}}{\text{Sản lượng nung hoàn thành (m²)}}$$
* **Tỷ lệ tro/cám thực tế (%):**
  $$\% \text{Tro thực tế} = \frac{\text{Khối lượng tro sinh ra (kg)}}{\text{Khối lượng than xuất dùng (kg)}} \times 100$$
* **Khối lượng than quy bù do tro vượt định mức (kg):**
  $$\text{Than quy bù} = \text{Than xuất} \times (\% \text{Tro thực tế} - \% \text{Định mức tro chuẩn (15\% hoặc 16\%)})$$

#### 5. Trung Tâm Cảnh Báo Bất Thường (Smart Anomaly Radar)
* **Điều kiện kích hoạt cảnh báo:**
  * Vật tư tiêu hao có `over_qty > 0`.
  * Than khí hóa có tỷ lệ tro thực tế $> \text{Định mức tro}$ hoặc `excess_ash_weight > 0`.
* **Phân loại mức độ nghiêm trọng (Severity):**
  * 🔴 **VƯỢT CAO (High Severity):** Độ lệch vượt $> 10\%$ hoặc khối lượng than vượt $\ge 500\text{ kg}$.
  * 🟡 **VƯỢT ĐỊNH MỨC (Medium Severity):** Độ lệch vượt $\le 10\%$.
* **Quy tắc hiển thị tổng hợp:**
  * Tách bạch rõ ràng khối lượng theo đơn vị: Ví dụ `Tổng vượt: +26.230,56 kg & +17,7 cái`.
  * Không cộng gộp số cái vào số kg.

---

### PHẦN IV: QUY TẮC BÓC TÁCH EXCEL LINH HOẠT THEO THÁNG

1. **Cơ chế Dò Cột Tự Động (Header Auto-Scan):**
   * Quét dòng tiêu đề để xác định vị trí thực tế của các cột `sl_ep`, `a1`, `a`, `b`, `prod_days`, `avg_per_day`, `stop_time_2mf`.
   * Không bị ảnh hưởng nếu phân xưởng chèn thêm cột, ẩn cột hay dịch chuyển vị trí giữa các tháng.
2. **Lọc Bỏ Bảng Trống (Zero-Production Size Pruning):**
   * Trong DC2, mỗi tháng chỉ chạy 1 hoặc 2 kích thước (ví dụ Tháng 10 chỉ chạy 40x80 và 60x60). Các bảng mẫu 50x50 không có sản lượng trong kỳ được tự động nhận diện và bỏ qua, tránh tạo số liệu rác trong cơ sở dữ liệu.
3. **Cơ Chế Ghi Đè Độc Lập Khi Import Lại:**
   * Khi người dùng upload lại file DC1, chỉ dọn dẹp và cập nhật lại dữ liệu của DC1 tháng đó.
   * Dữ liệu DC2 và Than của tháng đó được bảo toàn nguyên vẹn 100%, không bị ảnh hưởng, không bị cộng dồn chồng lấn.
