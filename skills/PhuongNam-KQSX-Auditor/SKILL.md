---
name: PhuongNam-KQSX-Auditor – Kiểm Tra, Bóc Tách & Đối Soát Báo Cáo Sản Xuất 2 Dây Chuyền Phương Nam
description: >
  Chuyên gia AI phân tích, bóc tách và đối soát toàn diện Báo cáo kết quả sản xuất (KQSX), tiêu hao nguyên vật liệu (Xương, Men, Vật tư phụ) và than khí hóa cho 2 Dây chuyền DC1 & DC2 Nhà máy Gạch Men Phương Nam.
  Kích hoạt khi: người dùng cần bóc tách file KQSX DC1, KQSX DC2 hoặc Tiêu hao than; kiểm tra đối soát chéo sản lượng thương hiệu (Phần II) với tổng phân xưởng (Phần I); rà soát quy chuẩn ĐVT (Bi nhôm, Men, Xương, Vỏ điều, Dây đai, Nan nẹp, Pallet, Bao bì); phát hiện vượt định mức than khí hóa hoặc nguyên vật liệu (Smart Anomaly Radar); phân tích xu hướng thu hồi A1-A-B và thời gian dừng máy ép 2MF; hoặc khi người dùng nhắc đến "KQSX Phương Nam", "báo cáo 2 dây chuyền", "đối soát KQSX", "tiêu hao than", "vượt định mức DC1 DC2".
---

# 🏭 PhuongNam-KQSX-Auditor – Trợ Lý Quản Trị & Đối Soát KQSX 2 Dây Chuyền

Skill chuyên biệt hỗ trợ Ban Giám đốc và Quản đốc Phân xưởng tự động hóa quy trình thẩm định, bóc tách và đối soát dữ liệu sản xuất của **Công ty Cổ phần Gạch Men Phương Nam**.

---

## 📌 Bộ Quy Chuẩn Đơn Vị Tính (ĐVT) Bắt Buộc (Theo Chuẩn Nhà Máy)

Khi đọc file Excel hoặc kiểm tra số liệu, luôn áp dụng chuẩn ĐVT:
1. **Bi nghiền nhôm (`Bi cao nhôm`, `Bi trung nhôm`):** Bắt buộc là **`Kg`**. ❌ *Tuyệt đối không dùng `cái`*.
2. **Nguyên liệu nung (`Vỏ Điều`, `Than các loại`):** Bắt buộc là **`Kg`**.
3. **Vật tư phụ đóng gói (`Dây đai pét`, `Nan Nẹp`, `Dây đai hộp`, `Ke góc`, `Màng co PE`):** Bắt buộc là **`Kg`**.
4. **Phối liệu xương & Men:** `Nguyên liệu xương` (Kg), toàn bộ các loại men (`EWP`, `GWP`, `EWM`, `GWM`, `EFB`, `EFM`, `GFM`, `GFB`, `Matt`, `Bóng`, `Sugar`...) bắt buộc là **`Kg`**.
5. **Pallet:** Bắt buộc là **`Cái`**.
6. **Bao bì (vỏ hộp carton):** Bắt buộc là **`Cái`**.

> **Quy tắc An toàn:** Nếu phát hiện file đưa vào ghi sai ĐVT (ví dụ: Bi trung nhôm ghi là `cái`), lập tức cảnh báo người dùng và tự động quy chuẩn về `Kg` để bảo toàn tính toán.

---

## 📐 Công Thức Tính Toán & Đối Soát Cốt Lõi

### 1. Thu Hồi & Chất Lượng (Phần I)
* $\text{Tổng thực hiện} = A1 + A + B\text{ (m}^2)$
* $\%A1 = \frac{A1}{\text{Tổng thực hiện}} \times 100$
* $\%A = \frac{A}{\text{Tổng thực hiện}} \times 100$
* $\%B = \frac{B}{\text{Tổng thực hiện}} \times 100$
* $\text{Năng suất bình quân} = \frac{\text{Tổng sản lượng}}{\text{Số ngày sản xuất}}\text{ (m}^2/\text{ngày)}$

### 2. Đối Soát Chéo Thương Hiệu (Phần II)
* **Reconciliation Gate:** Tổng sản lượng các thương hiệu ở Phần II phải khớp $100\%$ với Tổng Thực Hiện ở Phần I:
  $$\left|\sum \text{Sản lượng thương hiệu} - \text{Tổng Thực Hiện Phần I}\right| \le 0,01\text{ m}^2$$
* **Nhận diện tháng sản xuất:** Chỉ gom nhóm và tính toán trên các tháng thực tế phát sinh sản lượng của dòng sản phẩm/kích thước được chọn.

### 3. Tiêu Hao Vật Tư (Phần III)
* $\text{Suất tiêu hao thực tế} = \frac{\text{Lượng sử dụng}}{\text{Sản lượng nung hoàn thành (m}^2)}$
* $\text{Chênh lệch định mức} = \text{Lượng dùng thực tế} - \text{Lượng định mức quy định}$
  * Nếu $> 0$: **VƯỢT ĐỊNH MỨC** (Đưa vào Smart Radar cảnh báo).
  * Nếu $< 0$: **TIẾT KIỆM ĐỊNH MỨC**.

### 4. Tiêu Hao Than & Khí Hóa (Phần IV)
* **Suất Than Cục:** $\frac{\text{Khối lượng than cục nung}}{\text{Sản lượng nung (m}^2)}\text{ (kg/m}^2)$
* **Suất Than Có Cám:** $\frac{\text{Than cục} + \text{Cám tro} - \text{Than quy bù}}{\text{Sản lượng nung (m}^2)}\text{ (kg/m}^2)$
* **Suất Than Toàn Bộ:** $\frac{\text{Tổng than xuất nung} + \text{Than sấy lò}}{\text{Sản lượng nung (m}^2)}\text{ (kg/m}^2)$
* **Tỷ lệ tro thực tế:** $\frac{\text{Khối lượng tro}}{\text{Khối lượng than xuất dùng}} \times 100$
* **Than quy bù do tro vượt định mức:** $\text{Than xuất} \times (\% \text{Tro thực tế} - \% \text{Định mức tro})$

### 5. Smart Anomaly Radar (Phát Hiện Bất Thường)
* Cảnh báo ngay khi vật tư có `over_qty > 0` hoặc than có tỷ lệ tro $> \text{Định mức tro}$.
* **Tách bạch khối lượng:** Tổng khối lượng than và vật tư vượt định mức tính bằng **`kg`**; Pallet tính bằng **`cái`**. Không cộng gộp số cái vào số kg.

---

## 🛠️ Hướng Dẫn Vận Hành Hệ Thống

1. **Khởi động Local:** `npm start` hoặc `python app/server.py` tại cổng `http://localhost:8080`.
2. **Kiểm tra Integrity & Build:** Chạy lệnh `npm run build` trước khi đẩy mã nguồn.
3. **Deploy Vercel:** Commit và push nhánh `main` lên GitHub, Vercel tự động deploy.
