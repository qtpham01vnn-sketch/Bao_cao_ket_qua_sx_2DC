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

// ==========================================
// PWA (PROGRESSIVE WEB APP) CONTROLLER
// ==========================================
let deferredPWAInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPWAInstallPrompt = e;
  console.log("PWA beforeinstallprompt captured!");
  const installBtn = document.getElementById("btn-pwa-install");
  if (installBtn) {
    installBtn.classList.add("ring-2", "ring-emerald-400", "animate-pulse");
  }
});

window.addEventListener("appinstalled", () => {
  console.log("PWA đã được cài đặt thành công trên thiết bị!");
  deferredPWAInstallPrompt = null;
  alert("Chúc mừng! Ứng dụng Quản lý Sản xuất 2DC đã được cài đặt thành công vào màn hình chính của bạn.");
});

function triggerPWAInstall() {
  if (deferredPWAInstallPrompt) {
    deferredPWAInstallPrompt.prompt();
    deferredPWAInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted PWA installation");
      }
      deferredPWAInstallPrompt = null;
    });
  } else {
    openModal("modal-pwa-install");
  }
}

function triggerNativeInstallPrompt() {
  if (deferredPWAInstallPrompt) {
    deferredPWAInstallPrompt.prompt();
    deferredPWAInstallPrompt.userChoice.then((choiceResult) => {
      deferredPWAInstallPrompt = null;
      closeModal("modal-pwa-install");
    });
  } else {
    alert("Vui lòng thực hiện theo hướng dẫn tương ứng với thiết bị của bạn ở bên dưới.");
  }
}

// Service Worker Registration & Auto-Update
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.update();
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          };
        }
      };
      console.log("PWA Service Worker registered with scope:", reg.scope);
    }).catch((err) => {
      console.log("PWA Service Worker registration skipped or failed:", err);
    });
  });
}

// ==========================================
// USERS DATABASE & AUTHENTICATION (RBAC)
// ==========================================
const DEFAULT_USERS_DB = [
  {
    username: "admin",
    fullname: "Quản Trị Hệ Thống",
    title: "Admin System",
    role: "admin",
    roleName: "ADMIN System",
    roleBadgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    roleDotBg: "bg-rose-400",
    permissionsDesc: "Toàn quyền. Quản lý Master Data & Tài khoản.",
    pin: "0179",
    status: "Hoạt Động",
    avatar: "AD",
    avatarBg: "bg-rose-700"
  },
  {
    username: "quanly",
    fullname: "Bùi Văn A - Phó TGĐ",
    title: "BGD & Trưởng Phòng",
    role: "ptgd",
    roleName: "Management (Read-Only)",
    roleBadgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    roleDotBg: "bg-purple-400",
    permissionsDesc: "Giám sát. Xem toàn bộ báo cáo, KHÔNG có quyền Thêm/Xoá/Sửa.",
    pin: "1111",
    status: "Hoạt Động",
    avatar: "TGĐ",
    avatarBg: "bg-purple-700"
  },
  {
    username: "kcs_tester",
    fullname: "Phạm Thị Thu Hiền",
    title: "Nhân viên KCS (Người KT)",
    role: "operator",
    roleName: "Operator (Thống Kê)",
    roleBadgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    roleDotBg: "bg-emerald-400",
    permissionsDesc: "Tác nghiệp. Nhập liệu hằng ngày, KHÔNG sửa đổi Master Data.",
    pin: "1234",
    status: "Hoạt Động",
    avatar: "KT",
    avatarBg: "bg-emerald-700"
  },
  {
    username: "driver_ncc",
    fullname: "Trần Ngọc Triển",
    title: "Người giao hàng (Tài xế/NCC)",
    role: "operator",
    roleName: "Operator (Thống Kê)",
    roleBadgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    roleDotBg: "bg-emerald-400",
    permissionsDesc: "Tác nghiệp. Nhập liệu hằng ngày, KHÔNG sửa đổi Master Data.",
    pin: "2222",
    status: "Hoạt Động",
    avatar: "TX",
    avatarBg: "bg-teal-700"
  },
  {
    username: "kcs_manager",
    fullname: "Vũ Văn Bảy",
    title: "Phụ trách KCS / Kỹ thuật",
    role: "quan_doc",
    roleName: "Management (Read-Only)",
    roleBadgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    roleDotBg: "bg-amber-400",
    permissionsDesc: "Giám sát. Xem toàn bộ báo cáo, KHÔNG có quyền Thêm/Xoá/Sửa.",
    pin: "3333",
    status: "Hoạt Động",
    avatar: "QL",
    avatarBg: "bg-amber-700"
  },
  {
    username: "thongke",
    fullname: "Thống Kê Sản Xuất",
    title: "Thống Kê PXSX / KTCN",
    role: "operator",
    roleName: "Operator (Thống Kê)",
    roleBadgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    roleDotBg: "bg-emerald-400",
    permissionsDesc: "Tác nghiệp. Nhập liệu hằng ngày, KHÔNG sửa đổi Master Data.",
    pin: "9999",
    status: "Hoạt Động",
    avatar: "TK",
    avatarBg: "bg-emerald-700"
  },
  {
    username: "tp_ktkh",
    fullname: "Nguyễn Văn B - Trưởng Phòng",
    title: "Trưởng Phòng KT-KH",
    role: "truong_phong",
    roleName: "Management (Read-Only)",
    roleBadgeClass: "bg-blue-500/20 text-cyan-300 border-blue-500/40",
    roleDotBg: "bg-cyan-400",
    permissionsDesc: "Giám sát & Phân tích số liệu, KHÔNG có quyền sửa đổi Master Data.",
    pin: "tp3333",
    status: "Hoạt Động",
    avatar: "TP",
    avatarBg: "bg-blue-700"
  },
  {
    username: "quandoc",
    fullname: "Trần Văn C - Quản Đốc",
    title: "Quản Đốc Phân Xưởng",
    role: "quan_doc",
    roleName: "Management (Read-Only)",
    roleBadgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    roleDotBg: "bg-amber-400",
    permissionsDesc: "Giám sát vận hành 2 dây chuyền, theo dõi lò nung & sấy.",
    pin: "qd4444",
    status: "Hoạt Động",
    avatar: "QĐ",
    avatarBg: "bg-amber-700"
  }
];

const DB_USERS_KEY = "px_users_db_v4";

function getUsersDb() {
  try {
    const raw = localStorage.getItem(DB_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading users db:", e);
  }
  saveUsersDb(DEFAULT_USERS_DB);
  return DEFAULT_USERS_DB;
}

function saveUsersDb(users) {
  try {
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Error saving users db:", e);
  }
}

function getActiveUser() {
  const users = getUsersDb();
  const sessionUsername = localStorage.getItem("px_auth_session");
  if (!sessionUsername) return null;
  const user = users.find(u => u.username.toLowerCase() === sessionUsername.toLowerCase());
  return user || null;
}

let currentAuthUser = getActiveUser();
let currentRole = currentAuthUser ? currentAuthUser.role : "operator";

const ROLES_INFO = {
  admin: {
    title: "Quản trị viên",
    roleName: "ADMIN System",
    badge: "Toàn quyền",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    avatarBg: "bg-rose-700",
    avatarText: "AD",
    canEdit: true,
    canImport: true
  },
  ptgd: {
    title: "Phó Tổng Giám Đốc",
    roleName: "Management (Read-Only)",
    badge: "Chỉ xem",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    avatarBg: "bg-purple-700",
    avatarText: "TGĐ",
    canEdit: false,
    canImport: false
  },
  truong_phong: {
    title: "Trưởng / Phó Phòng KT-KH",
    roleName: "Management (Read-Only)",
    badge: "Chỉ xem",
    badgeClass: "bg-blue-500/20 text-cyan-300 border-blue-500/40",
    avatarBg: "bg-blue-700",
    avatarText: "TP",
    canEdit: false,
    canImport: false
  },
  quan_doc: {
    title: "Quản Đốc Phân Xưởng",
    roleName: "Management (Read-Only)",
    badge: "Chỉ xem",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    avatarBg: "bg-amber-700",
    avatarText: "QĐ",
    canEdit: false,
    canImport: false
  },
  operator: {
    title: "Thống Kê / Tác Nghiệp",
    roleName: "Operator (Thống Kê)",
    badge: "Chỉ xem",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    avatarBg: "bg-emerald-700",
    avatarText: "TK",
    canEdit: false,
    canImport: false
  }
};

function changeUserRole(roleKey) {
  if (!ROLES_INFO[roleKey]) roleKey = "admin";
  currentRole = roleKey;
  localStorage.setItem("user_role", roleKey);
  
  if (currentAuthUser) {
    currentAuthUser.role = roleKey;
  }
  applyRolePermissions();
}

function checkAndEnforceAuth() {
  const user = getActiveUser();
  const loginModal = document.getElementById("modal-login");
  
  if (!user) {
    if (loginModal) {
      loginModal.classList.remove("hidden");
      setTimeout(() => {
        const uInp = document.getElementById("login-username");
        if (uInp) uInp.focus();
      }, 150);
    }
    return false;
  }
  
  if (loginModal) {
    loginModal.classList.add("hidden");
  }
  currentAuthUser = user;
  currentRole = user.role || "operator";
  applyRolePermissions();
  return true;
}

function applyRolePermissions() {
  currentAuthUser = getActiveUser();
  if (!currentAuthUser) {
    const loginModal = document.getElementById("modal-login");
    if (loginModal) loginModal.classList.remove("hidden");
    return;
  }

  currentRole = currentAuthUser.role || "operator";
  const role = ROLES_INFO[currentRole] || ROLES_INFO.operator;

  // Sync role dropdowns
  const topSel = document.getElementById("user-role-select");
  if (topSel && topSel.value !== currentRole) topSel.value = currentRole;

  const adminSel = document.getElementById("admin-role-select");
  if (adminSel && adminSel.value !== currentRole) adminSel.value = currentRole;

  // Update Sidebar User Profile Card
  const userNameEl = document.getElementById("auth-display-name") || document.getElementById("auth-user-name");
  const userAvatarEl = document.getElementById("auth-user-avatar");
  const roleBadgeEl = document.getElementById("auth-role-badge");
  const roleTextEl = document.getElementById("auth-role-text");

  if (userNameEl && currentAuthUser) userNameEl.innerText = currentAuthUser.fullname;
  if (userAvatarEl && currentAuthUser) {
    userAvatarEl.innerText = currentAuthUser.avatar || "NV";
    userAvatarEl.className = `w-7 h-7 rounded-full ${currentAuthUser.avatarBg || 'bg-blue-700'} text-white flex items-center justify-center text-xs font-black shadow shrink-0`;
  }
  if (roleBadgeEl && currentAuthUser) {
    roleBadgeEl.className = `px-2 py-0.5 rounded text-[9.5px] font-bold border flex items-center gap-1 truncate ${currentAuthUser.roleBadgeClass || role.badgeClass}`;
  }
  if (roleTextEl && currentAuthUser) {
    roleTextEl.innerText = currentAuthUser.roleName || role.roleName || role.badge;
  }

  // Permission enforcement for Norms Tab
  const btnCreateVersion = document.getElementById("btn-create-norm-version");
  const btnSaveNorms = document.getElementById("btn-save-norm-details");
  const rbacNormNotice = document.getElementById("rbac-norm-notice");

  if (btnCreateVersion) btnCreateVersion.style.display = role.canEdit ? "inline-flex" : "none";
  if (btnSaveNorms) btnSaveNorms.style.display = role.canEdit ? "inline-block" : "none";
  if (rbacNormNotice) {
    if (role.canEdit) {
      rbacNormNotice.classList.add("hidden");
    } else {
      rbacNormNotice.classList.remove("hidden");
      rbacNormNotice.innerHTML = `<i data-lucide="lock" class="w-4 h-4 inline mr-1 text-amber-400"></i> <b>Chế độ Chỉ Xem (${role.title}):</b> Bạn không có quyền thêm mới hoặc chỉnh sửa định mức tiêu hao.`;
      if (window.lucide) lucide.createIcons();
    }
  }
  document.querySelectorAll(".norm-input-field").forEach(inp => {
    inp.disabled = !role.canEdit;
    if (!role.canEdit) {
      inp.classList.add("opacity-70", "cursor-not-allowed");
    } else {
      inp.classList.remove("opacity-70", "cursor-not-allowed");
    }
  });

  // Permission enforcement for Import Tab
  const btnSubmitImport = document.getElementById("btn-submit-import");
  const rbacImportNotice = document.getElementById("rbac-import-notice");

  if (btnSubmitImport) {
    btnSubmitImport.disabled = !role.canImport;
    if (!role.canImport) {
      btnSubmitImport.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      btnSubmitImport.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
  if (rbacImportNotice) {
    if (role.canImport) {
      rbacImportNotice.classList.add("hidden");
    } else {
      rbacImportNotice.classList.remove("hidden");
      rbacImportNotice.innerHTML = `<i data-lucide="shield-alert" class="w-4 h-4 inline mr-1 text-amber-400"></i> <b>Chế độ Chỉ Xem (${role.title}):</b> Chức năng Upload và Bóc Tách dữ liệu Excel chỉ dành riêng cho Quản trị viên (Admin).`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// Helper: Toggle Password Visibility
function togglePasswordVisibility(inputId, iconId) {
  const inp = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    if (icon) icon.setAttribute("data-lucide", "eye-off");
  } else {
    inp.type = "password";
    if (icon) icon.setAttribute("data-lucide", "eye");
  }
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

// ==========================================
// AUTHENTICATION MODAL & LOGOUT CONTROLLER
// ==========================================
function handleLogout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?")) {
    localStorage.removeItem("px_auth_session");
    currentAuthUser = null;
    currentRole = "operator";

    // Clear login inputs
    const uField = document.getElementById("login-username");
    const pField = document.getElementById("login-password");
    if (uField) uField.value = "";
    if (pField) pField.value = "";
    const errEl = document.getElementById("login-error-msg");
    if (errEl) errEl.classList.add("hidden");

    openModal("modal-login");
    setTimeout(() => {
      if (uField) uField.focus();
    }, 150);
  }
}

function handleManualLogin() {
  const uInput = document.getElementById("login-username").value.trim().toLowerCase();
  const pInput = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error-msg");

  if (!uInput || !pInput) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!";
    }
    return;
  }

  const users = getUsersDb();
  const user = users.find(u => u.username.toLowerCase() === uInput);

  if (!user || user.pin !== pInput) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Tên đăng nhập hoặc Mật khẩu không chính xác. Vui lòng kiểm tra lại!";
    }
    return;
  }

  if (user.status === "Tạm Khóa") {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Tài khoản của bạn đang bị TẠM KHÓA. Vui lòng liên hệ Admin!";
    }
    return;
  }

  // Success login
  if (errEl) errEl.classList.add("hidden");
  localStorage.setItem("px_auth_session", user.username);
  localStorage.setItem("user_role", user.role);
  currentRole = user.role;
  currentAuthUser = user;
  
  // Clear password input for security
  const pInp = document.getElementById("login-password");
  if (pInp) pInp.value = "";

  closeModal("modal-login");
  applyRolePermissions();
  renderAccountsTable();
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function quickLogin(username, pin) {
  document.getElementById("login-username").value = username;
  document.getElementById("login-password").value = pin;
  handleManualLogin();
}

function openChangePasswordModal() {
  const user = getActiveUser();
  if (!user) {
    openModal("modal-login");
    return;
  }
  const displayEl = document.getElementById("cp-user-display");
  if (displayEl) displayEl.innerText = `${user.fullname} (${user.username})`;

  document.getElementById("cp-old-pass").value = "";
  document.getElementById("cp-new-pass").value = "";
  document.getElementById("cp-confirm-pass").value = "";
  const errEl = document.getElementById("cp-error-msg");
  if (errEl) errEl.classList.add("hidden");
  openModal("modal-change-password");
  setTimeout(() => {
    const el = document.getElementById("cp-old-pass");
    if (el) el.focus();
  }, 100);
}

function submitChangePassword() {
  const oldPass = document.getElementById("cp-old-pass").value.trim();
  const newPass = document.getElementById("cp-new-pass").value.trim();
  const confirmPass = document.getElementById("cp-confirm-pass").value.trim();
  const errEl = document.getElementById("cp-error-msg");

  const user = getActiveUser();
  if (!user) return;

  if (!oldPass || !newPass || !confirmPass) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Vui lòng nhập đầy đủ các trường thông tin!";
    }
    return;
  }

  if (user.pin !== oldPass) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Mật khẩu hiện tại không đúng!";
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!";
    }
    return;
  }

  if (newPass.length < 4) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Mật khẩu mới phải có ít nhất 4 ký tự!";
    }
    return;
  }

  // Update in DB
  const users = getUsersDb();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx !== -1) {
    users[idx].pin = newPass;
    saveUsersDb(users);
  }

  if (errEl) errEl.classList.add("hidden");
  closeModal("modal-change-password");
  renderAccountsTable();
  alert("Chúc mừng! Bạn đã đổi mật khẩu thành công. Hãy ghi nhớ mật khẩu mới để đăng nhập cho các lần tiếp theo.");
}

// ==========================================
// MASTER DATA SUB-TABS & ACCOUNTS CRUD
// ==========================================
function switchMasterSubTab(subTabId) {
  document.querySelectorAll(".master-sub-pane").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".master-sub-btn").forEach(b => {
    b.classList.remove("bg-blue-600", "text-white", "shadow");
    b.classList.add("text-slate-300");
  });

  const activePane = document.getElementById(`sub-master-${subTabId}`);
  if (activePane) activePane.classList.remove("hidden");

  const activeBtn = document.getElementById(`btn-sub-${subTabId}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-blue-600", "text-white", "shadow");
    activeBtn.classList.remove("text-slate-300");
  }

  if (subTabId === "accounts") {
    renderAccountsTable();
  } else if (subTabId === "norms") {
    loadNormVersions();
  }
  if (window.lucide) lucide.createIcons();
}

function renderAccountsTable() {
  const tbody = document.getElementById("accounts-table-body");
  if (!tbody) return;

  const users = getUsersDb();
  tbody.innerHTML = users.map((u, idx) => {
    const isCurrentUser = currentAuthUser && currentAuthUser.username === u.username;
    return `
      <tr class="hover:bg-[#13284d]/60 transition ${isCurrentUser ? 'bg-cyan-950/20' : ''}">
        <td class="p-3 font-mono font-bold text-cyan-300 border border-[#1e3a6a]/40">
          ${u.username}
          ${isCurrentUser ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">Bạn</span>' : ''}
        </td>
        <td class="p-3 font-bold text-white border border-[#1e3a6a]/40">${u.fullname}</td>
        <td class="p-3 text-slate-300 border border-[#1e3a6a]/40">${u.title}</td>
        <td class="p-3 text-center border border-[#1e3a6a]/40">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${u.roleBadgeClass || 'bg-slate-700 text-slate-300'}">
            <span class="w-1.5 h-1.5 rounded-full ${u.roleDotBg || 'bg-slate-400'}"></span>
            ${u.roleName || u.role}
          </span>
        </td>
        <td class="p-3 text-[11px] text-slate-400 max-w-xs border border-[#1e3a6a]/40">${u.permissionsDesc || 'Chỉ xem dữ liệu'}</td>
        <td class="p-3 text-center font-mono font-black text-slate-300 border border-[#1e3a6a]/40 tracking-widest">
          ${u.pin}
        </td>
        <td class="p-3 text-center border border-[#1e3a6a]/40">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'Hoạt Động' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}">
            ${u.status}
          </span>
        </td>
        <td class="p-3 text-center border border-[#1e3a6a]/40">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="editUserAccount('${u.username}')" class="px-2 py-1 rounded bg-[#112348] hover:bg-[#183266] border border-blue-500/30 text-[10.5px] font-bold text-cyan-300 transition flex items-center gap-1" title="Sửa thông tin">
              <i data-lucide="edit-3" class="w-3 h-3"></i> Sửa
            </button>
            ${u.username !== 'admin' ? `
              <button onclick="deleteUserAccount('${u.username}')" class="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-[10.5px] font-bold text-rose-300 transition flex items-center gap-1" title="Xóa tài khoản">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Xóa
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function openAddUserModal() {
  document.getElementById("user-modal-title-text").innerHTML = `<i data-lucide="user-plus" class="w-4 h-4 text-cyan-400 inline mr-1"></i> Thêm Tài Khoản Người Dùng Mới`;
  document.getElementById("user-modal-edit-mode").value = "create";
  
  const uField = document.getElementById("user-modal-username");
  uField.value = "";
  uField.disabled = false;
  uField.classList.remove("opacity-60", "cursor-not-allowed");

  document.getElementById("user-modal-fullname").value = "";
  document.getElementById("user-modal-title").value = "";
  document.getElementById("user-modal-role").value = "operator";
  document.getElementById("user-modal-pin").value = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById("user-modal-status").value = "Hoạt Động";
  document.getElementById("user-modal-desc").value = "Tác nghiệp. Nhập liệu hằng ngày, KHÔNG sửa đổi Master Data.";

  const errEl = document.getElementById("user-modal-error-msg");
  if (errEl) errEl.classList.add("hidden");

  openModal("modal-user-account");
  if (window.lucide) lucide.createIcons();
}

function editUserAccount(username) {
  const users = getUsersDb();
  const user = users.find(u => u.username === username);
  if (!user) return;

  document.getElementById("user-modal-title-text").innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-amber-400 inline mr-1"></i> Sửa Thông Tin Tài Khoản: <b>${user.username}</b>`;
  document.getElementById("user-modal-edit-mode").value = "edit";

  const uField = document.getElementById("user-modal-username");
  uField.value = user.username;
  uField.disabled = true;
  uField.classList.add("opacity-60", "cursor-not-allowed");

  document.getElementById("user-modal-fullname").value = user.fullname;
  document.getElementById("user-modal-title").value = user.title;
  document.getElementById("user-modal-role").value = user.role || "operator";
  document.getElementById("user-modal-pin").value = user.pin;
  document.getElementById("user-modal-status").value = user.status;
  document.getElementById("user-modal-desc").value = user.permissionsDesc || "";

  const errEl = document.getElementById("user-modal-error-msg");
  if (errEl) errEl.classList.add("hidden");

  openModal("modal-user-account");
  if (window.lucide) lucide.createIcons();
}

function deleteUserAccount(username) {
  if (username === "admin") {
    alert("Không thể xóa tài khoản Quản trị viên gốc (Admin)!");
    return;
  }
  if (confirm(`Bạn có chắc chắn muốn xóa tài khoản [${username}] không? Hành động này không thể hoàn tác.`)) {
    let users = getUsersDb();
    users = users.filter(u => u.username !== username);
    saveUsersDb(users);
    renderAccountsTable();
    alert(`Đã xóa thành công tài khoản [${username}].`);
  }
}

function submitSaveUserAccount() {
  const mode = document.getElementById("user-modal-edit-mode").value;
  const username = document.getElementById("user-modal-username").value.trim().toLowerCase();
  const fullname = document.getElementById("user-modal-fullname").value.trim();
  const title = document.getElementById("user-modal-title").value.trim();
  const role = document.getElementById("user-modal-role").value;
  const pin = document.getElementById("user-modal-pin").value.trim();
  const status = document.getElementById("user-modal-status").value;
  const desc = document.getElementById("user-modal-desc").value.trim();
  const errEl = document.getElementById("user-modal-error-msg");

  if (!username || !fullname || !pin) {
    if (errEl) {
      errEl.classList.remove("hidden");
      errEl.innerText = "Vui lòng điền đầy đủ Username, Họ & Tên và Mã PIN!";
    }
    return;
  }

  const users = getUsersDb();

  // Role metadata mapping matching Image 3
  const roleMeta = {
    admin: {
      roleName: "ADMIN System",
      roleBadgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      roleDotBg: "bg-rose-400",
      avatarBg: "bg-rose-700"
    },
    ptgd: {
      roleName: "Management (Read-Only)",
      roleBadgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      roleDotBg: "bg-purple-400",
      avatarBg: "bg-purple-700"
    },
    truong_phong: {
      roleName: "Management (Read-Only)",
      roleBadgeClass: "bg-blue-500/20 text-cyan-300 border-blue-500/40",
      roleDotBg: "bg-cyan-400",
      avatarBg: "bg-blue-700"
    },
    quan_doc: {
      roleName: "Management (Read-Only)",
      roleBadgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      roleDotBg: "bg-amber-400",
      avatarBg: "bg-amber-700"
    },
    operator: {
      roleName: "Operator (Thống Kê)",
      roleBadgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      roleDotBg: "bg-emerald-400",
      avatarBg: "bg-emerald-700"
    }
  };

  const meta = roleMeta[role] || roleMeta.operator;
  const nameParts = fullname.split(" ").filter(Boolean);
  const avatarInitials = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : fullname.substring(0, 2).toUpperCase();

  if (mode === "create") {
    if (users.some(u => u.username.toLowerCase() === username)) {
      if (errEl) {
        errEl.classList.remove("hidden");
        errEl.innerText = `Username [${username}] đã tồn tại trong hệ thống! Vui lòng chọn tên khác.`;
      }
      return;
    }

    users.push({
      username,
      fullname,
      title,
      role,
      roleName: meta.roleName,
      roleBadgeClass: meta.roleBadgeClass,
      roleDotBg: meta.roleDotBg,
      permissionsDesc: desc || "Tác nghiệp. Nhập liệu hằng ngày.",
      pin,
      status,
      avatar: avatarInitials,
      avatarBg: meta.avatarBg
    });
  } else {
    // Edit mode
    const idx = users.findIndex(u => u.username === username);
    if (idx !== -1) {
      users[idx].fullname = fullname;
      users[idx].title = title;
      users[idx].role = role;
      users[idx].roleName = meta.roleName;
      users[idx].roleBadgeClass = meta.roleBadgeClass;
      users[idx].roleDotBg = meta.roleDotBg;
      users[idx].permissionsDesc = desc;
      users[idx].pin = pin;
      users[idx].status = status;
      users[idx].avatar = avatarInitials;
      users[idx].avatarBg = meta.avatarBg;
    }
  }

  saveUsersDb(users);
  closeModal("modal-user-account");
  renderAccountsTable();
  applyRolePermissions();
  alert(`Đã lưu thông tin tài khoản [${username}] thành công!`);
}

function downloadUsersTemplate() {
  const csvContent = "\uFEFF" + "USERNAME,HO_VA_TEN,CHUC_DANH,VAI_TRO,MA_PIN,TRANG_THAI,QUYEN_HAN\n"
    + "admin,Quản Trị Hệ Thống,Admin System,admin,0179,Hoạt Động,Toàn quyền quản lý\n"
    + "quanly,Bùi Văn A - Phó TGĐ,Ban Giám Đốc,ptgd,1111,Hoạt Động,Giám sát toàn bộ báo cáo\n"
    + "kcs_01,Phạm Văn D,Nhân viên KCS,operator,1234,Hoạt Động,Nhập liệu KCS hàng ngày\n";

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Mau_Danh_Sach_Tai_Khoan_PhuongNam.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImportUsersExcel() {
  document.getElementById("users-excel-file").click();
}

function importUsersFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("File không chứa dữ liệu tài khoản hợp lệ!");
        return;
      }

      const users = getUsersDb();
      let importedCount = 0;

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 3 && cols[0]) {
          const uName = cols[0].toLowerCase();
          const fName = cols[1] || uName;
          const tName = cols[2] || "Nhân viên";
          const rName = cols[3] || "operator";
          const pinCode = cols[4] || "1234";
          const stat = cols[5] || "Hoạt Động";
          const perm = cols[6] || "Tác nghiệp. Nhập liệu hằng ngày.";

          const existingIdx = users.findIndex(u => u.username === uName);
          const userObj = {
            username: uName,
            fullname: fName,
            title: tName,
            role: rName,
            roleName: rName === "admin" ? "ADMIN System" : (rName === "operator" ? "Operator (Thống Kê)" : "Management (Read-Only)"),
            roleBadgeClass: rName === "admin" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : (rName === "operator" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-purple-500/20 text-purple-300 border-purple-500/40"),
            roleDotBg: rName === "admin" ? "bg-rose-400" : (rName === "operator" ? "bg-emerald-400" : "bg-purple-400"),
            permissionsDesc: perm,
            pin: pinCode,
            status: stat,
            avatar: fName.substring(0, 2).toUpperCase(),
            avatarBg: rName === "admin" ? "bg-rose-700" : "bg-blue-700"
          };

          if (existingIdx !== -1) {
            users[existingIdx] = userObj;
          } else {
            users.push(userObj);
          }
          importedCount++;
        }
      }

      saveUsersDb(users);
      renderAccountsTable();
      alert(`Đã nhập thành công ${importedCount} tài khoản từ file!`);
    } catch (err) {
      alert("Lỗi khi đọc file tài khoản: " + err);
    }
  };
  reader.readAsText(file);
}

// Modal generic opener/closer
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("hidden");
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function closeModal(modalId) {
  if (modalId === "modal-login") {
    // Cannot close login modal if user is not authenticated
    if (!getActiveUser()) return;
  }
  const m = document.getElementById(modalId);
  if (m) m.classList.add("hidden");
}

// Mobile Sidebar Drawer Toggle
function toggleMobileSidebar(show) {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!sidebar || !backdrop) return;

  const isOpen = !sidebar.classList.contains("-translate-x-full");
  const shouldOpen = show !== undefined ? show : !isOpen;

  if (shouldOpen) {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
  } else {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
  }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide && lucide.createIcons) lucide.createIcons();

  // Strict Authentication Guard
  const isAuth = checkAndEnforceAuth();

  renderAccountsTable();
  try { loadDashboardData(); } catch(e) { console.error("loadDashboardData err:", e); }
  try { loadSummaryData(); } catch(e) { console.error("loadSummaryData err:", e); }
  try { loadBrandsData(); } catch(e) { console.error("loadBrandsData err:", e); }
  try { loadNormVersions(); } catch(e) { console.error("loadNormVersions err:", e); }
  try { loadConsumptionData(); } catch(e) { console.error("loadConsumptionData err:", e); }
  try { loadCoalData(); } catch(e) { console.error("loadCoalData err:", e); }
  try { populateFormMauPeriodSelect(); loadFormMauData(); } catch(e) { console.error("loadFormMauData err:", e); }
});

// Vietnamese Number Formatter
function formatNumber(num, decimals = 2, fixedDecimals = false) {
  if (num === null || num === undefined || isNaN(num)) return fixedDecimals ? "0," + "0".repeat(decimals) : "0";
  if (num === 0) return fixedDecimals ? "0," + "0".repeat(decimals) : "0";
  const fixed = Number(num).toFixed(decimals);
  let [intPart, decPart] = fixed.split(".");
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decimals === 0 || !decPart) {
    return intPart;
  }
  if (!fixedDecimals) {
    if (Number(decPart) === 0) return intPart;
    decPart = decPart.replace(/0+$/, "");
  }
  return decPart ? `${intPart},${decPart}` : intPart;
}

// Tab Switching
function switchTab(tabId) {
  currentTab = tabId;
  if (window.innerWidth < 768) {
    toggleMobileSidebar(false);
  }

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
    "consumption": "Tiêu hao vật tư",
    "coal": "Sử dụng than",
    "export-report": "Báo cáo trình ký",
    "master-data": "Quản Lý Danh Mục"
  };
  document.getElementById("breadcrumb-current").innerText = titles[tabId] || "Tổng quan";

  if (tabId === "dashboard") loadDashboardData();
  else if (tabId === "summary") loadSummaryData();
  else if (tabId === "brands") loadBrandsData();
  else if (tabId === "consumption") loadConsumptionData();
  else if (tabId === "coal") loadCoalData();
  else if (tabId === "export-report") renderFormMauPreview();
  else if (tabId === "master-data") {
    renderAccountsTable();
    loadNormVersions();
  }

  applyRolePermissions();
  if (window.lucide) lucide.createIcons();
}

// Toggle Dark / Light Theme
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");

  if (isDark) {
    text.innerText = "Tone Sáng";
    icon.setAttribute("data-lucide", "sun");
  } else {
    text.innerText = "Tone Xanh";
    icon.setAttribute("data-lucide", "moon");
  }
  if (window.lucide) lucide.createIcons();
  if (monthlyTrendChart) monthlyTrendChart.update();
  if (brandDistChart) brandDistChart.update();
}

// ----------------------------------------------------
// TAB 1: DASHBOARD (EXCEL REPLICA 2026 WITH VISUAL SLICERS)
// ----------------------------------------------------
// Section 1: Sản lượng & Chất lượng
let currentDashMonth = "all";
let currentDashLine = "all";
let currentDashSize = "all";
let currentDashBrand = "all";

// Section 2: Sản lượng Thương hiệu
let currentDashMonthP2 = "all";
let currentDashLineP2 = "all";
let currentDashSizeP2 = "all";
let currentDashBrandP2 = "all";

// Section 3: Tiêu hao Vật tư
let currentDashMonthP3 = "all";
let currentDashLineP3 = "all";
let currentDashSizeP3 = "all";

// Section 4: Sử dụng Than
let currentDashMonthP4 = "all";
let currentDashLineP4 = "all";
let currentDashSizeP4 = "all";
// ==========================================
// SECTION 1 HANDLERS
// ==========================================
// SMART CASCADE SLICER HELPER
// ==========================================
function updateSizeSlicerAvailability(sec, line) {
  const prefix = sec === 1 ? "btn-size-" : `btn-p${sec}-size-`;
  const allSizes = ["30x60", "50x50", "40x80", "60x60"];

  allSizes.forEach(sz => {
    const btn = document.getElementById(prefix + sz);
    if (!btn) return;
    if (line === "DC1") {
      // DC1 only has 30x60
      if (sz === "30x60") {
        btn.style.display = "";
      } else {
        btn.style.display = "none";
      }
    } else if (line === "DC2") {
      // DC2 has 50x50, 40x80, 60x60
      if (sz === "30x60") {
        btn.style.display = "none";
      } else {
        btn.style.display = "";
      }
    } else {
      // 'all' line shows all sizes
      btn.style.display = "";
    }
  });

  // Auto-reset current selected size if incompatible with selected line
  if (sec === 1) {
    if (line === "DC1" && ["50x50", "40x80", "60x60"].includes(currentDashSize)) {
      currentDashSize = "all";
    } else if (line === "DC2" && currentDashSize === "30x60") {
      currentDashSize = "all";
    }
  } else if (sec === 2) {
    if (line === "DC1" && ["50x50", "40x80", "60x60"].includes(currentDashSizeP2)) {
      currentDashSizeP2 = "all";
    } else if (line === "DC2" && currentDashSizeP2 === "30x60") {
      currentDashSizeP2 = "all";
    }
  } else if (sec === 3) {
    if (line === "DC1" && ["50x50", "40x80", "60x60"].includes(currentDashSizeP3)) {
      currentDashSizeP3 = "all";
    } else if (line === "DC2" && currentDashSizeP3 === "30x60") {
      currentDashSizeP3 = "all";
    }
  } else if (sec === 4) {
    if (line === "DC1" && ["50x50", "40x80", "60x60"].includes(currentDashSizeP4)) {
      currentDashSizeP4 = "all";
    } else if (line === "DC2" && currentDashSizeP4 === "30x60") {
      currentDashSizeP4 = "all";
    }
  }
}

// ==========================================
// SECTION 1 HANDLERS (Tổng quan)
// ==========================================
function setDashMonth(m) {
  currentDashMonth = m;
  updateSlicerButtonStyles(1);
  loadDashboardData();
}

function setDashLine(l) {
  currentDashLine = l;
  updateSizeSlicerAvailability(1, l);
  updateSlicerButtonStyles(1);
  loadDashboardData();
}

function setDashSize(s) {
  currentDashSize = s;
  updateSlicerButtonStyles(1);
  loadDashboardData();
}

function setDashBrand(b) {
  currentDashBrand = b;
  const brandSelect = document.getElementById("dash-filter-brand");
  if (brandSelect) brandSelect.value = b;
  loadDashboardData();
}

// ==========================================
// SECTION 2 HANDLERS (Thương hiệu)
// ==========================================
function setDashMonthP2(m) {
  currentDashMonthP2 = m;
  updateSlicerButtonStyles(2);
  loadDashboardData();
}

function setDashLineP2(l) {
  currentDashLineP2 = l;
  updateSizeSlicerAvailability(2, l);
  updateSlicerButtonStyles(2);
  loadDashboardData();
}

function setDashSizeP2(s) {
  currentDashSizeP2 = s;
  updateSlicerButtonStyles(2);
  loadDashboardData();
}

function setDashBrandP2(b) {
  currentDashBrandP2 = b;
  loadDashboardData();
}

// ==========================================
// SECTION 3 HANDLERS (Vật tư)
// ==========================================
function setDashMonthP3(m) {
  currentDashMonthP3 = m;
  updateSlicerButtonStyles(3);
  loadDashboardData();
}

function setDashLineP3(l) {
  currentDashLineP3 = l;
  updateSizeSlicerAvailability(3, l);
  updateSlicerButtonStyles(3);
  loadDashboardData();
}

function setDashSizeP3(s) {
  currentDashSizeP3 = s;
  updateSlicerButtonStyles(3);
  loadDashboardData();
}

// ==========================================
// SECTION 4 HANDLERS (Than)
// ==========================================
function setDashMonthP4(m) {
  currentDashMonthP4 = m;
  updateSlicerButtonStyles(4);
  loadDashboardData();
}

function setDashLineP4(l) {
  currentDashLineP4 = l;
  updateSizeSlicerAvailability(4, l);
  updateSlicerButtonStyles(4);
  loadDashboardData();
}

function setDashSizeP4(s) {
  currentDashSizeP4 = s;
  updateSlicerButtonStyles(4);
  loadDashboardData();
}

// ==========================================
// SYNC & RESET CONTROLLERS
// ==========================================
function syncSectionToP1(sec) {
  if (sec === 2) {
    currentDashMonthP2 = currentDashMonth;
    currentDashLineP2 = currentDashLine;
    currentDashSizeP2 = currentDashSize;
    updateSizeSlicerAvailability(2, currentDashLineP2);
    updateSlicerButtonStyles(2);
  } else if (sec === 3) {
    currentDashMonthP3 = currentDashMonth;
    currentDashLineP3 = currentDashLine;
    currentDashSizeP3 = currentDashSize;
    updateSizeSlicerAvailability(3, currentDashLineP3);
    updateSlicerButtonStyles(3);
  } else if (sec === 4) {
    currentDashMonthP4 = currentDashMonth;
    currentDashLineP4 = currentDashLine;
    currentDashSizeP4 = currentDashSize;
    updateSizeSlicerAvailability(4, currentDashLineP4);
    updateSlicerButtonStyles(4);
  }
  loadDashboardData();
}

function syncAllSectionsToP1() {
  currentDashMonthP2 = currentDashMonth;
  currentDashLineP2 = currentDashLine;
  currentDashSizeP2 = currentDashSize;

  currentDashMonthP3 = currentDashMonth;
  currentDashLineP3 = currentDashLine;
  currentDashSizeP3 = currentDashSize;

  currentDashMonthP4 = currentDashMonth;
  currentDashLineP4 = currentDashLine;
  currentDashSizeP4 = currentDashSize;

  updateSizeSlicerAvailability(1, currentDashLine);
  updateSizeSlicerAvailability(2, currentDashLineP2);
  updateSizeSlicerAvailability(3, currentDashLineP3);
  updateSizeSlicerAvailability(4, currentDashLineP4);

  updateSlicerButtonStyles(0);
  loadDashboardData();
}

function resetSectionFilter(sec) {
  if (sec === 2) {
    currentDashMonthP2 = "all";
    currentDashLineP2 = "all";
    currentDashSizeP2 = "all";
    currentDashBrandP2 = "all";
    updateSizeSlicerAvailability(2, "all");
    updateSlicerButtonStyles(2);
  } else if (sec === 3) {
    currentDashMonthP3 = "all";
    currentDashLineP3 = "all";
    currentDashSizeP3 = "all";
    updateSizeSlicerAvailability(3, "all");
    updateSlicerButtonStyles(3);
  } else if (sec === 4) {
    currentDashMonthP4 = "all";
    currentDashLineP4 = "all";
    currentDashSizeP4 = "all";
    updateSizeSlicerAvailability(4, "all");
    updateSlicerButtonStyles(4);
  }
  loadDashboardData();
}

function resetDashFilters() {
  currentDashMonth = "all";
  currentDashLine = "all";
  currentDashSize = "all";
  currentDashBrand = "all";

  currentDashMonthP2 = "all";
  currentDashLineP2 = "all";
  currentDashSizeP2 = "all";
  currentDashBrandP2 = "all";

  currentDashMonthP3 = "all";
  currentDashLineP3 = "all";
  currentDashSizeP3 = "all";

  currentDashMonthP4 = "all";
  currentDashLineP4 = "all";
  currentDashSizeP4 = "all";

  const brandSelect = document.getElementById("dash-filter-brand");
  if (brandSelect) brandSelect.value = "all";

  const matGroup = document.getElementById("dash-mat-filter-group");
  if (matGroup) matGroup.value = "all";
  const matStatus = document.getElementById("dash-mat-filter-status");
  if (matStatus) matStatus.value = "all";
  const matSearch = document.getElementById("dash-mat-search");
  if (matSearch) matSearch.value = "";

  const coalMetric = document.getElementById("dash-coal-filter-metric");
  if (coalMetric) coalMetric.value = "all";
  const coalSupp = document.getElementById("dash-coal-filter-supplier");
  if (coalSupp) coalSupp.value = "all";
  const coalWh = document.getElementById("dash-coal-filter-warehouse");
  if (coalWh) coalWh.value = "all";
  const coalSearch = document.getElementById("dash-coal-search");
  if (coalSearch) coalSearch.value = "";

  updateSizeSlicerAvailability(1, "all");
  updateSizeSlicerAvailability(2, "all");
  updateSizeSlicerAvailability(3, "all");
  updateSizeSlicerAvailability(4, "all");

  updateSlicerButtonStyles(0);
  loadDashboardData();
}

function updateSlicerButtonStyles(section = 0) {
  const months = ["all", "1", "3", "4", "5", "6", "7", "8"];
  const lines = ["all", "DC1", "DC2"];
  const sizes = ["all", "30x60", "50x50", "40x80", "60x60"];

  const activeCls = "px-2 py-1 rounded text-xs font-bold bg-emerald-600 text-white shadow-md border border-emerald-400 transition text-center";
  const inactiveCls = "px-2 py-1 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 transition text-center";

  // Section 1
  if (section === 0 || section === 1) {
    updateSizeSlicerAvailability(1, currentDashLine);
    months.forEach(m => {
      const btn = document.getElementById("btn-month-" + m);
      if (btn) btn.className = `dash-slicer-btn ${currentDashMonth === m ? activeCls : inactiveCls}`;
    });
    lines.forEach(l => {
      const btn = document.getElementById("btn-line-" + l);
      if (btn) btn.className = `dash-slicer-btn ${currentDashLine === l ? activeCls : inactiveCls}`;
    });
    sizes.forEach(s => {
      const btn = document.getElementById("btn-size-" + s);
      if (btn) btn.className = `dash-slicer-btn ${currentDashSize === s ? activeCls : inactiveCls}`;
    });
  }

  // Section 2
  if (section === 0 || section === 2) {
    updateSizeSlicerAvailability(2, currentDashLineP2);
    months.forEach(m => {
      const btn = document.getElementById("btn-p2-month-" + m);
      if (btn) btn.className = `p2-slicer-btn ${currentDashMonthP2 === m ? activeCls : inactiveCls}`;
    });
    lines.forEach(l => {
      const btn = document.getElementById("btn-p2-line-" + l);
      if (btn) btn.className = `p2-slicer-btn ${currentDashLineP2 === l ? activeCls : inactiveCls}`;
    });
    sizes.forEach(s => {
      const btn = document.getElementById("btn-p2-size-" + s);
      if (btn) btn.className = `p2-slicer-btn ${currentDashSizeP2 === s ? activeCls : inactiveCls}`;
    });
  }

  // Section 3
  if (section === 0 || section === 3) {
    updateSizeSlicerAvailability(3, currentDashLineP3);
    months.forEach(m => {
      const btn = document.getElementById("btn-p3-month-" + m);
      if (btn) btn.className = `p3-slicer-btn ${currentDashMonthP3 === m ? activeCls : inactiveCls}`;
    });
    lines.forEach(l => {
      const btn = document.getElementById("btn-p3-line-" + l);
      if (btn) btn.className = `p3-slicer-btn ${currentDashLineP3 === l ? activeCls : inactiveCls}`;
    });
    sizes.forEach(s => {
      const btn = document.getElementById("btn-p3-size-" + s);
      if (btn) btn.className = `p3-slicer-btn ${currentDashSizeP3 === s ? activeCls : inactiveCls}`;
    });
  }

  // Section 4
  if (section === 0 || section === 4) {
    updateSizeSlicerAvailability(4, currentDashLineP4);
    months.forEach(m => {
      const btn = document.getElementById("btn-p4-month-" + m);
      if (btn) btn.className = `p4-slicer-btn ${currentDashMonthP4 === m ? activeCls : inactiveCls}`;
    });
    lines.forEach(l => {
      const btn = document.getElementById("btn-p4-line-" + l);
      if (btn) btn.className = `p4-slicer-btn ${currentDashLineP4 === l ? activeCls : inactiveCls}`;
    });
    sizes.forEach(s => {
      const btn = document.getElementById("btn-p4-size-" + s);
      if (btn) btn.className = `p4-slicer-btn ${currentDashSizeP4 === s ? activeCls : inactiveCls}`;
    });
  }
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
    const query = new URLSearchParams({
      p1_month: currentDashMonth,
      p1_line: currentDashLine,
      p1_size: currentDashSize,
      p1_brand: currentDashBrand,

      p2_month: currentDashMonthP2,
      p2_line: currentDashLineP2,
      p2_size: currentDashSizeP2,
      p2_brand: currentDashBrandP2,

      p3_month: currentDashMonthP3,
      p3_line: currentDashLineP3,
      p3_size: currentDashSizeP3,

      p4_month: currentDashMonthP4,
      p4_line: currentDashLineP4,
      p4_size: currentDashSizeP4
    });
    const res = await fetch(`/api/dashboard?${query.toString()}`);
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
    renderDashboardBrandTable(data.brand_table || [], currentDashBrandP2);

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
          <button onclick="setDashBrandP2('${b.brand_name}')" class="px-2 py-1 rounded text-[10px] font-bold ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white'} transition">
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
          <button onclick="setDashBrandP2('all')" class="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
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
  const firing = document.getElementById("dash-coal-filter-firing") ? document.getElementById("dash-coal-filter-firing").value : "all";
  const metric = document.getElementById("dash-coal-filter-metric") ? document.getElementById("dash-coal-filter-metric").value : "all";
  const supplier = document.getElementById("dash-coal-filter-supplier") ? document.getElementById("dash-coal-filter-supplier").value : "all";
  const warehouse = document.getElementById("dash-coal-filter-warehouse") ? document.getElementById("dash-coal-filter-warehouse").value : "all";
  const search = document.getElementById("dash-coal-search") ? document.getElementById("dash-coal-search").value.trim().toLowerCase() : "";

  let filtered = [...(currentDashRawCoal || [])];

  // 1. Firing type filter
  if (firing === "firing") {
    filtered = filtered.filter(c => !((c.firing_type && c.firing_type.includes("Không")) || (!c.production_m2 || c.production_m2 === 0)));
  } else if (firing === "drying") {
    filtered = filtered.filter(c => (c.firing_type && c.firing_type.includes("Không")) || (!c.production_m2 || c.production_m2 === 0));
  }

  // 2. Metric filter (Rate Type / Ash / Compensation)
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

  // 3. Supplier filter
  if (supplier !== "all") {
    filtered = filtered.filter(c => (c.coal_supplier || "").toLowerCase().includes(supplier.toLowerCase()));
  }

  // 4. Warehouse filter
  if (warehouse !== "all") {
    filtered = filtered.filter(c => (c.warehouse || "").toLowerCase().includes(warehouse.toLowerCase()));
  }

  // 5. Search
  if (search) {
    filtered = filtered.filter(c => 
      (c.coal_supplier || "").toLowerCase().includes(search) || 
      (c.warehouse || "").toLowerCase().includes(search) || 
      (c.note || "").toLowerCase().includes(search) ||
      (c.line || "").toLowerCase().includes(search) ||
      (c.size || "").toLowerCase().includes(search)
    );
  }

  const elCoalBadge = document.getElementById("dash-coal-badge-count");
  if (elCoalBadge) elCoalBadge.innerText = `${filtered.length} lô đốt lò`;

  renderDashboardCoalTable(filtered, metric, firing);
  renderCoalTrendChart(currentDashRawCoalTrend);
}

function renderDashboardCoalTable(rows, currentMetric = "all", firingMode = "all") {
  const tbody = document.getElementById("dash-coal-table-body");
  const tfoot = document.getElementById("dash-coal-table-foot");

  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="17" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu tiêu hao than</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    updateDashboardCoalKPIs({
      rate_lump: 0,
      rate_lump_all: 0,
      issued_weight: 0,
      issued_weight_all: 0,
      rate_with_ash: 0,
      rate_with_ash_all: 0,
      ash_weight: 0,
      ash_rate_avg: 0,
      rate_total: 0,
      rate_total_all: 0,
      compensation_weight: 0,
      excess_ash_weight: 0,
      production_m2: 0,
      total_used_weight: 0,
      total_used_all: 0
    });
    return;
  }

  // Calculate dynamic sums for current filtered rows
  let sumLumpFiring = 0, sumAshFiring = 0, sumCompFiring = 0, sumExcessFiring = 0, sumUsedFiring = 0, sumM2Firing = 0;
  let sumLumpDrying = 0, sumAshDrying = 0, sumCompDrying = 0, sumUsedDrying = 0;

  rows.forEach(r => {
    const isDrying = (r.firing_type && r.firing_type.includes("Không")) || (!r.production_m2 || r.production_m2 === 0);
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const used = Number(r.total_used_weight || (issued + ash + comp - excess));
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
  const rateWithAshFiring = sumM2Firing > 0 ? ((sumLumpFiring + sumAshFiring - sumExcessFiring) / sumM2Firing) : 0;
  const rateTotalFiring = sumM2Firing > 0 ? (sumUsedFiring / sumM2Firing) : 0;

  const rateLumpAll = totalM2All > 0 ? (totalIssuedAll / totalM2All) : 0;
  const rateWithAshAll = totalM2All > 0 ? ((totalIssuedAll + totalAshAll - sumExcessFiring) / totalM2All) : 0;
  const rateTotalAll = totalM2All > 0 ? (totalUsedAll / totalM2All) : 0;

  const ashPctFiring = (sumLumpFiring + sumAshFiring) > 0 ? (sumAshFiring / (sumLumpFiring + sumAshFiring) * 100) : 0;
  const ashPctDrying = (sumLumpDrying + sumAshDrying) > 0 ? (sumAshDrying / (sumLumpDrying + sumAshDrying) * 100) : 0;
  const ashPctAll = (totalIssuedAll + totalAshAll) > 0 ? (totalAshAll / (totalIssuedAll + totalAshAll) * 100) : 0;

  // Update Top KPI Cards with both K.Tính Sấy vs + Sấy Lò
  updateDashboardCoalKPIs({
    rate_lump: rateLumpFiring,
    rate_lump_all: rateLumpAll,
    issued_weight: sumLumpFiring,
    issued_weight_all: totalIssuedAll,
    rate_with_ash: rateWithAshFiring,
    rate_with_ash_all: rateWithAshAll,
    ash_weight: sumAshFiring,
    ash_rate_avg: ashPctFiring,
    rate_total: rateTotalFiring,
    rate_total_all: rateTotalAll,
    compensation_weight: sumCompFiring,
    excess_ash_weight: sumExcessFiring,
    production_m2: sumM2Firing,
    total_used_weight: sumUsedFiring,
    total_used_all: totalUsedAll
  }, firingMode);

  // Render Table Body (Exactly 17 columns matching Tab 6 and Image 2)
  tbody.innerHTML = rows.map((r, idx) => {
    const isDrying = (r.firing_type && r.firing_type.includes("Không")) || (!r.production_m2 || r.production_m2 === 0);
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const totalUsed = Number(r.total_used_weight || (issued + ash + comp - excess));
    const m2 = Number(r.production_m2 || 0);

    const rateLump = r.rate_lump > 0 ? r.rate_lump : (m2 > 0 ? (issued / m2) : 0);
    const rateWithAsh = r.rate_with_ash > 0 ? r.rate_with_ash : (m2 > 0 ? ((issued + ash) / m2) : 0);
    const rateTotal = r.rate_total > 0 ? r.rate_total : (m2 > 0 ? (totalUsed / m2) : 0);

    if (isDrying) {
      return `
        <tr class="bg-[#0b172a]/70 text-slate-400 italic">
          <td class="p-2 text-center text-slate-500 font-mono">${r.stt || ''}</td>
          <td class="p-2 text-slate-400 font-medium">
            <span>${r.coal_supplier || 'Than sấy lò'}</span>
            <span class="ml-1 px-1 py-0.2 rounded text-[8px] bg-slate-800 text-slate-400 border border-slate-700">Đốt sấy</span>
          </td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(issued, 0)}</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(ash, 0)}</td>
          <td class="p-2 text-right text-slate-400">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2, true) : '-'}</td>
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

    const isExcessAsh = excess > 0 || ((r.ash_rate || 0) > (r.std_ash_rate || 16));
    const isComp = comp > 0;

    return `
      <tr class="hover:bg-[#13284d]/50 transition text-slate-200">
        <td class="p-2 text-center font-bold font-mono text-cyan-300">${r.stt || ''}</td>
        <td class="p-2 font-bold text-white">
          <div class="flex items-center gap-1 flex-wrap">
            <span>${r.coal_supplier || 'Than nung'}</span>
            ${isExcessAsh ? '<span class="px-1 py-0.2 rounded text-[8px] bg-red-500/20 text-red-300 border border-red-500/30">Cám vượt</span>' : ''}
            ${isComp ? '<span class="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30">Lĩnh bù</span>' : ''}
          </div>
          <div class="text-[9px] text-slate-400 font-normal">DC: ${r.line || '-'} • KT: ${r.size || '-'}</div>
        </td>
        <td class="p-2 text-right font-medium text-slate-300">${r.heat_value > 0 ? formatNumber(r.heat_value, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${r.ash_rate > 0 ? formatNumber(r.ash_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right text-slate-400">${r.std_ash_rate > 0 ? formatNumber(r.std_ash_rate, 1) : '15,0'}</td>
        <td class="p-2 text-right font-medium text-amber-300">${r.stone_rate > 0 ? formatNumber(r.stone_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-slate-100">${formatNumber(issued, 0)}</td>
        <td class="p-2 text-right font-medium text-slate-200">${ash > 0 ? formatNumber(ash, 0) : '-'}</td>
        <td class="p-2 text-right text-slate-300">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-emerald-400">${comp > 0 ? formatNumber(comp, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-rose-400">${excess > 0 ? formatNumber(excess, 0) : '-'}</td>
        <td class="p-2 text-right font-black text-amber-300">${formatNumber(totalUsed, 0)}</td>
        <td class="p-2 text-right font-bold text-emerald-300">${m2 > 0 ? formatNumber(m2, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-amber-300">${rateLump > 0 ? formatNumber(rateLump, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${rateWithAsh > 0 ? formatNumber(rateWithAsh, 2, true) : '-'}</td>
        <td class="p-2 text-right font-black text-white">${(comp > 0 && rateTotal > 0) ? formatNumber(rateTotal, 2, true) : '-'}</td>
        <td class="p-2 text-[11px] text-slate-300">${r.note || ''}</td>
      </tr>
    `;
  }).join("");

  // Render Table Footer (3 Tiers matching Tab 6 & Image 2 exactly)
  if (tfoot) {
    tfoot.innerHTML = `
      <!-- 1. TỔNG SẤY LÒ -->
      <tr class="bg-[#0a1526] text-slate-300 font-semibold">
        <td colspan="2" class="p-2.5 text-center uppercase text-[11px] font-bold text-slate-300 tracking-wider">
          TỔNG SẤY LÒ
        </td>
        <td colspan="4" class="p-2 text-center text-slate-500">-</td>
        <td class="p-2 text-right font-bold text-slate-200">${formatNumber(sumLumpDrying, 0)}</td>
        <td class="p-2 text-right font-medium text-slate-300">${formatNumber(sumAshDrying, 0)}</td>
        <td class="p-2 text-right text-slate-300">${formatNumber(ashPctDrying, 2, true)}</td>
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
        <td class="p-2 text-right font-bold text-emerald-300">${formatNumber(ashPctFiring, 2, true)}</td>
        <td class="p-2 text-right font-bold text-emerald-300">${sumCompFiring > 0 ? formatNumber(sumCompFiring, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-rose-300">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
        <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(sumUsedFiring, 0)}</td>
        <td class="p-2 text-right font-black text-emerald-300 text-sm">${formatNumber(sumM2Firing, 2)}</td>
        <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(rateLumpFiring, 2, true)}</td>
        <td class="p-2 text-right font-black text-cyan-300 text-sm">${formatNumber(rateWithAshFiring, 2, true)}</td>
        <td class="p-2 text-right font-black text-white text-sm">${formatNumber(rateTotalFiring, 2, true)}</td>
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
        <td class="p-2 text-right text-slate-300">${formatNumber(ashPctAll, 2, true)}</td>
        <td class="p-2 text-right text-emerald-400">${totalCompAll > 0 ? formatNumber(totalCompAll, 0) : '-'}</td>
        <td class="p-2 text-right text-rose-400">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-amber-300">${formatNumber(totalUsedAll, 0)}</td>
        <td class="p-2 text-right font-bold text-emerald-400">${formatNumber(totalM2All, 2)}</td>
        <td class="p-2 text-right font-bold text-amber-300">${formatNumber(rateLumpAll, 2, true)}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${formatNumber(rateWithAshAll, 2, true)}</td>
        <td class="p-2 text-right font-black text-white">${formatNumber(rateTotalAll, 2, true)}</td>
        <td class="p-2 text-left text-[11px] text-slate-400">Tổng nhiên liệu</td>
      </tr>
    `;
  }
}

function updateDashboardCoalKPIs(kpi, firingMode = "all") {
  const isOnlyFiring = firingMode === "firing";
  const isOnlyDrying = firingMode === "drying";

  // Card 1: Lump Rate
  const elRateLump = document.getElementById("dash-coal-kpi-rate-lump");
  const displayLump = isOnlyFiring ? kpi.rate_lump : (kpi.rate_lump_all > 0 ? kpi.rate_lump_all : kpi.rate_lump);
  if (elRateLump) elRateLump.innerHTML = `${formatNumber(displayLump, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateLumpAll = document.getElementById("dash-coal-kpi-rate-lump-all");
  if (elRateLumpAll) {
    if (isOnlyFiring) {
      elRateLumpAll.innerHTML = `<span class="text-emerald-400">Không tính sấy lò</span>`;
    } else {
      elRateLumpAll.innerHTML = `K.tính sấy: <b class="text-emerald-300">${formatNumber(kpi.rate_lump, 2, true)} kg/m²</b>`;
    }
  }

  const elLumpWt = document.getElementById("dash-coal-kpi-lump-wt");
  if (elLumpWt) elLumpWt.innerText = `${formatNumber(kpi.issued_weight, 0)} kg`;

  const elLumpAllWt = document.getElementById("dash-coal-kpi-lump-all-wt");
  if (elLumpAllWt) elLumpAllWt.innerText = `${formatNumber(kpi.issued_weight_all, 0)} kg`;

  // Card 2: Rate with Ash
  const elRateAsh = document.getElementById("dash-coal-kpi-rate-ash");
  const displayAshRate = isOnlyFiring ? kpi.rate_with_ash : (kpi.rate_with_ash_all > 0 ? kpi.rate_with_ash_all : kpi.rate_with_ash);
  if (elRateAsh) elRateAsh.innerHTML = `${formatNumber(displayAshRate, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateAshAll = document.getElementById("dash-coal-kpi-rate-ash-all");
  if (elRateAshAll) {
    if (isOnlyFiring) {
      elRateAshAll.innerHTML = `<span class="text-emerald-400">Không tính sấy lò</span>`;
    } else {
      elRateAshAll.innerHTML = `K.tính sấy: <b class="text-emerald-300">${formatNumber(kpi.rate_with_ash, 2, true)} kg/m²</b>`;
    }
  }

  const elAshWt = document.getElementById("dash-coal-kpi-ash-wt");
  if (elAshWt) elAshWt.innerText = `${formatNumber(kpi.ash_weight, 0)} kg`;
  
  const elAshPct = document.getElementById("dash-coal-kpi-ash-pct");
  if (elAshPct) elAshPct.innerText = `${formatNumber(kpi.ash_rate_avg, 2, true)}%`;

  // Card 3: Total Rate (Cuc + Cam + Bu)
  const elRateTotal = document.getElementById("dash-coal-kpi-rate-total");
  const displayTotalRate = isOnlyFiring ? kpi.rate_total : (kpi.rate_total_all > 0 ? kpi.rate_total_all : kpi.rate_total);
  if (elRateTotal) elRateTotal.innerHTML = `${formatNumber(displayTotalRate, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateTotalAll = document.getElementById("dash-coal-kpi-rate-total-all");
  if (elRateTotalAll) {
    if (isOnlyFiring) {
      elRateTotalAll.innerHTML = `<span class="text-emerald-400 font-bold">Chuẩn BC (Không tính sấy)</span>`;
    } else {
      elRateTotalAll.innerHTML = `K.tính sấy: <b class="text-emerald-300">${formatNumber(kpi.rate_total, 2, true)} kg/m²</b> (Khớp BC)`;
    }
  }

  const elCompWt = document.getElementById("dash-coal-kpi-comp-wt");
  if (elCompWt) elCompWt.innerText = `${formatNumber(kpi.compensation_weight, 0)} kg`;
  
  const elExcessWt = document.getElementById("dash-coal-kpi-excess-wt");
  if (elExcessWt) elExcessWt.innerText = `${formatNumber(kpi.excess_ash_weight, 0)} kg`;

  // Card 4: Production m2
  const elProdM2 = document.getElementById("dash-coal-kpi-prod-m2");
  if (elProdM2) elProdM2.innerHTML = `${formatNumber(kpi.production_m2, 0)} <span class="text-xs font-normal text-slate-400">m²</span>`;
  
  const elTotalUsed = document.getElementById("dash-coal-kpi-total-used");
  if (elTotalUsed) elTotalUsed.innerText = `${formatNumber(kpi.total_used_weight, 0)} kg`;

  const elTotalUsedAll = document.getElementById("dash-coal-kpi-total-used-all");
  if (elTotalUsedAll) elTotalUsedAll.innerText = `${formatNumber(kpi.total_used_all, 0)} kg`;
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
// TAB 4: ĐỊNH MỨC PHIÊN BẢN (VERSIONED NORMS - THEO DÒNG KT)
// ----------------------------------------------------
let normLineFilter = 'all'; // 'all', 'DC1', 'DC2'
let normSizeFilter = 'all'; // 'all', '30x60', '40x80', '50x50', '60x60'
let currentNormVersionsList = [];
let currentNormDetailsList = [];
let currentNormInfo = {};

// 1. SMART SLICERS LOGIC
function setNormLineFilter(line) {
  normLineFilter = line;
  
  // Update line slicer buttons UI
  ['all', 'DC1', 'DC2'].forEach(l => {
    const btn = document.getElementById(`btn-norm-line-${l}`);
    if (btn) {
      if (l === line) {
        btn.className = "norm-slicer-btn px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 text-white transition shadow";
      } else {
        btn.className = "norm-slicer-btn px-2.5 py-1 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 transition";
      }
    }
  });

  // Re-render Size buttons container based on Line
  const sizeContainer = document.getElementById("norm-size-buttons-container");
  if (sizeContainer) {
    if (line === 'DC1') {
      normSizeFilter = '30x60';
      sizeContainer.innerHTML = `
        <button onclick="setNormSizeFilter('all')" id="btn-norm-size-all" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 transition">Tất cả KT (DC1)</button>
        <button onclick="setNormSizeFilter('30x60')" id="btn-norm-size-30x60" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 text-white transition shadow">30x60 (300*600)</button>
      `;
    } else if (line === 'DC2') {
      if (normSizeFilter === '30x60') normSizeFilter = 'all';
      sizeContainer.innerHTML = `
        <button onclick="setNormSizeFilter('all')" id="btn-norm-size-all" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">Tất cả KT DC2</button>
        <button onclick="setNormSizeFilter('40x80')" id="btn-norm-size-40x80" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '40x80' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">40x80</button>
        <button onclick="setNormSizeFilter('50x50')" id="btn-norm-size-50x50" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '50x50' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">50x50</button>
        <button onclick="setNormSizeFilter('60x60')" id="btn-norm-size-60x60" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '60x60' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">60x60</button>
      `;
    } else {
      sizeContainer.innerHTML = `
        <button onclick="setNormSizeFilter('all')" id="btn-norm-size-all" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">Tất cả KT</button>
        <button onclick="setNormSizeFilter('30x60')" id="btn-norm-size-30x60" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '30x60' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">30x60</button>
        <button onclick="setNormSizeFilter('40x80')" id="btn-norm-size-40x80" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '40x80' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">40x80</button>
        <button onclick="setNormSizeFilter('50x50')" id="btn-norm-size-50x50" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '50x50' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">50x50</button>
        <button onclick="setNormSizeFilter('60x60')" id="btn-norm-size-60x60" class="norm-size-btn px-2.5 py-1 rounded text-xs font-bold ${normSizeFilter === '60x60' ? 'bg-emerald-600 text-white shadow' : 'bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400'} transition">60x60</button>
      `;
    }
  }

  updateNormFilterBadge();
  loadNormVersions();
}

function setNormSizeFilter(size) {
  normSizeFilter = size;
  
  // Update button active classes
  const buttons = document.querySelectorAll(".norm-size-btn");
  buttons.forEach(btn => {
    btn.className = "norm-size-btn px-2.5 py-1 rounded text-xs font-bold bg-[#09152b] border border-slate-700 text-slate-300 hover:border-emerald-400 transition";
  });
  const activeBtn = document.getElementById(`btn-norm-size-${size}`);
  if (activeBtn) {
    activeBtn.className = "norm-size-btn px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 text-white transition shadow";
  }

  updateNormFilterBadge();
  loadNormVersions();
}

function updateNormFilterBadge() {
  const badge = document.getElementById("norm-filter-badge");
  if (!badge) return;

  const lineText = normLineFilter === 'all' ? 'Tất cả DC' : normLineFilter;
  const sizeText = normSizeFilter === 'all' ? 'Tất cả Kích Thước' : `KT ${normSizeFilter}`;
  badge.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 inline mr-1 text-cyan-400"></i> Lọc: <b>${lineText}</b> • <b>${sizeText}</b>`;
  if (window.lucide) lucide.createIcons();
}

// 2. LOAD & RENDER NORM VERSIONS GRID
async function loadNormVersions() {
  try {
    const res = await fetch(`/api/norms/versions?line=${normLineFilter}&size=${normSizeFilter}`);
    const json = await res.json();
    currentNormVersionsList = json.data || [];
    
    renderNormVersionsGrid(currentNormVersionsList);

    // Populate copy-from select in modal
    const sel = document.getElementById("new-version-copy-from");
    if (sel) {
      sel.innerHTML = currentNormVersionsList.map(v => 
        `<option value="${v.id}">${v.version_code} - ${v.version_name} (${v.line || 'all'}/${v.size || 'all'})</option>`
      ).join("");
    }

    if (currentNormVersionsList.length > 0) {
      const matchCurrent = currentNormVersionsList.find(v => v.id === currentNormVersionId);
      const targetId = matchCurrent ? matchCurrent.id : currentNormVersionsList[0].id;
      loadNormDetails(targetId);
    } else {
      const tbody = document.getElementById("norm-details-body");
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Không có phiên bản định mức nào phù hợp với bộ lọc hiện tại. Hãy bấm <b>+ Tạo Phiên Bản Mới</b> hoặc <b>Nhập Excel Trích Xuất Bản Mới</b>.</td></tr>`;
      document.getElementById("current-norm-title").innerText = "Chưa chọn phiên bản định mức";
    }
  } catch (err) {
    console.error("Error loading norm versions:", err);
  }
}

// Smart decimal rounding: max 3 decimals for numbers >= 1, max 4 decimals for numbers < 1
function formatSmartDecimal(val) {
  if (val === undefined || val === null || val === "" || isNaN(val)) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
  if (isNaN(num)) return 0;
  if (num >= 1) {
    return parseFloat(num.toFixed(3));
  } else {
    return parseFloat(num.toFixed(4));
  }
}

async function deleteNormVersion(versionId, versionCode) {
  if (!versionId) return;
  if (!confirm(`Bạn có chắc chắn muốn xóa phiên bản định mức [${versionCode || 'này'}] không?\nToàn bộ các chỉ tiêu định mức thuộc phiên bản này sẽ bị xóa khỏi hệ thống.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/norms/versions?id=${versionId}`, {
      method: "DELETE"
    });
    const json = await res.json();
    if (json.success) {
      alert(`✓ Đã xóa thành công phiên bản [${versionCode || ''}]!`);
      if (currentNormVersionId === versionId) {
        currentNormVersionId = null;
      }
      loadNormVersions();
    } else {
      alert("Lỗi khi xóa phiên bản: " + (json.error || "Không thể xóa"));
    }
  } catch (err) {
    alert("Lỗi kết nối khi xóa phiên bản: " + err);
  }
}

function deleteCurrentNormVersion() {
  if (!currentNormVersionId || !currentNormInfo || !currentNormInfo.id) {
    alert("Vui lòng chọn 1 phiên bản định mức trước khi xóa!");
    return;
  }
  deleteNormVersion(currentNormVersionId, currentNormInfo.version_code || `Phiên bản #${currentNormVersionId}`);
}

function renderNormVersionsGrid(versions) {
  const grid = document.getElementById("norm-versions-grid");
  if (!grid) return;

  if (versions.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-6 text-center rounded-xl bg-[#091428] border border-dashed border-slate-700 text-slate-400 text-xs">
        Chưa có phiên bản định mức nào cho tiêu chí đang chọn (${normLineFilter} / ${normSizeFilter}).
      </div>
    `;
    return;
  }

  grid.innerHTML = versions.map(v => {
    const isSelected = v.id === currentNormVersionId;
    const lineLabel = v.line && v.line !== 'all' ? v.line : 'Chung 2 DC';
    const sizeLabel = v.size && v.size !== 'all' ? v.size : (v.line === 'DC1' ? '30x60' : 'Đa KT');
    const itemsCount = v.filtered_item_count !== undefined ? v.filtered_item_count : (v.item_count || 0);

    return `
      <div onclick="loadNormDetails(${v.id})" class="p-4 rounded-xl border cursor-pointer transition transform hover:-translate-y-0.5 relative group ${isSelected ? 'bg-gradient-to-br from-blue-900/40 to-[#0f2042] border-blue-400 shadow-xl ring-1 ring-blue-500/50' : 'bg-[#0f2042] border-[#1e3a6a]/60 hover:border-blue-400/50 shadow-md'}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono text-xs font-black border border-blue-400/30">${v.version_code}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${v.line === 'DC1' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800' : (v.line === 'DC2' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300')}">${lineLabel} • ${sizeLabel}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">T${v.effective_from_month}/${v.effective_from_year}</span>
            <button onclick="event.stopPropagation(); deleteNormVersion(${v.id}, '${v.version_code.replace(/'/g, "\\'")}')" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition border border-transparent hover:border-rose-700/50" title="Xóa phiên bản ${v.version_code}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-400"></i>
            </button>
          </div>
        </div>
        <h4 class="text-xs font-bold text-white mb-1 leading-snug">${v.version_name}</h4>
        <p class="text-[11px] text-slate-400 line-clamp-2">${v.description || 'Không có ghi chú'}</p>
        <div class="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
          <span class="font-semibold text-slate-300"><i data-lucide="list" class="w-3.5 h-3.5 inline mr-1 text-cyan-400"></i> ${itemsCount} chỉ tiêu</span>
          <span class="${isSelected ? 'text-emerald-300 font-bold' : 'text-slate-400'}">${isSelected ? 'Đang chọn xem ✓' : 'Xem chi tiết →'}</span>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// 3. LOAD & RENDER NORM DETAILS TABLE
async function loadNormDetails(versionId) {
  currentNormVersionId = versionId;
  try {
    const res = await fetch(`/api/norms/details?version_id=${versionId}&line=${normLineFilter}&size=${normSizeFilter}`);
    const json = await res.json();
    currentNormInfo = json.version || {};
    currentNormDetailsList = json.details || [];

    // Update Header and Badges
    const lineLabel = currentNormInfo.line && currentNormInfo.line !== 'all' ? currentNormInfo.line : (normLineFilter !== 'all' ? normLineFilter : 'Chung');
    const sizeLabel = currentNormInfo.size && currentNormInfo.size !== 'all' ? currentNormInfo.size : (normSizeFilter !== 'all' ? normSizeFilter : 'Đa KT');

    const titleEl = document.getElementById("current-norm-title");
    if (titleEl) {
      titleEl.innerText = `Chi tiết định mức: ${currentNormInfo.version_code || 'V1'} - ${currentNormInfo.version_name || ''}`;
    }

    const badgeEl = document.getElementById("current-norm-line-badge");
    if (badgeEl) {
      badgeEl.innerText = `${lineLabel} · ${sizeLabel} (Hiệu lực: T${currentNormInfo.effective_from_month || 1}/${currentNormInfo.effective_from_year || 2026})`;
    }

    renderNormDetailsTable(currentNormDetailsList);
    renderNormVersionsGrid(currentNormVersionsList); // re-highlight selected
  } catch (err) {
    console.error("Error loading norm details:", err);
  }
}

function renderNormDetailsTable(rows) {
  const tbody = document.getElementById("norm-details-body");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Chưa có chỉ tiêu định mức nào. Hãy bấm <b>+ Thêm 1 Chỉ Tiêu</b> hoặc tải file Excel để nạp hàng loạt.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((d, idx) => {
    const val = formatSmartDecimal(d.norm_value);
    return `
    <tr class="hover:bg-[#13284d]/50 transition border-b border-[#1e3a6a]/30">
      <td class="p-2.5 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
      <td class="p-2.5 font-bold text-white">${d.material_name}</td>
      <td class="p-2.5 text-center font-bold ${d.line === 'DC1' ? 'text-cyan-400' : 'text-amber-400'}">
        <span class="px-2 py-0.5 rounded text-[11px] ${d.line === 'DC1' ? 'bg-cyan-950 border border-cyan-800' : 'bg-amber-950 border border-amber-800'}">${d.line}</span>
      </td>
      <td class="p-2.5 text-center text-slate-300 font-semibold">${d.size}</td>
      <td class="p-2.5 text-center text-slate-400">${d.unit}</td>
      <td class="p-2.5 text-right">
        <input type="number" step="0.0001" value="${val}" data-item-id="${d.id}" class="norm-input-field w-32 bg-[#091428] border border-blue-500/30 text-xs font-mono font-bold text-cyan-300 px-2.5 py-1 rounded text-right focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
      </td>
      <td class="p-2.5 text-center">
        <button onclick="deleteNormItem(${d.id}, '${d.material_name.replace(/'/g, "\\'")}')" class="norm-delete-btn p-1 rounded hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 transition" title="Xóa chỉ tiêu này">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    </tr>
  `;
  }).join("");

  if (window.lucide) lucide.createIcons();
  applyRolePermissions();
}

function filterNormMaterialList(keyword) {
  if (!keyword || !keyword.trim()) {
    renderNormDetailsTable(currentNormDetailsList);
    return;
  }
  const term = keyword.toLowerCase().trim();
  const filtered = currentNormDetailsList.filter(d => 
    (d.material_name && d.material_name.toLowerCase().includes(term)) ||
    (d.line && d.line.toLowerCase().includes(term)) ||
    (d.size && d.size.toLowerCase().includes(term)) ||
    (d.unit && d.unit.toLowerCase().includes(term))
  );
  renderNormDetailsTable(filtered);
}

// 4. SAVE NORM DETAILS (CHẾ ĐỘ NHẬP TAY)
async function saveNormDetails() {
  const inputs = document.querySelectorAll(".norm-input-field");
  const items = [];
  inputs.forEach(inp => {
    const itemId = parseInt(inp.getAttribute("data-item-id"));
    if (itemId) {
      items.push({
        id: itemId,
        norm_value: parseFloat(inp.value || 0)
      });
    }
  });

  if (items.length === 0) {
    alert("Không có chỉ tiêu nào để lưu!");
    return;
  }

  try {
    const res = await fetch("/api/norms/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: currentNormVersionId, items: items })
    });
    const json = await res.json();
    if (json.success) {
      alert("✓ " + (json.message || "Đã lưu thay đổi định mức thành công!"));
      loadNormDetails(currentNormVersionId);
    } else {
      alert("Lỗi: " + (json.error || "Không thể lưu định mức"));
    }
  } catch (err) {
    alert("Lỗi kết nối khi lưu định mức: " + err);
  }
}

// 5. DOWNLOAD EXCEL TEMPLATE (TẢI FILE MẪU EXCEL .XLSX CHUẨN TCVN)
function downloadNormTemplateExcel() {
  const line = (normLineFilter !== 'all') ? normLineFilter : (document.getElementById("new-version-line")?.value || "DC1");
  let size = (normSizeFilter !== 'all') ? normSizeFilter : (document.getElementById("new-version-size")?.value || (line === 'DC1' ? '30x60' : '40x80'));

  let sampleRows = [];
  if (line === "DC1") {
    sampleRows = [
      [1, "Xương SP 30x60 (DC1)", "DC1", "30x60", "Kg", 19.04, "Định mức xương thô DC1"],
      [2, "Men EWB (Men lót)", "DC1", "30x60", "Kg", 0.456, "Men lót DC1"],
      [3, "Men EWM (Men phủ)", "DC1", "30x60", "Kg", 0.383, "Men phủ DC1"],
      [4, "Men EWP", "DC1", "30x60", "Kg", 0.520, "Men lót phủ"],
      [5, "Men GWB", "DC1", "30x60", "Kg", 0.434, "Men bóng"],
      [6, "Men GWM", "DC1", "30x60", "Kg", 0.434, "Men mờ"],
      [7, "Men GWP", "DC1", "30x60", "Kg", 0.520, "Men in"],
      [8, "Bao bì", "DC1", "30x60", "Cái", 0.697, "Vỏ thùng hộp"],
      [9, "Nan Nẹp", "DC1", "30x60", "Cái", 0.0472, "Nan nẹp bảo vệ"],
      [10, "Pallet", "DC1", "30x60", "Cái", 0.0118, "Palet đóng hàng"],
      [11, "Màng co PE khổ 500mm", "DC1", "30x60", "Kg", 0.0034, "Màng co bọc kiện"],
      [12, "Vỏ Điều", "DC1", "30x60", "Kg", 1.650, "Chất trợ cháy"],
      [13, "Bi cao nhôm (Grand)", "DC1", "30x60", "Kg", 0.0020, "Bi nghiền"],
      [14, "Bi cao nhôm (Luxury)", "DC1", "30x60", "Kg", 0.0028, "Bi nghiền"],
      [15, "Bi trung nhôm", "DC1", "30x60", "Kg", 0.0433, "Bi nghiền"],
      [16, "Dây đai hộp", "DC1", "30x60", "Kg", 0.0082, "Dây đai máy"],
      [17, "Dây đai pét", "DC1", "30x60", "Cái", 0.0064, "Dây đai kiện"],
      [18, "Ke góc", "DC1", "30x60", "Kg", 0.0371, "Ke góc hộp"],
      [19, "Than cục nung", "DC1", "30x60", "Kg", 0.582, "Tiêu hao than cục"],
      [20, "Than cám nung", "DC1", "30x60", "Kg", 0.045, "Tiêu hao than cám"]
    ];
  } else {
    sampleRows = [
      [1, "XƯƠNG DC2", "DC2", size, "Kg", 21.65, "Định mức xương DC2"],
      [2, "Men E Lót Bóng", "DC2", size, "Kg", 0.436, "Men lót DC2"],
      [3, "Men G Lát Bóng", "DC2", size, "Kg", 0.389, "Men phủ bóng DC2"],
      [4, "Men E MATT", "DC2", size, "Kg", 0.319, "Men lót mờ"],
      [5, "Men MATT", "DC2", size, "Kg", 0.319, "Men phủ mờ"],
      [6, "Bã điều", "DC2", size, "Kg", 1.84, "Chất trợ cháy"],
      [7, "Bi trung nhôm", "DC2", size, "Kg", 0.027, "Bi nghiền"],
      [8, "Bi cao nhôm", "DC2", size, "Kg", 0.0023, "Bi nghiền"],
      [9, "Ke góc", "DC2", size, "Kg", 0.022, "Ke bảo vệ góc"],
      [10, "Màng co", "DC2", size, "Kg", 0.0049, "Màng co"],
      [11, "Dây đai vỏ hộp (Dây đai máy)", "DC2", size, "Kg", 0.0109, "Dây đai hộp"],
      [12, "Dây đai Pet (Dây đai tay)", "DC2", size, "Kg", 0.0053, "Dây đai kiện"],
      [13, "Bao bì", "DC2", size, "Cái", 0.557, "Vỏ bao bì"],
      [14, "Palet", "DC2", size, "Cái", 0.0154, "Palet đóng gạch"],
      [15, "Than cục nung", "DC2", size, "Kg", 0.612, "Tiêu hao than cục DC2"],
      [16, "Than cám nung", "DC2", size, "Kg", 0.052, "Tiêu hao than cám DC2"]
    ];
  }

  // Generate real .XLSX via SheetJS
  if (window.XLSX) {
    const now = new Date();
    const dateStr = `Đồng Nai, ngày ${now.getDate()} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

    const wsData = [
      ["CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM", "", "", "", "", "", ""],
      ["PHÂN XƯỞNG SẢN XUẤT MEN & XƯƠNG", "", "", "", "", "", ""],
      ["BẢNG ĐỊNH MỨC TIÊU HAO NGUYÊN LIỆU, MEN, XƯƠNG VÀ VẬT TƯ (MẪU CHUẨN)", "", "", "", "", "", ""],
      [`Dây Chuyền: ${line} · Kích Thước: ${size} - Áp dụng năm 2026`, "", "", "", "", "", ""],
      [],
      ["STT", "TÊN NGUYÊN VẬT TƯ", "DÂY CHUYỀN", "KÍCH THƯỚC", "ĐƠN VỊ TÍNH", "ĐỊNH MỨC QUY ĐỊNH (Kg/m²)", "GHI CHÚ"],
      ...sampleRows,
      [],
      ["", "", "", "", dateStr, "", ""],
      ["NGƯỜI LẬP BIỂU", "", "TRƯỞNG PHÒNG KTCN", "", "QUẢN ĐỐC PHÂN XƯỞNG", "TỔNG GIÁM ĐỐC PHÊ DUYỆT", ""],
      ["(Ký & ghi rõ họ tên)", "", "(Ký & ghi rõ họ tên)", "", "(Ký & ghi rõ họ tên)", "(Ký & đóng dấu)", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const sigRow = 6 + sampleRows.length + 2;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: sigRow - 1, c: 4 }, e: { r: sigRow - 1, c: 6 } },
      { s: { r: sigRow, c: 0 }, e: { r: sigRow, c: 1 } },
      { s: { r: sigRow, c: 2 }, e: { r: sigRow, c: 3 } },
      { s: { r: sigRow, c: 4 }, e: { r: sigRow, c: 4 } },
      { s: { r: sigRow, c: 5 }, e: { r: sigRow, c: 6 } },
      { s: { r: sigRow + 1, c: 0 }, e: { r: sigRow + 1, c: 1 } },
      { s: { r: sigRow + 1, c: 2 }, e: { r: sigRow + 1, c: 3 } },
      { s: { r: sigRow + 1, c: 4 }, e: { r: sigRow + 1, c: 4 } },
      { s: { r: sigRow + 1, c: 5 }, e: { r: sigRow + 1, c: 6 } }
    ];

    ws['!cols'] = [
      { wch: 8 },
      { wch: 38 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 28 }
    ];

    // Format numbers
    for (let R = 6; R < 6 + sampleRows.length; ++R) {
      const sttCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
      if (sttCell) sttCell.t = 'n';

      const normCell = ws[XLSX.utils.encode_cell({ r: R, c: 5 })];
      if (normCell && typeof normCell.v === 'number') {
        normCell.t = 'n';
        normCell.z = (normCell.v < 1) ? "0.0000" : "0.000";
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dinh_Muc_Mau");
    XLSX.writeFile(wb, `Mau_Dinh_Muc_${line}_${size}_2026.xlsx`);
  } else {
    alert("Thư viện Excel đang tải, vui lòng thử lại sau 2 giây!");
  }
}

// 6. EXPORT CURRENT NORM TABLE TO EXCEL (.XLSX CHUẨN TCVN)
function exportCurrentNormTableExcel() {
  if (!currentNormDetailsList || currentNormDetailsList.length === 0) {
    alert("Không có dữ liệu định mức để xuất Excel!");
    return;
  }

  const verCode = currentNormInfo.version_code || "DM";
  const verName = currentNormInfo.version_name || "Định mức tiêu hao";
  const m = currentNormInfo.effective_from_month || 1;
  const y = currentNormInfo.effective_from_year || 2026;
  const lineLabel = currentNormInfo.line || normLineFilter || "Chung";
  const sizeLabel = currentNormInfo.size || normSizeFilter || "Đa KT";

  if (window.XLSX) {
    const dataRows = currentNormDetailsList.map((d, idx) => [
      idx + 1,
      d.material_name,
      d.line,
      d.size,
      d.unit,
      formatSmartDecimal(d.norm_value),
      ""
    ]);

    const now = new Date();
    const dateStr = `Đồng Nai, ngày ${now.getDate()} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

    const wsData = [
      ["CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM", "", "", "", "", "", ""],
      ["PHÂN XƯỞNG SẢN XUẤT MEN & XƯƠNG", "", "", "", "", "", ""],
      ["BẢNG ĐỊNH MỨC TIÊU HAO NGUYÊN LIỆU XƯƠNG, MEN, VẬT TƯ", "", "", "", "", "", ""],
      [`Phiên Bản: ${verCode} - ${verName}`, "", "", "", "", "", ""],
      [`Dây Chuyền: ${lineLabel} · Kích Thước: ${sizeLabel} - Hiệu lực: Tháng ${m}/${y}`, "", "", "", "", "", ""],
      [],
      ["STT", "TÊN NGUYÊN VẬT TƯ", "DÂY CHUYỀN", "KÍCH THƯỚC", "ĐƠN VỊ TÍNH", "ĐỊNH MỨC QUY ĐỊNH (Kg/m²)", "GHI CHÚ"],
      ...dataRows,
      [],
      ["", "", "", "", dateStr, "", ""],
      ["NGƯỜI LẬP BIỂU", "", "TRƯỞNG PHÒNG KTCN", "", "QUẢN ĐỐC PHÂN XƯỞNG", "TỔNG GIÁM ĐỐC PHÊ DUYỆT", ""],
      ["(Ký & ghi rõ họ tên)", "", "(Ký & ghi rõ họ tên)", "", "(Ký & ghi rõ họ tên)", "(Ký & đóng dấu)", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const sigRow = 7 + dataRows.length + 2;

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // PHÂN XƯỞNG SẢN XUẤT MEN & XƯƠNG
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // BẢNG ĐỊNH MỨC TIÊU HAO...
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Phiên Bản
      { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }, // Dây Chuyền · Kích Thước
      { s: { r: sigRow - 1, c: 4 }, e: { r: sigRow - 1, c: 6 } }, // Ngày tháng năm
      { s: { r: sigRow, c: 0 }, e: { r: sigRow, c: 1 } }, // Người lập biểu
      { s: { r: sigRow, c: 2 }, e: { r: sigRow, c: 3 } }, // Trưởng phòng KTCN
      { s: { r: sigRow, c: 4 }, e: { r: sigRow, c: 4 } }, // Quản đốc
      { s: { r: sigRow, c: 5 }, e: { r: sigRow, c: 6 } }, // Tổng Giám Đốc
      { s: { r: sigRow + 1, c: 0 }, e: { r: sigRow + 1, c: 1 } },
      { s: { r: sigRow + 1, c: 2 }, e: { r: sigRow + 1, c: 3 } },
      { s: { r: sigRow + 1, c: 4 }, e: { r: sigRow + 1, c: 4 } },
      { s: { r: sigRow + 1, c: 5 }, e: { r: sigRow + 1, c: 6 } }
    ];

    ws['!cols'] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 28 }
    ];

    // Format numbers
    for (let R = 7; R < 7 + dataRows.length; ++R) {
      const sttCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
      if (sttCell) sttCell.t = 'n';

      const normCell = ws[XLSX.utils.encode_cell({ r: R, c: 5 })];
      if (normCell && typeof normCell.v === 'number') {
        normCell.t = 'n';
        normCell.z = (normCell.v < 1) ? "0.0000" : "0.000";
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bang_Dinh_Muc");
    XLSX.writeFile(wb, `Bang_Dinh_Muc_${verCode}_${lineLabel}_${sizeLabel}.xlsx`);
  } else {
    alert("Thư viện Excel đang tải, vui lòng thử lại sau 2 giây!");
  }
}

// 7. AUTO-EXTRACT FROM EXCEL FILE (CHUYÊN GIA BÓC TÁCH TỜ TRÌNH & EXCEL NHÀ MÁY)
function triggerImportNormExcel() {
  const fileInput = document.getElementById("norm-quick-excel-file");
  if (fileInput) fileInput.click();
}

async function parseNormExcelFile(file, targetLine, targetSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (window.XLSX && !file.name.endsWith(".csv")) {
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          if (!rawRows || rawRows.length < 2) {
            reject("File Excel không có đủ dữ liệu hàng!");
            return;
          }

          let detectedLine = targetLine;
          let detectedSize = targetSize;

          // 1. Quét 20 dòng đầu để nhận diện Dây chuyền & Kích thước từ Tiêu đề Tờ trình
          for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const rowStr = rawRows[i].map(c => String(c || '').trim()).join(" ").toLowerCase();
            if (rowStr.includes("600x600") || rowStr.includes("600*600") || rowStr.includes("60x60")) {
              detectedSize = "60x60";
              detectedLine = "DC2";
            } else if (rowStr.includes("400x800") || rowStr.includes("400*800") || rowStr.includes("40x80")) {
              detectedSize = "40x80";
              detectedLine = "DC2";
            } else if (rowStr.includes("500x500") || rowStr.includes("500*500") || rowStr.includes("50x50")) {
              detectedSize = "50x50";
              detectedLine = "DC2";
            } else if (rowStr.includes("300x600") || rowStr.includes("300*600") || rowStr.includes("30x60")) {
              detectedSize = "30x60";
              detectedLine = "DC1";
            }
            if (rowStr.includes("dc1") || rowStr.includes("dây chuyền 1")) detectedLine = "DC1";
            if (rowStr.includes("dc2") || rowStr.includes("dây chuyền 2")) detectedLine = "DC2";
          }

          // 2. Định vị chính xác Dòng Tiêu Đề Cột Bảng (Header Row)
          let headerRowIdx = -1;
          let nameCol = -1;
          let normCol = -1;
          let unitCol = -1;
          let lineCol = -1;
          let sizeCol = -1;

          for (let i = 0; i < Math.min(25, rawRows.length); i++) {
            const row = rawRows[i].map(c => String(c || '').toLowerCase().trim());
            const nIdx = row.findIndex(c => 
              c.includes("tên nguyên liệu") || 
              c.includes("tên vật tư") || 
              c.includes("nguyên liệu, vật tư") || 
              c.includes("nguyên vật tư") || 
              c.includes("tên nguyên vật tư") || 
              c.includes("material")
            );

            if (nIdx !== -1) {
              headerRowIdx = i;
              nameCol = nIdx;

              // Ghép chuỗi tiêu đề đa dòng (cho header gộp dòng 10-12)
              const maxCols = Math.max(...rawRows.slice(Math.max(0, i - 1), Math.min(rawRows.length, i + 3)).map(r => r.length));
              const combinedHeaders = [];
              for (let c = 0; c < maxCols; c++) {
                let cellTexts = [];
                for (let r = Math.max(0, i - 1); r <= Math.min(rawRows.length - 1, i + 2); r++) {
                  if (rawRows[r] && rawRows[r][c]) {
                    cellTexts.push(String(rawRows[r][c]).toLowerCase().trim());
                  }
                }
                combinedHeaders[c] = cellTexts.join(" ");
              }

              // Ưu tiên 1: Cột "ĐM Khoán", "Định mức khoán", "Khoán", "ĐM (kg/m2)"
              let bestNorm = -1;
              for (let c = 0; c < combinedHeaders.length; c++) {
                const txt = combinedHeaders[c];
                if (txt.includes("đm khoán") || txt.includes("định mức khoán") || txt.includes("khoán") || txt.includes("đm (kg/m2)") || txt.includes("đm (kg/m²)") || txt.includes("đm (kg/m)")) {
                  bestNorm = c;
                  break;
                }
              }

              // Ưu tiên 2: Cột "Định mức quy định", "Định mức", "Norm"
              if (bestNorm === -1) {
                for (let c = 0; c < combinedHeaders.length; c++) {
                  const txt = combinedHeaders[c];
                  if (txt.includes("định mức quy định") || txt.includes("định mức") || txt.includes("norm") || txt.includes("sd thực tế")) {
                    bestNorm = c;
                    break;
                  }
                }
              }

              normCol = bestNorm;
              unitCol = combinedHeaders.findIndex(c => c.includes("đvt") || c.includes("đơn vị"));
              lineCol = combinedHeaders.findIndex(c => c.includes("dây chuyền") || c.includes("line"));
              sizeCol = combinedHeaders.findIndex(c => c.includes("kích thước") || c.includes("size"));

              break;
            }
          }

          if (headerRowIdx === -1 || nameCol === -1) {
            reject("Không tìm thấy dòng tiêu đề cột 'Tên nguyên liệu, vật tư' trong file Excel!");
            return;
          }

          // 3. Danh sách từ khóa DỪNG QUÉT (Footer / Ký tên / Nơi gửi)
          const stopKeywords = [
            "kính trình", "tổng giám đốc", "ban tổng giám đốc", "nơi gửi", 
            "lưu:", "p.ktcn", "pxsx", "p.khth", "p kế toán", "kế toán", 
            "phê duyệt", "đồng nai,", "ngày 0", "ngày 1", "ngày 2", "ngày 3", "gửi các phó",
            "nơi nhận", "thủ kho", "người lập", "trưởng phòng"
          ];

          const items = [];
          for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            const rawName = String(row[nameCol] || '').trim();
            const fullRowStr = row.map(c => String(c || '').toLowerCase().trim()).join(" ");

            // Kiểm tra điểm dừng kết thúc bảng
            if (stopKeywords.some(kw => fullRowStr.includes(kw) || rawName.toLowerCase().includes(kw))) {
              break;
            }

            // Bỏ qua dòng trống, dòng header lặp lại, hoặc dòng ghi chú nơi gửi
            if (!rawName || rawName.length < 2) continue;
            if (rawName.toLowerCase().includes("tên nguyên liệu") || rawName.toLowerCase().includes("tổng cộng") || rawName.toLowerCase().includes("cộng")) continue;
            if (/^\d+$/.test(rawName)) continue; // bỏ qua nếu tên chỉ là số STT thuần túy
            if (rawName.startsWith("-") && (rawName.toLowerCase().includes("tgđ") || rawName.toLowerCase().includes("lưu") || rawName.toLowerCase().includes("pxsx") || rawName.toLowerCase().includes("phó") || rawName.toLowerCase().includes("ktcn") || rawName.toLowerCase().includes("kế toán"))) continue;

            // Bóc tách giá trị Định Mức Chuẩn
            let normVal = 0;
            if (normCol !== -1 && row[normCol] !== undefined && row[normCol] !== "") {
              const strVal = String(row[normCol]).replace(/,/g, '.').trim();
              const parsed = parseFloat(strVal);
              if (!isNaN(parsed)) normVal = parsed;
            }

            // Nếu ô normCol rỗng (do merge cell), tìm ô số thực dương đầu tiên sau cột tên vật tư
            if (normVal === 0) {
              for (let c = nameCol + 1; c < row.length; c++) {
                const cellStr = String(row[c] || '').replace(/,/g, '.').trim();
                const p = parseFloat(cellStr);
                if (!isNaN(p) && p > 0 && p < 1000) {
                  normVal = p;
                }
              }
            }

            // Làm tròn thông minh: Số >= 1 lấy tối đa 3 số thập phân, số < 1 lấy tối đa 4 số thập phân
            normVal = formatSmartDecimal(normVal);

            // Xác định Đơn Vị Tính (ĐVT)
            let unitVal = "Kg";
            const lowerName = rawName.toLowerCase();
            if (unitCol !== -1 && row[unitCol] && String(row[unitCol]).trim().length > 0) {
              unitVal = String(row[unitCol]).trim();
            } else {
              if (lowerName.includes("bao bì") || lowerName.includes("palet") || lowerName.includes("pallet") || lowerName.includes("nan nẹp") || lowerName.includes("hộp") || lowerName.includes("dây đai pét")) {
                unitVal = "Cái";
              } else if (lowerName.includes("m2") || lowerName.includes("m²")) {
                unitVal = "m²";
              }
            }

            const rowLine = lineCol !== -1 && row[lineCol] ? String(row[lineCol]).trim() : detectedLine;
            const rowSize = sizeCol !== -1 && row[sizeCol] ? String(row[sizeCol]).trim() : detectedSize;

            items.push({
              material_name: rawName,
              line: rowLine || detectedLine,
              size: rowSize || detectedSize,
              unit: unitVal,
              norm_value: normVal
            });
          }

          if (items.length === 0) {
            reject("Không bóc tách được dòng vật tư hợp lệ nào từ bảng!");
            return;
          }

          resolve({ items: items, detectedLine: detectedLine, detectedSize: detectedSize });
        } catch (err) {
          reject("Lỗi khi đọc file Excel: " + err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject("Vui lòng tải lên file Excel (.xlsx hoặc .xls)");
    }
  });
}

// Quick Import directly from toolbar button
async function importNormVersionFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const targetLine = normLineFilter !== 'all' ? normLineFilter : 'DC1';
  const targetSize = normSizeFilter !== 'all' ? normSizeFilter : (targetLine === 'DC1' ? '30x60' : '40x80');

  try {
    const parseResult = await parseNormExcelFile(file, targetLine, targetSize);
    const items = parseResult.items || [];
    const line = parseResult.detectedLine || targetLine;
    const size = parseResult.detectedSize || targetSize;

    if (!items || items.length === 0) {
      alert("Không trích xuất được chỉ tiêu nào từ file Excel!");
      return;
    }

    // Auto calculate next version code
    const basePrefix = `DM-${line}-${size}`;
    let maxV = 1;
    currentNormVersionsList.forEach(v => {
      if (v.version_code && v.version_code.startsWith(basePrefix)) {
        const match = v.version_code.match(/V(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= maxV) maxV = num + 1;
        }
      }
    });

    const newCode = `${basePrefix}-V${maxV}`;
    const newName = `Định mức trích xuất tự động ${line} ${size} (V${maxV})`;
    const currentMonth = 9; // T9/2026

    const res = await fetch("/api/norms/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_code: newCode,
        version_name: newName,
        effective_from_month: currentMonth,
        effective_from_year: 2026,
        line: line,
        size: size,
        description: `Tự động trích xuất từ file: ${file.name} (${items.length} chỉ tiêu)`,
        items: items
      })
    });

    const json = await res.json();
    if (json.success) {
      alert(`🎉 Đã trích xuất thành công ${items.length} chỉ tiêu vật tư!\nTạo phiên bản mới: ${newCode} (Hiệu lực: T${currentMonth}/2026)`);
      if (json.version_id) currentNormVersionId = json.version_id;
      loadNormVersions();
    } else {
      alert("Lỗi khi tạo phiên bản mới: " + (json.error || "Không rõ lỗi"));
    }
  } catch (err) {
    alert("Lỗi trích xuất: " + err);
  } finally {
    event.target.value = ""; // reset input
  }
}

// Real-time Excel file reader and preview inside modal
let modalParsedNormItems = [];

async function onModalNormFileChange(event) {
  const file = event.target.files[0];
  const previewBox = document.getElementById("modal-norm-preview-box");
  const fileNameEl = document.getElementById("modal-norm-preview-filename");
  const countEl = document.getElementById("modal-norm-preview-count");
  const itemsEl = document.getElementById("modal-norm-preview-items");

  if (!file) {
    if (previewBox) previewBox.classList.add("hidden");
    modalParsedNormItems = [];
    return;
  }

  const line = document.getElementById("new-version-line")?.value || "DC1";
  const size = document.getElementById("new-version-size")?.value || "30x60";

  try {
    const parseResult = await parseNormExcelFile(file, line, size);
    modalParsedNormItems = parseResult.items || [];

    // Auto sync detected line & size to dropdowns
    if (parseResult.detectedLine) {
      const lineEl = document.getElementById("new-version-line");
      if (lineEl && lineEl.value !== parseResult.detectedLine) {
        lineEl.value = parseResult.detectedLine;
        onModalNormLineChange();
      }
    }
    if (parseResult.detectedSize) {
      const sizeEl = document.getElementById("new-version-size");
      if (sizeEl) {
        sizeEl.value = parseResult.detectedSize;
        onModalNormSizeChange();
      }
    }

    if (previewBox && fileNameEl && countEl && itemsEl) {
      previewBox.classList.remove("hidden");
      fileNameEl.innerHTML = `<i data-lucide="file-check" class="w-3.5 h-3.5 inline text-emerald-400 mr-1"></i> File: <b>${file.name}</b> (${parseResult.detectedLine || line} - ${parseResult.detectedSize || size})`;
      countEl.innerText = `${modalParsedNormItems.length} chỉ tiêu vật tư`;
      
      const sampleItems = modalParsedNormItems.slice(0, 6).map((it, idx) => 
        `<div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-800">
           <span class="text-slate-200">${idx + 1}. <b>${it.material_name}</b> <span class="text-slate-400 font-normal">(${it.unit})</span></span>
           <span class="text-cyan-300 font-bold font-mono text-xs bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">${it.norm_value}</span>
         </div>`
      ).join("");
      
      const moreText = modalParsedNormItems.length > 6 ? `<div class="text-[10px] text-slate-400 italic pt-1 text-center font-medium">+ và ${modalParsedNormItems.length - 6} chỉ tiêu khác đã bóc tách thành công...</div>` : '';
      itemsEl.innerHTML = sampleItems + moreText;
      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    if (previewBox) previewBox.classList.add("hidden");
    modalParsedNormItems = [];
    alert("Lỗi khi đọc file Excel: " + err);
  }
}

// 8. MODAL DUAL-MODE CONTROLLER
function openCreateVersionModal() {
  const line = normLineFilter !== 'all' ? normLineFilter : 'DC1';
  const size = normSizeFilter !== 'all' ? normSizeFilter : (line === 'DC1' ? '30x60' : '40x80');

  const lineSel = document.getElementById("new-version-line");
  if (lineSel) lineSel.value = line;

  onModalNormLineChange();

  const sizeSel = document.getElementById("new-version-size");
  if (sizeSel) sizeSel.value = size;

  onModalNormSizeChange();

  // Reset file input & preview
  const fileInp = document.getElementById("modal-norm-file");
  if (fileInp) fileInp.value = "";
  const previewBox = document.getElementById("modal-norm-preview-box");
  if (previewBox) previewBox.classList.add("hidden");
  modalParsedNormItems = [];

  const errBox = document.getElementById("new-version-error-msg");
  if (errBox) errBox.classList.add("hidden");

  switchCreateNormMode('excel');
  document.getElementById("modal-create-version").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function switchCreateNormMode(mode) {
  const modeInp = document.getElementById("new-version-mode");
  if (modeInp) modeInp.value = mode;

  const btnExcel = document.getElementById("btn-norm-mode-excel");
  const btnManual = document.getElementById("btn-norm-mode-manual");
  const boxExcel = document.getElementById("modal-norm-box-excel");
  const boxManual = document.getElementById("modal-norm-box-manual");
  const submitText = document.getElementById("btn-submit-create-version-text");

  if (mode === 'excel') {
    if (btnExcel) btnExcel.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-teal-600 text-white shadow";
    if (btnManual) btnManual.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-300 hover:bg-[#112348] hover:text-white";
    if (boxExcel) boxExcel.classList.remove("hidden");
    if (boxManual) boxManual.classList.add("hidden");
    if (submitText) submitText.innerText = "Trích Xuất & Tạo Phiên Bản";
  } else {
    if (btnExcel) btnExcel.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-300 hover:bg-[#112348] hover:text-white";
    if (btnManual) btnManual.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow";
    if (boxExcel) boxExcel.classList.add("hidden");
    if (boxManual) boxManual.classList.remove("hidden");
    if (submitText) submitText.innerText = "Tạo & Kế Thừa Bản Cũ";
  }
}

function onModalNormLineChange() {
  const lineSel = document.getElementById("new-version-line");
  const sizeSel = document.getElementById("new-version-size");
  if (!lineSel || !sizeSel) return;

  const line = lineSel.value;
  if (line === "DC1") {
    sizeSel.innerHTML = `
      <option value="30x60" selected>30x60 (300x600 mm)</option>
    `;
  } else {
    sizeSel.innerHTML = `
      <option value="40x80" selected>40x80 (400x800 mm)</option>
      <option value="50x50">50x50 (500x500 mm)</option>
      <option value="60x60">60x60 (600x600 mm)</option>
    `;
  }
  onModalNormSizeChange();
}

function onModalNormSizeChange() {
  const line = document.getElementById("new-version-line")?.value || "DC1";
  const size = document.getElementById("new-version-size")?.value || "30x60";

  // Calculate next version code
  const basePrefix = `DM-${line}-${size}`;
  let maxV = 1;
  currentNormVersionsList.forEach(v => {
    if (v.version_code && v.version_code.startsWith(basePrefix)) {
      const match = v.version_code.match(/V(\d+)/i);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= maxV) maxV = num + 1;
      }
    }
  });

  const codeInp = document.getElementById("new-version-code");
  const nameInp = document.getElementById("new-version-name");
  if (codeInp) codeInp.value = `${basePrefix}-V${maxV}`;
  if (nameInp) nameInp.value = `Định mức ${line} kích thước ${size} (Phiên bản ${maxV})`;
}

async function submitCreateVersion() {
  const mode = document.getElementById("new-version-mode")?.value || "excel";
  const code = document.getElementById("new-version-code")?.value.trim();
  const name = document.getElementById("new-version-name")?.value.trim();
  const month = parseInt(document.getElementById("new-version-month")?.value || "9");
  const year = parseInt(document.getElementById("new-version-year")?.value || "2026");
  const line = document.getElementById("new-version-line")?.value || "DC1";
  const size = document.getElementById("new-version-size")?.value || "30x60";
  const desc = document.getElementById("new-version-desc")?.value.trim() || "";
  const errBox = document.getElementById("new-version-error-msg");

  if (!code || !name) {
    if (errBox) {
      errBox.classList.remove("hidden");
      errBox.innerText = "Vui lòng nhập đầy đủ Mã và Tên phiên bản!";
    } else {
      alert("Vui lòng nhập đầy đủ Mã và Tên phiên bản!");
    }
    return;
  }

  if (errBox) errBox.classList.add("hidden");

  let items = [];

  if (mode === "excel") {
    if (modalParsedNormItems && modalParsedNormItems.length > 0) {
      items = modalParsedNormItems;
    } else {
      const fileInp = document.getElementById("modal-norm-file");
      const file = fileInp?.files[0];
      if (!file) {
        alert("Vui lòng chọn 1 file Excel/CSV định mức để trích xuất tự động!");
        return;
      }

      try {
        const parseResult = await parseNormExcelFile(file, line, size);
        items = parseResult.items || [];
        if (!items || items.length === 0) {
          alert("Không trích xuất được dữ liệu nào từ file Excel!");
          return;
        }
      } catch (parseErr) {
        alert("Lỗi đọc file: " + parseErr);
        return;
      }
    }
  }

  const copyFrom = document.getElementById("new-version-copy-from")?.value;

  try {
    const res = await fetch("/api/norms/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_code: code,
        version_name: name,
        effective_from_month: month,
        effective_from_year: year,
        line: line,
        size: size,
        copy_from_version_id: mode === "manual" && copyFrom ? parseInt(copyFrom) : null,
        description: desc + (items.length > 0 ? ` (Nạp tự động ${items.length} chỉ tiêu)` : ''),
        items: items
      })
    });

    const json = await res.json();
    if (json.success) {
      alert(`✓ Đã tạo thành công phiên bản định mức: ${code}!\nÁp dụng từ: Tháng ${month}/${year}`);
      closeModal("modal-create-version");
      if (json.version_id) currentNormVersionId = json.version_id;
      loadNormVersions();
    } else {
      alert("Lỗi khi tạo phiên bản: " + (json.error || "Không rõ nguyên nhân"));
    }
  } catch (err) {
    alert("Lỗi kết nối máy chủ: " + err);
  }
}

// 9. ADD & DELETE NORM ITEM
function openAddNormItemModal() {
  const line = normLineFilter !== 'all' ? normLineFilter : 'DC1';
  const size = normSizeFilter !== 'all' ? normSizeFilter : (line === 'DC1' ? '30x60' : '40x80');

  const lineEl = document.getElementById("add-norm-line");
  const sizeEl = document.getElementById("add-norm-size");
  if (lineEl) lineEl.value = line;
  if (sizeEl) sizeEl.value = size;

  document.getElementById("add-norm-name").value = "";
  document.getElementById("add-norm-val").value = "";
  const errBox = document.getElementById("add-norm-error-msg");
  if (errBox) errBox.classList.add("hidden");

  document.getElementById("modal-add-norm-item").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

async function submitAddNormItem() {
  const name = document.getElementById("add-norm-name")?.value.trim();
  const line = document.getElementById("add-norm-line")?.value || "DC1";
  const size = document.getElementById("add-norm-size")?.value || "30x60";
  const unit = document.getElementById("add-norm-unit")?.value || "Kg";
  const val = parseFloat(document.getElementById("add-norm-val")?.value || "0");
  const errBox = document.getElementById("add-norm-error-msg");

  if (!name) {
    if (errBox) {
      errBox.classList.remove("hidden");
      errBox.innerText = "Vui lòng nhập Tên nguyên vật tư!";
    }
    return;
  }

  try {
    const res = await fetch("/api/norms/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_id: currentNormVersionId,
        material_name: name,
        line: line,
        size: size,
        unit: unit,
        norm_value: val
      })
    });
    const json = await res.json();
    if (json.success) {
      alert("✓ Đã thêm chỉ tiêu vật tư thành công!");
      closeModal("modal-add-norm-item");
      loadNormDetails(currentNormVersionId);
    } else {
      alert("Lỗi: " + (json.error || "Không thể thêm chỉ tiêu"));
    }
  } catch (err) {
    alert("Lỗi: " + err);
  }
}

async function deleteNormItem(itemId, itemName) {
  if (!confirm(`Bạn có chắc chắn muốn xóa chỉ tiêu định mức: "${itemName}" khỏi phiên bản này?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/norms/items?id=${itemId}`, {
      method: "DELETE"
    });
    const json = await res.json();
    if (json.success) {
      loadNormDetails(currentNormVersionId);
    } else {
      alert("Lỗi khi xóa: " + (json.error || "Không thể xóa"));
    }
  } catch (err) {
    alert("Lỗi: " + err);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
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
    tbody.innerHTML = `<tr><td colspan="11" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu</td></tr>`;
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
      </tr>
    `;
  }).join("");
}

// ----------------------------------------------------
// TAB 6: SỬ DỤNG THAN (DATA IV - CHUẨN 100% FORM GỐC ẢNH 2)
// ----------------------------------------------------
let coalSummaryData = null;

function onCoalLineChange() {
  const lineEl = document.getElementById("coal-filter-line");
  const sizeEl = document.getElementById("coal-filter-size");
  if (!lineEl || !sizeEl) return;
  const line = lineEl.value;
  const prevSize = sizeEl.value;

  if (line === "DC1") {
    sizeEl.innerHTML = `
      <option value="all">Tất cả kích thước (DC1)</option>
      <option value="30x60">30x60</option>
    `;
    if (prevSize === "30x60") sizeEl.value = "30x60";
    else sizeEl.value = "all";
  } else if (line === "DC2") {
    sizeEl.innerHTML = `
      <option value="all">Tất cả kích thước (DC2)</option>
      <option value="50x50">50x50</option>
      <option value="40x80">40x80</option>
      <option value="60x60">60x60</option>
    `;
    if (["50x50", "40x80", "60x60"].includes(prevSize)) sizeEl.value = prevSize;
    else sizeEl.value = "all";
  } else {
    sizeEl.innerHTML = `
      <option value="all">Tất cả kích thước</option>
      <option value="30x60">30x60</option>
      <option value="50x50">50x50</option>
      <option value="40x80">40x80</option>
      <option value="60x60">60x60</option>
    `;
    if (["30x60", "50x50", "40x80", "60x60"].includes(prevSize)) sizeEl.value = prevSize;
    else sizeEl.value = "all";
  }

  loadCoalData();
}

async function loadCoalData() {
  const monthEl = document.getElementById("coal-filter-month");
  const lineEl = document.getElementById("coal-filter-line");
  const sizeEl = document.getElementById("coal-filter-size");
  const firingEl = document.getElementById("coal-filter-firing");

  const month = monthEl ? monthEl.value : "8";
  const line = lineEl ? lineEl.value : "all";
  const size = sizeEl ? sizeEl.value : "all";
  const firing = firingEl ? firingEl.value : "all";

  const badge = document.getElementById("coal-badge-period");
  const monthStr = month === "all" ? "Tất cả kỳ" : (month.length === 1 ? "Tháng 0" + month : "Tháng " + month);
  const lineStr = line === "all" ? "Tất cả DC" : line;
  const sizeStr = size === "all" ? "" : ` (${size})`;
  if (badge) badge.innerText = `• ${monthStr} / 2026 - ${lineStr}${sizeStr}`;

  try {
    const res = await fetch(`/api/data/coal?month=${encodeURIComponent(month)}&line=${encodeURIComponent(line)}&size=${encodeURIComponent(size)}&firing_type=${encodeURIComponent(firing)}`);
    const json = await res.json();
    rawCoalData = json.data || [];
    coalSummaryData = json.summary || {};
    renderCoalTable(rawCoalData, coalSummaryData);
  } catch (err) {
    console.error("Error loading coal data:", err);
  }
}

function filterCoalClient() {
  const inputEl = document.getElementById("coal-search-input");
  const term = inputEl ? inputEl.value.toLowerCase().trim() : "";
  const filtered = (rawCoalData || []).filter(r => 
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
  const rowCountEl = document.getElementById("coal-row-count");
  if (rowCountEl) rowCountEl.innerText = `${(rows || []).length} dòng dữ liệu`;

  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="17" class="p-4 text-center text-slate-500">Không tìm thấy dữ liệu tiêu hao than</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    updateCoalKPIs({
      rate_lump: 0,
      rate_lump_all: 0,
      issued_weight: 0,
      issued_weight_all: 0,
      rate_with_ash: 0,
      rate_with_ash_all: 0,
      ash_weight: 0,
      ash_rate_avg: 0,
      rate_total: 0,
      rate_total_all: 0,
      compensation_weight: 0,
      excess_ash_weight: 0,
      production_m2: 0,
      total_used_weight: 0,
      total_used_all: 0
    });
    return;
  }

  // Calculate dynamic sums for current filtered rows
  let sumLumpFiring = 0, sumAshFiring = 0, sumCompFiring = 0, sumExcessFiring = 0, sumUsedFiring = 0, sumM2Firing = 0;
  let sumLumpDrying = 0, sumAshDrying = 0, sumCompDrying = 0, sumUsedDrying = 0;

  rows.forEach(r => {
    const isDrying = (r.firing_type && r.firing_type.includes("Không")) || (!r.production_m2 || r.production_m2 === 0);
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const used = Number(r.total_used_weight || (issued + ash + comp - excess));
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
  const rateWithAshFiring = sumM2Firing > 0 ? ((sumLumpFiring + sumAshFiring - sumExcessFiring) / sumM2Firing) : 0;
  const rateTotalFiring = sumM2Firing > 0 ? (sumUsedFiring / sumM2Firing) : 0;

  const rateLumpAll = totalM2All > 0 ? (totalIssuedAll / totalM2All) : 0;
  const rateWithAshAll = totalM2All > 0 ? ((totalIssuedAll + totalAshAll - sumExcessFiring) / totalM2All) : 0;
  const rateTotalAll = totalM2All > 0 ? (totalUsedAll / totalM2All) : 0;

  const ashPctFiring = (sumLumpFiring + sumAshFiring) > 0 ? (sumAshFiring / (sumLumpFiring + sumAshFiring) * 100) : 0;
  const ashPctDrying = (sumLumpDrying + sumAshDrying) > 0 ? (sumAshDrying / (sumLumpDrying + sumAshDrying) * 100) : 0;
  const ashPctAll = (totalIssuedAll + totalAshAll) > 0 ? (totalAshAll / (totalIssuedAll + totalAshAll) * 100) : 0;

  // Update Top KPI Cards (Both K.Tính Sấy vs + Sấy Lò)
  updateCoalKPIs({
    rate_lump: rateLumpFiring,
    rate_lump_all: rateLumpAll,
    issued_weight: sumLumpFiring,
    issued_weight_all: totalIssuedAll,
    rate_with_ash: rateWithAshFiring,
    rate_with_ash_all: rateWithAshAll,
    ash_weight: sumAshFiring,
    ash_rate_avg: ashPctFiring,
    rate_total: rateTotalFiring,
    rate_total_all: rateTotalAll,
    compensation_weight: sumCompFiring,
    excess_ash_weight: sumExcessFiring,
    production_m2: sumM2Firing,
    total_used_weight: sumUsedFiring,
    total_used_all: totalUsedAll
  });

  // Render Table Body (Exactly 17 columns matching Image 2)
  tbody.innerHTML = rows.map(r => {
    const isDrying = (r.firing_type && r.firing_type.includes("Không")) || (!r.production_m2 || r.production_m2 === 0);
    const issued = Number(r.issued_weight || 0);
    const ash = Number(r.ash_weight || 0);
    const comp = Number(r.compensation_weight || 0);
    const excess = Number(r.excess_ash_weight || 0);
    const totalUsed = Number(r.total_used_weight || (issued + ash + comp - excess));
    const m2 = Number(r.production_m2 || 0);

    const rateLump = r.rate_lump > 0 ? r.rate_lump : (m2 > 0 ? (issued / m2) : 0);
    const rateWithAsh = r.rate_with_ash > 0 ? r.rate_with_ash : (m2 > 0 ? ((issued + ash) / m2) : 0);
    const rateTotal = r.rate_total > 0 ? r.rate_total : (m2 > 0 ? (totalUsed / m2) : 0);

    if (isDrying) {
      return `
        <tr class="bg-[#0b172a]/70 text-slate-400 italic">
          <td class="p-2 text-center text-slate-500 font-mono">${r.stt || ''}</td>
          <td class="p-2 text-slate-500">${r.coal_supplier || ''}</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right text-slate-500">-</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(issued, 0)}</td>
          <td class="p-2 text-right font-medium text-slate-300">${formatNumber(ash, 0)}</td>
          <td class="p-2 text-right text-slate-400">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2, true) : '-'}</td>
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
        <td class="p-2 font-bold text-white">${r.coal_supplier || ''}</td>
        <td class="p-2 text-right font-medium text-slate-300">${r.heat_value > 0 ? formatNumber(r.heat_value, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${r.ash_rate > 0 ? formatNumber(r.ash_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right text-slate-400">${r.std_ash_rate > 0 ? formatNumber(r.std_ash_rate, 1) : '15,0'}</td>
        <td class="p-2 text-right font-medium text-amber-300">${r.stone_rate > 0 ? formatNumber(r.stone_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-slate-100">${formatNumber(issued, 0)}</td>
        <td class="p-2 text-right font-medium text-slate-200">${ash > 0 ? formatNumber(ash, 0) : '-'}</td>
        <td class="p-2 text-right text-slate-300">${r.ash_export_rate > 0 ? formatNumber(r.ash_export_rate, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-emerald-400">${comp > 0 ? formatNumber(comp, 0) : '-'}</td>
        <td class="p-2 text-right font-bold text-rose-400">${excess > 0 ? formatNumber(excess, 0) : '-'}</td>
        <td class="p-2 text-right font-black text-amber-300">${formatNumber(totalUsed, 0)}</td>
        <td class="p-2 text-right font-bold text-emerald-300">${m2 > 0 ? formatNumber(m2, 2) : '-'}</td>
        <td class="p-2 text-right font-bold text-amber-300">${rateLump > 0 ? formatNumber(rateLump, 2, true) : '-'}</td>
        <td class="p-2 text-right font-bold text-cyan-300">${rateWithAsh > 0 ? formatNumber(rateWithAsh, 2, true) : '-'}</td>
        <td class="p-2 text-right font-black text-white">${(comp > 0 && rateTotal > 0) ? formatNumber(rateTotal, 2, true) : '-'}</td>
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
      <td class="p-2 text-right text-slate-300">${formatNumber(ashPctDrying, 2, true)}</td>
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
      <td class="p-2 text-right font-bold text-emerald-300">${formatNumber(ashPctFiring, 2, true)}</td>
      <td class="p-2 text-right font-bold text-emerald-300">${sumCompFiring > 0 ? formatNumber(sumCompFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-bold text-rose-300">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(sumUsedFiring, 0)}</td>
      <td class="p-2 text-right font-black text-emerald-300 text-sm">${formatNumber(sumM2Firing, 2)}</td>
      <td class="p-2 text-right font-black text-amber-300 text-sm">${formatNumber(rateLumpFiring, 2, true)}</td>
      <td class="p-2 text-right font-black text-cyan-300 text-sm">${formatNumber(rateWithAshFiring, 2, true)}</td>
      <td class="p-2 text-right font-black text-white text-sm">${formatNumber(rateTotalFiring, 2, true)}</td>
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
      <td class="p-2 text-right text-slate-300">${formatNumber(ashPctAll, 2, true)}</td>
      <td class="p-2 text-right text-emerald-400">${totalCompAll > 0 ? formatNumber(totalCompAll, 0) : '-'}</td>
      <td class="p-2 text-right text-rose-400">${sumExcessFiring > 0 ? formatNumber(sumExcessFiring, 0) : '-'}</td>
      <td class="p-2 text-right font-bold text-amber-300">${formatNumber(totalUsedAll, 0)}</td>
      <td class="p-2 text-right font-bold text-emerald-400">${formatNumber(totalM2All, 2)}</td>
      <td class="p-2 text-right font-bold text-amber-300">${formatNumber(rateLumpAll, 2, true)}</td>
      <td class="p-2 text-right font-bold text-cyan-300">${formatNumber(rateWithAshAll, 2, true)}</td>
      <td class="p-2 text-right font-black text-white">${formatNumber(rateTotalAll, 2, true)}</td>
      <td class="p-2 text-left text-[11px] text-slate-400">Tổng nhiên liệu</td>
    </tr>
  `;
}

function updateCoalKPIs(kpi) {
  const elRateLump = document.getElementById("coal-kpi-rate-lump");
  if (elRateLump) elRateLump.innerHTML = `${formatNumber(kpi.rate_lump, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateLumpAll = document.getElementById("coal-kpi-rate-lump-all");
  if (elRateLumpAll) elRateLumpAll.innerHTML = `+ Sấy lò: <b>${formatNumber(kpi.rate_lump_all, 2, true)} kg/m²</b>`;

  const elLumpWt = document.getElementById("coal-kpi-lump-wt");
  if (elLumpWt) elLumpWt.innerText = `${formatNumber(kpi.issued_weight, 0)} kg`;

  const elLumpAllWt = document.getElementById("coal-kpi-lump-all-wt");
  if (elLumpAllWt) elLumpAllWt.innerText = `${formatNumber(kpi.issued_weight_all, 0)} kg`;

  const elRateAsh = document.getElementById("coal-kpi-rate-ash");
  if (elRateAsh) elRateAsh.innerHTML = `${formatNumber(kpi.rate_with_ash, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateAshAll = document.getElementById("coal-kpi-rate-ash-all");
  if (elRateAshAll) elRateAshAll.innerHTML = `+ Sấy lò: <b>${formatNumber(kpi.rate_with_ash_all, 2, true)} kg/m²</b>`;

  const elAshWt = document.getElementById("coal-kpi-ash-wt");
  if (elAshWt) elAshWt.innerText = `${formatNumber(kpi.ash_weight, 0)} kg`;
  
  const elAshPct = document.getElementById("coal-kpi-ash-pct");
  if (elAshPct) elAshPct.innerText = `${formatNumber(kpi.ash_rate_avg, 2, true)}%`;

  const elRateTotal = document.getElementById("coal-kpi-rate-total");
  if (elRateTotal) elRateTotal.innerHTML = `${formatNumber(kpi.rate_total, 2, true)} <span class="text-xs font-normal text-slate-400">kg/m²</span>`;
  
  const elRateTotalAll = document.getElementById("coal-kpi-rate-total-all");
  if (elRateTotalAll) elRateTotalAll.innerHTML = `+ Sấy lò (Tổng): <b>${formatNumber(kpi.rate_total_all, 2, true)} kg/m²</b>`;

  const elCompWt = document.getElementById("coal-kpi-comp-wt");
  if (elCompWt) elCompWt.innerText = `${formatNumber(kpi.compensation_weight, 0)} kg`;
  
  const elExcessWt = document.getElementById("coal-kpi-excess-wt");
  if (elExcessWt) elExcessWt.innerText = `${formatNumber(kpi.excess_ash_weight, 0)} kg`;

  const elProdM2 = document.getElementById("coal-kpi-prod-m2");
  if (elProdM2) elProdM2.innerHTML = `${formatNumber(kpi.production_m2, 2)} <span class="text-xs font-normal text-slate-400">m²</span>`;
  
  const elTotalUsed = document.getElementById("coal-kpi-total-used");
  if (elTotalUsed) elTotalUsed.innerText = `${formatNumber(kpi.total_used_weight, 0)} kg`;

  const elTotalUsedAll = document.getElementById("coal-kpi-total-used-all");
  if (elTotalUsedAll) elTotalUsedAll.innerText = `${formatNumber(kpi.total_used_all, 0)} kg`;
}

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
// TAB 8: FORM MẪU BÁO CÁO TỔNG HỢP TRÌNH KÝ 8 PHẦN (V3)
// ----------------------------------------------------
let formMauPeriodType = 'month';
let formMauPeriodValue = '8';
let formMauYear = 2026;
let currentFormMauData = null;
let isFormMauEditMode = false;
let selectedFormMauFile = null;

function setFormMauPeriodType(type) {
  formMauPeriodType = type;
  ['month', 'quarter', 'half_year', 'full_year'].forEach(t => {
    const btn = document.getElementById('btn-period-type-' + t);
    if (btn) {
      if (t === type) {
        btn.className = 'px-2.5 py-1 rounded text-xs font-bold bg-cyan-600 text-white transition shadow';
      } else {
        btn.className = 'px-2.5 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white transition';
      }
    }
  });

  populateFormMauPeriodSelect();
  loadFormMauData();
}

function populateFormMauPeriodSelect() {
  const sel = document.getElementById('form-mau-select-value');
  if (!sel) return;
  sel.innerHTML = '';

  if (formMauPeriodType === 'month') {
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.innerText = `Tháng ${m < 10 ? '0' + m : m}/${formMauYear}`;
      if (m === 8) opt.selected = true;
      sel.appendChild(opt);
    }
  } else if (formMauPeriodType === 'quarter') {
    const quarters = [
      { val: 'Q1', text: `Quý I (Tháng 01 - 03/${formMauYear})` },
      { val: 'Q2', text: `Quý II (Tháng 04 - 06/${formMauYear})` },
      { val: 'Q3', text: `Quý III (Tháng 07 - 09/${formMauYear})` },
      { val: 'Q4', text: `Quý IV (Tháng 10 - 12/${formMauYear})` }
    ];
    quarters.forEach(q => {
      const opt = document.createElement('option');
      opt.value = q.val;
      opt.innerText = q.text;
      if (q.val === 'Q3') opt.selected = true;
      sel.appendChild(opt);
    });
  } else if (formMauPeriodType === 'half_year') {
    const halves = [
      { val: 'H1', text: `6 Tháng đầu năm (T01 - T06/${formMauYear})` },
      { val: 'H2', text: `6 Tháng cuối năm (T07 - T12/${formMauYear})` }
    ];
    halves.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.val;
      opt.innerText = h.text;
      if (h.val === 'H2') opt.selected = true;
      sel.appendChild(opt);
    });
  } else if (formMauPeriodType === 'full_year') {
    const opt = document.createElement('option');
    opt.value = formMauYear;
    opt.innerText = `Cả năm ${formMauYear} (12 Tháng)`;
    opt.selected = true;
    sel.appendChild(opt);
  }
}

async function loadFormMauData() {
  const selVal = document.getElementById('form-mau-select-value');
  const selYear = document.getElementById('form-mau-select-year');
  if (selVal) formMauPeriodValue = selVal.value;
  if (selYear) formMauYear = parseInt(selYear.value) || 2026;

  const contentDiv = document.getElementById('form-mau-content');
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div class="p-12 text-center text-slate-400">
        <div class="inline-block animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mb-3"></div>
        <div class="font-bold text-sm text-cyan-300">Đang tổng hợp dữ liệu Form Mẫu chuẩn Form gốc...</div>
      </div>
    `;
  }

  try {
    const res = await fetch(`/api/report/form-mau?period_type=${formMauPeriodType}&period_value=${formMauPeriodValue}&year=${formMauYear}`);
    const json = await res.json();
    currentFormMauData = json;
    renderFormMauContent(currentFormMauData);
  } catch (err) {
    console.error('Error loading form mau data:', err);
    if (contentDiv) {
      contentDiv.innerHTML = `<div class="p-6 text-center text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/30">Lỗi nạp dữ liệu: ${err.message}</div>`;
    }
  }
}

function renderFormMauPreview() {
  loadFormMauData();
}

function formatRatePointDiff(val) {
  if (val === null || val === undefined || isNaN(val)) return '0,00%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${formatNumber(val, 2)}%`;
}

function renderMaterialTableBlock(matList, title) {
  if (!matList || matList.length === 0) return '';
  return `
    <div class="mb-6">
      <h5 class="text-xs font-bold text-emerald-400 mb-2">${title}:</h5>
      <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60 shadow">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th class="p-2 border border-[#1e3a6a] w-12">STT</th>
              <th class="p-2 border border-[#1e3a6a] text-left">Tên Nguyên Liệu / Vật Tư</th>
              <th class="p-2 border border-[#1e3a6a] w-14">ĐVT</th>
              <th class="p-2 border border-[#1e3a6a] text-right">Định Mức Quy Định</th>
              <th class="p-2 border border-[#1e3a6a] text-right">Khối Lượng Dùng</th>
              <th class="p-2 border border-[#1e3a6a] text-right">Sản Lượng (m²)</th>
              <th class="p-2 border border-[#1e3a6a] text-right text-cyan-300">Thực Tế</th>
              <th class="p-2 border border-[#1e3a6a] text-right text-emerald-400">Vượt / Giảm</th>
              <th class="p-2 border border-[#1e3a6a] text-center w-24">Đánh Giá</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${matList.map((r, i) => `
              <tr class="hover:bg-[#13284d]/60">
                <td class="p-1.5 border border-[#1e3a6a] text-slate-400">${i + 1}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-left font-semibold text-white">${r.material_name}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-slate-400">${r.unit}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.norm_value, 4)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-slate-300">${formatNumber(r.used_qty, 2)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-slate-300">${formatNumber(r.prod_qty, 0)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-cyan-300">${formatNumber(r.actual_rate, 4)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold ${r.diff_qty <= 0 ? 'text-emerald-400' : 'text-rose-400'}">${r.diff_qty > 0 ? '+' : ''}${formatNumber(r.diff_qty, 2)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-center text-xs ${r.diff_qty <= 0 ? 'text-emerald-400' : 'text-amber-400'}">${r.diff_qty <= 0 ? 'Đạt ĐM ✓' : 'Vượt ĐM'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCoalDetailBlock(coalGroup, groupTitle, isDC2Combined = false) {
  if (!coalGroup) return '';
  const rows = coalGroup.all_rows || [];
  if (rows.length === 0) return '';

  const sumD = coalGroup.sum_drying || {};
  const sumF = coalGroup.sum_firing || {};
  const sumA = coalGroup.sum_all || {};

  return `
    <div class="mb-6">
      <h5 class="text-xs font-bold text-emerald-400 mb-2 flex items-center justify-between">
        <span>${groupTitle}</span>
        <span class="text-[11px] text-slate-400 font-normal italic">Đơn vị tính: Kg, m², Kg/m²</span>
      </h5>
      <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60 shadow">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-10">STT</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-left">Tên Loại Than / Lô Than</th>
              <th colspan="4" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-cyan-300 text-[10px]">Chất Lượng Lô Than</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-slate-200">KL. Lĩnh (Kg)</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-amber-300 text-[10px]">Xuất Cám (Kg)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-emerald-400">Lĩnh Bù (Kg)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-rose-400">Cám Vượt TC</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right font-bold text-cyan-300">Tổng Sử Dụng (Kg)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-white">Sản Lượng (m²)</th>
              <th colspan="3" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-emerald-300 text-[10px]">Tiêu Hao (Kg/m²)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-left w-32">Ghi Chú</th>
            </tr>
            <tr class="bg-[#0e2246] text-slate-300 text-[10px]">
              <th class="p-1 border border-[#1e3a6a]">Nhiệt Trị</th>
              <th class="p-1 border border-[#1e3a6a]">% Cám TT</th>
              <th class="p-1 border border-[#1e3a6a]">% Cám TC</th>
              <th class="p-1 border border-[#1e3a6a]">% Xỉ Đá</th>
              <th class="p-1 border border-[#1e3a6a] text-right">SL (Kg)</th>
              <th class="p-1 border border-[#1e3a6a] text-right">% Cám</th>
              <th class="p-1 border border-[#1e3a6a] text-right">Than Cục</th>
              <th class="p-1 border border-[#1e3a6a] text-right">Có Cám</th>
              <th class="p-1 border border-[#1e3a6a] text-right font-bold text-emerald-300">Cục+Cám+Bù</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${rows.map((r, i) => {
              const isDrying = (r.firing_type || '').includes('Không');
              if (isDrying) {
                return `
                  <tr class="hover:bg-[#13284d]/60 text-slate-400 italic text-[10px]">
                    <td class="p-1 border border-[#1e3a6a] text-center"></td>
                    <td class="p-1 border border-[#1e3a6a] text-left pl-4">${r.coal_supplier}</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.issued_weight, 0)}</td>
                    <td class="p-1 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.ash_weight, 0)}</td>
                    <td class="p-1 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.ash_export_rate, 2)}</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-center">-</td>
                    <td class="p-1 border border-[#1e3a6a] text-right font-mono font-bold text-slate-300">${formatNumber(r.total_used_weight, 0)}</td>
                    <td class="p-1 border border-[#1e3a6a] text-left text-slate-400" colspan="4">Sấy lò không tính tiêu hao</td>
                    <td class="p-1 border border-[#1e3a6a] text-left text-[9px] text-slate-500">${r.note || ''}</td>
                  </tr>
                `;
              } else {
                return `
                  <tr class="hover:bg-[#13284d]/60">
                    <td class="p-1.5 border border-[#1e3a6a] text-center font-bold text-cyan-300">${r.stt || i + 1}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-left font-semibold text-white">${r.coal_supplier}</td>
                    <td class="p-1.5 border border-[#1e3a6a] font-mono text-center">${formatNumber(r.heat_value, 0)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] font-mono font-bold text-cyan-300 text-center">${formatNumber(r.ash_rate, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] font-mono text-slate-400 text-center">${formatNumber(r.std_ash_rate, 0)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] font-mono text-amber-300 text-center">${formatNumber(r.stone_rate, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-white">${formatNumber(r.issued_weight, 0)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-amber-200">${formatNumber(r.ash_weight, 0)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.ash_export_rate, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold ${r.compensation_weight > 0 ? 'text-emerald-400' : 'text-slate-500'}">${r.compensation_weight > 0 ? formatNumber(r.compensation_weight, 0) : '-'}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold ${r.excess_ash_weight > 0 ? 'text-rose-400' : 'text-slate-500'}">${r.excess_ash_weight > 0 ? formatNumber(r.excess_ash_weight, 0) : '-'}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-cyan-300">${formatNumber(r.total_used_weight, 0)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-white">${formatNumber(r.production_m2, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.rate_lump, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono">${formatNumber(r.rate_with_ash, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-emerald-400">${formatNumber(r.rate_total, 2)}</td>
                    <td class="p-1.5 border border-[#1e3a6a] text-left text-[10px] text-slate-400">${r.note || ''}</td>
                  </tr>
                `;
              }
            }).join('')}

            <!-- Dòng TỔNG SẤY LÒ -->
            <tr class="bg-[#102542] text-slate-300 font-bold text-[10px]">
              <td colspan="6" class="p-1.5 text-center uppercase border border-[#1e3a6a]">TỔNG SẤY LÒ:</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sumD.issued_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sumD.ash_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sumD.ash_pct, 2)}</td>
              <td class="p-1.5 text-center border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-center border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(sumD.total_used_weight, 0)}</td>
              <td colspan="4" class="p-1.5 text-left border border-[#1e3a6a] italic text-slate-400">Sấy lò không tính tiêu hao</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
            </tr>

            <!-- Dòng TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ -->
            <tr class="bg-[#0c1a35] text-emerald-300 font-bold text-[11px]">
              <td colspan="6" class="p-1.5 text-center uppercase border border-[#1e3a6a]">TỔNG TIÊU HAO KHÔNG TÍNH SẤY LÒ:</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-white">${formatNumber(sumF.issued_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-200">${formatNumber(sumF.ash_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sumF.ash_pct, 2)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(sumF.compensation_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(sumF.excess_ash_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(sumF.total_used_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(sumF.production_m2, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a]">${formatNumber(sumF.rate_lump, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a]">${formatNumber(sumF.rate_with_ash, 2)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(sumF.rate_total, 2)}</td>
              <td class="p-1.5 border border-[#1e3a6a] text-center text-xs text-emerald-400">Khoán ✓</td>
            </tr>

            <!-- Dòng TỔNG + SẤY LÒ -->
            <tr class="bg-[#071326] text-white font-bold text-[11px]">
              <td colspan="6" class="p-1.5 text-center uppercase border border-[#1e3a6a]">TỔNG + SẤY LÒ:</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-black">${formatNumber(sumA.issued_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-200 font-black">${formatNumber(sumA.ash_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sumA.ash_pct, 2)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(sumA.compensation_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(sumA.excess_ash_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(sumA.total_used_weight, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a]">${formatNumber(sumA.production_m2, 2)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a]">${formatNumber(sumA.rate_lump, 2)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a]">${formatNumber(sumA.rate_with_ash, 2)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-300">${formatNumber(sumA.rate_total, 2)}</td>
              <td class="p-1.5 border border-[#1e3a6a] text-center text-xs text-cyan-300">Tổng cộng</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFormMauContent(d) {
  if (!d || !d.section_1_production) return;

  const pInfo = d.period_info || {};
  document.getElementById('form-mau-header-title').innerText = `BÁO CÁO TỔNG HỢP KẾT QUẢ SẢN XUẤT ${pInfo.period_title || ''} CỦA 2 DÂY CHUYỀN`;

  const s1 = d.section_1_production;
  const s2 = d.section_2_brands;
  const s3 = d.section_3_materials;
  const s4 = d.section_4_coal;
  const s5 = d.section_5_hr;
  const s6 = d.section_6_plan;
  const s7 = d.section_7_goals;
  const s8 = d.section_8_evaluation;

  // --- SECTION I: SẢN LƯỢNG - CHẤT LƯỢNG - THU HỒI ---
  const s1ItemsHtml = s1.items.map(it => {
    const p = it.plan;
    const a = it.actual;
    const diff = it.diff_m2;
    const rate = it.rate_pct;

    return `
      <!-- Row Kế hoạch (m2) -->
      <tr class="hover:bg-[#13284d]/60">
        <td rowspan="6" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-cyan-300 align-middle">${it.line}</td>
        <td rowspan="6" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-white align-middle">${it.size}</td>
        <td rowspan="2" class="p-2 font-semibold text-center border border-[#1e3a6a] text-slate-300 align-middle">Kế hoạch</td>
        <td class="p-1.5 text-center border border-[#1e3a6a] text-slate-400">m²</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(p.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${formatNumber(p.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(p.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(p.recovery_total, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(p.prod_days, 1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.avg_per_day, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.a_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.c_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.huy_ep, 2)}%</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(p.stop_time_2mf, 0)}</td>
      </tr>
      <!-- Row Kế hoạch (%) -->
      <tr class="hover:bg-[#13284d]/60 text-slate-400">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_a1, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_a, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_b, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">100%</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>

      <!-- Row Thực hiện (m2) -->
      <tr class="hover:bg-[#13284d]/60 bg-emerald-500/5">
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] text-emerald-400 align-middle">Thực hiện</td>
        <td class="p-1.5 text-center border border-[#1e3a6a] text-slate-400">m²</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(a.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(a.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-300">${formatNumber(a.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(a.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(a.recovery_total, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(a.prod_days, 1)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a]">${formatNumber(a.avg_per_day, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(a.a_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(a.c_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(a.huy_ep, 2)}%</td>
        <td class="p-1.5 text-center font-mono font-bold border border-[#1e3a6a] text-amber-300">${formatNumber(a.stop_time_2mf, 0)}</td>
      </tr>
      <!-- Row Thực hiện (%) -->
      <tr class="hover:bg-[#13284d]/60 bg-emerald-500/5 text-slate-400">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(a.pct_a1, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${formatNumber(a.pct_a, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(a.pct_b, 2)}%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">100%</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>

      <!-- Row So sánh TH/KH (m2) -->
      <tr class="hover:bg-[#13284d]/60 bg-cyan-500/5">
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] text-cyan-400 align-middle">So sánh TH/KH</td>
        <td class="p-1.5 text-center border border-[#1e3a6a] text-slate-400">m²</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.sl_ep >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.sl_ep >= 0 ? '+' : ''}${formatNumber(diff.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.a1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.a1 >= 0 ? '+' : ''}${formatNumber(diff.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${diff.a >= 0 ? '+' : ''}${formatNumber(diff.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${diff.b >= 0 ? '+' : ''}${formatNumber(diff.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.recovery_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.recovery_total >= 0 ? '+' : ''}${formatNumber(diff.recovery_total, 2)}</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>
      <!-- Row So sánh TH/KH (%) - Chuẩn TH% - KH% -->
      <tr class="hover:bg-[#13284d]/60 bg-cyan-500/5">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.sl_ep >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${formatNumber(rate.sl_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.a1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.a1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] ${rate.a >= 0 ? 'text-blue-400' : 'text-slate-400'}">${formatRatePointDiff(rate.a)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] ${rate.b <= 0 ? 'text-emerald-400' : 'text-amber-400'}">${formatRatePointDiff(rate.b)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.recovery_total >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${formatNumber(rate.recovery_total, 2)}%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.a_ep >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.a_ep)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatRatePointDiff(rate.c_ep)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] ${rate.huy_ep <= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.huy_ep)}</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>
    `;
  }).join('');

  function renderTotalBlock(tot, bgColor = 'bg-amber-500/10') {
    const p = tot.plan;
    const a = tot.actual;
    const diff = tot.diff_m2;
    const rate = tot.rate_pct;

    return `
      <tr class="${bgColor} font-bold">
        <td rowspan="6" colspan="2" class="p-2 text-center uppercase border border-[#1e3a6a] text-amber-300 align-middle font-black">${tot.name}</td>
        <td rowspan="2" class="p-2 text-center border border-[#1e3a6a] text-slate-300 align-middle">Tổng kế hoạch</td>
        <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(p.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${formatNumber(p.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(p.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(p.recovery_total, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(p.prod_days, 1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.avg_per_day, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.a_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.c_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.huy_ep, 2)}%</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(p.stop_time_2mf, 0)}</td>
      </tr>
      <tr class="${bgColor}">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_a1, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_a, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(p.pct_b, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">100%</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>

      <tr class="${bgColor} bg-emerald-500/10">
        <td rowspan="2" class="p-2 text-center border border-[#1e3a6a] text-emerald-300 align-middle">Tổng thực hiện</td>
        <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-white">${formatNumber(a.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(a.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-300">${formatNumber(a.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(a.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(a.recovery_total, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(a.prod_days, 1)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a]">${formatNumber(a.avg_per_day, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(a.a_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(a.c_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(a.huy_ep, 2)}%</td>
        <td class="p-1.5 text-center font-mono font-bold border border-[#1e3a6a] text-amber-300">${formatNumber(a.stop_time_2mf, 0)}</td>
      </tr>
      <tr class="${bgColor} bg-emerald-500/10">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(a.pct_a1, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-300">${formatNumber(a.pct_a, 2)}%</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(a.pct_b, 2)}%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">100%</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>

      <tr class="${bgColor} bg-cyan-500/10">
        <td rowspan="2" class="p-2 text-center border border-[#1e3a6a] text-cyan-300 align-middle">So sánh TH/KH</td>
        <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.sl_ep >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.sl_ep >= 0 ? '+' : ''}${formatNumber(diff.sl_ep, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.a1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.a1 >= 0 ? '+' : ''}${formatNumber(diff.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${diff.a >= 0 ? '+' : ''}${formatNumber(diff.a, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${diff.b >= 0 ? '+' : ''}${formatNumber(diff.b, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${diff.recovery_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff.recovery_total >= 0 ? '+' : ''}${formatNumber(diff.recovery_total, 2)}</td>
        <td colspan="6" class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>
      <tr class="${bgColor} bg-cyan-500/10">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.sl_ep >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${formatNumber(rate.sl_ep, 2)}%</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.a1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.a1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatRatePointDiff(rate.a)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatRatePointDiff(rate.b)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.recovery_total >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${formatNumber(rate.recovery_total, 2)}%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] ${rate.a_ep >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.a_ep)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatRatePointDiff(rate.c_ep)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] ${rate.huy_ep <= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatRatePointDiff(rate.huy_ep)}</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
      </tr>
    `;
  }

  // --- SECTION II: THƯƠNG HIỆU & CƠ CẤU MEN ---
  const s2_dc1 = s2.dc1_30x60 || [];
  const s2_dc1_sum = s2.dc1_30x60_sum || {};
  const s2_50_obj = s2.dc2_50x50 || {};
  const bong_50 = s2_50_obj.bong || [];
  const sugar_50 = s2_50_obj.sugar || [];
  const sum_bong_50 = s2_50_obj.sum_bong || {};
  const sum_sugar_50 = s2_50_obj.sum_sugar || {};
  const sum_total_50 = s2_50_obj.sum_total || {};

  const s2_40_list = s2.dc2_40x80 || [];
  const s2_40_sum = s2.dc2_40x80_sum || {};

  // --- SECTION V: NHÂN SỰ ---
  const hrRows = s5.table || [];
  const sumDinhBienDC1 = hrRows.reduce((acc, r) => acc + (Number(r.dinhbien_dc1) || 0), 0);
  const sumDinhBienDC2 = hrRows.reduce((acc, r) => acc + (Number(r.dinhbien_dc2) || 0), 0);
  const sumTuyenMoiDC1 = hrRows.reduce((acc, r) => acc + (Number(r.tuyenmoi_dc1) || 0), 0);
  const sumTuyenMoiDC2 = hrRows.reduce((acc, r) => acc + (Number(r.tuyenmoi_dc2) || 0), 0);
  const sumChuyenDC1 = hrRows.reduce((acc, r) => acc + (Number(r.chuyen_dc1) || 0), 0);
  const sumChuyenDC2 = hrRows.reduce((acc, r) => acc + (Number(r.chuyen_dc2) || 0), 0);
  const sumNghiDC1 = hrRows.reduce((acc, r) => acc + (Number(r.nghi_dc1) || 0), 0);
  const sumNghiDC2 = hrRows.reduce((acc, r) => acc + (Number(r.nghi_dc2) || 0), 0);
  const sumHienTaiDC1 = hrRows.reduce((acc, r) => acc + (Number(r.hientai_dc1) || 0), 0);
  const sumHienTaiDC2 = hrRows.reduce((acc, r) => acc + (Number(r.hientai_dc2) || 0), 0);

  // --- SECTION VI: KẾ HOẠCH THÁNG TIẾP THEO (PDF PAGE 1) ---
  const planData = s6.data || get_default_plan_next_period();
  const planItems = planData.items || [];
  const planTotal2dc = planData.total_2dc || {};
  const planNotes = planData.notes || [];

  const planRowsHtml = planItems.map(it => {
    const pm = it.plan_m2 || {};
    const pp = it.plan_pct || {};
    return `
      <tr class="hover:bg-[#13284d]/60">
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-cyan-300 align-middle">${it.line}</td>
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-white align-middle">${it.size}</td>
        <td class="p-1.5 text-center border border-[#1e3a6a] text-slate-400">m²</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-white">${formatNumber(pm.sl_ep, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400 font-bold">${formatNumber(pm.a1, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${pm.a > 0 ? formatNumber(pm.a, 0) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(pm.b, 0)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">${formatNumber(pm.recovery_total, 0)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(pm.prod_days, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(pm.avg_per_day, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(pm.a_ep, 1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${pm.c_ep ? formatNumber(pm.c_ep, 2) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(pm.huy_ep, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400 font-bold">${pm.stop_time_2mf || 40}</td>
      </tr>
      <tr class="hover:bg-[#13284d]/60 text-slate-400">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-emerald-400">${formatNumber(pp.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${pp.a > 0 ? formatNumber(pp.a, 2) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(pp.b, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-cyan-300">100,00</td>
        <td colspan="3" class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(pm.a_ep, 1)}</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(pm.huy_ep, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${pm.stop_time_2mf || 40}</td>
      </tr>
    `;
  }).join('');

  const pTotM = planTotal2dc.plan_m2 || {};
  const pTotP = planTotal2dc.plan_pct || {};

  // --- SECTION VII: MỤC TIÊU THÁNG TIẾP THEO (PDF PAGE 2) ---
  const goalsData = s7.data || get_default_goals_next_period();
  const goalItems = goalsData.items || [];
  const goalTotalDC2 = goalsData.total_dc2 || {};
  const goalTotal2DC = goalsData.total_2dc || {};
  const deptTasks = goalsData.department_tasks || [];

  const goalRowsHtml = goalItems.map(it => {
    const gm = it.goal_m2 || {};
    const gp = it.goal_pct || {};
    return `
      <tr class="hover:bg-[#13284d]/60">
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-cyan-300 align-middle">${it.line}</td>
        <td rowspan="2" class="p-2 font-bold text-center border border-[#1e3a6a] bg-[#0c1a35] text-white align-middle">${it.size}</td>
        <td class="p-1.5 text-center border border-[#1e3a6a] text-slate-400">m²</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-white">${formatNumber(gm.sl_ep, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400 font-bold">${formatNumber(gm.a1, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${gm.a > 0 ? formatNumber(gm.a, 0) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gm.b, 0)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">${formatNumber(gm.recovery_total, 0)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(gm.prod_days, 2)}</td>
        <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(gm.avg_per_day, 0)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(gm.a_ep, 1)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${gm.c_ep ? formatNumber(gm.c_ep, 2) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(gm.huy_ep, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400 font-bold">${gm.stop_time_2mf || 25}</td>
      </tr>
      <tr class="hover:bg-[#13284d]/60 text-slate-400">
        <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-emerald-400">${formatNumber(gp.a1, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${gp.a > 0 ? formatNumber(gp.a, 2) : '-'}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gp.b, 2)}</td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-bold text-cyan-300">100,00</td>
        <td colspan="3" class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(gm.a_ep, 1)}</td>
        <td class="p-1.5 border border-[#1e3a6a]"></td>
        <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(gm.huy_ep, 2)}</td>
        <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${gm.stop_time_2mf || 25}</td>
      </tr>
    `;
  }).join('');

  const gTotDC2M = goalTotalDC2.goal_m2 || {};
  const gTotDC2P = goalTotalDC2.goal_pct || {};
  const gTot2DCM = goalTotal2DC.goal_m2 || {};
  const gTot2DCP = goalTotal2DC.goal_pct || {};

  // --- SECTION VIII: CHỮ KÝ 6 CẤP & NƠI NHẬN (PDF PAGE 3) ---
  const sigs = s8.signatures || {};

  const contentDiv = document.getElementById('form-mau-content');
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <!-- PHẦN I: KẾT QUẢ SẢN XUẤT TỔNG HỢP 2 DC -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          I. SẢN LƯỢNG - CHẤT LƯỢNG - THU HỒI TỔNG A1+A+B/ÉP
        </h4>
        <span class="text-xs text-slate-400 italic">Đơn vị tính: m²</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-[#1e3a6a]/60 shadow-lg">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">DC</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-16">Kích Thước</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-28">KH / TH</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">ĐVT</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">Tổng SL Ép</th>
              <th colspan="3" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-cyan-300">Sản Lượng Thu Hồi</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right bg-[#0c1e3d] text-white">Tổng (A1+A+B)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-14">Số Ngày SX</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">TB / Ngày</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-emerald-400">A/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">C/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-rose-400">Huỷ/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-center w-16 text-amber-300">T/g Dừng 2MF</th>
            </tr>
            <tr class="bg-[#0e2246] text-slate-300">
              <th class="p-1.5 border border-[#1e3a6a] text-right text-emerald-300">A1</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-blue-300">A</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-amber-300">B</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${s1ItemsHtml}
            ${renderTotalBlock(s1.total_dc2, 'bg-amber-500/10')}
            ${renderTotalBlock(s1.total_2dc, 'bg-cyan-500/10')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- PHẦN II: THƯƠNG HIỆU & CƠ CẤU MEN -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          II. SẢN LƯỢNG THEO CÁC THƯƠNG HIỆU & CƠ CẤU CHỦNG LOẠI MEN
        </h4>
      </div>

      <!-- 1. DC1 30x60 -->
      <div class="mb-6">
        <h5 class="text-xs font-bold text-emerald-400 mb-2">1. Kết quả thực hiện sản phẩm các thương hiệu của Dây chuyền số 1 (Gạch ốp 30x60):</h5>
        <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60">
          <table class="table-excel-grid w-full text-center text-[11px]">
            <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
              <tr>
                <th class="p-2 border border-[#1e3a6a] w-12">STT</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Chủng Loại / Men</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Thương Hiệu</th>
                <th class="p-2 border border-[#1e3a6a] text-right">Tổng Sản Lượng (m²)</th>
                <th class="p-2 border border-[#1e3a6a] text-center w-20">Số Kỳ Chạy</th>
                <th class="p-2 border border-[#1e3a6a] text-right w-20">Tỷ Lệ %</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Ghi Chú</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
              ${s2_dc1.map((r, i) => `
                <tr class="hover:bg-[#13284d]/60">
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-400">${i + 1}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left">${r.glaze_type || 'Gạch ốp'}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left font-bold text-cyan-300">${r.brand_name}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-white">${formatNumber(r.total_m2, 2)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-center font-mono">1 kỳ</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-emerald-400">${s2_dc1_sum.total > 0 ? formatNumber(r.total_m2 / s2_dc1_sum.total * 100, 2) : 0}%</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left text-slate-400 text-[10px]">Chuẩn chất lượng</td>
                </tr>
              `).join('')}
              <tr class="bg-[#0c1a35] font-bold text-emerald-300">
                <td colspan="3" class="p-2 text-center uppercase border border-[#1e3a6a]">TỔNG CỘNG DC1 30x60:</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(s2_dc1_sum.total, 2)}</td>
                <td class="p-2 text-center border border-[#1e3a6a]"></td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">100%</td>
                <td class="p-2 border border-[#1e3a6a]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. DC2 50x50: Tách rõ 2 nhóm Men Bóng & Men Sugar Sân Vườn -->
      <div class="mb-6">
        <h5 class="text-xs font-bold text-emerald-400 mb-2">2. Kết quả thực hiện sản phẩm các thương hiệu của Dây chuyền số 2 (Gạch lát 50x50):</h5>
        <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60 mb-3">
          <table class="table-excel-grid w-full text-center text-[11px]">
            <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
              <tr>
                <th class="p-2 border border-[#1e3a6a] text-left w-32">Nhóm Men</th>
                <th class="p-2 border border-[#1e3a6a] w-20">Kích Thước</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Thương Hiệu</th>
                <th class="p-2 border border-[#1e3a6a] w-12">ĐVT</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-emerald-300">A1</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-blue-300">A</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-amber-300">B</th>
                <th class="p-2 border border-[#1e3a6a] text-right font-bold text-white">Tổng (A1+A+B)</th>
                <th class="p-2 border border-[#1e3a6a] text-right w-20">Tỷ Lệ %</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Ghi Chú</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
              <!-- a. Nhóm Men Bóng -->
              <tr class="bg-cyan-950/40 text-cyan-300 font-bold">
                <td colspan="10" class="p-1.5 text-left border border-[#1e3a6a] uppercase tracking-wider text-[10px]">
                  ❖ A. Nhóm Men Bóng (50x50)
                </td>
              </tr>
              ${bong_50.map((r, i) => `
                <tr class="hover:bg-[#13284d]/60">
                  ${i === 0 ? `<td rowspan="${bong_50.length}" class="p-1.5 border border-[#1e3a6a] text-center font-semibold align-middle text-cyan-200 bg-[#0c1a35]">Men Bóng</td>` : ''}
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-300">50x50</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left font-bold text-white">${r.brand_name}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-400">m²</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-emerald-400">${formatNumber(r.a1_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-blue-400">${formatNumber(r.a_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-amber-400">${formatNumber(r.b_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-white">${formatNumber(r.total_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-emerald-300">${sum_total_50.total > 0 ? formatNumber(r.total_m2 / sum_total_50.total * 100, 2) : 0}%</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left text-slate-400 text-[10px]">Bóng</td>
                </tr>
              `).join('')}
              <tr class="bg-[#0f244a] font-bold text-cyan-200 text-[11px]">
                <td colspan="4" class="p-1.5 text-center uppercase border border-[#1e3a6a]">Cộng Nhóm Men Bóng 50x50:</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-300">${formatNumber(sum_bong_50.a1, 1)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sum_bong_50.a, 1)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(sum_bong_50.b, 1)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(sum_bong_50.total, 1)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${sum_total_50.total > 0 ? formatNumber(sum_bong_50.total / sum_total_50.total * 100, 2) : 0}%</td>
                <td class="p-1.5 border border-[#1e3a6a]"></td>
              </tr>

              <!-- b. Nhóm Men Sugar Sân Vườn -->
              <tr class="bg-amber-950/40 text-amber-300 font-bold">
                <td colspan="10" class="p-1.5 text-left border border-[#1e3a6a] uppercase tracking-wider text-[10px]">
                  ❖ B. Nhóm Men Sugar Sân Vườn (50x50)
                </td>
              </tr>
              ${sugar_50.map((r, i) => `
                <tr class="hover:bg-[#13284d]/60">
                  ${i === 0 ? `<td rowspan="${sugar_50.length}" class="p-1.5 border border-[#1e3a6a] text-center font-semibold align-middle text-amber-200 bg-[#0c1a35]">Sugar Sân vườn</td>` : ''}
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-300">50x50</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left font-bold text-white">${r.brand_name}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-400">m²</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-emerald-400">${formatNumber(r.a1_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-blue-400">${formatNumber(r.a_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-amber-400">${formatNumber(r.b_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-white">${formatNumber(r.total_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-emerald-300">${sum_total_50.total > 0 ? formatNumber(r.total_m2 / sum_total_50.total * 100, 2) : 0}%</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left text-slate-400 text-[10px]">Sugar Sân vườn</td>
                </tr>
              `).join('')}
              <tr class="bg-[#2a1c0a] font-bold text-amber-200 text-[11px]">
                <td colspan="4" class="p-1.5 text-center uppercase border border-[#1e3a6a]">Cộng Nhóm Sugar Sân Vườn 50x50:</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-300">${formatNumber(sum_sugar_50.a1, 1)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(sum_sugar_50.a, 1)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(sum_sugar_50.b, 1)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(sum_sugar_50.total, 1)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-amber-300">${sum_total_50.total > 0 ? formatNumber(sum_sugar_50.total / sum_total_50.total * 100, 2) : 0}%</td>
                <td class="p-1.5 border border-[#1e3a6a]"></td>
              </tr>

              <!-- TỔNG CỘNG 50x50 -->
              <tr class="bg-[#0c1a35] font-bold text-emerald-300 text-xs">
                <td colspan="4" class="p-2 text-center uppercase border border-[#1e3a6a] font-black">TỔNG CỘNG 50x50 (BÓNG + SUGAR SÂN VƯỜN):</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-emerald-300">${formatNumber(sum_total_50.a1, 1)}</td>
                <td class="p-2 text-right font-mono border border-[#1e3a6a]">${formatNumber(sum_total_50.a, 1)}</td>
                <td class="p-2 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(sum_total_50.b, 1)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(sum_total_50.total, 1)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">100%</td>
                <td class="p-2 border border-[#1e3a6a]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. DC2 40x80 -->
      <div class="mb-6">
        <h5 class="text-xs font-bold text-emerald-400 mb-2">3. Kết quả thực hiện sản phẩm các thương hiệu của Dây chuyền số 2 (Gạch ốp 40x80):</h5>
        <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60">
          <table class="table-excel-grid w-full text-center text-[11px]">
            <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
              <tr>
                <th class="p-2 border border-[#1e3a6a] w-12">STT</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Chủng Loại Men</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Thương Hiệu</th>
                <th class="p-2 border border-[#1e3a6a] w-12">ĐVT</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-emerald-300">A1</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-blue-300">A</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-amber-300">B</th>
                <th class="p-2 border border-[#1e3a6a] text-right font-bold text-white">Tổng (A1+A+B)</th>
                <th class="p-2 border border-[#1e3a6a] text-right w-20">Tỷ Lệ %</th>
                <th class="p-2 border border-[#1e3a6a] text-left">Ghi Chú</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
              ${s2_40_list.map((r, i) => `
                <tr class="hover:bg-[#13284d]/60">
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-400">${i + 1}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left">${r.glaze_type || 'Men Panson'}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left font-bold text-white">${r.brand_name}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-slate-400">m²</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-emerald-400">${formatNumber(r.a1_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-blue-400">${formatNumber(r.a_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono text-amber-400">${formatNumber(r.b_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-white">${formatNumber(r.total_m2, 1)}</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-right font-mono font-bold text-emerald-300">${s2_40_sum.total > 0 ? formatNumber(r.total_m2 / s2_40_sum.total * 100, 2) : 0}%</td>
                  <td class="p-1.5 border border-[#1e3a6a] text-left text-slate-400 text-[10px]">Đạt chuẩn</td>
                </tr>
              `).join('')}
              <tr class="bg-[#0c1a35] font-bold text-emerald-300">
                <td colspan="4" class="p-2 text-center uppercase border border-[#1e3a6a]">TỔNG CỘNG DC2 40x80:</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-emerald-300">${formatNumber(s2_40_sum.a1, 1)}</td>
                <td class="p-2 text-right font-mono border border-[#1e3a6a]">${formatNumber(s2_40_sum.a, 1)}</td>
                <td class="p-2 text-right font-mono border border-[#1e3a6a] text-amber-300">${formatNumber(s2_40_sum.b, 1)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(s2_40_sum.total, 1)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">100%</td>
                <td class="p-2 border border-[#1e3a6a]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PHẦN III: TIÊU HAO VẬT TƯ (ĐẦY ĐỦ 30x60, 50x50, 40x80) -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          III. TÌNH HÌNH TIÊU HAO NGUYÊN LIỆU, MEN, XƯƠNG & VẬT TƯ
        </h4>
        <span class="text-xs text-slate-400 italic">Đầy đủ theo từng kích thước 30x60, 50x50 & 40x80</span>
      </div>
      ${renderMaterialTableBlock(s3.dc1_30x60, '1. Tiêu hao vật tư Dây chuyền số 1 (30x60)')}
      ${renderMaterialTableBlock(s3.dc2_50x50, '2. Tiêu hao vật tư Dây chuyền số 2 (50x50)')}
      ${renderMaterialTableBlock(s3.dc2_40x80, '3. Tiêu hao vật tư Dây chuyền số 2 (40x80)')}
      ${s3.dc2_60x60 && s3.dc2_60x60.length > 0 ? renderMaterialTableBlock(s3.dc2_60x60, '4. Tiêu hao vật tư Dây chuyền số 2 (60x60)') : ''}
    </div>

    <!-- PHẦN IV: SỬ DỤNG THAN TRẠM KHÍ HOÁ CHI TIẾT (KHỚP 100% ẢNH 2 & ẢNH 3) -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          IV. SỬ DỤNG THAN TRẠM KHÍ HÓA KHÍ TRONG KỲ
        </h4>
        <span class="text-xs text-slate-400 italic">Chi tiết từng lô than, sấy lò và tổng hợp cho 2 dây chuyền</span>
      </div>

      <!-- 1. DC1 30x60 -->
      ${renderCoalDetailBlock(s4.dc1_30x60, '1. Dây chuyền số 1 (Gạch ốp 300x600 mm):')}

      <!-- 2. DC2 50x50 -->
      ${renderCoalDetailBlock(s4.dc2_50x50, '2. Dây chuyền số 2 - Kích thước 500x500 mm:')}

      <!-- 3. DC2 40x80 -->
      ${renderCoalDetailBlock(s4.dc2_40x80, '3. Dây chuyền số 2 - Kích thước 400x800 mm:')}

      <!-- 4. DC2 60x60 nếu có -->
      ${s4.dc2_60x60 && (s4.dc2_60x60.all_rows || []).length > 0 ? renderCoalDetailBlock(s4.dc2_60x60, '4. Dây chuyền số 2 - Kích thước 600x600 mm:') : ''}

      <!-- TỔNG HỢP DC2 & TOÀN NHÀ MÁY -->
      <div class="mb-6">
        <h5 class="text-xs font-bold text-amber-300 mb-2">★ Tổng hợp sử dụng Than Dây chuyền 2 & Toàn bộ 2 Dây chuyền:</h5>
        <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60 shadow">
          <table class="table-excel-grid w-full text-center text-[11px]">
            <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
              <tr>
                <th class="p-2 border border-[#1e3a6a] text-left">Hạng Mục Tổng Hợp</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-white">Than Cục Cấp (Kg)</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-amber-200">Xuất Cám Xỉ (Kg)</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-emerald-400">Lĩnh Bù (Kg)</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-rose-400">Cám Vượt TC (Kg)</th>
                <th class="p-2 border border-[#1e3a6a] text-right font-bold text-cyan-300">Tổng Than Sử Dụng (Kg)</th>
                <th class="p-2 border border-[#1e3a6a] text-right text-white">Sản Lượng (m²)</th>
                <th class="p-2 border border-[#1e3a6a] text-right">Suất Than Cục</th>
                <th class="p-2 border border-[#1e3a6a] text-right">Suất Có Cám</th>
                <th class="p-2 border border-[#1e3a6a] text-right font-black text-emerald-300">Suất Tiêu Hao (Kg/m²)</th>
                <th class="p-2 border border-[#1e3a6a] text-center w-28">Đánh Giá</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
              <!-- DC2 Firing -->
              <tr class="bg-[#0c1a35] text-amber-200 font-bold">
                <td class="p-1.5 text-left border border-[#1e3a6a] uppercase">TỔNG TIÊU HAO DC2 KHÔNG TÍNH SẤY LÒ:</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-white">${formatNumber(s4.dc2_total?.sum_firing?.issued_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(s4.dc2_total?.sum_firing?.ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(s4.dc2_total?.sum_firing?.compensation_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(s4.dc2_total?.sum_firing?.excess_ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(s4.dc2_total?.sum_firing?.total_used_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-white">${formatNumber(s4.dc2_total?.sum_firing?.production_m2, 2)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(s4.dc2_total?.sum_firing?.rate_lump, 2)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(s4.dc2_total?.sum_firing?.rate_with_ash, 2)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(s4.dc2_total?.sum_firing?.rate_total, 2)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-center text-xs text-emerald-300">Khoán ✓</td>
              </tr>
              <!-- DC2 All (+ Sấy lò) -->
              <tr class="bg-[#102542] text-white font-bold">
                <td class="p-1.5 text-left border border-[#1e3a6a] uppercase text-amber-300">TỔNG SỬ DỤNG DC2 (+ SẤY LÒ):</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] font-black">${formatNumber(s4.dc2_total?.sum_all?.issued_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-200">${formatNumber(s4.dc2_total?.sum_all?.ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(s4.dc2_total?.sum_all?.compensation_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(s4.dc2_total?.sum_all?.excess_ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(s4.dc2_total?.sum_all?.total_used_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(s4.dc2_total?.sum_all?.production_m2, 2)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a]">${formatNumber(s4.dc2_total?.sum_all?.rate_lump, 2)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a]">${formatNumber(s4.dc2_total?.sum_all?.rate_with_ash, 2)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-amber-300">${formatNumber(s4.dc2_total?.sum_all?.rate_total, 2)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-center text-xs text-amber-300">DC2</td>
              </tr>
              <!-- 2DC Firing -->
              <tr class="bg-[#0b2b40] text-cyan-300 font-bold">
                <td class="p-1.5 text-left border border-[#1e3a6a] uppercase">TỔNG TIÊU HAO 2 DC KHÔNG TÍNH SẤY LÒ:</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-white">${formatNumber(s4.total_2dc?.sum_firing?.issued_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-200">${formatNumber(s4.total_2dc?.sum_firing?.ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(s4.total_2dc?.sum_firing?.compensation_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(s4.total_2dc?.sum_firing?.excess_ash_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(s4.total_2dc?.sum_firing?.total_used_weight, 0)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-white">${formatNumber(s4.total_2dc?.sum_firing?.production_m2, 2)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(s4.total_2dc?.sum_firing?.rate_lump, 2)}</td>
                <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(s4.total_2dc?.sum_firing?.rate_with_ash, 2)}</td>
                <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-300">${formatNumber(s4.total_2dc?.sum_firing?.rate_total, 2)}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-center text-xs text-emerald-300">Toàn NM</td>
              </tr>
              <!-- 2DC Grand Total -->
              <tr class="bg-[#051c2c] text-white font-bold text-xs">
                <td class="p-2 text-left border border-[#1e3a6a] uppercase font-black text-cyan-300">TỔNG SỬ DỤNG TOÀN BỘ 2 DÂY CHUYỀN (+ SẤY LÒ):</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(s4.total_2dc?.sum_all?.issued_weight, 0)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-amber-200">${formatNumber(s4.total_2dc?.sum_all?.ash_weight, 0)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(s4.total_2dc?.sum_all?.compensation_weight, 0)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-rose-400">${formatNumber(s4.total_2dc?.sum_all?.excess_ash_weight, 0)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(s4.total_2dc?.sum_all?.total_used_weight, 0)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(s4.total_2dc?.sum_all?.production_m2, 2)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-slate-200">${formatNumber(s4.total_2dc?.sum_all?.rate_lump, 2)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-slate-200">${formatNumber(s4.total_2dc?.sum_all?.rate_with_ash, 2)}</td>
                <td class="p-2 text-right font-mono font-black border border-[#1e3a6a] text-emerald-300">${formatNumber(s4.total_2dc?.sum_all?.rate_total, 2)}</td>
                <td class="p-2 border border-[#1e3a6a] text-center font-bold text-xs text-emerald-400">Đạt kế hoạch ✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PHẦN V: TÌNH HÌNH NHÂN SỰ & ĐỊNH BIÊN -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          V. TÌNH HÌNH NHÂN SỰ & BIẾN ĐỘNG ĐỊNH BIÊN
        </h4>
        <span class="text-xs text-slate-400 italic">Đơn vị tính: Người</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-[#1e3a6a]/60 shadow-lg mb-3">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">STT</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-left">Bộ Phận / Vị Trí</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] text-cyan-300 bg-[#0c1e3d]">Định Biên</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] text-emerald-300 bg-[#0c1e3d]">Tuyển Mới</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] text-amber-300 bg-[#0c1e3d]">Điều Chuyển</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] text-rose-300 bg-[#0c1e3d]">Nghỉ Việc</th>
              <th colspan="2" class="p-1.5 border border-[#1e3a6a] text-white bg-[#0c1e3d]">Hiện Tại</th>
            </tr>
            <tr class="bg-[#0e2246] text-slate-300">
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC1</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC2</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC1</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC2</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC1</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC2</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC1</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14">DC2</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14 text-cyan-300 font-bold">DC1</th>
              <th class="p-1.5 border border-[#1e3a6a] w-14 text-cyan-300 font-bold">DC2</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${hrRows.map((r, i) => `
              <tr class="hover:bg-[#13284d]/60">
                <td class="p-1.5 border border-[#1e3a6a] text-slate-400">${r.stt || i + 1}</td>
                <td class="p-1.5 border border-[#1e3a6a] text-left font-semibold text-white">${r.position}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono">${r.dinhbien_dc1 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono">${r.dinhbien_dc2 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-emerald-400">${r.tuyenmoi_dc1 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-emerald-400">${r.tuyenmoi_dc2 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-amber-400">${r.chuyen_dc1 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-amber-400">${r.chuyen_dc2 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-rose-400">${r.nghi_dc1 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono text-rose-400">${r.nghi_dc2 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono font-bold text-cyan-300">${r.hientai_dc1 || 0}</td>
                <td class="p-1.5 border border-[#1e3a6a] font-mono font-bold text-cyan-300">${r.hientai_dc2 || 0}</td>
              </tr>
            `).join('')}
            <tr class="bg-[#0c1a35] font-bold text-white text-xs">
              <td colspan="2" class="p-2 text-center uppercase border border-[#1e3a6a] font-black text-amber-300">TỔNG CỘNG NHÂN SỰ:</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black">${sumDinhBienDC1}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black">${sumDinhBienDC2}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-emerald-400">${sumTuyenMoiDC1}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-emerald-400">${sumTuyenMoiDC2}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-amber-400">${sumChuyenDC1}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-amber-400">${sumChuyenDC2}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-rose-400">${sumNghiDC1}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-rose-400">${sumNghiDC2}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-cyan-300">${sumHienTaiDC1}</td>
              <td class="p-2 border border-[#1e3a6a] font-mono font-black text-cyan-300">${sumHienTaiDC2}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="bg-[#0c1a35]/70 p-3 rounded-xl border border-[#1e3a6a] text-slate-300 text-xs leading-relaxed whitespace-pre-line">
        <span class="font-bold text-cyan-400 block mb-1">📌 Đánh giá & Ghi chú tình hình nhân sự:</span>
        ${s5.notes || 'Không có ghi chú.'}
      </div>
    </div>

    <!-- PHẦN VI: KẾ HOẠCH SẢN XUẤT THÁNG TIẾP THEO (CHUẨN TRANG 1 PDF) -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          VI. KẾ HOẠCH THỰC HIỆN ${s6.next_full_title || s6.next_title || 'THÁNG TIẾP THEO'} (LẦN 01)
        </h4>
        <span class="text-xs text-slate-400 italic">Đơn vị tính: m²</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-[#1e3a6a]/60 shadow-lg mb-3">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">DC</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-20">Kích Thước</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">ĐVT</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">Tổng Sản Lượng Ép</th>
              <th colspan="3" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-cyan-300">Sản Lượng Thu Hồi</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right bg-[#0c1e3d] text-white">Tổng (A1+A+B)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-16">Số Ngày SX</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">TB / Ngày (m²)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-emerald-400">A/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">C/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-rose-400">Huỷ/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-center w-16 text-amber-300">T/g Dừng 2MF (Phút/ngày)</th>
            </tr>
            <tr class="bg-[#0e2246] text-slate-300">
              <th class="p-1.5 border border-[#1e3a6a] text-right text-emerald-300">A1</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-blue-300">A</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-amber-300">B</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${planRowsHtml}
            <tr class="bg-[#0c1a35] font-bold text-white text-xs">
              <td rowspan="2" colspan="2" class="p-2 text-center uppercase border border-[#1e3a6a] font-black text-amber-300 align-middle">TỔNG KẾ HOẠCH 2 DC</td>
              <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(pTotM.sl_ep, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(pTotM.a1, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${formatNumber(pTotM.a, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(pTotM.b, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(pTotM.recovery_total, 0)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(pTotM.prod_days, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(pTotM.avg_per_day, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(pTotM.a_ep, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(pTotM.huy_ep, 1)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${pTotM.stop_time_2mf || 40}</td>
            </tr>
            <tr class="bg-[#0c1a35] text-slate-400 text-xs">
              <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(pTotP.a1, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(pTotP.a, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(pTotP.b, 1)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">100,00</td>
              <td colspan="3" class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(pTotM.a_ep, 1)}</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(pTotM.huy_ep, 1)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${pTotM.stop_time_2mf || 40}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="bg-[#0c1a35]/70 p-3 rounded-xl border border-[#1e3a6a] text-slate-300 text-xs leading-relaxed space-y-1">
        <span class="font-bold text-cyan-400 block mb-1">📝 Ghi chú Kế hoạch Sản xuất:</span>
        ${planNotes.map(n => `<div>• ${n}</div>`).join('')}
      </div>
    </div>

    <!-- PHẦN VII: MỤC TIÊU SẢN XUẤT THÁNG TIẾP THEO (CHUẨN TRANG 2 PDF) -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          VII. MỤC TIÊU THỰC HIỆN ${s7.next_full_title || s7.next_title || 'THÁNG TIẾP THEO'} & KẾ HOẠCH CÁC PHÒNG BAN
        </h4>
        <span class="text-xs text-slate-400 italic">Đơn vị tính: m²</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-[#1e3a6a]/60 shadow-lg mb-4">
        <table class="table-excel-grid w-full text-center text-[11px]">
          <thead class="bg-[#0b172a] text-slate-200 font-bold border-b border-[#1e3a6a]">
            <tr>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">DC</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-20">Kích Thước</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-12">ĐVT</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">Tổng Sản Lượng Ép</th>
              <th colspan="3" class="p-1.5 border border-[#1e3a6a] bg-[#0c1e3d] text-cyan-300">Sản Lượng Thu Hồi</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right bg-[#0c1e3d] text-white">Tổng (A1+A+B)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] w-16">Số Ngày SX</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">TB / Ngày (m²)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-emerald-400">A/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right">C/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-right text-rose-400">Huỷ/ép (%)</th>
              <th rowspan="2" class="p-2 border border-[#1e3a6a] text-center w-16 text-amber-300">T/g Dừng 2MF (Phút/ngày)</th>
            </tr>
            <tr class="bg-[#0e2246] text-slate-300">
              <th class="p-1.5 border border-[#1e3a6a] text-right text-emerald-300">A1</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-blue-300">A</th>
              <th class="p-1.5 border border-[#1e3a6a] text-right text-amber-300">B</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
            ${goalRowsHtml}
            <!-- TỔNG MỤC TIÊU DC 2 -->
            <tr class="bg-[#0c1a35] font-bold text-amber-300 text-xs">
              <td rowspan="2" colspan="2" class="p-2 text-center uppercase border border-[#1e3a6a] font-black align-middle">TỔNG MỤC TIÊU DC 2</td>
              <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(gTotDC2M.sl_ep, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(gTotDC2M.a1, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">-</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gTotDC2M.b, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(gTotDC2M.recovery_total, 0)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(gTotDC2M.prod_days, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(gTotDC2M.avg_per_day, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(gTotDC2M.a_ep, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(gTotDC2M.huy_ep, 2)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${gTotDC2M.stop_time_2mf || 25}</td>
            </tr>
            <tr class="bg-[#0c1a35] text-slate-400 text-xs">
              <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(gTotDC2P.a1, 2)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gTotDC2P.b, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">100,00</td>
              <td colspan="3" class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(gTotDC2M.a_ep, 1)}</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(gTotDC2M.huy_ep, 2)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${gTotDC2M.stop_time_2mf || 25}</td>
            </tr>
            <!-- TỔNG MỤC TIÊU 2 DC -->
            <tr class="bg-[#0c1a35] font-bold text-white text-xs">
              <td rowspan="2" colspan="2" class="p-2 text-center uppercase border border-[#1e3a6a] font-black text-cyan-300 align-middle">TỔNG MỤC TIÊU 2 DC</td>
              <td class="p-1.5 text-center border border-[#1e3a6a]">m²</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-white">${formatNumber(gTot2DCM.sl_ep, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-emerald-400">${formatNumber(gTot2DCM.a1, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-blue-400">${formatNumber(gTot2DCM.a, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gTot2DCM.b, 0)}</td>
              <td class="p-1.5 text-right font-mono font-black border border-[#1e3a6a] text-cyan-300">${formatNumber(gTot2DCM.recovery_total, 0)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a]">${formatNumber(gTot2DCM.prod_days, 2)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-300">${formatNumber(gTot2DCM.avg_per_day, 0)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(gTot2DCM.a_ep, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">-</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(gTot2DCM.huy_ep, 1)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${gTot2DCM.stop_time_2mf || 25}</td>
            </tr>
            <tr class="bg-[#0c1a35] text-slate-400 text-xs">
              <td class="p-1.5 text-center border border-[#1e3a6a]">%</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-emerald-400">${formatNumber(gTot2DCP.a1, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a]">${formatNumber(gTot2DCP.a, 1)}</td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-amber-400">${formatNumber(gTot2DCP.b, 1)}</td>
              <td class="p-1.5 text-right font-mono font-bold border border-[#1e3a6a] text-cyan-300">100,00</td>
              <td colspan="3" class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-emerald-400">${formatNumber(gTot2DCM.a_ep, 1)}</td>
              <td class="p-1.5 border border-[#1e3a6a]"></td>
              <td class="p-1.5 text-right font-mono border border-[#1e3a6a] text-rose-400">${formatNumber(gTot2DCM.huy_ep, 1)}</td>
              <td class="p-1.5 text-center font-mono border border-[#1e3a6a] text-amber-400">${gTot2DCM.stop_time_2mf || 25}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kế hoạch các phòng ban / phân xưởng thực hiện -->
      <h5 class="text-xs font-bold text-amber-400 mb-2">★ Kế hoạch các phòng ban / phân xưởng cần thực hiện trong kỳ:</h5>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${deptTasks.map(d => `
          <div class="bg-[#0c1a35]/80 p-3.5 rounded-xl border border-[#1e3a6a] shadow-sm">
            <h6 class="text-xs font-bold text-emerald-300 mb-1.5 flex items-center gap-1.5">
              <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i>
              ${d.dept}
            </h6>
            <div class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">${d.tasks}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- PHẦN VIII: ĐÁNH GIÁ & CHỮ KÝ 6 CẤP TRÌNH KÝ (CHUẨN TRANG 3 PDF) -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
        <h4 class="font-bold text-cyan-400 uppercase tracking-wider text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          VIII. ĐÁNH GIÁ KẾT QUẢ SẢN XUẤT & PHÊ DUYỆT TRÌNH KÝ
        </h4>
      </div>
      
      <div class="bg-[#0c1a35]/80 p-4 rounded-xl border border-[#1e3a6a] text-slate-200 text-xs leading-relaxed mb-6">
        <div class="font-bold text-cyan-400 mb-2 uppercase tracking-wide">Nhận Xét Tổng Thể Của Phân Xưởng:</div>
        <div class="whitespace-pre-line">${s8.content || 'Hoàn thành các chỉ tiêu sản xuất theo kế hoạch.'}</div>
        <div class="mt-3 italic text-slate-400">Trân trọng!</div>
      </div>

      <!-- Ngày tháng & Chữ ký 6 cấp -->
      <div class="bg-[#0c1a35]/90 p-4 rounded-xl border border-[#1e3a6a]">
        <div class="text-right text-xs italic text-slate-300 mb-6 font-serif">
          ${sigs.date_str || 'Đồng Nai, ngày 28 tháng 08 năm 2026'}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-6 gap-3 text-center mb-8">
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-amber-300 uppercase">${sigs.signer_1_title || 'TỔNG GIÁM ĐỐC'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký & Ghi rõ họ tên)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_1_name || ''}</div>
          </div>
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-amber-300 uppercase">${sigs.signer_2_title || 'P.TGĐ PT'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký duyệt)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_2_name || ''}</div>
          </div>
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-cyan-300 uppercase">${sigs.signer_3_title || 'PXCĐ-NL'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký xác nhận)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_3_name || ''}</div>
          </div>
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-cyan-300 uppercase">${sigs.signer_4_title || 'PXSX'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký xác nhận)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_4_name || ''}</div>
          </div>
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-cyan-300 uppercase">${sigs.signer_5_title || 'P.KT-CN'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký xác nhận)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_5_name || ''}</div>
          </div>
          <div class="p-2 border border-[#1e3a6a]/60 rounded-lg bg-[#071326]">
            <div class="font-bold text-[11px] text-emerald-300 uppercase">${sigs.signer_6_title || 'Người lập'}</div>
            <div class="h-16 flex items-end justify-center text-xs text-slate-400 italic pb-1">(Ký tên)</div>
            <div class="font-bold text-xs text-white">${sigs.signer_6_name || ''}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 pt-3 border-t border-[#1e3a6a]/60">
          <div>
            <span class="font-bold text-slate-300">Nơi gửi:</span>
            <ul class="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
              <li>Ông Tổng Giám Đốc Cty</li>
              <li>Các Ông Phó Tổng Giám Đốc</li>
              <li>Các Phòng ban / Phân xưởng</li>
            </ul>
          </div>
          <div>
            <span class="font-bold text-slate-300">Nơi lưu:</span>
            <ul class="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
              <li>Phòng TC - HC/ Ban ISO</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// ----------------------------------------------------
// INLINE EDIT & SAVE CUSTOM FORM MẪU DATA
// ----------------------------------------------------
function toggleFormMauEditMode() {
  isFormMauEditMode = !isFormMauEditMode;
  const btn = document.getElementById('btn-form-mau-edit');
  if (btn) {
    if (isFormMauEditMode) {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md hover:bg-amber-400 transition';
      btn.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5"></i><span>Lưu Thay Đổi</span>`;
      makeFormMauEditable(true);
    } else {
      saveFormMauCustomData();
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1.5 transition';
      btn.innerHTML = `<i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>Chỉnh Sửa Trực Tiếp</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }
}

function makeFormMauEditable(isEditable) {
  // Let the user edit fields or notes if in edit mode
}

async function saveFormMauCustomData() {
  if (!currentFormMauData) return;
  try {
    const payload = {
      period_type: formMauPeriodType,
      period_value: formMauPeriodValue,
      year: formMauYear,
      hr_data: currentFormMauData.section_5_hr?.table || [],
      notes_data: { hr_notes: currentFormMauData.section_5_hr?.notes },
      plan_data: currentFormMauData.section_6_plan?.data || {},
      goals_data: currentFormMauData.section_7_goals?.data || {},
      evaluation_data: currentFormMauData.section_8_evaluation?.content || '',
      signatures_data: currentFormMauData.section_8_evaluation?.signatures || {}
    };

    const res = await fetch('/api/report/form-mau/save-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      alert('Đã lưu dữ liệu Form Mẫu thành công!');
      loadFormMauData();
    } else {
      alert('Lỗi khi lưu: ' + (json.error || ''));
    }
  } catch (err) {
    console.error('Save custom err:', err);
    alert('Lỗi kết nối khi lưu dữ liệu: ' + err.message);
  }
}

// ----------------------------------------------------
// UPLOAD FILE EXCEL / PDF BÓC TÁCH
// ----------------------------------------------------
function openFormMauUploadModal() {
  const m = document.getElementById('modal-form-mau-upload');
  if (m) m.classList.remove('hidden');
}

function closeFormMauUploadModal() {
  const m = document.getElementById('modal-form-mau-upload');
  if (m) m.classList.add('hidden');
  selectedFormMauFile = null;
  const fName = document.getElementById('form-mau-upload-filename');
  if (fName) fName.innerText = 'Chưa chọn tệp tin nào';
  const logBox = document.getElementById('form-mau-upload-log');
  if (logBox) logBox.classList.add('hidden');
}

function handleFormMauFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedFormMauFile = file;
  const fName = document.getElementById('form-mau-upload-filename');
  if (fName) fName.innerText = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}

async function uploadAndExtractFormMau() {
  if (!selectedFormMauFile) {
    alert('Vui lòng chọn file Excel hoặc PDF trước khi bấm bóc tách!');
    return;
  }

  const btn = document.getElementById('btn-start-extract-form-mau');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Đang bóc tách...`;
  }

  const formData = new FormData();
  formData.append('file', selectedFormMauFile);
  formData.append('period_type', formMauPeriodType);
  formData.append('period_value', formMauPeriodValue);
  formData.append('year', formMauYear);

  try {
    const res = await fetch('/api/report/form-mau/import-excel', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    const logBox = document.getElementById('form-mau-upload-log');
    if (logBox) {
      logBox.classList.remove('hidden');
      logBox.innerHTML = (json.logs || []).map(l => `<div>• ${l}</div>`).join('');
    }

    if (json.success) {
      setTimeout(() => {
        closeFormMauUploadModal();
        loadFormMauData();
        alert('Trích xuất và nạp dữ liệu Form Mẫu thành công!');
      }, 1500);
    } else {
      alert('Lỗi: ' + (json.error || 'Không trích xuất được file'));
    }
  } catch (err) {
    console.error('Upload err:', err);
    alert('Lỗi khi tải file: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>Bắt Đầu Bóc Tách</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function downloadFormMauExcel() {
  window.location.href = `/api/export/form-mau-excel?period_type=${formMauPeriodType}&period_value=${formMauPeriodValue}&year=${formMauYear}`;
}

function quickExportSignOff() {
  downloadFormMauExcel();
}

// ----------------------------------------------------
// PRINT SIGNOFF REPORT (FORM MẪU TRÌNH KÝ 8 PHẦN A4)
// ----------------------------------------------------
function printSignOffReport() {
  const printableDiv = document.getElementById("form-mau-printable");
  if (!printableDiv) {
    window.print();
    return;
  }

  const title = (currentFormMauData && currentFormMauData.period_info && currentFormMauData.period_info.period_title) 
    ? `BÁO CÁO TỔNG HỢP KẾT QUẢ SẢN XUẤT ${currentFormMauData.period_info.period_title}` 
    : `BÁO CÁO KẾT QUẢ SẢN XUẤT TRÌNH KÝ BAN GIÁM ĐỐC`;

  const contentHtml = printableDiv.innerHTML;
  const printHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title} - Phương Nam</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 10px; background: #fff; }
    .print-bar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 8px; }
    .btn-print-action { background: #0284c7; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; }
    th, td { border: 1px solid #475569; padding: 3px 5px; }
    th { background: #0f2a4a !important; color: white !important; text-align: center; }
    .table-excel-grid th { background: #0f2a4a !important; color: white !important; }
    .table-excel-grid td { color: #0f172a !important; }
    .no-print { display: none !important; }
    @media print { .print-bar { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-print-action" onclick="window.print()">🖨️ Bấm để In / Lưu PDF ngay</button>
  </div>
  ${contentHtml}
</body>
</html>
  `;

  openPrintWindow(printHtml);
}


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
    const used = Number(r.total_used_weight || (issued + ash + comp - excess));
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
  const rateWithAshFiring = sumM2Firing > 0 ? ((sumLumpFiring + sumAshFiring - sumExcessFiring) / sumM2Firing) : 0;
  const rateTotalFiring = sumM2Firing > 0 ? (sumUsedFiring / sumM2Firing) : 0;

  const rateLumpAll = totalM2All > 0 ? (totalIssuedAll / totalM2All) : 0;
  const rateWithAshAll = totalM2All > 0 ? ((totalIssuedAll + totalAshAll - sumExcessFiring) / totalM2All) : 0;
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
    const totalUsed = Number(r.total_used_weight || (issued + ash + comp - excess));
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

  // Open Print Window
  openPrintWindow(printHtml);
}

// ==========================================
// 7. COMPREHENSIVE PRINT & EXPORT PDF ENGINE FOR ALL TABS
// ==========================================

function openPrintWindow(htmlContent) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
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
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 400);
}

function createPrintDocumentHtml({
  title,
  subTitle,
  periodInfo,
  kpiCardsHtml = "",
  tableHtml,
  orientation = "landscape",
  signatures = null
}) {
  const now = new Date();
  const dateStr = `Đồng Nai, ngày ${now.getDate()} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

  const defaultSignatures = signatures || [
    { title: "NGƯỜI LẬP BIỂU", sub: "(Ký, ghi rõ họ tên)" },
    { title: "PT.BP TỔNG HỢP / THK", sub: "(Ký, ghi rõ họ tên)" },
    { title: "QUẢN ĐỐC PHÂN XƯỞNG", sub: "(Ký, ghi rõ họ tên)" },
    { title: "BAN GIÁM ĐỐC DUYỆT", sub: "(Ký, đóng dấu)" }
  ];

  const sigHtml = `
    <div class="signature-grid">
      ${defaultSignatures.map(s => `
        <div class="sig-col">
          <div class="sig-title">${s.title}</div>
          <div class="sig-sub">${s.sub}</div>
          <div class="sig-space"></div>
        </div>
      `).join("")}
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title} - Phương Nam</title>
  <style>
    @page {
      size: A4 ${orientation};
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
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .title-box .sub {
      font-size: 11px;
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
    .row-total-main {
      background: #e6f4ea !important;
      font-weight: bold;
      border-top: 2px solid #16a34a !important;
      border-bottom: 2px solid #16a34a !important;
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
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: 800; font-size: 11.5px; text-transform: uppercase;">CÔNG TY CỔ PHẦN GẠCH MEN PHƯƠNG NAM</div>
        <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #1e3a8a; margin-top: 2px;">PHÂN XƯỞNG SẢN XUẤT MEN & XƯƠNG</div>
        <div style="font-size: 9px; margin-top: 1px;">❖❖❖</div>
      </td>
      <td style="width: 4%;"></td>
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: 800; font-size: 11.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: 700; font-size: 10.5px; text-decoration: underline; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size: 10px; font-style: italic; margin-top: 3px;">${dateStr}</div>
      </td>
    </tr>
  </table>

  <!-- TITLE -->
  <div class="title-box">
    <h1>${title}</h1>
    <div class="sub">${subTitle || ''} ${periodInfo ? `&nbsp;|&nbsp; ${periodInfo}` : ''}</div>
  </div>

  ${kpiCardsHtml}

  <!-- DATA TABLE -->
  ${tableHtml}

  <!-- SIGNATURES -->
  ${sigHtml}
</body>
</html>
  `;
}

// Master Router for Global Top Bar Button
function printCurrentActiveTab() {
  switch (currentTab) {
    case "dashboard":
      printDashboardReport();
      break;
    case "summary":
      printSummaryReport();
      break;
    case "brands":
      printBrandsReport();
      break;
    case "consumption":
      printConsumptionReport();
      break;
    case "coal":
      printCoalReport();
      break;
    case "export-report":
      printSignOffReport();
      break;
    case "master-data":
      printNormsReport();
      break;
    default:
      printDashboardReport();
  }
}

// 1. PRINT DASHBOARD SUMMARY
function printDashboardReport() {
  const kpiM2 = document.getElementById("dash-kpi-m2-val")?.innerText || "-";
  const kpiA1 = document.getElementById("dash-kpi-a1-val")?.innerText || "-";
  const kpiStop = document.getElementById("dash-kpi-stop-val")?.innerText || "-";
  const kpiCoal = document.getElementById("dash-kpi-coal-val")?.innerText || "-";

  const kpiHtml = `
    <div class="kpi-cards">
      <div class="kpi-card" style="border-left: 3px solid #10b981;">
        <div class="kpi-title">Tổng sản lượng thu hồi</div>
        <div class="kpi-val" style="color: #059669;">${kpiM2}</div>
        <div class="kpi-sub">Kỳ 2026</div>
      </div>
      <div class="kpi-card" style="border-left: 3px solid #06b6d4;">
        <div class="kpi-title">Tỷ lệ A1 bình quân</div>
        <div class="kpi-val" style="color: #0891b2;">${kpiA1}</div>
        <div class="kpi-sub">Chất lượng cao</div>
      </div>
      <div class="kpi-card" style="border-left: 3px solid #f59e0b;">
        <div class="kpi-title">Tiêu hao than cục</div>
        <div class="kpi-val" style="color: #d97706;">${kpiCoal}</div>
        <div class="kpi-sub">Nung lò</div>
      </div>
      <div class="kpi-card" style="border-left: 3px solid #6366f1;">
        <div class="kpi-title">Thời gian dừng máy</div>
        <div class="kpi-val" style="color: #4f46e5;">${kpiStop}</div>
        <div class="kpi-sub">Bảo dưỡng & Sự cố</div>
      </div>
    </div>
  `;

  // Get Summary Section Table Data
  let summaryRows = "";
  if (rawSummaryData && rawSummaryData.length > 0) {
    let sumEp = 0, sumA1 = 0, sumA = 0, sumB = 0, sumTong = 0;
    rawSummaryData.forEach((r, idx) => {
      const slEp = Number(r.sl_ep || 0);
      const a1 = Number(r.a1 || 0);
      const a = Number(r.a || 0);
      const b = Number(r.b || 0);
      const tong = Number(r.recovery_total || (a1 + a + b));
      sumEp += slEp; sumA1 += a1; sumA += a; sumB += b; sumTong += tong;

      summaryRows += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center; font-weight: bold;">${r.line || ''}</td>
          <td style="text-align: center;">${r.size || ''}</td>
          <td>${r.product_line || 'Phương Nam'}</td>
          <td style="text-align: center;">${r.data_type || 'Thực hiện'}</td>
          <td style="text-align: right;">${formatNumber(slEp, 2)}</td>
          <td style="text-align: right; font-weight: bold; color: #16a34a;">${formatNumber(a1, 2)}</td>
          <td style="text-align: right;">${formatNumber(a, 2)}</td>
          <td style="text-align: right;">${formatNumber(b, 2)}</td>
          <td style="text-align: right; font-weight: bold;">${formatNumber(tong, 2)}</td>
          <td style="text-align: right; font-weight: bold; color: #0284c7;">${tong > 0 ? formatNumber(a1 / tong * 100, 2) : '-'}%</td>
        </tr>
      `;
    });

    const pctA1Total = sumTong > 0 ? (sumA1 / sumTong * 100) : 0;
    summaryRows += `
      <tr class="row-total-main">
        <td colspan="5" style="text-align: center; text-transform: uppercase;">TỔNG CỘNG TOÀN NHÀ MÁY</td>
        <td style="text-align: right;">${formatNumber(sumEp, 2)}</td>
        <td style="text-align: right; color: #166534;">${formatNumber(sumA1, 2)}</td>
        <td style="text-align: right;">${formatNumber(sumA, 2)}</td>
        <td style="text-align: right;">${formatNumber(sumB, 2)}</td>
        <td style="text-align: right; color: #0f172a; font-size: 11px;">${formatNumber(sumTong, 2)}</td>
        <td style="text-align: right; color: #0284c7; font-size: 11px;">${formatNumber(pctA1Total, 2)}%</td>
      </tr>
    `;
  } else {
    summaryRows = `<tr><td colspan="11" style="text-align: center; padding: 15px;">Chưa nạp dữ liệu</td></tr>`;
  }

  const tableHtml = `
    <div style="font-weight: 800; font-size: 12px; text-transform: uppercase; color: #0f2a4a; margin-bottom: 6px;">
      I. KẾT QUẢ SẢN XUẤT & THU HỒI TỔNG HỢP (m²)
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px;">STT</th>
          <th style="width: 50px;">Dây Chuyền</th>
          <th style="width: 55px;">Kích Thước</th>
          <th>Dòng Sản Phẩm</th>
          <th style="width: 65px;">Loại Số Liệu</th>
          <th style="width: 75px;">SL Ép (m²)</th>
          <th style="width: 75px;">A1 (m²)</th>
          <th style="width: 70px;">A (m²)</th>
          <th style="width: 70px;">B (m²)</th>
          <th style="width: 80px;">Tổng Thu Hồi (m²)</th>
          <th style="width: 65px;">% A1</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
  `;

  const html = createPrintDocumentHtml({
    title: "BÁO CÁO TỔNG HỢP KẾT QUẢ SẢN XUẤT NĂM 2026",
    subTitle: "Dây chuyền 1 & Dây chuyền 2 - Công ty CP Gạch Men Phương Nam",
    periodInfo: "Kỳ báo cáo: 01/01/2026 - 31/08/2026",
    kpiCardsHtml: kpiHtml,
    tableHtml: tableHtml,
    orientation: "landscape"
  });

  openPrintWindow(html);
}

// 2. PRINT SUMMARY REPORT (TAB 2)
function printSummaryReport() {
  if (!rawSummaryData || rawSummaryData.length === 0) {
    alert("Không có dữ liệu sản lượng để in! Vui lòng tải lại trang hoặc chọn kỳ khác.");
    return;
  }

  const month = document.getElementById("summary-filter-month")?.value || "all";
  const line = document.getElementById("summary-filter-line")?.value || "all";
  const size = document.getElementById("summary-filter-size")?.value || "all";

  const monthStr = month === "all" ? "Tất cả các kỳ (T1 - T8)" : `Tháng ${month.padStart(2, '0')}`;
  const lineStr = line === "all" ? "Toàn bộ DC1 & DC2" : `Dây chuyền ${line}`;
  const sizeStr = size === "all" ? "Tất cả kích thước" : `Kích thước ${size}`;

  let sumEp = 0, sumA1 = 0, sumA = 0, sumB = 0, sumTong = 0;
  const rowsHtml = rawSummaryData.map((r, idx) => {
    const slEp = Number(r.sl_ep || 0);
    const a1 = Number(r.a1 || 0);
    const a = Number(r.a || 0);
    const b = Number(r.b || 0);
    const tong = Number(r.recovery_total || (a1 + a + b));
    sumEp += slEp; sumA1 += a1; sumA += a; sumB += b; sumTong += tong;

    const pctA1 = tong > 0 ? (a1 / tong * 100) : 0;
    const pctA = tong > 0 ? (a / tong * 100) : 0;
    const pctB = tong > 0 ? (b / tong * 100) : 0;

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center; font-weight: bold;">${r.line}</td>
        <td style="text-align: center;">${r.size}</td>
        <td>${r.product_line || 'Phương Nam'}</td>
        <td style="text-align: center;">${r.data_type || 'Thực hiện'}</td>
        <td style="text-align: right;">${formatNumber(slEp, 2)}</td>
        <td style="text-align: right; font-weight: bold; color: #16a34a;">${formatNumber(a1, 2)}</td>
        <td style="text-align: right;">${formatNumber(a, 2)}</td>
        <td style="text-align: right;">${formatNumber(b, 2)}</td>
        <td style="text-align: right; font-weight: bold;">${formatNumber(tong, 2)}</td>
        <td style="text-align: right; font-weight: bold; color: #16a34a;">${formatNumber(pctA1, 2)}%</td>
        <td style="text-align: right;">${formatNumber(pctA, 2)}%</td>
        <td style="text-align: right; color: #d97706;">${formatNumber(pctB, 2)}%</td>
        <td style="text-align: center;">${formatNumber(r.prod_days, 1)}</td>
        <td style="text-align: center;">${formatNumber(r.stop_time_2mf, 0)}</td>
      </tr>
    `;
  }).join("");

  const pctA1All = sumTong > 0 ? (sumA1 / sumTong * 100) : 0;
  const pctAAll = sumTong > 0 ? (sumA / sumTong * 100) : 0;
  const pctBAll = sumTong > 0 ? (sumB / sumTong * 100) : 0;

  const tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 25px;">STT</th>
          <th rowspan="2" style="width: 45px;">DC</th>
          <th rowspan="2" style="width: 55px;">Kích Thước</th>
          <th rowspan="2">Dòng Sản Phẩm</th>
          <th rowspan="2" style="width: 60px;">Loại Số Liệu</th>
          <th rowspan="2" style="width: 75px;">SL Ép (m²)</th>
          <th colspan="4">KẾT QUẢ THU HỒI (m²)</th>
          <th colspan="3">TỶ LỆ THU HỒI (%)</th>
          <th rowspan="2" style="width: 50px;">Ngày SX</th>
          <th rowspan="2" style="width: 50px;">Dừng (p/ng)</th>
        </tr>
        <tr>
          <th style="width: 70px;">A1</th>
          <th style="width: 65px;">A</th>
          <th style="width: 65px;">B</th>
          <th style="width: 75px;">Tổng (m²)</th>
          <th style="width: 50px;">% A1</th>
          <th style="width: 50px;">% A</th>
          <th style="width: 50px;">% B</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr class="row-total-main">
          <td colspan="5" style="text-align: center; text-transform: uppercase;">TỔNG CỘNG</td>
          <td style="text-align: right;">${formatNumber(sumEp, 2)}</td>
          <td style="text-align: right; color: #166534;">${formatNumber(sumA1, 2)}</td>
          <td style="text-align: right;">${formatNumber(sumA, 2)}</td>
          <td style="text-align: right;">${formatNumber(sumB, 2)}</td>
          <td style="text-align: right; color: #0f172a; font-size: 11px;">${formatNumber(sumTong, 2)}</td>
          <td style="text-align: right; color: #166534; font-size: 11px;">${formatNumber(pctA1All, 2)}%</td>
          <td style="text-align: right;">${formatNumber(pctAAll, 2)}%</td>
          <td style="text-align: right; color: #b45309;">${formatNumber(pctBAll, 2)}%</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  `;

  const html = createPrintDocumentHtml({
    title: "BÁO CÁO KẾT QUẢ SẢN XUẤT & TỶ LỆ THU HỒI",
    subTitle: "Phân xưởng sản xuất 2 Dây chuyền",
    periodInfo: `Kỳ: <b>${monthStr}</b> &nbsp;|&nbsp; <b>${lineStr}</b> &nbsp;|&nbsp; <b>${sizeStr}</b>`,
    tableHtml: tableHtml,
    orientation: "landscape"
  });

  openPrintWindow(html);
}

// 3. PRINT BRANDS REPORT (TAB 3)
function printBrandsReport() {
  if (!rawBrandsData || rawBrandsData.length === 0) {
    alert("Không có dữ liệu thương hiệu để in!");
    return;
  }

  const month = document.getElementById("brands-filter-month")?.value || "8";
  const line = document.getElementById("brands-filter-line")?.value || "all";
  const size = document.getElementById("brands-filter-size")?.value || "all";

  const monthStr = month === "all" ? "Tất cả kỳ" : `Tháng ${month.padStart(2, '0')}`;
  const lineStr = line === "all" ? "Toàn bộ DC1 & DC2" : `Dây chuyền ${line}`;
  const sizeStr = size === "all" ? "Tất cả kích thước" : `Kích thước ${size}`;

  let sumA1 = 0, sumA = 0, sumB = 0, grandTotal = 0;
  rawBrandsData.forEach(r => {
    const q = Number(r.quantity_m2 || 0);
    grandTotal += q;
    if (r.grade === "A1") sumA1 += q;
    else if (r.grade === "A") sumA += q;
    else if (r.grade === "B") sumB += q;
  });

  const pctA1 = grandTotal > 0 ? (sumA1 / grandTotal * 100) : 0;
  const pctA = grandTotal > 0 ? (sumA / grandTotal * 100) : 0;
  const pctB = grandTotal > 0 ? (sumB / grandTotal * 100) : 0;

  const rowsHtml = rawBrandsData.map((r, idx) => {
    const q = Number(r.quantity_m2 || 0);
    const gradeBadge = r.grade === 'A1' 
      ? '<span style="display:inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 10px;">A1</span>'
      : (r.grade === 'A'
        ? '<span style="display:inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; font-size: 10px;">A</span>'
        : '<span style="display:inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 10px;">B</span>');

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center;">${r.month || month}/${r.year || 2026}</td>
        <td style="text-align: center; font-weight: bold;">${r.line}</td>
        <td style="text-align: center;">${r.size || '-'}</td>
        <td>${r.glaze_type || 'Phương Nam'}</td>
        <td style="font-weight: 600;">${r.brand_name}</td>
        <td style="text-align: center;">${gradeBadge}</td>
        <td style="text-align: right; font-weight: bold;">${formatNumber(q, 2)}</td>
      </tr>
    `;
  }).join("");

  const tableHtml = `
    <div style="margin-bottom: 12px; display: flex; gap: 12px; font-size: 11px;">
      <div style="flex: 1; padding: 8px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
        <span style="color: #166534; font-weight: bold;">Tổng Loại A1:</span> <b>${formatNumber(sumA1, 2)} m²</b> (${formatNumber(pctA1, 2)}%)
      </div>
      <div style="flex: 1; padding: 8px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
        <span style="color: #1e40af; font-weight: bold;">Tổng Loại A:</span> <b>${formatNumber(sumA, 2)} m²</b> (${formatNumber(pctA, 2)}%)
      </div>
      <div style="flex: 1; padding: 8px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
        <span style="color: #92400e; font-weight: bold;">Tổng Loại B:</span> <b>${formatNumber(sumB, 2)} m²</b> (${formatNumber(pctB, 2)}%)
      </div>
      <div style="flex: 1.2; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
        <span style="color: #0f172a; font-weight: bold;">Tổng Toàn Bộ:</span> <b style="color: #0284c7; font-size: 12px;">${formatNumber(grandTotal, 2)} m²</b>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px;">STT</th>
          <th style="width: 60px;">Kỳ</th>
          <th style="width: 45px;">DC</th>
          <th style="width: 65px;">Kích Thước</th>
          <th>Dòng Men / Sản Phẩm</th>
          <th>Tên Thương Hiệu / Nhãn Hàng</th>
          <th style="width: 60px;">Loại</th>
          <th style="width: 105px;">Sản Lượng (m²)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr class="row-total-main">
          <td colspan="7" style="text-align: center; text-transform: uppercase;">TỔNG CỘNG SẢN LƯỢNG THƯƠNG HIỆU</td>
          <td style="text-align: right; color: #0284c7; font-size: 12px; font-weight: bold;">${formatNumber(grandTotal, 2)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  const html = createPrintDocumentHtml({
    title: "BÁO CÁO SẢN LƯỢNG THEO DÒNG SẢN PHẨM & THƯƠNG HIỆU",
    subTitle: "Chi tiết cơ cấu phân loại thương hiệu theo dây chuyền và kích thước",
    periodInfo: `Kỳ: <b>${monthStr}</b> &nbsp;|&nbsp; <b>${lineStr}</b> &nbsp;|&nbsp; <b>${sizeStr}</b>`,
    tableHtml: tableHtml,
    orientation: "portrait"
  });

  openPrintWindow(html);
}

// 4. PRINT CONSUMPTION REPORT (TAB 4)
function printConsumptionReport() {
  if (!rawConsumptionData || rawConsumptionData.length === 0) {
    alert("Không có dữ liệu tiêu hao vật tư để in!");
    return;
  }

  const month = document.getElementById("consumption-filter-month")?.value || "8";
  const line = document.getElementById("consumption-filter-line")?.value || "all";
  const size = document.getElementById("consumption-filter-size")?.value || "all";

  const monthStr = month === "all" ? "Tất cả kỳ" : `Tháng ${month.padStart(2, '0')}`;
  const lineStr = line === "all" ? "Toàn bộ DC1 & DC2" : `Dây chuyền ${line}`;
  const sizeStr = size === "all" ? "Tất cả kích thước" : `Kích thước ${size}`;

  const rowsHtml = rawConsumptionData.map((r, idx) => {
    const hasData = (Number(r.used_qty) > 0) || (Number(r.actual_rate) > 0);
    const prodM2 = Number(r.prod_qty || r.calculated_m2 || 0);
    const diff = Number(r.diff_qty || 0);
    const diffStr = diff !== 0 ? (diff > 0 ? `+${formatNumber(diff, 2)}` : `${formatNumber(diff, 2)}`) : "-";
    const diffColor = diff < 0 ? "#15803d" : (diff > 0 ? "#b91c1c" : "#64748b");
    const diffBg = diff < 0 ? "#f0fdf4" : (diff > 0 ? "#fef2f2" : "transparent");
    const isSave = diff <= 0;
    const statusBadge = hasData 
      ? (isSave 
          ? '<span style="display:inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 10px;">Đạt định mức ✓</span>'
          : '<span style="display:inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 10px;">Vượt định mức ✗</span>')
      : '<span style="display:inline-block; padding: 2px 6px; font-size: 10px; color: #64748b;">Chưa nhập liệu</span>';

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center;">${r.month || month}/${r.year || 2026}</td>
        <td style="text-align: center; font-weight: bold;">${r.line || ''}</td>
        <td style="text-align: center;">${r.size || '-'}</td>
        <td style="font-weight: 600;">${r.material_name}</td>
        <td style="text-align: center;">${r.unit || 'Kg'}</td>
        <td style="text-align: right; font-weight: bold;">${formatNumber(Number(r.norm_value || 0), 4)}</td>
        <td style="text-align: right;">${Number(r.used_qty) > 0 ? formatNumber(Number(r.used_qty), 2) : '-'}</td>
        <td style="text-align: right; font-weight: 600;">${prodM2 > 0 ? formatNumber(prodM2, 2) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #0284c7;">${Number(r.actual_rate) > 0 ? formatNumber(Number(r.actual_rate), 4) : '-'}</td>
        <td style="text-align: right; font-weight: bold; color: ${diffColor}; background: ${diffBg};">${diffStr}</td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
    `;
  }).join("");

  const tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25px;">STT</th>
          <th style="width: 50px;">Kỳ</th>
          <th style="width: 40px;">DC</th>
          <th style="width: 55px;">Kích Thước</th>
          <th>Nguyên Liệu / Vật Tư</th>
          <th style="width: 40px;">ĐVT</th>
          <th style="width: 75px;">Định Mức Kỳ</th>
          <th style="width: 80px;">Lượng Sử Dụng</th>
          <th style="width: 85px;">SL Tính Tiêu Hao (m²)</th>
          <th style="width: 80px;">Tiêu Hao Thực Tế</th>
          <th style="width: 85px;">Vượt (+) / Giảm (-)</th>
          <th style="width: 90px;">Trạng Thái</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const html = createPrintDocumentHtml({
    title: "BÁO CÁO TIÊU HAO NGUYÊN VẬT TƯ SẢN XUẤT",
    subTitle: "Báo cáo chi tiết định mức, thực tế tiêu hao và đánh giá vượt/giảm",
    periodInfo: `Kỳ: <b>${monthStr}</b> &nbsp;|&nbsp; <b>${lineStr}</b> &nbsp;|&nbsp; <b>${sizeStr}</b>`,
    tableHtml: tableHtml,
    orientation: "landscape"
  });

  openPrintWindow(html);
}

// (printSignOffReport defined in Tab 8 section)

// 6. PRINT NORMS MASTER REPORT (TAB 7)
function printNormsReport() {
  if (!currentNormDetailsList || currentNormDetailsList.length === 0) {
    alert("Không có dữ liệu định mức để in! Vui lòng chọn phiên bản khác.");
    return;
  }

  const verCode = currentNormInfo.version_code || "DM";
  const verName = currentNormInfo.version_name || "Định mức tiêu hao";
  const m = currentNormInfo.effective_from_month || 1;
  const y = currentNormInfo.effective_from_year || 2026;
  const lineLabel = currentNormInfo.line || normLineFilter || "Chung";
  const sizeLabel = currentNormInfo.size || normSizeFilter || "Đa KT";

  const rowsHtml = currentNormDetailsList.map((d, idx) => {
    const val = formatSmartDecimal(d.norm_value);
    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 600;">${d.material_name}</td>
        <td style="text-align: center; font-weight: bold;">${d.line}</td>
        <td style="text-align: center;">${d.size}</td>
        <td style="text-align: center;">${d.unit}</td>
        <td style="text-align: right; font-weight: bold; color: #0284c7; font-size: 11px;">${val}</td>
        <td>${d.description || ''}</td>
      </tr>
    `;
  }).join("");

  const tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px;">STT</th>
          <th>Tên Nguyên Liệu / Vật Tư</th>
          <th style="width: 60px;">Dây Chuyền</th>
          <th style="width: 65px;">Kích Thước</th>
          <th style="width: 55px;">ĐVT</th>
          <th style="width: 110px;">Định Mức Quy Định (Kg/m²)</th>
          <th style="width: 140px;">Ghi Chú</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const html = createPrintDocumentHtml({
    title: "BẢNG ĐỊNH MỨC TIÊU HAO NGUYÊN LIỆU, MEN, XƯƠNG VÀ VẬT TƯ",
    subTitle: `Phiên bản: <b>${verCode}</b> - ${verName}`,
    periodInfo: `Dây chuyền: <b>${lineLabel}</b> &nbsp;|&nbsp; Kích thước: <b>${sizeLabel}</b> &nbsp;|&nbsp; Hiệu lực: <b>Tháng ${m}/${y}</b>`,
    tableHtml: tableHtml,
    orientation: "portrait"
  });

  openPrintWindow(html);
}

