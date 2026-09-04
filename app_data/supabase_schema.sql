-- =========================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU SẢN XUẤT PHƯƠNG NAM 2026 (SUPABASE POSTGRESQL)
-- GÓI THIẾT LẬP TOÀN DIỆN (DROP + SCHEMA + SEED DATA T1 - T8)
-- =========================================================================

-- Xóa bảng cũ nếu tồn tại để tránh xung đột cấu trúc
DROP TABLE IF EXISTS master_norms_detail CASCADE;
DROP TABLE IF EXISTS master_norms_version CASCADE;
DROP TABLE IF EXISTS data_production_summary CASCADE;
DROP TABLE IF EXISTS data_brand_production CASCADE;
DROP TABLE IF EXISTS data_material_consumption CASCADE;
DROP TABLE IF EXISTS data_coal_consumption CASCADE;

-- 1. Bảng Phiên Bản Định Mức
CREATE TABLE master_norms_version (
    id BIGSERIAL PRIMARY KEY,
    version_code TEXT UNIQUE NOT NULL,
    version_name TEXT NOT NULL,
    effective_from_month INT NOT NULL,
    effective_from_year INT NOT NULL DEFAULT 2026,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Chi Tiết Định Mức
CREATE TABLE master_norms_detail (
    id BIGSERIAL PRIMARY KEY,
    version_id BIGINT REFERENCES master_norms_version(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    unit TEXT,
    norm_value NUMERIC(15, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Sản Lượng & Chất Lượng (Khối I)
CREATE TABLE data_production_summary (
    id BIGSERIAL PRIMARY KEY,
    stt INT,
    excel_row INT,
    month INT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    product_line TEXT,
    data_type TEXT NOT NULL DEFAULT 'Thực hiện',
    unit TEXT NOT NULL DEFAULT 'm2',
    sl_ep NUMERIC(15, 2) DEFAULT 0,
    a1 NUMERIC(15, 2) DEFAULT 0,
    a NUMERIC(15, 2) DEFAULT 0,
    b NUMERIC(15, 2) DEFAULT 0,
    recovery_total NUMERIC(15, 2) DEFAULT 0,
    pct_a1 NUMERIC(10, 4) DEFAULT 0,
    pct_a NUMERIC(10, 4) DEFAULT 0,
    pct_b NUMERIC(10, 4) DEFAULT 0,
    prod_days NUMERIC(10, 2) DEFAULT 0,
    avg_per_day NUMERIC(15, 2) DEFAULT 0,
    stop_time_2mf NUMERIC(10, 2) DEFAULT 0,
    stop_time_total NUMERIC(10, 2) DEFAULT 0,
    source_row TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Thương Hiệu (Khối II)
CREATE TABLE data_brand_production (
    id BIGSERIAL PRIMARY KEY,
    stt INT,
    excel_row INT,
    month INT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    glaze_type TEXT,
    brand_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    quantity_m2 NUMERIC(15, 2) DEFAULT 0,
    source_row TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng Tiêu Hao Vật Tư So Với Định Mức (Khối III)
CREATE TABLE data_material_consumption (
    id BIGSERIAL PRIMARY KEY,
    stt INT,
    excel_row INT,
    month INT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    material_name TEXT NOT NULL,
    unit TEXT,
    norm_value NUMERIC(15, 4) DEFAULT 0,
    used_qty NUMERIC(15, 2) DEFAULT 0,
    prod_qty NUMERIC(15, 2) DEFAULT 0,
    actual_rate NUMERIC(15, 4) DEFAULT 0,
    reduced_qty NUMERIC(15, 2) DEFAULT 0,
    over_qty NUMERIC(15, 2) DEFAULT 0,
    diff_qty NUMERIC(15, 2) DEFAULT 0,
    status_text TEXT,
    source_row TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng Sử Dụng Than (Khối IV)
CREATE TABLE data_coal_consumption (
    id BIGSERIAL PRIMARY KEY,
    stt INT,
    excel_row INT,
    month INT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    line TEXT NOT NULL,
    size TEXT NOT NULL,
    coal_supplier TEXT NOT NULL,
    warehouse TEXT,
    import_date TEXT,
    firing_type TEXT NOT NULL DEFAULT 'Có tính tiêu hao',
    heat_value NUMERIC(10, 2) DEFAULT 0,
    ash_rate NUMERIC(10, 4) DEFAULT 0,
    std_ash_rate NUMERIC(10, 4) DEFAULT 15.0,
    stone_rate NUMERIC(10, 4) DEFAULT 0,
    issued_weight NUMERIC(15, 2) DEFAULT 0,
    ash_weight NUMERIC(15, 2) DEFAULT 0,
    ash_export_rate NUMERIC(10, 4) DEFAULT 0,
    compensation_weight NUMERIC(15, 2) DEFAULT 0,
    excess_ash_weight NUMERIC(15, 2) DEFAULT 0,
    total_used_weight NUMERIC(15, 2) DEFAULT 0,
    production_m2 NUMERIC(15, 2) DEFAULT 0,
    rate_lump NUMERIC(10, 4) DEFAULT 0,
    rate_with_ash NUMERIC(10, 4) DEFAULT 0,
    rate_total NUMERIC(10, 4) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phân quyền bảo mật Row Level Security (RLS)
ALTER TABLE master_norms_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_norms_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_brand_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_coal_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read master_norms_version" ON master_norms_version FOR SELECT USING (true);
CREATE POLICY "Public Read master_norms_detail" ON master_norms_detail FOR SELECT USING (true);
CREATE POLICY "Public Read data_production_summary" ON data_production_summary FOR SELECT USING (true);
CREATE POLICY "Public Read data_brand_production" ON data_brand_production FOR SELECT USING (true);
CREATE POLICY "Public Read data_material_consumption" ON data_material_consumption FOR SELECT USING (true);
CREATE POLICY "Public Read data_coal_consumption" ON data_coal_consumption FOR SELECT USING (true);
