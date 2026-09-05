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

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
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

function getUsersDb() {
  try {
    const raw = localStorage.getItem("px_users_db_v3");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading users db:", e);
  }
  saveUsersDb(DEFAULT_USERS_DB);
  return DEFAULT_USERS_DB;
}

function saveUsersDb(users) {
  try {
    localStorage.setItem("px_users_db_v3", JSON.stringify(users));
  } catch (e) {
    console.error("Error saving users db:", e);
  }
}

function getActiveUser() {
  const users = getUsersDb();
  const sessionUsername = localStorage.getItem("px_auth_session") || "admin";
  const user = users.find(u => u.username === sessionUsername) || users[0];
  return user;
}

let currentAuthUser = getActiveUser();
let currentRole = currentAuthUser ? currentAuthUser.role : "admin";

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
  
  // Update current user role temporarily for test
  if (currentAuthUser) {
    currentAuthUser.role = roleKey;
  }
  applyRolePermissions();
}

function applyRolePermissions() {
  currentAuthUser = getActiveUser();
  const role = ROLES_INFO[currentRole] || ROLES_INFO.admin;

  // Sync role dropdowns
  const topSel = document.getElementById("user-role-select");
  if (topSel && topSel.value !== currentRole) topSel.value = currentRole;

  const adminSel = document.getElementById("admin-role-select");
  if (adminSel && adminSel.value !== currentRole) adminSel.value = currentRole;

  // Update Sidebar User Profile Card
  const userNameEl = document.getElementById("auth-user-name");
  const userAvatarEl = document.getElementById("auth-user-avatar");
  const roleBadgeEl = document.getElementById("auth-role-badge");
  const roleTextEl = document.getElementById("auth-role-text");

  if (userNameEl && currentAuthUser) userNameEl.innerText = currentAuthUser.fullname;
  if (userAvatarEl && currentAuthUser) {
    userAvatarEl.innerText = currentAuthUser.avatar || "AD";
    userAvatarEl.className = `w-7 h-7 rounded-full ${currentAuthUser.avatarBg || 'bg-rose-700'} text-white flex items-center justify-center text-xs font-black shadow shrink-0`;
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

// ==========================================
// AUTHENTICATION MODAL & LOGOUT CONTROLLER
// ==========================================
function handleLogout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?")) {
    localStorage.removeItem("px_auth_session");
    openModal("modal-login");
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
  
  closeModal("modal-login");
  applyRolePermissions();
  renderAccountsTable();
  alert(`Đăng nhập thành công! Chào mừng ${user.fullname} (${user.roleName || user.title}).`);
}

function quickLogin(username, pin) {
  document.getElementById("login-username").value = username;
  document.getElementById("login-password").value = pin;
  handleManualLogin();
}

function openChangePasswordModal() {
  const user = getActiveUser();
  document.getElementById("cp-old-pass").value = "";
  document.getElementById("cp-new-pass").value = "";
  document.getElementById("cp-confirm-pass").value = "";
  const errEl = document.getElementById("cp-error-msg");
  if (errEl) errEl.classList.add("hidden");
  openModal("modal-change-password");
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
  alert("Chúc mừng! Bạn đã đổi mật khẩu thành công.");
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
  if (window.lucide) lucide.createIcons();
}

function closeModal(modalId) {
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
  applyRolePermissions();
  renderAccountsTable();
  try { loadDashboardData(); } catch(e) { console.error("loadDashboardData err:", e); }
  try { loadSummaryData(); } catch(e) { console.error("loadSummaryData err:", e); }
  try { loadBrandsData(); } catch(e) { console.error("loadBrandsData err:", e); }
  try { loadNormVersions(); } catch(e) { console.error("loadNormVersions err:", e); }
  try { loadConsumptionData(); } catch(e) { console.error("loadConsumptionData err:", e); }
  try { loadCoalData(); } catch(e) { console.error("loadCoalData err:", e); }
  try { renderFormMauPreview(); } catch(e) { console.error("renderFormMauPreview err:", e); }
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
    applyRolePermissions();
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
        <h4 class="font-bold text-emerald-400 uppercase mb-2 border-b border-[#1e3a6a] pb-1 tracking-wider text-xs">I. KẾT QUẢ SẢN XUẤT TỔNG HỢP</h4>
        <div class="overflow-x-auto rounded-lg border border-[#1e3a6a]/60">
          <table class="table-excel-grid w-full text-center text-[11px]">
            <thead class="bg-[#0b172a] text-slate-300 font-bold">
              <tr>
                <th class="p-2 text-center align-middle">Dây Chuyền</th>
                <th class="p-2 text-center align-middle">Kích Thước</th>
                <th class="p-2 text-center align-middle">Dòng Sản Phẩm</th>
                <th class="p-2 text-center align-middle">Loại Số Liệu</th>
                <th class="p-2 text-right align-middle">SL Ép (m²)</th>
                <th class="p-2 text-right align-middle">A1 (m²)</th>
                <th class="p-2 text-right align-middle">A (m²)</th>
                <th class="p-2 text-right align-middle">B (m²)</th>
                <th class="p-2 text-right align-middle">Tổng (m²)</th>
                <th class="p-2 text-center align-middle">Ngày SX</th>
                <th class="p-2 text-center align-middle">Dừng (p/ng)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e3a6a]/40 text-slate-200">
              ${rows.map(r => `
                <tr class="hover:bg-[#13284d]/60">
                  <td class="p-1.5 font-bold">${r.line}</td>
                  <td class="p-1.5">${r.size}</td>
                  <td class="p-1.5">${r.product_line || 'Phương Nam'}</td>
                  <td class="p-1.5 font-semibold ${r.data_type === 'Thực hiện' ? 'text-emerald-400' : 'text-cyan-400'}">${r.data_type}</td>
                  <td class="p-1.5 text-right font-mono">${formatNumber(r.sl_ep, 2)}</td>
                  <td class="p-1.5 text-right font-mono font-bold text-emerald-400">${formatNumber(r.a1, 2)}</td>
                  <td class="p-1.5 text-right font-mono">${formatNumber(r.a, 2)}</td>
                  <td class="p-1.5 text-right font-mono text-amber-400">${formatNumber(r.b, 2)}</td>
                  <td class="p-1.5 text-right font-mono font-bold text-white">${formatNumber(r.recovery_total, 2)}</td>
                  <td class="p-1.5 font-mono">${formatNumber(r.prod_days, 1)}</td>
                  <td class="p-1.5 font-mono">${formatNumber(r.stop_time_2mf, 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Phần II: Ghi Chú Đánh Giá -->
      <div class="mt-4">
        <h4 class="font-bold text-emerald-400 uppercase mb-2 border-b border-[#1e3a6a] pb-1 tracking-wider text-xs">II. ĐÁNH GIÁ TÌNH HÌNH SẢN XUẤT</h4>
        <ul class="list-disc pl-5 space-y-1.5 text-slate-300">
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
