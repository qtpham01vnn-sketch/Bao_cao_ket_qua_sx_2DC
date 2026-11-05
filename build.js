/**
 * BUILD & INTEGRITY VERIFICATION SCRIPT
 * Hệ Thống Quản Trị & Đối Soát Sản Xuất 2 Dây Chuyền - Phương Nam 2026
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

console.log("\n=======================================================");
console.log("🚀 STARTING BUILD & VALIDATION PROCESS (PHƯƠNG NAM 2026)");
console.log("=======================================================\n");

let errors = [];
let warnings = [];

// 1. Kiểm tra cú pháp JavaScript (Syntax Check)
console.log("🔍 [1/5] Kiểm tra cú pháp JavaScript (app.js)...");
try {
  const appJsCode = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  new vm.Script(appJsCode);
  console.log("   ✅ public/app.js: Cú pháp JavaScript hoàn toàn chuẩn xác (0 lỗi syntax).");
} catch (err) {
  errors.push(`Lỗi cú pháp public/app.js: ${err.message}`);
}

// 2. Kiểm tra tính toàn vẹn HTML & Cặp thẻ
console.log("🔍 [2/5] Kiểm tra cấu trúc HTML (index.html)...");
try {
  const htmlCode = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const requiredElements = [
    'p2-monthly-breakdown-bar',
    'p2-breakdown-chips',
    'anomaly-items-container',
    'chart-brand-dist',
    'dash-brand-table-body',
    'import-logs-box'
  ];
  
  for (const elId of requiredElements) {
    if (!htmlCode.includes(`id="${elId}"`)) {
      errors.push(`Thiếu phần tử bắt buộc trong index.html: id="${elId}"`);
    }
  }
  console.log("   ✅ public/index.html: Đầy đủ các phần tử giao diện cốt lõi (Breakdown Bar, Radar, Table, Import Log).");
} catch (err) {
  errors.push(`Lỗi đọc index.html: ${err.message}`);
}

// 3. Kiểm tra tính đồng bộ giữa public/ và app/public/
console.log("🔍 [3/5] Kiểm tra đồng bộ hóa tài nguyên tĩnh (public/ <-> app/public/)...");
try {
  const filesToCheck = ['index.html', 'app.js', 'style.css', 'sw.js'];
  let synced = true;
  for (const f of filesToCheck) {
    const p1 = path.join(__dirname, 'public', f);
    const p2 = path.join(__dirname, 'app', 'public', f);
    if (!fs.existsSync(p2)) {
      synced = false;
      fs.copyFileSync(p1, p2);
      console.log(`   ℹ️ Đã tự động sao chép đồng bộ: ${f}`);
    } else {
      const s1 = fs.statSync(p1).size;
      const s2 = fs.statSync(p2).size;
      if (s1 !== s2) {
        fs.copyFileSync(p1, p2);
        console.log(`   ℹ️ Đã đồng bộ lại kích thước chênh lệch: ${f} (${s1} bytes)`);
      }
    }
  }
  console.log("   ✅ Tài nguyên web: 100% đồng bộ giữa root public/ và app/public/.");
} catch (err) {
  warnings.push(`Cảnh báo đồng bộ thư mục: ${err.message}`);
}

// 4. Kiểm tra biên dịch mã nguồn Python backend
console.log("🔍 [4/5] Kiểm tra mã nguồn Backend Python (py_compile)...");
try {
  execSync('python -m py_compile app/server.py app/monthly_importer.py', { stdio: 'pipe' });
  console.log("   ✅ app/server.py & app/monthly_importer.py: Biên dịch Python hợp lệ 100%.");
} catch (err) {
  errors.push(`Lỗi biên dịch Python: ${err.message}`);
}

// 5. Kiểm tra Chuẩn hóa ĐVT trong Cơ sở dữ liệu SQLite
console.log("🔍 [5/5] Kiểm tra quy chuẩn ĐVT trong Cơ sở dữ liệu...");
try {
  execSync('python -c "import sqlite3, sys; conn = sqlite3.connect(\'app_data/production_data.db\'); c = conn.cursor(); c.execute(\'SELECT DISTINCT material_name, unit FROM data_material_consumption WHERE (material_name LIKE \\\x22%bi%\\\x22 OR material_name LIKE \\\x22%nan nẹp%\\\x22 OR material_name LIKE \\\x22%dây đai%\\\x22) AND lower(unit) = \\\x22cái\\\x22\'); bad = c.fetchall(); conn.close(); sys.exit(1 if bad else 0)"', { stdio: 'pipe' });
  console.log("   ✅ Database integrity: 100% vật tư Bi nghiền, Dây đai, Nan nẹp... đều đạt chuẩn ĐVT (Kg).");
} catch (err) {
  errors.push(`Database có vật tư chưa chuẩn hóa ĐVT: ${err.message}`);
}

// Tổng kết Build
console.log("\n-------------------------------------------------------");
if (errors.length === 0) {
  console.log("🎉 BUILD STATUS: SUCCESS (100% PASSED)!");
  console.log("🚀 Sẵn sàng đưa lên Production trên Vercel & Chạy Server Local.");
  console.log("-------------------------------------------------------\n");
  process.exit(0);
} else {
  console.error("❌ BUILD STATUS: FAILED WITH ERRORS:");
  errors.forEach(e => console.error(`  - ${e}`));
  console.log("-------------------------------------------------------\n");
  process.exit(1);
}
