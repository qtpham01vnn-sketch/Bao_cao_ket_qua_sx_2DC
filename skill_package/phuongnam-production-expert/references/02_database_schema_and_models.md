# KIẾN TRÚC CƠ SỞ DỮ LIỆU & ĐẶC TẢ CÁC BẢNG (DATABASE SCHEMA)

Cơ sở dữ liệu của hệ thống được lưu trữ kép:
1. **SQLite cục bộ:** `app_data/production_data.db` (Dùng cho ứng dụng máy tính cá nhân, mạng nội bộ, offline PWA).
2. **PostgreSQL Cloud:** Supabase (Dùng khi triển khai trực tuyến trên Vercel).

Tài liệu này định nghĩa cấu trúc chi tiết của toàn bộ 8 bảng trong cơ sở dữ liệu.

---

## 🗄️ CHI TIẾT 8 BẢNG DỮ LIỆU

### 1. Bảng `data_production_summary` (Khối I: Sản Lượng & Chất Lượng)
Lưu trữ thông tin Kế hoạch và Thực hiện sản xuất theo tháng, dây chuyền, kích thước.

```sql
CREATE TABLE data_production_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stt INTEGER,
    excel_row INTEGER,
    month INTEGER NOT NULL,            -- Tháng (1 đến 12)
    year INTEGER NOT NULL DEFAULT 2026,-- Năm sản xuất
    line TEXT NOT NULL,                 -- 'DC1' hoặc 'DC2'
    size TEXT NOT NULL,                 -- '30x60', '50x50', '40x80', '60x60'
    product_line TEXT,                  -- 'Phương Nam'
    data_type TEXT NOT NULL,            -- 'Kế hoạch' hoặc 'Thực hiện'
    unit TEXT NOT NULL,                 -- 'm2' hoặc '%'
    sl_ep REAL DEFAULT 0,               -- Sản lượng ép (m2)
    a1 REAL DEFAULT 0,                  -- Sản lượng loại A1 (m2 hoặc %)
    a REAL DEFAULT 0,                   -- Sản lượng loại A (m2 hoặc %)
    b REAL DEFAULT 0,                   -- Sản lượng loại B (m2 hoặc %)
    recovery_total REAL DEFAULT 0,      -- Tổng thu hồi = A1 + A + B
    pct_a1 REAL DEFAULT 0,              -- Tỷ lệ A1 (%)
    pct_a REAL DEFAULT 0,               -- Tỷ lệ A (%)
    pct_b REAL DEFAULT 0,               -- Tỷ lệ B (%)
    prod_days REAL DEFAULT 0,           -- Số ngày sản xuất thực tế
    avg_per_day REAL DEFAULT 0,         -- Năng suất bình quân (m2/ngày)
    stop_time_2mf REAL DEFAULT 0,       -- Thời gian dừng máy ép 2MF (phút/ngày)
    stop_time_total REAL DEFAULT 0,     -- Tổng thời gian dừng máy (phút)
    source_row TEXT                     -- Nguồn gốc dòng dữ liệu
);
```

---

### 2. Bảng `data_brand_production` (Khối II: Sản Lượng Thương Hiệu)
Lưu chi tiết từng mã thương hiệu, dòng men và phân hạng.

```sql
CREATE TABLE data_brand_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stt INTEGER,
    excel_row INTEGER,
    month INTEGER NOT NULL,            -- Tháng (1 đến 12)
    year INTEGER NOT NULL DEFAULT 2026,-- Năm sản xuất
    line TEXT NOT NULL,                 -- 'DC1', 'DC2'
    size TEXT NOT NULL,                 -- '30x60', '50x50', '40x80', '60x60'
    glaze_type TEXT,                    -- Loại men (Men bóng, Vi tinh, Men matt...)
    brand_name TEXT NOT NULL,           -- Tên thương hiệu/mã sản phẩm
    grade TEXT NOT NULL,                -- Phân loại: 'A1', 'A', 'B'
    quantity_m2 REAL DEFAULT 0,         -- Sản lượng thực tế (m2)
    source_row TEXT
);
```

---

### 3. Bảng `data_material_consumption` (Khối III: Tiêu Hao Vật Tư)
Lưu theo dõi nguyên vật liệu, định mức và thực tế tiêu hao (12 cột).

```sql
CREATE TABLE data_material_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stt INTEGER,
    excel_row INTEGER,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL DEFAULT 2026,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    material_name TEXT NOT NULL,        -- Tên vật tư (Xương, Men lót, Men phủ, Vỏ điều...)
    unit TEXT NOT NULL,                 -- 'Kg', 'Tấn', 'Lít'
    norm_value REAL DEFAULT 0,          -- Định mức cho phép (kg/m2)
    used_qty REAL DEFAULT 0,            -- Khối lượng thực tế sử dụng (kg)
    prod_qty REAL DEFAULT 0,            -- Sản lượng sản xuất tính định mức (m2)
    actual_rate REAL DEFAULT 0,         -- Tỷ lệ tiêu hao thực tế (kg/m2)
    reduced_qty REAL DEFAULT 0,         -- Lượng tiết kiệm (kg)
    over_qty REAL DEFAULT 0,            -- Lượng vượt định mức (kg)
    diff_qty REAL DEFAULT 0,            -- Chênh lệch = used_qty - (norm * prod)
    status_text TEXT,                   -- 'Tiết kiệm' / 'Vượt định mức'
    source_row TEXT
);
```

---

### 4. Bảng `master_norms_version` & `master_norms_detail` (Quản Lý Định Mức)
Quản lý đa phiên bản định mức và bảng giá trị chi tiết.

```sql
CREATE TABLE master_norms_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_code TEXT UNIQUE NOT NULL,  -- Mã phiên bản: 'DM-2026-V1', 'DM-2026-V2'
    version_name TEXT NOT NULL,         -- Tên phiên bản
    effective_from_month INTEGER,       -- Tháng bắt đầu áp dụng
    effective_from_year INTEGER,        -- Năm áp dụng
    description TEXT,                   -- Mô tả căn cứ ban hành
    is_active INTEGER DEFAULT 1,        -- 1: Đang hiệu lực, 0: Hết hiệu lực
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    line TEXT DEFAULT 'all',
    size TEXT DEFAULT 'all'
);

CREATE TABLE master_norms_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id INTEGER NOT NULL,        -- FK tới master_norms_version(id)
    material_name TEXT NOT NULL,        -- Tên nguyên vật liệu
    line TEXT DEFAULT 'all',            -- DC1 / DC2 / all
    size TEXT DEFAULT 'all',            -- Kích thước áp dụng
    unit TEXT DEFAULT 'Kg',
    norm_value REAL NOT NULL,           -- Giá trị định mức (vd: 19.04 cho Xương DC1)
    FOREIGN KEY (version_id) REFERENCES master_norms_version(id)
);
```

---

### 5. Bảng `data_coal_consumption` (Khối IV: Sử Dụng Than Khí Hóa)
Cấu trúc 17 cột kẻ bảng chuẩn Phân xưởng Cơ điện - Năng lượng.

```sql
CREATE TABLE data_coal_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stt INTEGER,
    excel_row INTEGER,
    month INTEGER NOT NULL,
    year INTEGER DEFAULT 2026,
    line TEXT,                          -- DC1 / DC2 / 2DC
    size TEXT,
    coal_supplier TEXT,                 -- Nhà cung cấp than
    warehouse TEXT,                     -- Kho chứa than
    import_date TEXT,                   -- Ngày nhập than
    firing_type TEXT,                   -- 'Than nung', 'Than sấy', 'Không nung'
    heat_value REAL,                    -- Nhiệt trị (kcal/kg)
    ash_rate REAL,                      -- Độ tro Ak thực tế (%)
    std_ash_rate REAL DEFAULT 28.0,     -- Độ tro Ak tiêu chuẩn (%)
    stone_rate REAL DEFAULT 3.63,       -- Tỷ lệ xít đá (%)
    issued_weight REAL DEFAULT 0,       -- Khối lượng than xuất kho (kg)
    ash_weight REAL DEFAULT 0,          -- Khối lượng xỉ than thải ra (kg)
    ash_export_rate REAL DEFAULT 0,     -- Tỷ lệ xỉ than (%)
    compensation_weight REAL DEFAULT 0, -- Than bù chất lượng (kg)
    excess_ash_weight REAL DEFAULT 0,   -- Than bù độ tro thừa (kg)
    total_used_weight REAL DEFAULT 0,   -- Khối lượng than sử dụng quy đổi (kg)
    production_m2 REAL DEFAULT 0,       -- Sản lượng m2 tính tiêu hao
    rate_lump REAL DEFAULT 0,           -- Tiêu hao than cục (kg/m2, chuẩn 2.38)
    rate_with_ash REAL DEFAULT 0,       -- Tiêu hao có cám (kg/m2, chuẩn 2.68)
    rate_total REAL DEFAULT 0,          -- Tiêu hao toàn bộ (kg/m2, chuẩn 2.70)
    note TEXT
);
```

---

### 6. Bảng `report_form_mau_custom` (Lưu Dữ Liệu Form Mẫu Trình Ký)
Lưu tùy biến nhân sự, mục tiêu, đánh giá phân xưởng và chữ ký theo kỳ báo cáo.

```sql
CREATE TABLE report_form_mau_custom (
    period_key TEXT PRIMARY KEY,        -- 'M08_2026', 'M09_2026', 'Q_Q3_2026', 'Y_2026'
    period_type TEXT,                   -- 'month', 'quarter', 'half_year', 'year'
    period_value TEXT,                  -- '8', '9', 'Q3', '2026'
    year INTEGER DEFAULT 2026,
    hr_data TEXT,                       -- JSON dữ liệu nhân sự (Mục I)
    plan_data TEXT,                     -- JSON kế hoạch tháng tới (Mục II)
    goals_data TEXT,                    -- JSON mục tiêu sản xuất (Mục III)
    notes_data TEXT,                    -- JSON ghi chú các phần
    evaluation_data TEXT,               -- JSON đánh giá phân xưởng (Mục VII, VIII)
    signatures_data TEXT,               -- JSON thông tin người ký trình duyệt
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 7. Bảng `auth_access_requests` (Bảo Mật & Phân Quyền)
Quản lý yêu cầu cấp quyền truy cập, token 25h và Master PIN.

```sql
CREATE TABLE auth_access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    full_name TEXT,
    department TEXT,
    device_id TEXT NOT NULL,
    request_type TEXT DEFAULT 'trial_25h', -- 'trial_25h' hoặc 'permanent'
    status TEXT DEFAULT 'pending',         -- 'pending', 'approved_trial', 'approved_permanent'
    activation_pin TEXT,                   -- Mã PIN riêng nếu cấp
    granted_at TEXT,
    expires_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔍 TRUY VẤN ĐỐI SOÁT CHÉO MẪU (CROSS-CHECK QUERY)

Để kiểm tra độ khớp dữ liệu giữa Khối I và Khối II của bất kỳ tháng nào:

```sql
SELECT 
    d1.month,
    d1.recovery_total as khoi_1_total,
    d2.brand_total as khoi_2_total,
    (d1.recovery_total - d2.brand_total) as diff_m2,
    d1.a1 as khoi_1_a1,
    d2.brand_a1 as khoi_2_a1,
    (d1.a1 - d2.brand_a1) as diff_a1
FROM (
    SELECT month, SUM(recovery_total) as recovery_total, SUM(a1) as a1
    FROM data_production_summary 
    WHERE data_type = 'Thực hiện' AND unit = 'm2'
    GROUP BY month
) d1
LEFT JOIN (
    SELECT month, 
           SUM(quantity_m2) as brand_total,
           SUM(CASE WHEN grade = 'A1' THEN quantity_m2 ELSE 0 END) as brand_a1
    FROM data_brand_production
    GROUP BY month
) d2 ON d1.month = d2.month;
```
*Kết quả chuẩn: `diff_m2 = 0` và `diff_a1 = 0` trên tất cả các tháng.*
