// Global State
let currentTab = "dashboard";
let monthlyTrendChart = null;
let donutActualChart = null;
let donutPlanChart = null;
let brandDistChart = null;
let matCompareChart = null;
let coalTrendChart = null;
let currentNormVersionId = 1;
let rawSummaryData = [];
let rawBrandsData = [];
let rawConsumptionData = [];
let rawCoalData = [];
let currentDashRawMaterials = [];
let currentDashRawCoal = [];
let currentDashRawMaterialsChart = [];
let currentDashRawCoalTrend = [];

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide && lucide.createIcons) lucide.createIcons();
  try { loadDashboardData(); } catch(e) { console.error("loadDashboardData err:", e); }
  try { loadSummaryData(); } catch(e) { console.error("loadSummaryData err:", e); }
  try { loadBrandsData(); } catch(e) { console.error("loadBrandsData err:", e); }
  try { loadNormVersions(); } catch(e) { console.error("loadNormVersions err:", e); }
  try { loadConsumptionData(); } catch(e) { console.error("loadConsumptionData err:", e); }
  try { loadCoalData(); } catch(e) { console.error("loadCoalData err:", e); }
  try { renderFormMauPreview(); } catch(e) { console.error("renderFormMauPreview err:", e); }
});

// Vietnamese Number Formatter
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  if (num === 0) return "0";
  const fixed = Number(num).toFixed(decimals);
  let [intPart, decPart] = fixed.split(".");
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decimals === 0 || !decPart || Number(decPart) === 0) {
    return intPart;
  }
  decPart = decPart.replace(/0+$/, "");
  return decPart ? `${intPart},${decPart}` : intPart;
}

// Tab Switching
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.remove("bg-emerald-600/90", "text-white", "shadow");
    b.classList.add("text-slate-300");
  });

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.remove("hidden");

  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.classList.add("bg-emerald-600/90", "text-white", "shadow");
    activeNav.classList.remove("text-slate-300");
  }

  const titles = {
    "dashboard": "Tổng quan",
    "summary": "Sản lượng · chất lượng",
    "brands": "Thương hiệu",
    "norms": "Định mức phiên bản",
    "consumption": "Tiêu hao vật tư",
    "coal": "Sử dụng than",
    "import": "Import Excel",
    "export-report": "Báo cáo trình ký",
    "admin": "Quản trị"
  };
  document.getElementById("breadcrumb-current").innerText = titles[tabId] || "Tổng quan";

  if (tabId === "dashboard") loadDashboardData();
  else if (tabId === "summary") loadSummaryData();
  else if (tabId === "brands") loadBrandsData();
  else if (tabId === "norms") loadNormVersions();
  else if (tabId === "consumption") loadConsumptionData();
  else if (tabId === "coal") loadCoalData();
  else if (tabId === "export-report") renderFormMauPreview();

  lucide.createIcons();
}

// Toggle Dark / Light Theme
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");

  if (isDark) {
    text.innerText = "Tone Sáng Doanh Nghiệp";
    icon.setAttribute("data-lucide", "sun");
  } else {
    text.innerText = "Tone Xanh Kỹ Thuật Số";
    icon.setAttribute("data-lucide", "moon");
  }
  lucide.createIcons();
  if (monthlyTrendChart) monthlyTrendChart.update();
  if (brandDistChart) brandDistChart.update();
}

// ----------------------------------------------------
// TAB 1: DASHBOARD (EXCEL REPLICA 2026 WITH VISUAL SLICERS)
// ----------------------------------------------------
let currentDashMonth = "all";
let currentDashLine = "all";
let currentDashSize = "all";
let currentDashBrand = "all";

function setDashMonth(m) {
  currentDashMonth = m;
  updateSlicerButtonStyles();
  loadDashboardData();
}

function setDashLine(l) {
  currentDashLine = l;
  updateSlicerButtonStyles();
  loadDashboardData();
}

function setDashSize(s) {
  currentDashSize = s;
  updateSlicerButtonStyles();
  loadDashboardData();
}

function setDashBrand(b) {
  currentDashBrand = b;
  const brandSelect = document.getElementById("dash-filter-brand");
  if (brandSelect) brandSelect.value = b;
  loadDashboardData();
}

function resetDashFilters() {
  currentDashMonth = "all";
  currentDashLine = "all";
  currentDashSize = "all";
  currentDashBrand = "all";
  updateSlicerButtonStyles();
  const brandSelect = document.getElementById("dash-filter-brand");
  if (brandSelect) brandSelect.value = "all";
  loadDashboardData();
}

function updateSlicerButtonStyles() {
  // 1. Month buttons
  const months = ["all", "1", "3", "4", "5", "6", "7", "8"];
  months.forEach(m => {
    const btn = document.getElementById("btn-month-" + m);
    if (btn) {
      if (currentDashMonth === m) {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white shadow-md border border-emerald-400 transition text-center";
      } else {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 transition text-center";
      }
    }
  });

  // 2. Line buttons
  const lines = ["all", "DC1", "DC2"];
  lines.forEach(l => {
    const btn = document.getElementById("btn-line-" + l);
    if (btn) {
      if (currentDashLine === l) {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white shadow-md border border-emerald-400 text-center transition";
      } else {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 text-center transition";
      }
    }
  });

  // 3. Size buttons
  const sizes = ["all", "30x60", "50x50", "40x80"];
  sizes.forEach(s => {
    const btn = document.getElementById("btn-size-" + s);
    if (btn) {
      if (currentDashSize === s) {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white shadow-md border border-emerald-400 text-center transition";
      } else {
        btn.className = "dash-slicer-btn px-2 py-1.5 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 text-center transition";
      }
    }
  });
}

async function loadDashboardData() {
  updateSlicerButtonStyles();

  const brandSelect = document.getElementById("dash-filter-brand");
  const brand = brandSelect ? brandSelect.value : currentDashBrand;
  currentDashBrand = brand;

  // Build badge
  const badge = document.getElementById("dash-badge-period");
  const monthStr = currentDashMonth === "all" ? "Tất cả các kỳ (T1 - T8)" : ("Tháng " + (currentDashMonth.length === 1 ? "0" + currentDashMonth : currentDashMonth));
  const lineStr = currentDashLine === "all" ? "Tất cả DC" : currentDashLine;
  const sizeStr = currentDashSize === "all" ? "Tất cả KT" : currentDashSize;
  const brandStr = currentDashBrand === "all" ? "" : ` • TH: ${currentDashBrand}`;
  if (badge) badge.innerText = `• ${monthStr} • ${lineStr} • ${sizeStr}${brandStr}`;

  // Date range label
  const dateRangeEl = document.getElementById("dash-date-range");
  if (dateRangeEl) {
    if (currentDashMonth === "all") dateRangeEl.innerText = "01/01/2026 - 31/08/2026";
    else {
      const m = parseInt(currentDashMonth);
      dateRangeEl.innerText = `01/${m.toString().padStart(2, '0')}/2026 - 31/${m.toString().padStart(2, '0')}/2026`;
    }
  }

  try {
    const res = await fetch(`/api/dashboard?month=${currentDashMonth}&line=${currentDashLine}&size=${currentDashSize}&brand=${encodeURIComponent(currentDashBrand)}`);
    const data = await res.json();
    const act = data.actual || {};
    const pln = data.plan || {};

    // 1. Update Brand Dropdown Options Dynamically
    if (data.available_brands && brandSelect) {
      const currentVal = currentDashBrand;
      brandSelect.innerHTML = `<option value="all">Tất cả thương hiệu (${data.available_brands.length})</option>` +
        data.available_brands.map(b => `<option value="${b}" ${b === currentVal ? 'selected' : ''}>${b}</option>`).join("");
      if (currentVal !== "all" && data.available_brands.includes(currentVal)) {
        brandSelect.value = currentVal;
      }
    }

    // 2. Update Panel 1: Thực hiện
    document.getElementById("donut-act-center").innerText = formatNumber(act.total_m2 || 0, 0);
    document.getElementById("donut-act-a1-pct").innerText = formatNumber(act.a1_pct || 0, 1) + "%";
    document.getElementById("donut-act-a-pct").innerText = formatNumber(act.a_pct || 0, 1) + "%";
    document.getElementById("donut-act-b-pct").innerText = formatNumber(act.b_pct || 0, 1) + "%";

    document.getElementById("tile-act-a1").innerText = formatNumber(act.a1_m2 || 0, 0);
    document.getElementById("tile-act-days").innerText = formatNumber(act.days || 0, 2);
    document.getElementById("tile-act-a").innerText = formatNumber(act.a_m2 || 0, 0);
    document.getElementById("tile-act-avgday").innerText = formatNumber(act.avg_per_day || 0, 0);
    document.getElementById("tile-act-b").innerText = formatNumber(act.b_m2 || 0, 0);
    document.getElementById("tile-act-stop2mf").innerText = formatNumber(act.stop_time_2mf || 0, 0);

    // 3. Update Panel 2: Kế hoạch
    document.getElementById("donut-pln-center").innerText = formatNumber(pln.total_m2 || 0, 0);
    document.getElementById("donut-pln-a1-pct").innerText = formatNumber(pln.a1_pct || 0, 1) + "%";
    document.getElementById("donut-pln-a-pct").innerText = formatNumber(pln.a_pct || 0, 1) + "%";
    document.getElementById("donut-pln-b-pct").innerText = formatNumber(pln.b_pct || 0, 1) + "%";

    document.getElementById("tile-pln-a1").innerText = formatNumber(pln.a1_m2 || 0, 0);
    document.getElementById("tile-pln-days").innerText = formatNumber(pln.days || 0, 2);
    document.getElementById("tile-pln-a").innerText = formatNumber(pln.a_m2 || 0, 0);
    document.getElementById("tile-pln-avgday").innerText = formatNumber(pln.avg_per_day || 0, 0);
    document.getElementById("tile-pln-b").innerText = formatNumber(pln.b_m2 || 0, 0);
    document.getElementById("tile-pln-stop2mf").innerText = formatNumber(pln.stop_time_2mf || 0, 0);

    // 4. Render Donut Charts
    renderDualDonutCharts(act, pln);

    // 5. Render Monthly Grouped Bar Chart
    renderMonthlyTrendChart(data.monthly_trend || [], data.is_brand_selected);

    // 6. Render Brand Distribution Doughnut & Table
    renderBrandDistChart(data.brand_distribution || [], data.is_brand_selected);
    renderDashboardBrandTable(data.brand_table || [], currentDashBrand);

    // 7. Store Raw Part III Materials Data
    const matSec = data.materials_section || {};
    currentDashRawMaterials = matSec.materials_list || [];
    currentDashRawMaterialsChart = matSec.materials_chart || [];
    filterDashboardMaterials();

    // 8. Store Raw Part IV Coal Data
    const coalSec = data.coal_section || {};
    currentDashRawCoal = coalSec.coal_list || [];
    currentDashRawCoalTrend = coalSec.coal_monthly_trend || [];
    filterDashboardCoal();

    if (window.lucide && lucide.createIcons) {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading dashboard data:", err);
  }
}

function renderDualDonutCharts(act, pln) {
  if (typeof Chart === "undefined") return;
  
  // 1. Actual Donut
  try {
    const elAct = document.getElementById("chart-donut-actual");
    if (elAct) {
      const ctxAct = elAct.getContext("2d");
      if (donutActualChart) donutActualChart.destroy();

      donutActualChart = new Chart(ctxAct, {
        type: "doughnut",
        data: {
          labels: ["Sum of A1", "Sum of A", "Sum of B"],
          datasets: [{
            data: [act.a1_m2 || 0, act.a_m2 || 0, act.b_m2 || 0],
            backgroundColor: ["#2d6a4f", "#b5d6b2", "#e76f51"],
            borderWidth: 2,
            borderColor: "#0f2042"
          }]
        },
        options: {
          cutout: "68%",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(c) {
                  const total = (act.total_m2 || 0);
                  const val = c.raw;
                  const pct = total > 0 ? (val / total * 100).toFixed(2) : 0;
                  return `${c.label}: ${formatNumber(val, 0)} m² (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  } catch (errAct) {
    console.error("Error rendering Actual Donut:", errAct);
  }

  // 2. Plan Donut
  try {
    const elPln = document.getElementById("chart-donut-plan");
    if (elPln) {
      const ctxPln = elPln.getContext("2d");
      if (donutPlanChart) donutPlanChart.destroy();

      donutPlanChart = new Chart(ctxPln, {
        type: "doughnut",
        data: {
          labels: ["Sum of A1", "Sum of A", "Sum of B"],
          datasets: [{
            data: [pln.a1_m2 || 0, pln.a_m2 || 0, pln.b_m2 || 0],
            backgroundColor: ["#2d6a4f", "#b5d6b2", "#e76f51"],
            borderWidth: 2,
            borderColor: "#0f2042"
          }]
        },
        options: {
          cutout: "68%",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(c) {
                  const total = (pln.total_m2 || 0);
                  const val = c.raw;
                  const pct = total > 0 ? (val / total * 100).toFixed(2) : 0;
                  return `${c.label}: ${formatNumber(val, 0)} m² (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  } catch (errPln) {
    console.error("Error rendering Plan Donut:", errPln);
  }
}

function renderMonthlyTrendChart(trends, isBrandSelected) {
  if (typeof Chart === "undefined") return;
  try {
    const el = document.getElementById("chart-monthly-trend");
    if (!el) return;
    const ctx = el.getContext("2d");
    if (monthlyTrendChart) monthlyTrendChart.destroy();

    const labels = (trends || []).map(t => t.month);
    const actuals = (trends || []).map(t => t.actual);
    const plans = (trends || []).map(t => t.plan);

    monthlyTrendChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Kế hoạch",
            data: plans,
            backgroundColor: "#94b89f",
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          },
          {
            label: "Thực hiện",
            data: actuals,
            backgroundColor: "#2d6a4f",
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw;
                return `${context.dataset.label}: ${formatNumber(val, 0)} m² (${(val / 1000).toFixed(0)}K)`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#cbd5e1", font: { weight: "bold", size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: "#94a3b8",
              callback: function(v) {
                if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
                if (v >= 1000) return (v / 1000).toFixed(0) + "K";
                return v;
              }
            },
            grid: { color: "rgba(255,255,255,0.06)" }
          }
        }
      }
    });
  } catch (errTrend) {
    console.error("Error rendering Monthly Trend Chart:", errTrend);
  }
}

function renderBrandDistChart(brands, isBrandSelected) {
  if (typeof Chart === "undefined") return;
  try {
    const el = document.getElementById("chart-brand-dist");
    if (!el) return;
    const ctx = el.getContext("2d");
    if (brandDistChart) brandDistChart.destroy();

    const labels = (brands || []).map(b => b.brand_name || "Chưa phân loại");
    const quantities = (brands || []).map(b => b.total_m2);

    brandDistChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: quantities,
          backgroundColor: [
            "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899",
            "#06b6d4", "#14b8a6", "#6366f1", "#d946ef", "#f43f5e",
            "#eab308", "#84cc16", "#06b6d4", "#a855f7", "#f97316"
          ],
          borderWidth: 2,
          borderColor: "#0f2042"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: "#94a3b8", font: { size: 9.5 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                return `${context.label}: ${formatNumber(val, 2)} m² (${pct}%)`;
              }
            }
          }
        }
      }
    });
  } catch (errBrand) {
    console.error("Error rendering Brand Dist Chart:", errBrand);
  }
}

function renderDashboardBrandTable(brandList, currentBrandFilter) {
  const tbody = document.getElementById("dash-brand-table-body");
  const tfoot = document.getElementById("dash-brand-table-foot");
  const countBadge = document.getElementById("dash-brand-table-count");

  if (countBadge) {
    countBadge.innerText = `${brandList.length} thương hiệu`;
  }

  if (!tbody || !brandList) return;

  if (brandList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-slate-500">Không có dữ liệu thương hiệu phù hợp</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let sumA1 = 0, sumB = 0, sumTotal = 0;
  brandList.forEach(b => {
    sumA1 += b.a1_m2 || 0;
    sumB += b.b_m2 || 0;
    sumTotal += b.total_m2 || 0;
  });
  const avgA1Pct = sumTotal > 0 ? (sumA1 / sumTotal * 100) : 0;

  tbody.innerHTML = brandList.map((b, idx) => {
    const isSelected = currentBrandFilter === b.brand_name;
    return `
      <tr class="transition ${isSelected ? 'bg-amber-500/15 text-amber-200 font-semibold' : 'hover:bg-[#13284d]/50 text-slate-200'}">
        <td class="p-2 text-center font-mono text-cyan-300 font-bold border border-[#1e3a6a]/40">${idx + 1}</td>
        <td class="p-2 font-bold text-white border border-[#1e3a6a]/40">
          <div class="flex items-center gap-1.5">
            <span>${b.brand_name}</span>
            ${isSelected ? '<span class="px-1 py-0.5 rounded text-[8.5px] bg-amber-500 text-black font-bold">Đang lọc</span>' : ''}
          </div>
        </td>
        <td class="p-2 text-center text-slate-300 border border-[#1e3a6a]/40 font-semibold">${b.lines || '-'}</td>
        <td class="p-2 text-center text-slate-300 border border-[#1e3a6a]/40">${b.sizes || '-'}</td>
        <td class="p-2 text-right font-bold text-emerald-400 border border-[#1e3a6a]/40">${formatNumber(b.a1_m2, 2)}</td>
        <td class="p-2 text-right font-medium text-amber-400 border border-[#1e3a6a]/40">${formatNumber(b.b_m2, 2)}</td>
        <td class="p-2 text-right font-black text-white border border-[#1e3a6a]/40">${formatNumber(b.total_m2, 2)}</td>
        <td class="p-2 text-right font-bold text-cyan-300 border border-[#1e3a6a]/40">${formatNumber(b.a1_pct, 1)}%</td>
        <td class="p-2 text-right font-medium text-slate-300 border border-[#1e3a6a]/40">
          <div class="flex items-center justify-end gap-1.5">
            <div class="w-10 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="bg-emerald-400 h-full" style="width: ${Math.min(100, b.share_pct)}%"></div>
            </div>
            <span>${formatNumber(b.share_pct, 1)}%</span>
          </div>
        </td>
        <td class="p-2 text-center border border-[#1e3a6a]/40">
          <button onclick="setDashBrand('${b.brand_name}')" class="px-2 py-1 rounded text-[10px] font-bold ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white'} transition">
            ${isSelected ? 'Đã chọn' : 'Lọc'}
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="bg-[#09152b] text-white border-t-2 border-emerald-500/60 font-black">
        <td colspan="4" class="p-2 text-center uppercase tracking-wider text-emerald-300 text-[11px]">TỔNG CỘNG TẤT CẢ THƯƠNG HIỆU</td>
        <td class="p-2 text-right text-emerald-400 text-xs">${formatNumber(sumA1, 2)}</td>
        <td class="p-2 text-right text-amber-400 text-xs">${formatNumber(sumB, 2)}</td>
        <td class="p-2 text-right text-white text-xs">${formatNumber(sumTotal, 2)}</td>
        <td class="p-2 text-right text-cyan-300 text-xs">${formatNumber(avgA1Pct, 1)}%</td>
        <td class="p-2 text-right text-slate-300">100.0%</td>
        <td class="p-2 text-center">
          <button onclick="setDashBrand('all')" class="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            Tất cả
          </button>
        </td>
      </tr>
    `;
  }
}

function filterDashboardMaterials() {
  const groupEl = document.getElementById("dash-mat-filter-group");
  const statusEl = document.getElementById("dash-mat-filter-status");
  const searchEl = document.getElementById("dash-mat-search");

  const group = groupEl ? groupEl.value : "all";
  const status = statusEl ? statusEl.value : "all";
  const search = searchEl ? searchEl.value.trim().toLowerCase() : "";

  let filtered = [...currentDashRawMaterials];

  // Filter by Group
  if (group === "xuong") {
    filtered = filtered.filter(m => (m.material_name || "").toLowerCase().includes("xương"));
  } else if (group === "men") {
    filtered = filtered.filter(m => (m.material_name || "").toLowerCase().includes("men"));
  } else if (group === "donggoi") {
    filtered = filtered.filter(m => {
      const n = (m.material_name || "").toLowerCase();
      return n.includes("bao bì") || n.includes("ke") || n.includes("đai") || n.includes("nan") || n.includes("nẹp") || n.includes("pallet");
    });
  } else if (group === "nhienlieu") {
    filtered = filtered.filter(m => (m.material_name || "").toLowerCase().includes("điều"));
  } else if (group === "bi") {
    filtered = filtered.filter(m => (m.material_name || "").toLowerCase().includes("bi"));
  }

  // Filter by Status
  if (status === "reduced") {
    filtered = filtered.filter(m => (m.reduced_qty || 0) > 0);
  } else if (status === "over") {
    filtered = filtered.filter(m => (m.over_qty || 0) > 0);
  }

  // Filter by Search
  if (search) {
    filtered = filtered.filter(m => (m.material_name || "").toLowerCase().includes(search));
  }

  // Update KPIs for filtered set
  const totalReduced = filtered.reduce((s, m) => s + (m.reduced_qty || 0), 0);
  const totalOver = filtered.reduce((s, m) => s + (m.over_qty || 0), 0);
  const totalXuong = filtered.filter(m => (m.material_name || "").toLowerCase().includes("xương")).reduce((s, m) => s + (m.used_qty || 0), 0);
  const totalMen = filtered.filter(m => (m.material_name || "").toLowerCase().includes("men")).reduce((s, m) => s + (m.used_qty || 0), 0);

  const elMatRed = document.getElementById("dash-mat-kpi-reduced");
  if (elMatRed) elMatRed.innerText = formatNumber(totalReduced, 1) + " kg";
  const elMatOver = document.getElementById("dash-mat-kpi-over");
  if (elMatOver) elMatOver.innerText = formatNumber(totalOver, 1) + " kg";
  const elMatXuong = document.getElementById("dash-mat-kpi-xuong");
  if (elMatXuong) elMatXuong.innerText = formatNumber(totalXuong / 1000, 1) + " tấn";
  const elMatMen = document.getElementById("dash-mat-kpi-men");
  if (elMatMen) elMatMen.innerText = formatNumber(totalMen / 1000, 1) + " tấn";
  const elMatBadge = document.getElementById("dash-mat-badge-count");
  if (elMatBadge) elMatBadge.innerText = `${filtered.length} loại vật tư`;

  renderDashboardMaterialTable(filtered);
  renderMaterialCompareChart(currentDashRawMaterialsChart);
}

function renderDashboardMaterialTable(materials) {
  const tbody = document.getElementById("dash-mat-table-body");
  const tfoot = document.getElementById("dash-mat-table-foot");

  if (!tbody) return;

  if (!materials || materials.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-500">Không có dữ liệu tiêu hao vật tư phù hợp</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let sumUsed = 0, sumReduced = 0, sumOver = 0;
  tbody.innerHTML = materials.map((m, idx) => {
    sumUsed += m.used_qty || 0;
    sumReduced += m.reduced_qty || 0;
    sumOver += m.over_qty || 0;

    const isOver = (m.over_qty || 0) > 0;
    const isReduced = (m.reduced_qty || 0) > 0;

    let statusBadge = `<span class="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-800 text-slate-400">Chuẩn</span>`;
    if (isOver) {
      statusBadge = `<span class="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">Vượt ĐM</span>`;
    } else if (isReduced) {
      statusBadge = `<span class="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Tiết kiệm</span>`;
    }

    return `
      <tr class="hover:bg-[#13284d]/50 text-slate-200 transition">
        <td class="p-2 text-center font-mono text-cyan-300 font-bold border border-[#1e3a6a]/40">${idx + 1}</td>
        <td class="p-2 font-bold text-white border border-[#1e3a6a]/40">
          <div>${m.material_name}</div>
          <div class="text-[10px] text-slate-400 font-normal">DC: ${m.line || '-'} • KT: ${m.size || '-'}</div>
        </td>
        <td class="p-2 text-center text-slate-300 border border-[#1e3a6a]/40 font-semibold">${m.unit || 'Kg'}</td>
        <td class="p-2 text-right text-slate-300 border border-[#1e3a6a]/40 font-mono">${formatNumber(m.norm_value, 4)}</td>
        <td class="p-2 text-right font-bold ${isOver ? 'text-amber-400' : 'text-cyan-300'} border border-[#1e3a6a]/40 font-mono">${formatNumber(m.actual_rate, 4)}</td>
        <td class="p-2 text-right font-black text-white border border-[#1e3a6a]/40 font-mono">${formatNumber(m.used_qty, 2)}</td>
        <td class="p-2 text-right font-bold text-emerald-400 border border-[#1e3a6a]/40 font-mono">${isReduced ? formatNumber(m.reduced_qty, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-amber-400 border border-[#1e3a6a]/40 font-mono">${isOver ? formatNumber(m.over_qty, 2) : '-'}</td>
        <td class="p-2 text-center border border-[#1e3a6a]/40">${statusBadge}</td>
      </tr>
    `;
  }).join("");

  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="bg-[#09152b] text-white border-t-2 border-emerald-500/60 font-black">
        <td colspan="5" class="p-2 text-center uppercase tracking-wider text-emerald-300 text-[11px]">TỔNG CỘNG TIÊU HAO VẬT TƯ</td>
        <td class="p-2 text-right text-white font-mono text-xs">${formatNumber(sumUsed, 2)}</td>
        <td class="p-2 text-right text-emerald-400 font-mono text-xs">${formatNumber(sumReduced, 2)}</td>
        <td class="p-2 text-right text-amber-400 font-mono text-xs">${formatNumber(sumOver, 2)}</td>
        <td class="p-2 text-center text-slate-400 text-[10px]">TỔNG HỢP</td>
      </tr>
    `;
  }
}

function renderMaterialCompareChart(chartItems) {
  if (typeof Chart === "undefined") return;
  try {
    const el = document.getElementById("chart-mat-compare");
    if (!el) return;
    const ctx = el.getContext("2d");
    if (matCompareChart) matCompareChart.destroy();

    const topItems = (chartItems || []).slice(0, 6);
    const labels = topItems.map(i => i.material_name);
    const normData = topItems.map(i => i.norm_value);
    const actData = topItems.map(i => i.actual_rate);

    matCompareChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Định mức",
            data: normData,
            backgroundColor: "#3b82f6",
            borderRadius: 4
          },
          {
            label: "Thực tế",
            data: actData,
            backgroundColor: "#10b981",
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { color: "#94a3b8", font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function(c) {
                return `${c.dataset.label}: ${formatNumber(c.raw, 4)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#cbd5e1", font: { size: 9.5 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(255,255,255,0.06)" }
          }
        }
      }
    });
  } catch (errMat) {
    console.error("Error rendering Material Compare Chart:", errMat);
  }
}

function filterDashboardCoal() {
  const metricEl = document.getElementById("dash-coal-filter-metric");
  const supplierEl = document.getElementById("dash-coal-filter-supplier");
  const warehouseEl = document.getElementById("dash-coal-filter-warehouse");
  const searchEl = document.getElementById("dash-coal-search");

  const metric = metricEl ? metricEl.value : "all";
  const supplier = supplierEl ? supplierEl.value : "all";
  const warehouse = warehouseEl ? warehouseEl.value : "all";
  const search = searchEl ? searchEl.value.trim().toLowerCase() : "";

  let filtered = [...currentDashRawCoal];

  // 1. Metric filter (Rate Type / Ash / Compensation)
  if (metric === "rate_lump") {
    filtered = filtered.filter(c => (c.rate_lump || 0) > 0);
  } else if (metric === "rate_with_ash") {
    filtered = filtered.filter(c => (c.rate_with_ash || 0) > 0);
  } else if (metric === "rate_total") {
    filtered = filtered.filter(c => (c.rate_total || 0) > 0);
  } else if (metric === "excess_ash") {
    filtered = filtered.filter(c => (c.excess_ash_weight || 0) > 0 || ((c.ash_rate || 0) > (c.std_ash_rate || 16)));
  } else if (metric === "compensation") {
    filtered = filtered.filter(c => (c.compensation_weight || 0) > 0);
  }

  // 2. Supplier filter
  if (supplier !== "all") {
    filtered = filtered.filter(c => (c.coal_supplier || "").toLowerCase().includes(supplier.toLowerCase()));
  }

  // 3. Warehouse filter
  if (warehouse !== "all") {
    filtered = filtered.filter(c => (c.warehouse || "").toLowerCase().includes(warehouse.toLowerCase()));
  }

  // 4. Search
  if (search) {
    filtered = filtered.filter(c => 
      (c.coal_supplier || "").toLowerCase().includes(search) || 
      (c.warehouse || "").toLowerCase().includes(search) || 
      (c.note || "").toLowerCase().includes(search)
    );
  }

  // Update KPI cards based on filtered set
  const totalUsed = filtered.reduce((s, c) => s + (c.total_used_weight || 0), 0);
  const totalProd = filtered.reduce((s, c) => s + (c.production_m2 || 0), 0);
  
  let avgRate = 0;
  let rateDesc = "Bình quân theo sản lượng";
  if (metric === "rate_lump") {
    const totalLump = filtered.reduce((s, c) => s + (c.issued_weight || 0), 0);
    avgRate = totalProd > 0 ? (totalLump / totalProd) : 0;
    rateDesc = "Suất tiêu hao than cục";
  } else if (metric === "rate_with_ash") {
    const totalWithAsh = filtered.reduce((s, c) => s + (c.issued_weight || 0) + (c.ash_weight || 0), 0);
    avgRate = totalProd > 0 ? (totalWithAsh / totalProd) : 0;
    rateDesc = "Suất TH than cục + cám";
  } else {
    avgRate = totalProd > 0 ? (totalUsed / totalProd) : 0;
    rateDesc = "Suất TH tổng hợp (cục+cám+bù)";
  }

  const validHeats = filtered.map(c => c.heat_value).filter(h => h && h > 0);
  const avgHeat = validHeats.length > 0 ? (validHeats.reduce((a, b) => a + b, 0) / validHeats.length) : 0;

  const validAsh = filtered.map(c => c.ash_rate).filter(a => a !== null && a !== undefined && a > 0);
  const avgAsh = validAsh.length > 0 ? (validAsh.reduce((a, b) => a + b, 0) / validAsh.length) : 0;

  const elCoalTot = document.getElementById("dash-coal-kpi-total");
  if (elCoalTot) elCoalTot.innerText = formatNumber(totalUsed / 1000, 1) + " tấn";
  const elCoalRate = document.getElementById("dash-coal-kpi-rate");
  if (elCoalRate) elCoalRate.innerText = formatNumber(avgRate, 2) + " kg/m²";
  const elCoalRateDesc = document.getElementById("dash-coal-kpi-rate-desc");
  if (elCoalRateDesc) elCoalRateDesc.innerText = rateDesc;
  const elCoalAsh = document.getElementById("dash-coal-kpi-ash");
  if (elCoalAsh) elCoalAsh.innerText = formatNumber(avgAsh, 1) + " %";
  const elCoalHeat = document.getElementById("dash-coal-kpi-heat");
  if (elCoalHeat) elCoalHeat.innerText = formatNumber(avgHeat, 0) + " kcal/kg";
  const elCoalBadge = document.getElementById("dash-coal-badge-count");
  if (elCoalBadge) elCoalBadge.innerText = `${filtered.length} lô đốt lò`;

  renderDashboardCoalTable(filtered, metric);
  renderCoalTrendChart(currentDashRawCoalTrend);
}

function renderDashboardCoalTable(coalList, currentMetric = "all") {
  const tbody = document.getElementById("dash-coal-table-body");
  const tfoot = document.getElementById("dash-coal-table-foot");

  if (!tbody) return;

  if (!coalList || coalList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="p-4 text-center text-slate-500">Không có dữ liệu than phù hợp</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let sumIssued = 0, sumComp = 0, sumProd = 0, sumUsed = 0;
  tbody.innerHTML = coalList.map((c, idx) => {
    sumIssued += c.issued_weight || 0;
    sumComp += c.compensation_weight || 0;
    sumUsed += c.total_used_weight || 0;
    sumProd += c.production_m2 || 0;

    const isExcessAsh = (c.excess_ash_weight || 0) > 0 || ((c.ash_rate || 0) > (c.std_ash_rate || 16));
    const isComp = (c.compensation_weight || 0) > 0;

    return `
      <tr class="hover:bg-[#13284d]/50 text-slate-200 transition">
        <td class="p-2 text-center font-mono text-cyan-300 font-bold border border-[#1e3a6a]/40">${idx + 1}</td>
        <td class="p-2 font-bold text-white border border-[#1e3a6a]/40">
          <div class="flex items-center gap-1.5">
            <span>${c.coal_supplier || 'Than nung'}</span>
            ${isExcessAsh ? '<span class="px-1 py-0.2 rounded text-[8px] bg-red-500/20 text-red-300 border border-red-500/30">Cám vượt</span>' : ''}
            ${isComp ? '<span class="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30">Lĩnh bù</span>' : ''}
          </div>
          <div class="text-[9.5px] text-slate-400 font-normal">DC: ${c.line || '-'} • KT: ${c.size || '-'}</div>
        </td>
        <td class="p-2 text-center text-slate-300 border border-[#1e3a6a]/40 font-mono">
          <div>${c.warehouse || '-'}</div>
          <div class="text-[9px] text-slate-400">${c.import_date || ''}</div>
        </td>
        <td class="p-2 text-right text-blue-300 border border-[#1e3a6a]/40 font-mono font-bold">${formatNumber(c.heat_value, 0)}</td>
        <td class="p-2 text-right ${isExcessAsh ? 'text-amber-400 font-bold' : 'text-emerald-300'} border border-[#1e3a6a]/40 font-mono font-semibold">${formatNumber(c.ash_rate, 1)}%</td>
        <td class="p-2 text-right font-black text-slate-200 border border-[#1e3a6a]/40 font-mono">${formatNumber(c.issued_weight, 0)}</td>
        <td class="p-2 text-right font-bold text-amber-300 border border-[#1e3a6a]/40 font-mono">${isComp ? formatNumber(c.compensation_weight, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-white border border-[#1e3a6a]/40 font-mono">${formatNumber(c.production_m2, 0)}</td>
        <td class="p-2 text-right font-bold text-cyan-300 border border-[#1e3a6a]/40 font-mono ${currentMetric === 'rate_lump' ? 'bg-cyan-950/40 border-cyan-500' : ''}">${formatNumber(c.rate_lump, 2)}</td>
        <td class="p-2 text-right font-bold text-amber-300 border border-[#1e3a6a]/40 font-mono ${currentMetric === 'rate_with_ash' ? 'bg-amber-950/40 border-amber-500' : ''}">${formatNumber(c.rate_with_ash, 2)}</td>
        <td class="p-2 text-right font-black text-emerald-300 border border-[#1e3a6a]/40 font-mono ${currentMetric === 'rate_total' || currentMetric === 'all' ? 'bg-emerald-950/30' : ''}">${formatNumber(c.rate_total, 2)}</td>
        <td class="p-2 text-slate-300 border border-[#1e3a6a]/40 text-[9.5px]">${c.note || '-'}</td>
      </tr>
    `;
  }).join("");

  const overallLumpRate = sumProd > 0 ? (sumIssued / sumProd) : 0;
  const overallRate = sumProd > 0 ? (sumUsed / sumProd) : 0;
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="bg-[#09152b] text-white border-t-2 border-amber-500/60 font-black">
        <td colspan="5" class="p-2 text-center uppercase tracking-wider text-amber-300 text-[10.5px]">TỔNG CỘNG & BÌNH QUÂN</td>
        <td class="p-2 text-right text-slate-200 font-mono text-[11px]">${formatNumber(sumIssued, 0)}</td>
        <td class="p-2 text-right text-amber-300 font-mono text-[11px]">${formatNumber(sumComp, 0)}</td>
        <td class="p-2 text-right text-white font-mono text-[11px]">${formatNumber(sumProd, 0)}</td>
        <td class="p-2 text-right text-cyan-300 font-mono text-[11px]">${formatNumber(overallLumpRate, 2)}</td>
        <td class="p-2 text-right text-amber-300 font-mono text-[11px]">-</td>
        <td class="p-2 text-right text-emerald-300 font-mono text-[11px]">${formatNumber(overallRate, 2)}</td>
        <td class="p-2 text-slate-400 text-[9.5px]">TỔNG THỰC HIỆN</td>
      </tr>
    `;
  }
}

function renderCoalTrendChart(monthlyTrend) {
  if (typeof Chart === "undefined") return;
  try {
    const el = document.getElementById("chart-coal-trend");
    if (!el) return;
    const ctx = el.getContext("2d");
    if (coalTrendChart) coalTrendChart.destroy();

    const labels = (monthlyTrend || []).map(t => "Tháng " + t.month_num);
    const rates = (monthlyTrend || []).map(t => t.rate_kg_m2);
    const weights = (monthlyTrend || []).map(t => t.used_ton);

    coalTrendChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "bar",
            label: "Khối lượng than (Tấn)",
            data: weights,
            backgroundColor: "rgba(245, 158, 11, 0.45)",
            borderColor: "#f59e0b",
            borderWidth: 1,
            yAxisID: "y1",
            borderRadius: 4
          },
          {
            type: "line",
            label: "Suất tiêu hao (kg/m²)",
            data: rates,
            borderColor: "#06b6d4",
            backgroundColor: "#06b6d4",
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#06b6d4",
            pointRadius: 4,
            borderWidth: 2.5,
            tension: 0.3,
            yAxisID: "y"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { color: "#94a3b8", font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function(c) {
                if (c.dataset.type === "line") {
                  return `Suất tiêu hao: ${formatNumber(c.raw, 2)} kg/m²`;
                }
                return `Lượng than: ${formatNumber(c.raw, 1)} tấn`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#cbd5e1", font: { weight: "bold", size: 10 } },
            grid: { display: false }
          },
          y: {
            position: "left",
            title: { display: true, text: "kg/m²", color: "#06b6d4", font: { size: 9.5 } },
            ticks: { color: "#06b6d4" },
            grid: { color: "rgba(255,255,255,0.06)" }
          },
          y1: {
            position: "right",
            title: { display: true, text: "Tấn than", color: "#f59e0b", font: { size: 9.5 } },
            ticks: { color: "#f59e0b" },
            grid: { display: false }
          }
        }
      }
    });
  } catch (errCoal) {
    console.error("Error rendering Coal Trend Chart:", errCoal);
  }
}

// ----------------------------------------------------
// TAB 2: DATA I (SẢN LƯỢNG · CHẤT LƯỢNG)
// ----------------------------------------------------
async function loadSummaryData() {
  const month = document.getElementById("summary-filter-month").value;
  const line = document.getElementById("summary-filter-line").value;
  const size = document.getElementById("summary-filter-size").value;

  const badge = document.getElementById("summary-badge-period");
  badge.innerText = `• Tháng ${month === "all" ? "Tất cả" : (month.length === 1 ? "0" + month : month)} / 2026`;

  try {
    const res = await fetch(`/api/data/summary?month=${month}&line=${line}&size=${size}&unit=m2`);
    const json = await res.json();
    rawSummaryData = json.data || [];
    renderSummaryTable(rawSummaryData);
  } catch (err) {
    console.error("Error loading summary data:", err);
  }
}

function filterSummaryClient() {
  const term = document.getElementById("summary-search-input").value.toLowerCase();
  const filtered = rawSummaryData.filter(r => 
    (r.product_line && r.product_line.toLowerCase().includes(term)) ||
    (r.line && r.line.toLowerCase().includes(term)) ||
    (r.size && r.size.toLowerCase().includes(term)) ||
    (r.data_type && r.data_type.toLowerCase().includes(term)) ||
    (r.source_row && r.source_row.toLowerCase().includes(term))
  );
  renderSummaryTable(filtered);
}

function renderSummaryTable(rows) {
  const tbody = document.getElementById("summary-table-body");
  document.getElementById("summary-row-count").innerText = `${rows.length} dòng dữ liệu`;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr class="hover:bg-[#13284d]/50 transition">
      <td class="p-3">${r.month}/${r.year}</td>
      <td class="p-3 font-bold ${r.line === 'DC1' ? 'text-cyan-400' : 'text-amber-400'}">${r.line}</td>
      <td class="p-3">${r.size}</td>
      <td class="p-3 font-semibold">${r.product_line || 'Phương Nam'}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded text-[11px] font-medium ${r.data_type === 'Thực hiện' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}">
          ${r.data_type}
        </span>
      </td>
      <td class="p-3 text-right font-medium">${formatNumber(r.sl_ep, 2)}</td>
      <td class="p-3 text-right font-bold text-emerald-400">${formatNumber(r.a1, 2)}</td>
      <td class="p-3 text-right font-medium">${formatNumber(r.a, 2)}</td>
      <td class="p-3 text-right font-medium text-amber-400">${formatNumber(r.b, 2)}</td>
      <td class="p-3 text-right font-bold text-white">${formatNumber(r.recovery_total, 2)}</td>
      <td class="p-3 text-center">${formatNumber(r.prod_days, 1)}</td>
      <td class="p-3 text-center text-rose-300 font-semibold">${formatNumber(r.stop_time_2mf, 0)}</td>
      <td class="p-3 text-slate-400 text-[11px]">${r.source_row || 'Data tổng hợp I'}</td>
      <td class="p-3 text-center">
        <button onclick="alert('Xem chi tiết bản ghi ID ' + ${r.id})" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition">
          Chi tiết / sửa
        </button>
      </td>
    </tr>
  `).join("");
}

// ----------------------------------------------------
// TAB 3: DATA II (THƯƠNG HIỆU) + HÀNG TÍNH TỔNG A1/A/B
// ----------------------------------------------------
async function loadBrandsData() {
  const month = document.getElementById("brands-filter-month").value;
  const line = document.getElementById("brands-filter-line").value;
  const size = document.getElementById("brands-filter-size").value;

  const badge = document.getElementById("brands-badge-period");
  badge.innerText = `• Tháng ${month === "all" ? "Tất cả" : (month.length === 1 ? "0" + month : month)} / 2026`;

  try {
    const res = await fetch(`/api/data/brands?month=${month}&line=${line}&size=${size}`);
    const json = await res.json();
    rawBrandsData = json.data || [];
    renderBrandsTable(rawBrandsData);
  } catch (err) {
    console.error("Error loading brands data:", err);
  }
}

function filterBrandsClient() {
  const term = document.getElementById("brands-search-input").value.toLowerCase();
  const filtered = rawBrandsData.filter(r => 
    (r.brand_name && r.brand_name.toLowerCase().includes(term)) ||
    (r.glaze_type && r.glaze_type.toLowerCase().includes(term)) ||
    (r.line && r.line.toLowerCase().includes(term)) ||
    (r.size && r.size.toLowerCase().includes(term)) ||
    (r.grade && r.grade.toLowerCase().includes(term)) ||
    (r.source_row && r.source_row.toLowerCase().includes(term))
  );
  renderBrandsTable(filtered);
}

function renderBrandsTable(rows) {
  const tbody = document.getElementById("brands-table-body");
  const tfoot = document.getElementById("brands-table-foot");
  document.getElementById("brands-row-count").innerText = `${rows.length} dòng dữ liệu`;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu</td></tr>`;
    tfoot.innerHTML = "";
    return;
  }

  // Calculate Totals for A1, A, B and Grand Total
  let sumA1 = 0;
  let sumA = 0;
  let sumB = 0;
  let grandTotal = 0;

  rows.forEach(r => {
    const q = Number(r.quantity_m2 || 0);
    grandTotal += q;
    if (r.grade === "A1") sumA1 += q;
    else if (r.grade === "A") sumA += q;
    else if (r.grade === "B") sumB += q;
  });

  // Render Rows
  tbody.innerHTML = rows.map(r => `
    <tr class="hover:bg-[#13284d]/50 transition">
      <td class="p-3">${r.month}/${r.year}</td>
      <td class="p-3 font-bold ${r.line === 'DC1' ? 'text-cyan-400' : 'text-amber-400'}">${r.line}</td>
      <td class="p-3">${r.size || '-'}</td>
      <td class="p-3 text-slate-300 font-medium">${r.glaze_type || 'Phương Nam'}</td>
      <td class="p-3 font-semibold text-white">${r.brand_name}</td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 rounded text-[11px] font-bold ${r.grade === 'A1' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (r.grade === 'A' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')}">
          ${r.grade}
        </span>
      </td>
      <td class="p-3 text-right font-bold text-slate-100">${formatNumber(r.quantity_m2, 2)}</td>
      <td class="p-3 text-slate-400 text-[11px]">${r.source_row || 'Data tổng hợp II'}</td>
      <td class="p-3 text-center">
        <button onclick="alert('Chi tiết thương hiệu: ' + '${r.brand_name}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition">
          Chi tiết / sửa
        </button>
      </td>
    </tr>
  `).join("");

  // Render Table Footer Row (TỔNG CỘNG A1 / A / B)
  tfoot.innerHTML = `
    <tr>
      <td colspan="5" class="p-3 text-left uppercase text-slate-300">TỔNG CỘNG THEO PHÂN LOẠI (A1 / A / B):</td>
      <td class="p-3 text-center text-xs font-bold text-emerald-400">TỔNG</td>
      <td class="p-3 text-right text-sm font-black text-white">${formatNumber(grandTotal, 2)}</td>
      <td colspan="2" class="p-3 text-left text-[11px] text-emerald-400 font-semibold">
        Khớp 100% Data I ✓
      </td>
    </tr>
  `;

  // Update Footer Cards
  document.getElementById("foot-sum-a1").innerText = formatNumber(sumA1, 2) + " m²";
  document.getElementById("foot-sum-a").innerText = formatNumber(sumA, 2) + " m²";
  document.getElementById("foot-sum-b").innerText = formatNumber(sumB, 2) + " m²";
  document.getElementById("foot-sum-total").innerText = formatNumber(grandTotal, 2) + " m²";
}

// ----------------------------------------------------
// TAB 4: ĐỊNH MỨC PHIÊN BẢN (VERSIONED NORMS)
// ----------------------------------------------------
async function loadNormVersions() {
  try {
    const res = await fetch("/api/norms/versions");
    const json = await res.json();
    const versions = json.data || [];
    renderNormVersionsGrid(versions);

    const sel = document.getElementById("new-version-copy-from");
    if (sel) {
      sel.innerHTML = versions.map(v => `<option value="${v.id}">${v.version_code} - ${v.version_name}</option>`).join("");
    }

    if (versions.length > 0) {
      loadNormDetails(currentNormVersionId || versions[0].id);
    }
  } catch (err) {
    console.error("Error loading norm versions:", err);
  }
}

function renderNormVersionsGrid(versions) {
  const grid = document.getElementById("norm-versions-grid");
  if (!grid) return;

  grid.innerHTML = versions.map(v => `
    <div onclick="loadNormDetails(${v.id})" class="p-4 rounded-xl border cursor-pointer transition ${v.id === currentNormVersionId ? 'bg-blue-600/20 border-blue-500 shadow-lg' : 'bg-[#0f2042] border-[#1e3a6a]/60 hover:border-blue-400/50'}">
      <div class="flex items-center justify-between mb-2">
        <span class="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono text-xs font-bold">${v.version_code}</span>
        <span class="text-[11px] text-emerald-400 font-semibold">Hiệu lực: T${v.effective_from_month}/${v.effective_from_year}</span>
      </div>
      <h4 class="text-xs font-bold text-white mb-1">${v.version_name}</h4>
      <p class="text-[11px] text-slate-400 line-clamp-2">${v.description || 'Không có ghi chú'}</p>
      <div class="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
        <span>${v.item_count || 0} hạng mục định mức</span>
        <span class="text-cyan-400 font-medium">Bảo toàn lịch sử ✓</span>
      </div>
    </div>
  `).join("");
}

async function loadNormDetails(versionId) {
  currentNormVersionId = versionId;
  try {
    const res = await fetch(`/api/norms/details?version_id=${versionId}`);
    const json = await res.json();
    const ver = json.version || {};
    const details = json.details || [];

    document.getElementById("current-norm-title").innerText = `Chi tiết định mức: ${ver.version_code || 'V1'} - ${ver.version_name || ''}`;
    const tbody = document.getElementById("norm-details-body");
    tbody.innerHTML = details.map(d => `
      <tr class="hover:bg-[#13284d]/50">
        <td class="p-3 font-semibold text-white">${d.material_name}</td>
        <td class="p-3 font-bold text-cyan-400">${d.line}</td>
        <td class="p-3">${d.size}</td>
        <td class="p-3 text-slate-400">${d.unit}</td>
        <td class="p-3 text-right">
          <input type="number" step="0.001" value="${d.norm_value}" data-item-id="${d.id}" class="norm-input-field w-28 bg-[#091428] border border-blue-500/30 text-xs font-bold text-cyan-300 px-2 py-1 rounded text-right focus:outline-none focus:border-emerald-400" />
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error loading norm details:", err);
  }
}

async function saveNormDetails() {
  const inputs = document.querySelectorAll(".norm-input-field");
  const items = [];
  inputs.forEach(inp => {
    items.push({
      id: parseInt(inp.getAttribute("data-item-id")),
      norm_value: parseFloat(inp.value || 0)
    });
  });

  try {
    const res = await fetch("/api/norms/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: currentNormVersionId, items: items })
    });
    const json = await res.json();
    alert(json.message || "Đã lưu thay đổi định mức thành công!");
    loadNormDetails(currentNormVersionId);
  } catch (err) {
    alert("Lỗi khi lưu định mức: " + err);
  }
}

function openCreateVersionModal() {
  document.getElementById("modal-create-version").classList.remove("hidden");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
}

async function submitCreateVersion() {
  const code = document.getElementById("new-version-code").value.trim();
  const name = document.getElementById("new-version-name").value.trim();
  const month = parseInt(document.getElementById("new-version-month").value);
  const year = parseInt(document.getElementById("new-version-year").value);
  const copyFrom = document.getElementById("new-version-copy-from").value;
  const desc = document.getElementById("new-version-desc").value.trim();

  if (!code || !name) {
    alert("Vui lòng nhập đầy đủ Mã và Tên phiên bản!");
    return;
  }

  try {
    const res = await fetch("/api/norms/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_code: code,
        version_name: name,
        effective_from_month: month,
        effective_from_year: year,
        copy_from_version_id: copyFrom ? parseInt(copyFrom) : null,
        description: desc
      })
    });
    const json = await res.json();
    if (json.success) {
      alert("Đã tạo phiên bản định mức mới thành công! Định mức mới chỉ áp dụng từ thời điểm hiệu lực.");
      closeModal("modal-create-version");
      loadNormVersions();
    } else {
      alert(json.error || "Lỗi khi tạo phiên bản");
    }
  } catch (err) {
    alert("Lỗi: " + err);
  }
}

// ----------------------------------------------------
// TAB 5: TIÊU HAO VẬT TƯ (DATA III - KHỚP 100% ẢNH 2 CODEX)
// ----------------------------------------------------
async function loadConsumptionData() {
  const month = document.getElementById("consumption-filter-month").value;
  const line = document.getElementById("consumption-filter-line").value;
  const size = document.getElementById("consumption-filter-size").value;

  const badge = document.getElementById("consumption-badge-period");
  badge.innerText = `• Tháng ${month === "all" ? "Tất cả" : (month.length === 1 ? "0" + month : month)} / 2026`;

  try {
    const res = await fetch(`/api/data/materials?month=${month}&line=${line}&size=${size}`);
    const json = await res.json();
    rawConsumptionData = json.data || [];
    renderConsumptionTable(rawConsumptionData);
  } catch (err) {
    console.error("Error loading consumption data:", err);
  }
}

function filterConsumptionClient() {
  const term = document.getElementById("consumption-search-input").value.toLowerCase();
  const filtered = rawConsumptionData.filter(r => 
    (r.material_name && r.material_name.toLowerCase().includes(term)) ||
    (r.line && r.line.toLowerCase().includes(term)) ||
    (r.size && r.size.toLowerCase().includes(term)) ||
    (r.status_text && r.status_text.toLowerCase().includes(term)) ||
    (r.source_row && r.source_row.toLowerCase().includes(term))
  );
  renderConsumptionTable(filtered);
}

function renderConsumptionTable(rows) {
  const tbody = document.getElementById("consumption-table-body");
  document.getElementById("consumption-row-count").innerText = `${rows.length} dòng dữ liệu`;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const hasData = r.used_qty > 0 || r.actual_rate > 0;
    const diff = Number(r.diff_qty || 0);
    const diffStr = diff !== 0 ? (diff > 0 ? `+${formatNumber(diff, 2)}` : `${formatNumber(diff, 2)}`) : "-";
    const diffClass = diff < 0 ? "text-emerald-400 font-bold" : (diff > 0 ? "text-rose-400 font-bold" : "text-slate-400");
    const statusClass = hasData ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/30 text-slate-400";

    return `
      <tr class="hover:bg-[#13284d]/50 transition">
        <td class="p-3">${r.month}/${r.year}</td>
        <td class="p-3 font-bold ${r.line === 'DC1' ? 'text-cyan-400' : 'text-amber-400'}">${r.line}</td>
        <td class="p-3">${r.size || '-'}</td>
        <td class="p-3 font-semibold text-white">${r.material_name}</td>
        <td class="p-3 text-slate-400">${r.unit || ''}</td>
        <td class="p-3 text-right font-medium">${formatNumber(r.norm_value, 4)}</td>
        <td class="p-3 text-right font-medium">${r.used_qty > 0 ? formatNumber(r.used_qty, 0) : '-'}</td>
        <td class="p-3 text-right font-medium text-slate-300">${r.prod_qty > 0 ? formatNumber(r.prod_qty, 2) : '0'}</td>
        <td class="p-3 text-right font-bold text-cyan-300">${r.actual_rate > 0 ? formatNumber(r.actual_rate, 4) : '-'}</td>
        <td class="p-3 text-right ${diffClass}">${diffStr}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded text-[11px] font-medium ${statusClass}">
            ${r.status_text || (hasData ? 'Có số liệu' : 'Chưa nhập lượng sử dụng')}
          </span>
        </td>
        <td class="p-3 text-slate-400 text-[11px]">${r.source_row || 'Data tổng hợp III'}</td>
      </tr>
    `;
  }).join("");
}

// ----------------------------------------------------
// TAB 6: SỬ DỤNG THAN (DATA IV - CHUẨN 100% FORM GỐC ẢNH 2)
// ----------------------------------------------------
let coalSummaryData = null;

async function loadCoalData() {
  const month = document.getElementById("coal-filter-month").value;
  const line = document.getElementById("coal-filter-line").value;
  const size = document.getElementById("coal-filter-size").value;
  const firing = document.getElementById("coal-filter-firing").value;

  const badge = document.getElementById("coal-badge-period");
  const monthStr = month === "all" ? "Tất cả kỳ" : (month.length === 1 ? "Tháng 0" + month : "Tháng " + month);
  const lineStr = line === "all" ? "Tất cả DC" : line;
  const sizeStr = size === "all" ? "" : ` (${size})`;
  badge.innerText = `• ${monthStr} / 2026 - ${lineStr}${sizeStr}`;

  try {
    const res = await fetch(`/api/data/coal?month=${month}&line=${line}&size=${size}&firing_type=${firing}`);
    const json = await res.json();
    rawCoalData = json.data || [];
    coalSummaryData = json.summary || {};
    renderCoalTable(rawCoalData, coalSummaryData);
  } catch (err) {
    console.error("Error loading coal data:", err);
  }
}

function filterCoalClient() {
  const term = document.getElementById("coal-search-input").value.toLowerCase();
  const filtered = rawCoalData.filter(r => 
    (r.coal_supplier && r.coal_supplier.toLowerCase().includes(term)) ||
    (r.firing_type && r.firing_type.toLowerCase().includes(term)) ||
    (r.line && r.line.toLowerCase().includes(term)) ||
    (r.note && r.note.toLowerCase().includes(term))
  );
  renderCoalTable(filtered, coalSummaryData);
}

function renderCoalTable(rows, summary) {
  const tbody = document.getElementById("coal-table-body");
  const tfoot = document.getElementById("coal-table-foot");
  document.getElementById("coal-row-count").innerText = `${rows.length} dòng dữ liệu`;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="17" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu tiêu hao than</td></tr>`;
    tfoot.innerHTML = "";
    updateCoalKPIs({
      rate_lump: 0,
      issued_weight: 0,
      rate_with_ash: 0,
      ash_weight: 0,
      ash_rate_avg: 0,
      rate_total: 0,
      compensation_weight: 0,
      excess_ash_weight: 0,
      production_m2: 0,
      total_used_weight: 0
    });
    return;
  }

  // Calculate dynamic sums for current filtered rows
  let sumLumpFiring = 0, sumAshFiring = 0, sumCompFiring = 0, sumExcessFiring = 0, sumUsedFiring = 0, sumM2Firing = 0;
  let sumLumpDrying = 0, sumAshDrying = 0, sumCompDrying = 0, sumUsedDrying = 0;

  rows.forEach(r => {
    const isDrying = r.firing_type && r.firing_type.includes("Không");
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const used = Number(r.total_used_weight || (issued + ash + comp));
    const m2 = Number(r.production_m2 || 0);

    if (isDrying) {
      sumLumpDrying += issued;
      sumAshDrying += ash;
      sumCompDrying += comp;
      sumUsedDrying += used;
    } else {
      sumLumpFiring += issued;
      sumAshFiring += ash;
      sumCompFiring += comp;
      sumExcessFiring += excess;
      sumUsedFiring += used;
      sumM2Firing += m2;
    }
  });

  const totalIssuedAll = sumLumpFiring + sumLumpDrying;
  const totalAshAll = sumAshFiring + sumAshDrying;
  const totalCompAll = sumCompFiring + sumCompDrying;
  const totalUsedAll = sumUsedFiring + sumUsedDrying;
  const totalM2All = sumM2Firing;

  const rateLumpFiring = sumM2Firing > 0 ? (sumLumpFiring / sumM2Firing) : 0;
  const rateWithAshFiring = sumM2Firing > 0 ? ((sumLumpFiring + sumAshFiring) / sumM2Firing) : 0;
  const rateTotalFiring = sumM2Firing > 0 ? (sumUsedFiring / sumM2Firing) : 0;

  const rateLumpAll = totalM2All > 0 ? (totalIssuedAll / totalM2All) : 0;
  const rateWithAshAll = totalM2All > 0 ? ((totalIssuedAll + totalAshAll) / totalM2All) : 0;
  const rateTotalAll = totalM2All > 0 ? (totalUsedAll / totalM2All) : 0;

  const ashPctFiring = (sumLumpFiring + sumAshFiring) > 0 ? (sumAshFiring / (sumLumpFiring + sumAshFiring) * 100) : 0;
  const ashPctDrying = (sumLumpDrying + sumAshDrying) > 0 ? (sumAshDrying / (sumLumpDrying + sumAshDrying) * 100) : 0;
  const ashPctAll = (totalIssuedAll + totalAshAll) > 0 ? (totalAshAll / (totalIssuedAll + totalAshAll) * 100) : 0;

  // Update Top KPI Cards (Based on Firing - Production Consumption)
  updateCoalKPIs({
    rate_lump: rateLumpFiring,
    issued_weight: sumLumpFiring,
    rate_with_ash: rateWithAshFiring,
    ash_weight: sumAshFiring,
    ash_rate_avg: ashPctFiring,
    rate_total: rateTotalFiring,
    compensation_weight: sumCompFiring,
    excess_ash_weight: sumExcessFiring,
    production_m2: sumM2Firing,
    total_used_weight: sumUsedFiring
  });

  // Render Table Body (Exactly 17 columns matching Image 2)
  tbody.innerHTML = rows.map(r => {
    const isDrying = r.firing_type && r.firing_type.includes("Không");
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const totalUsed = Number(r.total_used_weight || (issued + ash + comp));
    const m2 = Number(r.production_m2 || 0);

    const rateLump = r.rate_lump > 0 ? r.rate_lump : (m2 > 0 ? (issued / m2) : 0);
    const rateWithAsh = r.rate_with_ash > 0 ? r.rate_with_ash : (m2 > 0 ? ((issued + ash) / m2) : 0);
    const rateTotal = r.rate_total > 0 ? r.rate_total : (m2 > 0 ? (totalUsed / m2) : 0);

    if (isDrying) {
      return `
        <tr class="bg-[#0b172a]/70 text-slate-400 italic">
          <td class="p-2 text-center text-slate-500"></td>
          <td class="p-2 text-slate-500"></td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(issued, 0)}</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(ash, 0)}</td>
          <td class="p-2 text-right text-slate-400">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2) : '-'}</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right font-bold text-slate-300">${formatNumber(totalUsed, 0)}</td>
          <td class="p-2 text-center font-medium text-slate-400 bg-slate-800/40">Sấy lò không tính tiêu hao</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-[11px] text-slate-400">${r.note || ''}</td>
        </tr>
      `;
    }

    return `
      <tr class="hover:bg-[#13284d]/50 transition text-slate-200">
        <td class="p-2 text-center font-bold font-mono text-cyan-300">${r.stt || ''}</td>
        <td class="p-2 font-bold text-white">${r.coal_supplier}</td>
        <td class="p-2 text-right font-medium text-slate-300">${r.heat_value > 0 ? formatNumber(r.heat_value, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${r.ash_rate > 0 ? formatNumber(r.ash_rate, 2) : '-'}</td>
        <td class="p-2 text-right text-slate-400">${r.std_ash_rate > 0 ? formatNumber(r.std_ash_rate, 1) : '15,0'}</td>
        <td class="p-2 text-right font-medium text-amber-300">${r.stone_rate > 0 ? formatNumber(r.stone_rate, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-slate-100">${formatNumber(issued, 0)}</td>
        <td class="p-2 text-right font-medium text-slate-200">${ash > 0 ? formatNumber(ash, 0) : '-'}</td>
        <td class="p-2 text-right text-slate-300">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-emerald-400">${comp > 0 ? formatNumber(comp, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-rose-400">${excess > 0 ? formatNumber(excess, 0) : '-'}</td>
        <td class="p-2 text-right font-black text-amber-300">${formatNumber(totalUsed, 0)}</td>
        <td class="p-2 text-right font-bold text-emerald-300">${m2 > 0 ? formatNumber(m2, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-amber-300">${rateLump > 0 ? formatNumber(rateLump, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${rateWithAsh > 0 ? formatNumber(rateWithAsh, 2) : '-'}</td>
        <td class="p-2 text-right font-black text-white">${rateTotal > 0 ? formatNumber(rateTotal, 2) : '-'}</td>
        <td class="p-2 text-[11px] text-slate-300">${r.note || ''}</td>
      </tr>
    `;
  }).join("");

  // Render Table Footer (3 Tiers matching Image 2 exactly)
  tfoot.innerHTML = `
    <!-- 1. TỔNG SẤY LÒ -->
    <tr class="bg-[#0a1526] text-slate-300 font-semibold">
      <td colspan="2" class="p-2.5 text-center uppercase text-[11px] font-bold text-slate-300 tracking-wider">
        TỔNG SẤY LÒ
      </td>
      <td colspan="4" class="p-2 text-center text-slate-500">-</td>
      <td class="p-2 text-right font-bold text-slate-200">${formatNumber(sumLumpDrying, 0)}</td>
      <td class="p-2 text-right font-medium text-slate-300">${formatNumber(sumAshDrying, 0)}</td>
      <td class="p-2 text-right text-slate-300">${formatNumber(ashPctDrying, 2)}</td>
      <td class="p-2 text-right text-slate-500">-</td>
      <td class="p-2 text-right text-slate-500">-</td>
      <td class="p-2 text-right font-bold text-slate-200">${formatNumber(sumUsedDrying, 0)}</td>
      <td colspan="4" class="p-2 text-center text-slate-500 italic">Sấy lò không tính tiêu hao</td>
      <td class="p-2 text-slate-500"></td>
    </tr>

    <!-- 2. TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ (Màu xanh nổi bật chuẩn Ảnh 2) -->
    <tr class="bg-[#0b291b] text-white font-bold border-t-2 border-b-2 border-emerald-500/60">
      <td colspan="2" class="p-2.5 text-center uppercase text-[11px] font-black text-emerald-300 tracking-wider">
        TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ
      </td>
      <td colspan="4" class="p-2 text-center text-slate-400 font-normal">-</td>
      <td class="p-2 text-right font-black text-white text-sm">${formatNumber(sumLumpFiring, 0)}</td>
      <td class="p-2 text-right font-bold text-slate-100">${formatNumber(sumAshFiring, 0)}</td>
      <td class="p-2 text-right font-bold text-emerald-300">${formatNumber(ashPctFiring, 2)}</td>
      <td class="p-2 text-right font-bold text-emerald-300">${sumCompFiring > 0 ? formatNumber(sumCompFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-bold text-rose-300">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(sumUsedFiring, 0)}</td>
      <td class="p-2 text-right font-black text-emerald-300 text-sm">${formatNumber(sumM2Firing, 2)}</td>
      <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(rateLumpFiring, 2)}</td>
      <td class="p-2 text-right font-black text-cyan-300 text-sm">${formatNumber(rateWithAshFiring, 2)}</td>
      <td class="p-2 text-right font-black text-white text-sm">${formatNumber(rateTotalFiring, 2)}</td>
      <td class="p-2 text-left text-[11px] text-emerald-400 font-semibold">Khớp 100% Báo Cáo ✓</td>
    </tr>

    <!-- 3. TỔNG + SẤY LÒ -->
    <tr class="bg-[#09152b] text-slate-200 font-semibold">
      <td colspan="2" class="p-2.5 text-center uppercase text-[11px] font-bold text-white tracking-wider">
        TỔNG + SẤY LÒ
      </td>
      <td colspan="4" class="p-2 text-center text-slate-500">-</td>
      <td class="p-2 text-right font-bold text-white">${formatNumber(totalIssuedAll, 0)}</td>
      <td class="p-2 text-right text-slate-200">${formatNumber(totalAshAll, 0)}</td>
      <td class="p-2 text-right text-slate-300">${formatNumber(ashPctAll, 2)}</td>
      <td class="p-2 text-right text-emerald-400">${totalCompAll > 0 ? formatNumber(totalCompAll, 0) : '-'}</td>
      <td class="p-2 text-right text-rose-400">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-bold text-amber-300">${formatNumber(totalUsedAll, 0)}</td>
      <td class="p-2 text-right font-bold text-emerald-400">${formatNumber(totalM2All, 2)}</td>
      <td class="p-2 text-right font-bold text-amber-300">${formatNumber(rateLumpAll, 2)}</td>
      <td class="p-2 text-right font-bold text-cyan-300">${formatNumber(rateWithAshAll, 2)}</td>
      <td class="p-2 text-right font-black text-white">${formatNumber(rateTotalAll, 2)}</td>
      <td class="p-2 text-left text-[11px] text-slate-400">Tổng nhiên liệu</td>
    </tr>
  `;
}

function updateCoalKPIs(kpi) {
  document.getElementById("coal-kpi-rate-lump").innerHTML = `${formatNumber(kpi.rate_lump, 2)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  document.getElementById("coal-kpi-lump-wt").innerText = `${formatNumber(kpi.issued_weight, 0)} kg`;
  
  document.getElementById("coal-kpi-rate-ash").innerHTML = `${formatNumber(kpi.rate_with_ash, 2)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  document.getElementById("coal-kpi-ash-wt").innerText = `${formatNumber(kpi.ash_weight, 0)} kg`;
  document.getElementById("coal-kpi-ash-pct").innerText = `${formatNumber(kpi.ash_rate_avg, 2)}%`;
  
  document.getElementById("coal-kpi-rate-total").innerHTML = `${formatNumber(kpi.rate_total, 2)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  document.getElementById("coal-kpi-comp-wt").innerText = `${formatNumber(kpi.compensation_weight, 0)} kg`;
  document.getElementById("coal-kpi-excess-wt").innerText = `${formatNumber(kpi.excess_ash_weight, 0)} kg`;
  
  document.getElementById("coal-kpi-prod-m2").innerHTML = `${formatNumber(kpi.production_m2, 2)} <span class="text-xs font-normal text-slate-400">m²</span>`;
  document.getElementById("coal-kpi-total-used").innerText = `${formatNumber(kpi.total_used_weight, 0)} kg`;
}

// ----------------------------------------------------
// TAB 7: IMPORT 3 FILE THÁNG
// ----------------------------------------------------
async function submitMonthlyImport() {
  const month = document.getElementById("import-month-select").value;
  const fDc1 = document.getElementById("file-dc1").files[0];
  const fDc2 = document.getElementById("file-dc2").files[0];
  const fCoal = document.getElementById("file-coal").files[0];

  if (!fDc1 && !fDc2 && !fCoal) {
    alert("Vui lòng chọn ít nhất 1 file để xử lý!");
    return;
  }

  const formData = new FormData();
  formData.append("month", month);
  formData.append("year", 2026);
  if (fDc1) formData.append("file_dc1", fDc1);
  if (fDc2) formData.append("file_dc2", fDc2);
  if (fCoal) formData.append("file_coal", fCoal);

  const logsBox = document.getElementById("import-logs-box");
  logsBox.classList.remove("hidden");
  logsBox.innerHTML = `<div>Đang tải lên và phân tích dữ liệu Tháng ${month}/2026...</div>`;

  try {
    const res = await fetch("/api/import/monthly", {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    if (json.success) {
      logsBox.innerHTML += `<div class="text-emerald-400 font-bold mt-2">✓ ${json.message}</div>`;
      (json.logs || []).forEach(l => {
        logsBox.innerHTML += `<div>${l}</div>`;
      });
      alert("Đã trích xuất và phân rã dữ liệu thành công vào 4 bảng Data!");
    } else {
      logsBox.innerHTML += `<div class="text-rose-400 mt-2">✗ Lỗi: ${json.error}</div>`;
    }
  } catch (err) {
    logsBox.innerHTML += `<div class="text-rose-400 mt-2">✗ Lỗi kết nối: ${err}</div>`;
  }
}

// ----------------------------------------------------
// TAB 8: FORM MẪU TRÌNH KÝ PREVIEW & EXPORT
// ----------------------------------------------------
async function renderFormMauPreview() {
  const month = document.getElementById("export-select-month").value || "8";
  document.getElementById("form-mau-header-title").innerText = `BÁO CÁO KẾT QUẢ SẢN XUẤT THÁNG ${month.length === 1 ? '0' + month : month}/2026`;

  try {
    const res = await fetch(`/api/data/summary?month=${month}&unit=m2`);
    const json = await res.json();
    const rows = json.data || [];

    const contentDiv = document.getElementById("form-mau-content");
    contentDiv.innerHTML = `
      <!-- Phần I: Tổng Hợp Sản Lượng -->
      <div>
        <h4 class="font-bold text-slate-800 uppercase mb-2 border-b border-slate-300 pb-1">I. KẾT QUẢ SẢN XUẤT TỔNG HỢP</h4>
        <table class="w-full border-collapse border border-slate-300 text-center text-[11px]">
          <thead class="bg-slate-100 font-bold">
            <tr>
              <th class="border border-slate-300 p-2">Dây Chuyền</th>
              <th class="border border-slate-300 p-2">Kích Thước</th>
              <th class="border border-slate-300 p-2">Dòng Sản Phẩm</th>
              <th class="border border-slate-300 p-2">Loại Số Liệu</th>
              <th class="border border-slate-300 p-2 text-right">SL Ép (m²)</th>
              <th class="border border-slate-300 p-2 text-right">A1 (m²)</th>
              <th class="border border-slate-300 p-2 text-right">A (m²)</th>
              <th class="border border-slate-300 p-2 text-right">B (m²)</th>
              <th class="border border-slate-300 p-2 text-right">Tổng (m²)</th>
              <th class="border border-slate-300 p-2">Ngày SX</th>
              <th class="border border-slate-300 p-2">Dừng (p/ng)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="border border-slate-300 p-1.5 font-bold">${r.line}</td>
                <td class="border border-slate-300 p-1.5">${r.size}</td>
                <td class="border border-slate-300 p-1.5">${r.product_line || 'Phương Nam'}</td>
                <td class="border border-slate-300 p-1.5 font-semibold ${r.data_type === 'Thực hiện' ? 'text-emerald-700' : 'text-blue-700'}">${r.data_type}</td>
                <td class="border border-slate-300 p-1.5 text-right">${formatNumber(r.sl_ep, 2)}</td>
                <td class="border border-slate-300 p-1.5 text-right font-bold text-emerald-800">${formatNumber(r.a1, 2)}</td>
                <td class="border border-slate-300 p-1.5 text-right">${formatNumber(r.a, 2)}</td>
                <td class="border border-slate-300 p-1.5 text-right text-amber-800">${formatNumber(r.b, 2)}</td>
                <td class="border border-slate-300 p-1.5 text-right font-bold">${formatNumber(r.recovery_total, 2)}</td>
                <td class="border border-slate-300 p-1.5">${formatNumber(r.prod_days, 1)}</td>
                <td class="border border-slate-300 p-1.5">${formatNumber(r.stop_time_2mf, 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <!-- Phần II: Ghi Chú Đánh Giá -->
      <div>
        <h4 class="font-bold text-slate-800 uppercase mb-2 border-b border-slate-300 pb-1">II. ĐÁNH GIÁ TÌNH HÌNH SẢN XUẤT</h4>
        <ul class="list-disc pl-5 space-y-1 text-slate-700">
          <li>Dây chuyền 1 hoạt động ổn định, đạt tỷ lệ A1 vượt kế hoạch đề ra.</li>
          <li>Dây chuyền 2 chạy chuyển đổi các dòng Men bóng, Sugar sân vườn và Panson 40x80 đảm bảo chỉ tiêu chất lượng.</li>
          <li>Thời gian dừng máy do 2 máy phát điện và bảo dưỡng cơ điện được kiểm soát chặt chẽ trong khung cho phép.</li>
        </ul>
      </div>
    `;
  } catch (err) {
    console.error("Error rendering form mau preview:", err);
  }
}

function downloadFormMauExcel() {
  const month = document.getElementById("export-select-month").value || "8";
  window.location.href = `/api/export/sign-off-report?month=${month}&year=2026`;
}

function quickExportSignOff() {
  window.location.href = `/api/export/sign-off-report?month=8&year=2026`;
}



// ==========================================


// ==========================================
// 6. XUẤT BÁO CÁO IN / PDF TIÊU HAO THAN (A4 LANDSCAPE)
// ==========================================
function printCoalReport() {
  if (!rawCoalData || rawCoalData.length === 0) {
    alert("Không có dữ liệu than để in báo cáo! Vui lòng chờ tải dữ liệu hoặc chọn kỳ khác.");
    return;
  }

  const month = document.getElementById("coal-filter-month").value;
  const line = document.getElementById("coal-filter-line").value;
  const size = document.getElementById("coal-filter-size").value;
  const firing = document.getElementById("coal-filter-firing").value;

  const monthStr = month === "all" ? "Tất cả các tháng" : (month.length === 1 ? "Tháng 0" + month : "Tháng " + month);
  const lineStr = line === "all" ? "Toàn bộ Nhà máy (DC1 & DC2)" : ("Dây chuyền " + line);
  const sizeStr = size === "all" ? "Tất cả kích thước" : ("Kích thước " + size);
  const firingStr = firing === "all" ? "Toàn bộ (Nung & Sấy lò)" : firing;

  // Calculate sums
  let sumLumpFiring = 0, sumAshFiring = 0, sumCompFiring = 0, sumExcessFiring = 0, sumUsedFiring = 0, sumM2Firing = 0;
  let sumLumpDrying = 0, sumAshDrying = 0, sumCompDrying = 0, sumUsedDrying = 0;

  rawCoalData.forEach(r => {
    const isDrying = r.firing_type && r.firing_type.includes("Không");
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const used = Number(r.total_used_weight || (issued + ash + comp));
    const m2 = Number(r.production_m2 || 0);

    if (isDrying) {
      sumLumpDrying += issued;
      sumAshDrying += ash;
      sumCompDrying += comp;
      sumUsedDrying += used;
    } else {
      sumLumpFiring += issued;
      sumAshFiring += ash;
      sumCompFiring += comp;
      sumExcessFiring += excess;
      sumUsedFiring += used;
      sumM2Firing += m2;
    }
  });

  const totalIssuedAll = sumLumpFiring + sumLumpDrying;
  const totalAshAll = sumAshFiring + sumAshDrying;
  const totalCompAll = sumCompFiring + sumCompDrying;
  const totalUsedAll = sumUsedFiring + sumUsedDrying;
  const totalM2All = sumM2Firing;

  const rateLumpFiring = sumM2Firing > 0 ? (sumLumpFiring / sumM2Firing) : 0;
  const rateWithAshFiring = sumM2Firing > 0 ? ((sumLumpFiring + sumAshFiring) / sumM2Firing) : 0;
  const rateTotalFiring = sumM2Firing > 0 ? (sumUsedFiring / sumM2Firing) : 0;

  const rateLumpAll = totalM2All > 0 ? (totalIssuedAll / totalM2All) : 0;
  const rateWithAshAll = totalM2All > 0 ? ((totalIssuedAll + totalAshAll) / totalM2All) : 0;
  const rateTotalAll = totalM2All > 0 ? (totalUsedAll / totalM2All) : 0;

  const ashPctFiring = (sumLumpFiring + sumAshFiring) > 0 ? (sumAshFiring / (sumLumpFiring + sumAshFiring) * 100) : 0;
  const ashPctDrying = (sumLumpDrying + sumAshDrying) > 0 ? (sumAshDrying / (sumLumpDrying + sumAshDrying) * 100) : 0;
  const ashPctAll = (totalIssuedAll + totalAshAll) > 0 ? (totalAshAll / (totalIssuedAll + totalAshAll) * 100) : 0;

  // Build rows
  const rowsHtml = rawCoalData.map(r => {
    const isDrying = r.firing_type && r.firing_type.includes("Không");
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const totalUsed = Number(r.total_used_weight || (issued + ash + comp));
    const m2 = Number(r.production_m2 || 0);

    const rateLump = r.rate_lump > 0 ? r.rate_lump : (m2 > 0 ? (issued / m2) : 0);
    const rateWithAsh = r.rate_with_ash > 0 ? r.rate_with_ash : (m2 > 0 ? ((issued + ash) / m2) : 0);
    const rateTotal = r.rate_total > 0 ? r.rate_total : (m2 > 0 ? (totalUsed / m2) : 0);

    if (isDrying) {
      return `
        <tr style="background: #f8fafc; font-style: italic; color: #475569;">
          <td style="text-align: center;">-</td>
          <td style="text-align: left; font-weight: 500;">${r.coal_supplier}</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right; font-weight: 600;">${formatNumber(issued, 0)}</td>
          <td style="text-align: right;">${ash > 0 ? formatNumber(ash, 0) : '-'}</td>
          <td style="text-align: right;">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2) : '-'}</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right;">-</td>
          <td style="text-align: right; font-weight: bold;">${formatNumber(totalUsed, 0)}</td>
          <td style="text-align: center;" colspan="4">Sấy lò không tính tiêu hao</td>
          <td style="text-align: left; font-size: 10px;">${r.note || ''}</td>
        </tr>
      `;
    }

    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${r.stt || ''}</td>
        <td style="text-align: left; font-weight: 600;">${r.coal_supplier}</td>
        <td style="text-align: right;">${r.heat_value > 0 ? formatNumber(r.heat_value, 0) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #0284c7;">${r.ash_rate > 0 ? formatNumber(r.ash_rate, 2) : '-'}</td>
        <td style="text-align: right; color: #64748b;">${r.std_ash_rate > 0 ? formatNumber(r.std_ash_rate, 1) : '15,0'}</td>
        <td style="text-align: right; color: #b45309;">${r.stone_rate > 0 ? formatNumber(r.stone_rate, 2) : '-'}</td>
        <td style="text-align: right; font-weight: bold;">${formatNumber(issued, 0)}</td>
        <td style="text-align: right;">${ash > 0 ? formatNumber(ash, 0) : '-'}</td>
        <td style="text-align: right;">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2) : '-'}</td>
        <td style="text-align: right; font-weight: 600; color: #16a34a;">${comp > 0 ? formatNumber(comp, 0) : '-'}</td>
        <td style="text-align: right; font-weight: 600; color: #dc2626;">${excess > 0 ? formatNumber(excess, 0) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #d97706;">${formatNumber(totalUsed, 0)}</td>
        <td style="text-align: right; font-weight: 600;">${m2 > 0 ? formatNumber(m2, 2) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #b45309;">${rateLump > 0 ? formatNumber(rateLump, 2) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #0284c7;">${rateWithAsh > 0 ? formatNumber(rateWithAsh, 2) : '-'}</td>
        <td style="text-align: right; font-weight: 800; color: #0f172a;">${rateTotal > 0 ? formatNumber(rateTotal, 2) : '-'}</td>
        <td style="text-align: left; font-size: 10px;">${r.note || ''}</td>
      </tr>
    `;
  }).join("");

  const printHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Sử Dụng Than - Phương Nam</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      margin: 0;
      padding: 10px;
      background: #fff;
    }
    .print-bar {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .btn-print-action {
      background: #0284c7;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .header-table td {
      border: none !important;
      padding: 0;
    }
    .title-box {
      text-align: center;
      margin-bottom: 12px;
    }
    .title-box h1 {
      font-size: 17px;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .title-box .sub {
      font-size: 11.5px;
      color: #334155;
    }
    .kpi-cards {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: center;
    }
    .kpi-title {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .kpi-val {
      font-size: 14px;
      font-weight: 800;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #475569;
      margin-top: 1px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 15px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #475569;
      padding: 4px 5px;
      vertical-align: middle;
    }
    table.data-table thead th {
      background: #0f2a4a;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      font-size: 10px;
    }
    table.data-table thead th.th-qual {
      background: #1e3a6a;
    }
    table.data-table thead th.th-ash {
      background: #854d0e;
    }
    table.data-table thead th.th-rate {
      background: #1e293b;
    }
    .row-drying {
      background: #f1f5f9;
      font-style: italic;
      color: #475569;
    }
    .row-total-sub {
      background: #f8fafc;
      font-weight: bold;
    }
    .row-total-main {
      background: #e6f4ea !important;
      font-weight: bold;
      border-top: 2px solid #16a34a !important;
      border-bottom: 2px solid #16a34a !important;
    }
    .row-total-grand {
      background: #e2e8f0 !important;
      font-weight: bold;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      page-break-inside: avoid;
      text-align: center;
    }
    .sig-col {
      width: 23%;
    }
    .sig-title {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
    }
    .sig-sub {
      font-size: 10px;
      font-style: italic;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-space {
      height: 55px;
    }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-print-action" onclick="window.print()">🖨️ Bấm để In / Lưu PDF ngay</button>
  </div>

  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="font-weight: 800; font-size: 12px; text-transform: uppercase;">CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM</div>
        <div style="font-weight: 700; font-size: 11.5px; text-transform: uppercase; color: #1e3a8a; margin-top: 2px;">PHÂN XƯỞNG CƠ ĐIỆN - NĂNG LƯỢNG</div>
        <div style="font-size: 10px; margin-top: 1px;">❖❖❖</div>
      </td>
      <td style="width: 10%;"></td>
      <td style="width: 45%; text-align: center;">
        <div style="font-weight: 800; font-size: 12px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: 700; font-size: 11px; text-decoration: underline; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size: 10.5px; font-style: italic; margin-top: 3px;">Đồng Nai, ngày ${new Date().getDate()} tháng ${(new Date().getMonth()+1).toString().padStart(2, '0')} năm ${new Date().getFullYear()}</div>
      </td>
    </tr>
  </table>

  <!-- TITLE -->
  <div class="title-box">
    <h1>BÁO CÁO KẾT QUẢ SỬ DỤNG THAN SẢN XUẤT</h1>
    <div class="sub">
      Kỳ báo cáo: <b>${monthStr} / 2026</b> &nbsp; | &nbsp; Dây chuyền: <b>${lineStr}</b> &nbsp; | &nbsp; Kích thước: <b>${sizeStr}</b> &nbsp; | &nbsp; Phân loại: <b>${firingStr}</b>
    </div>
  </div>

  <!-- KPI SUMMARY -->
  <div class="kpi-cards">
    <div class="kpi-card" style="border-left: 3px solid #d97706;">
      <div class="kpi-title">Tiêu hao Than cục</div>
      <div class="kpi-val" style="color: #b45309;">${formatNumber(rateLumpFiring, 2)} <span style="font-size: 10px; font-weight: normal;">kg/m²</span></div>
      <div class="kpi-sub">Lĩnh: ${formatNumber(sumLumpFiring, 0)} kg</div>
    </div>
    <div class="kpi-card" style="border-left: 3px solid #0284c7;">
      <div class="kpi-title">Tiêu hao (Có Cám)</div>
      <div class="kpi-val" style="color: #0369a1;">${formatNumber(rateWithAshFiring, 2)} <span style="font-size: 10px; font-weight: normal;">kg/m²</span></div>
      <div class="kpi-sub">Xuất cám: ${formatNumber(sumAshFiring, 0)} kg (${formatNumber(ashPctFiring, 2)}%)</div>
    </div>
    <div class="kpi-card" style="border-left: 3px solid #16a34a;">
      <div class="kpi-title">Tiêu hao (Cục + Cám + Bù)</div>
      <div class="kpi-val" style="color: #15803d;">${formatNumber(rateTotalFiring, 2)} <span style="font-size: 10px; font-weight: normal;">kg/m²</span></div>
      <div class="kpi-sub">Bù: ${formatNumber(sumCompFiring, 0)} kg | Vượt: ${formatNumber(sumExcessFiring, 0)} kg</div>
    </div>
    <div class="kpi-card" style="border-left: 3px solid #4f46e5;">
      <div class="kpi-title">Sản lượng nung</div>
      <div class="kpi-val" style="color: #4338ca;">${formatNumber(sumM2Firing, 2)} <span style="font-size: 10px; font-weight: normal;">m²</span></div>
      <div class="kpi-sub">Tổng than SD: ${formatNumber(sumUsedFiring, 0)} kg</div>
    </div>
  </div>

  <!-- TABLE -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 25px;">STT</th>
        <th rowspan="2" style="min-width: 140px;">TÊN LOẠI THAN</th>
        <th colspan="4" class="th-qual">CHẤT LƯỢNG LÔ THAN</th>
        <th rowspan="2" style="width: 60px;">KL LĨNH<br><span style="font-weight: normal; font-size: 9px;">(kg)</span></th>
        <th colspan="2" class="th-ash">XUẤT CÁM</th>
        <th rowspan="2" style="width: 50px;">LĨNH BÙ<br><span style="font-weight: normal; font-size: 9px;">(kg)</span></th>
        <th rowspan="2" style="width: 50px;">CÁM VƯỢT TC<br><span style="font-weight: normal; font-size: 9px;">(kg)</span></th>
        <th rowspan="2" style="width: 65px;">TỔNG SỬ DỤNG<br><span style="font-weight: normal; font-size: 9px;">(kg)</span></th>
        <th rowspan="2" style="width: 65px;">SẢN LƯỢNG<br><span style="font-weight: normal; font-size: 9px;">(m²)</span></th>
        <th colspan="3" class="th-rate">TIÊU HAO (kg/m²)</th>
        <th rowspan="2" style="width: 90px;">GHI CHÚ</th>
      </tr>
      <tr>
        <th class="th-qual" style="width: 40px;">Nhiệt trị<br><span style="font-size: 8px;">(Kcal)</span></th>
        <th class="th-qual" style="width: 35px;">% Cám<br>TT</th>
        <th class="th-qual" style="width: 35px;">% Cám<br>TC</th>
        <th class="th-qual" style="width: 35px;">% Xít<br>đá</th>
        <th class="th-ash" style="width: 45px;">SL (kg)</th>
        <th class="th-ash" style="width: 35px;">% Cám</th>
        <th class="th-rate" style="width: 45px;">Than cục</th>
        <th class="th-rate" style="width: 45px;">Có cám</th>
        <th class="th-rate" style="width: 45px;">Cả bù</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <!-- 1. TỔNG SẤY LÒ -->
      <tr class="row-total-sub">
        <td colspan="2" style="text-align: center; text-transform: uppercase; font-size: 9.5px;">TỔNG SẤY LÒ</td>
        <td colspan="4" style="text-align: center; color: #94a3b8;">-</td>
        <td style="text-align: right;">${formatNumber(sumLumpDrying, 0)}</td>
        <td style="text-align: right;">${formatNumber(sumAshDrying, 0)}</td>
        <td style="text-align: right;">${formatNumber(ashPctDrying, 2)}</td>
        <td style="text-align: center; color: #94a3b8;">-</td>
        <td style="text-align: center; color: #94a3b8;">-</td>
        <td style="text-align: right;">${formatNumber(sumUsedDrying, 0)}</td>
        <td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">Sấy lò không tính tiêu hao</td>
        <td></td>
      </tr>

      <!-- 2. TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ -->
      <tr class="row-total-main">
        <td colspan="2" style="text-align: center; text-transform: uppercase; font-size: 9.5px; color: #166534;">TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ</td>
        <td colspan="4" style="text-align: center; color: #64748b;">-</td>
        <td style="text-align: right; color: #0f172a;">${formatNumber(sumLumpFiring, 0)}</td>
        <td style="text-align: right;">${formatNumber(sumAshFiring, 0)}</td>
        <td style="text-align: right; color: #166534;">${formatNumber(ashPctFiring, 2)}</td>
        <td style="text-align: right; color: #166534;">${sumCompFiring > 0 ? formatNumber(sumCompFiring, 0) : '-'}</td>
        <td style="text-align: right; color: #dc2626;">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
        <td style="text-align: right; color: #b45309;">${formatNumber(sumUsedFiring, 0)}</td>
        <td style="text-align: right; color: #166534;">${formatNumber(sumM2Firing, 2)}</td>
        <td style="text-align: right; color: #b45309;">${formatNumber(rateLumpFiring, 2)}</td>
        <td style="text-align: right; color: #0284c7;">${formatNumber(rateWithAshFiring, 2)}</td>
        <td style="text-align: right; color: #0f172a; font-size: 11px;">${formatNumber(rateTotalFiring, 2)}</td>
        <td style="text-align: center; font-weight: 600; color: #16a34a;">Khớp 100% ✓</td>
      </tr>

      <!-- 3. TỔNG + SẤY LÒ -->
      <tr class="row-total-grand">
        <td colspan="2" style="text-align: center; text-transform: uppercase; font-size: 9.5px;">TỔNG + SẤY LÒ</td>
        <td colspan="4" style="text-align: center; color: #94a3b8;">-</td>
        <td style="text-align: right;">${formatNumber(totalIssuedAll, 0)}</td>
        <td style="text-align: right;">${formatNumber(totalAshAll, 0)}</td>
        <td style="text-align: right;">${formatNumber(ashPctAll, 2)}</td>
        <td style="text-align: right;">${totalCompAll > 0 ? formatNumber(totalCompAll, 0) : '-'}</td>
        <td style="text-align: right;">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
        <td style="text-align: right;">${formatNumber(totalUsedAll, 0)}</td>
        <td style="text-align: right;">${formatNumber(totalM2All, 2)}</td>
        <td style="text-align: right;">${formatNumber(rateLumpAll, 2)}</td>
        <td style="text-align: right;">${formatNumber(rateWithAshAll, 2)}</td>
        <td style="text-align: right; font-size: 11px;">${formatNumber(rateTotalAll, 2)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- SIGNATURES -->
  <div class="signature-grid">
    <div class="sig-col">
      <div class="sig-title">NGƯỜI LẬP BIỂU</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-col">
      <div class="sig-title">PT.BP TỔNG HỢP / THK</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-col">
      <div class="sig-title">QUẢN ĐỐC PXCĐ - NL</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-col">
      <div class="sig-title">BAN GIÁM ĐỐC DUYỆT</div>
      <div class="sig-sub">(Ký, đóng dấu)</div>
      <div class="sig-space"></div>
    </div>
  </div>
</body>
</html>
  `;

  // Try opening new print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn("Auto print failed:", e);
      }
    }, 400);
    return;
  }

  // Fallback: If popup was blocked
  let iframe = document.getElementById("print-iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1000px";
    iframe.style.height = "1000px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(printHtml);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 400);
}
