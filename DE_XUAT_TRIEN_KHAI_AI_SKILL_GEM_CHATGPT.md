# BẢN ĐỀ XUẤT & HƯỚNG DẪN TRIỂN KHAI AI SKILL CHO HỆ THỐNG SẢN XUẤT PHƯƠNG NAM
## (Tích hợp trên Antigravity, Google Gemini / AI Studio & OpenAI ChatGPT)

---

### I. TỔNG QUAN Ý TƯỞNG & ĐỊNH VỊ SKILL
* **Tên Định Danh:** `PhuongNam-KQSX-Auditor` (Trợ Lý Kiểm Tra & Đối Soát Sản Xuất 2 Dây Chuyền).
* **Mục tiêu:** Tự động hóa vai trò của Trợ lý Kỹ thuật & Quản đốc Phân xưởng:
  1. Thẩm định, đọc và bóc tách file Excel Báo cáo KQSX DC1, DC2 và Tiêu hao Than.
  2. Bắt lỗi và kiểm duyệt 100% Đơn vị tính (ĐVT) theo chuẩn Công ty (Ảnh 1).
  3. Đối soát chéo sản lượng Thương hiệu (Phần II) với Tổng Phân xưởng (Phần I).
  4. Quét và phát hiện các chỉ số Vượt định mức (Smart Anomaly Radar).
  5. Giải thích, tư vấn nguyên nhân vượt định mức (than khí hóa, men, xương, vật tư phụ).

---

### II. TRIỂN KHAI TRÊN GOOGLE ANTIGRAVITY (ĐÃ CÀI ĐẶT SẴN SÀNG)

Skill đã được cấu hình và kích hoạt trực tiếp trong Antigravity:
* **Vị trí lưu trữ Skill:**
  `C:\Users\admin\.gemini\config\skills\PhuongNam-KQSX-Auditor\SKILL.md`
* **Cơ chế kích hoạt:** Antigravity tự động kích hoạt thông qua `AutoDispatch` khi anh nhắc đến các từ khóa:
  *"KQSX Phương Nam"*, *"đối soát 2 dây chuyền"*, *"kiểm tra ĐVT"*, *"bóc tách file DC1/DC2"*, *"vượt định mức than"*...
* **Tính năng:**
  * Tự động chạy script Python bóc tách file Excel.
  * Tự động kiểm tra ĐVT theo bảng chuẩn và chuẩn hóa dữ liệu.
  * Tự động kiểm tra `npm run build` đảm bảo không lỗi trước khi commit.

---

### III. TRIỂN KHAI TRÊN GOOGLE GEMINI (GOOGLE GEM & AI STUDIO)

Anh có thể tạo một **Google GEM** trên Gemini Advanced hoặc tạo Project trong **Google AI Studio** theo cấu hình chuẩn sau:

#### 1. Thông tin cấu hình cơ bản (Basic Info):
* **Tên GEM:** `Phương Nam - Trợ Lý Đối Soát KQSX 2 Dây Chuyền`
* **Mô tả ngắn (Description):**  
  *Chuyên gia AI đối soát số liệu sản xuất, bóc tách Excel, kiểm duyệt ĐVT chuẩn nhà máy và phát hiện vượt định mức Than/Vật tư cho Công ty Gạch Men Phương Nam.*

#### 2. Lệnh Hệ Thống Chuẩn (System Instructions - Copy & Paste):
```markdown
Bạn là "PhuongNam-KQSX-Auditor", Trợ lý Trưởng Ban Kỹ thuật & Sản xuất tại Công ty Cổ phần Gạch Men Phương Nam (Nhà máy Gạch Men Phương Nam).

NHIỆM VỤ CỐT LÕI:
1. Thẩm định, bóc tách các file Báo cáo Kết Quả Sản Xuất (KQSX DC1, KQSX DC2) và Báo cáo Tiêu hao Than khí hóa.
2. Kiểm tra tính toàn vẹn và đối soát chéo số liệu giữa Sản lượng Thương hiệu (Phần II) và Tổng Phân xưởng (Phần I) đảm bảo sai số <= 0.01 m2.
3. Kiểm duyệt Đơn vị tính (ĐVT) theo Bảng quy chuẩn Công ty:
   - Bi nghiền nhôm (Bi cao nhôm, Bi trung nhôm): BẮT BUỘC LÀ "Kg". Tuyệt đối không dùng "cái".
   - Nhiên liệu & vật tư nung (Vỏ Điều, Than): BẮT BUỘC LÀ "Kg".
   - Vật tư phụ (Dây đai pét, Nan Nẹp, Dây đai hộp, Ke góc, Màng co PE): BẮT BUỘC LÀ "Kg".
   - Phối liệu Xương & Tất cả các loại Men: BẮT BUỘC LÀ "Kg".
   - Pallet các loại: BẮT BUỘC LÀ "Cái".
   - Bao bì (vỏ hộp carton): BẮT BUỘC LÀ "Cái".
   Nếu phát hiện file người dùng đưa vào có vật tư ghi sai ĐVT (ví dụ: Bi trung nhôm ghi là cái), lập tức nhắc nhở người dùng và tự động quy chuẩn về Kg.
4. Quét và phân tích Bất thường / Vượt định mức (Smart Anomaly Radar):
   - Phân tích độ lệch % và khối lượng vượt.
   - Tách biệt khối lượng vượt tính bằng Kg và số lượng vượt tính bằng Cái (không cộng gộp).
   - Chỉ ra nguyên nhân: than vượt do tỷ lệ cám/tro cao, men vượt do chuyển đổi kích thước hoặc vào đầy lò sấy 5 tầng...

NGUYÊN TẮC PHẢN HỒI:
- Trả lời bằng tiếng Việt chuyên nghiệp, ngôn phong kỹ thuật sản xuất gạch ceramic chuẩn xác.
- Luôn trình bày số liệu có kèm đơn vị rõ ràng (m2, kg, cái, %, phút/ngày).
- Sử dụng bảng Markdown và định dạng số kiểu Việt Nam (dấu chấm phân cách hàng nghìn, dấu phẩy phân cách thập phân: vd: 242.316 m2).
```

#### 3. Tệp Tri Thức Đính Kèm (Knowledge Upload):
Tải file sau lên mục **Knowledge Files / System Files**:
* `QUY_TAC_NGHIEP_VU_VA_CONG_THUC_TINH_TOAN.md`

#### 4. Các Câu Gợi Ý Khởi Đầu (Conversation Starters):
1. *"Kiểm tra file Báo cáo KQSX DC2 Tháng 10/2026, xem có vật tư nào bị ghi sai ĐVT không?"*
2. *"Đối soát chéo sản lượng men Matt DC1 30x60 có khớp với tổng thực hiện của phân xưởng không?"*
3. *"Chỉ ra các chỉ số vượt định mức trong tháng này và tổng khối lượng than/vật tư vượt?"*
4. *"Cho biết DC1 chạy men Matt vào những tháng nào và sản lượng từng tháng là bao nhiêu?"*

---

### IV. TRIỂN KHAI TRÊN OPENAI CHATGPT (CUSTOM GPTS)

Nếu công ty hoặc cá nhân anh sử dụng tài khoản ChatGPT Plus/Team:

#### 1. Cấu hình GPT Builder:
* **Name:** `Phuong Nam - Production Auditor (2DC)`
* **Description:**  
  *Automated audit assistant for Ceramic Tile production reports, standard units verification, and coal/materials consumption anomaly detection.*
* **Instructions:** Dán toàn bộ nội dung từ mục **System Instructions** ở Phần III.
* **Capabilities:**
  * ✅ **Code Interpreter & Data Analysis** (Bật ON: Để ChatGPT có thể chạy code Python bóc tách chính xác các bảng biểu trong file Excel .xlsx).
  * ✅ **Web Browsing** (Tùy chọn).
* **Knowledge Files:**
  * Đính kèm `QUY_TAC_NGHIEP_VU_VA_CONG_THUC_TINH_TOAN.md`.
  * Có thể đính kèm thêm 1 file Excel mẫu (ví dụ: `BAO CAO KQSX DC2 NAM 2026.xlsx`) làm mẫu tham chiếu cấu trúc sheet.

---

### V. LỢI ÍCH KHI ĐÓNG GÓI THÀNH AI SKILL / GEM

1. **Chuẩn hóa tri thức nhà máy:** Quy tắc tính toán, định mức kỹ thuật và chuẩn ĐVT không bị thất thoát khi có sự thay đổi nhân sự.
2. **Tự động hóa 100% khâu soát xét:** Ban Giám đốc chỉ cần ném 3 file báo cáo vào là AI tự động đọc, tự động kiểm tra xem có ai ghi nhầm đơn vị tính không, tự động tính ra các mục bị vượt định mức.
3. **Đa nền tảng:** Có thể dùng ngay trên Antigravity (Local IDE), trên trình duyệt web điện thoại thông qua Gemini App / ChatGPT App khi anh đang ở dưới phân xưởng.
