# CÔNG THỨC TOÁN HỌC & QUY TẮC TÍNH TOÁN 4 KHỐI DỮ LIỆU SẢN XUẤT PHƯƠNG NAM

Tài liệu này chuẩn hóa toàn bộ công thức tính toán, dung sai cho phép và quy tắc nghiệm thu số liệu cho Nhà máy Gạch men Phương Nam (DC1 & DC2). Mọi thay đổi về code hoặc tính toán phải đối chiếu với tài liệu này.

---

## 📐 KHỐI I: SẢN LƯỢNG - CHẤT LƯỢNG - THU HỒI

### 1. Chỉ tiêu Sản lượng & Cơ cấu
* **Sản lượng thành phẩm thu hồi ($m^2$):**
  $$R = A_1 + A + B$$
  *(Trong đó: $A_1$ là gạch loại 1, $A$ là gạch loại phụ, $B$ là gạch loại 2).*

* **Tỷ lệ cơ cấu chất lượng (%):**
  $$\%A_1 = \frac{A_1}{R} \times 100\%$$
  $$\%A = \frac{A}{R} \times 100\%$$
  $$\%B = \frac{B}{R} \times 100\%$$
  *Điều kiện bắt buộc:* $\%A_1 + \%A + \%B = 100\%$.

* **Tỷ lệ thu hồi trên sản lượng ép (%):**
  $$\%R_{\text{ép}} = \frac{R}{\text{sl\_ep}} \times 100\%$$
  *(Tỷ lệ chuẩn thường dao động từ $94.5\%$ đến $97.2\%$).*

* **Tỷ lệ hoàn thành kế hoạch (%):**
  $$\text{Completion\_Rate} = \frac{R_{\text{Thực hiện}}}{R_{\text{Kế hoạch}}} \times 100\%$$

---

### 2. Định mức Ngày sản xuất & Năng suất ngày
* **Năng suất bình quân ngày ($m^2/\text{ngày}$):**
  $$P_{\text{ngày}} = \frac{R}{\text{prod\_days}}$$

* **Bảng chuẩn hóa Ngày sản xuất theo Dây chuyền & Kích thước (Tháng 30 ngày):**
  | Dây chuyền | Kích thước | Số ngày SX chuẩn | Ghi chú vận hành |
  | :--- | :--- | :--- | :--- |
  | **DC1** | $30\times60$ | **$30\text{ ngày}$** | Chạy liên tục cả tháng |
  | **DC2** | $50\times50$ | **$4\text{ ngày}$** | Đổi bài phối liệu men bóng (Kỳ thông thường) |
  | **DC2** | $40\times80$ | **$8\text{ ngày}$** | Kích thước trung bình (Kỳ thông thường) |
  | **DC2** | $60\times60$ | **$18\text{ ngày}$** | Kích thước chủ lực DC2 (Kỳ thông thường) |
  | **Tổng DC2**| **Tất cả** | **$30\text{ ngày}$** | $4 + 8 + 18 = 30\text{ ngày}$ |

* **Quy chuẩn sản xuất thực tế Tháng 09/2026:**
  * **DC1 ($30\times60$):** Sản xuất đủ $30\text{ ngày}$, Thực hiện: **$476,442.72\text{ m}^2$** ($A_1: 448,359.84\text{ m}^2$, $A: 12,769.92\text{ m}^2$, $B: 15,312.96\text{ m}^2$).
  * **DC2 ($40\times80$):** Sản xuất đủ $30\text{ ngày}$, Thực hiện: **$439,864.00\text{ m}^2$** ($A_1: 411,920.00\text{ m}^2$, $A: 0\text{ m}^2$, $B: 27,944.00\text{ m}^2$).
  * **Đặc thù DC2 Tháng 09:** Trong tháng 9, DC2 **chỉ chạy duy nhất kích thước $40\times80$**. Tuyệt đối không cộng bất kỳ dòng $50\times50$ nào vào sản lượng thực hiện hoặc nung than tháng 9 (nếu sheet có dòng $50\times50$, đó là kế hoạch mẫu/ngoài kỳ và bắt buộc phải loại bỏ).
  * **Tổng sản lượng thực hiện & nung than 2DC Tháng 09/2026:**
    $$\text{Total}_{\text{T09}} = 476,442.72 + 439,864.00 = \mathbf{916,306.72\text{ m}^2}$$
    *(Khớp chính xác với Báo cáo Than Phân xưởng Cơ điện - Năng lượng Dòng 33: $916,307\text{ m}^2$ và hiển thị Dashboard: $916,307\text{ m}^2$).*

---

### 3. Thời gian dừng máy ép 2MF
* **Kế hoạch dừng máy:** Chuẩn hóa $40\text{ phút/ngày}$.
  $$\text{Tổng thời gian dừng kế hoạch} = \text{prod\_days} \times 40\text{ (phút)}$$
* **Thực tế dừng máy:**
  * DC1: Trung bình từ $16$ đến $20\text{ phút/ngày}$.
  * DC2: $100\text{ p/ng}$ ($50\times50$), $48\text{ p/ng}$ ($40\times80$), $13\text{ p/ng}$ ($60\times60$).

---

## 🏷️ KHỐI II: SẢN LƯỢNG THƯƠNG HIỆU & ĐỐI CHỨNG CHÉO

### 1. Nguyên tắc Đối chứng Chéo Thực nghiệm (Empirical Cross-Checking)
Mỗi dòng sản phẩm trong bảng `data_brand_production` được gắn nhãn phân hạng ($A1, A, B$).
Công thức đối chiếu thực tế:
$$\Delta_{\text{total}} = \left| \sum_{\text{mọi brand}} \text{quantity\_m2} - \sum \text{recovery\_total}_{\text{Khối I}} \right|$$
$$\Delta_{A1} = \left| \sum_{\text{grade} = 'A1'} \text{quantity\_m2} - \sum A_{1\text{, Khối I}} \right|$$
$$\Delta_{B} = \left| \sum_{\text{grade} = 'B'} \text{quantity\_m2} - \sum B_{\text{Khối I}} \right|$$

**Phân loại mức độ phù hợp số liệu:**
* **Khớp hoàn toàn ($\Delta = 0$):** Số liệu hai khối hoàn toàn trùng khớp tuyệt đối từng số lẻ.
* **Sai số làm tròn Excel ($0 < \Delta \le 2,0\text{ m}^2$):** Chênh lệch nhỏ phát sinh do làm tròn hiển thị số lẻ của từng ô con trong bảng tính gốc (tỷ lệ sai số $< 0,0005\%$), nằm trong ngưỡng chấp nhận kỹ thuật.
* **Lệch vượt dung sai ($\Delta > 2,0\text{ m}^2$):** Cảnh báo hệ thống yêu cầu nhân viên kỹ thuật rà soát lại file nguồn.

### 2. Danh mục 33 dòng sản phẩm
Bao gồm:
* Gạch Phương Nam men bóng, men matt, vi tinh, phẳng bóng, carving, bán mài.
* Các thương hiệu gia công: Viglacera, Catalan, Mikado, CMC, Prime... theo từng đơn đặt hàng.

---

## 🧪 KHỐI III: TIÊU HAO VẬT TƯ & ĐỊNH MỨC XƯƠNG - MEN

### 1. Bảng 12 Cột Kiểm Soát Tiêu Hao
Cho mỗi loại nguyên vật liệu $i$:
1. $N_i$: Định mức cho phép ($kg/m^2$ hoặc $g/m^2$)
2. $U_i$: Lượng sử dụng thực tế ($kg$)
3. $P_i$: Sản lượng gạch sản xuất áp dụng ($m^2$)
4. $r_i$: Tỷ lệ tiêu hao thực tế:
   $$r_i = \frac{U_i}{P_i}$$
5. $L_i$: Lượng định mức lý thuyết cho phép dùng:
   $$L_i = N_i \times P_i$$
6. $\Delta_i$: Chênh lệch thực tế so với định mức:
   $$\Delta_i = U_i - L_i$$
7. **Lượng Tiết kiệm (Giảm) & Lượng Vượt:**
   * Nếu $\Delta_i \le 0$:
     $$\text{reduced\_qty} = |\Delta_i|, \quad \text{over\_qty} = 0, \quad \text{status} = \text{"Tiết kiệm"}$$
   * Nếu $\Delta_i > 0$:
     $$\text{over\_qty} = \Delta_i, \quad \text{reduced\_qty} = 0, \quad \text{status} = \text{"Vượt định mức"}$$

### 2. Các Định mức Chuẩn Trọng Yếu
* **Định mức Xương DC1 ($30\times60$):** **$19,04\text{ kg/m}^2$** (Phiên bản `DM-2026-V1`).
* **Men lót:** Dao động $0,45 - 0,55\text{ kg/m}^2$.
* **Men phủ:** Dao động $0,70 - 0,85\text{ kg/m}^2$.
* **Vỏ điều (Nhiên liệu sấy phun):** Tùy theo độ ẩm bột và mùa vụ.

---

## 🔥 KHỐI IV: BÁO CÁO TIÊU HAO THAN KHÍ HÓA

### 1. Cấu trúc Lô than & Tỷ lệ Chuẩn
Theo tiêu chuẩn kỹ thuật Phân xưởng Cơ điện - Năng lượng:
* **Tỷ lệ than cám chuẩn:** **$13,50\%$**
* **Tỷ lệ xít đá chuẩn:** **$3,63\%$**
* **Độ tro chuẩn ($A_k$ tiêu chuẩn):** $28,00\% - 30,00\%$.

### 2. Công thức Tính Lượng Than Sử Dụng
* **Lượng than cục hữu ích ($kg$):**
  $$W_{\text{cục}} = W_{\text{xuất}} \times \left(1 - \frac{13,50}{100} - \frac{3,63}{100}\right) = W_{\text{xuất}} \times 0,8287$$
* **Trọng lượng bù độ tro thừa ($kg$):**
  $$\text{excess\_ash} = W_{\text{than}} \times \max\left(0, \frac{A_k - A_{k\text{, std}}}{100}\right)$$
* **Tổng than sử dụng quy đổi ($W_{\text{sử dụng}}$):**
  $$W_{\text{sử dụng}} = W_{\text{xuất}} - \text{excess\_ash} + \text{compensation}$$

### 3. Ba Chỉ Số Tiêu Hao Than Bắt Buộc ($kg/m^2$)
1. **Tiêu hao than cục:**
   $$\text{Rate}_{\text{cục}} = \frac{W_{\text{cục}}}{P_{m^2}} = \mathbf{2,38\text{ kg/m}^2}$$
2. **Tiêu hao than có cám (Cục + Cám):**
   $$\text{Rate}_{\text{có cám}} = \frac{W_{\text{cục}} + W_{\text{cám}}}{P_{m^2}} = \mathbf{2,68\text{ kg/m}^2}$$
3. **Tiêu hao than toàn bộ (Cục + Cám + Xít đá):**
   $$\text{Rate}_{\text{toàn bộ}} = \frac{W_{\text{tổng}}}{P_{m^2}} = \mathbf{2,70\text{ kg/m}^2}$$

*(Ghi chú: $2,38 \rightarrow 2,68 \rightarrow 2,70$ là bộ 3 chỉ số chuẩn của Nhà máy Gạch men Phương Nam năm 2026).*
