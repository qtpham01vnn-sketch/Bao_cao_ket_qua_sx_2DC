# CƠ CHẾ BẢO MẬT, PHÂN QUYỀN & MÃ KÍCH HOẠT VIP (SECURITY & ACCESS CONTROL)

Hệ thống Quản trị Sản xuất Phương Nam tích hợp cơ chế bảo mật linh hoạt, phù hợp cho cả môi trường mạng nội bộ nhà máy (On-premise / Localhost) lẫn môi trường đám mây (Cloud).

---

## 👥 I. MA TRẬN PHÂN QUYỀN (ROLE PERMISSION MATRIX)

Hệ thống phân định 3 vai trò sử dụng chính:

| Vai Trò | Mã Quyền (`role`) | Quyền Hạn Trong Hệ Thống |
| :--- | :--- | :--- |
| **Quản trị viên** | `admin` | **Toàn quyền hệ thống:**<br>• Nạp dữ liệu Excel hàng tháng (DC1, DC2, Than).<br>• Tạo và cập nhật phiên bản định mức (`master_norms_version`).<br>• Phê duyệt yêu cầu cấp quyền truy cập của người dùng mới.<br>• Xóa / Chỉnh sửa các bản ghi dữ liệu sản xuất. |
| **Quản đốc PX** | `quan_doc` | **Quản lý sản xuất:**<br>• Xem toàn bộ Dashboard và 4 Khối dữ liệu.<br>• Tạo, chỉnh sửa và lưu trữ Báo cáo Form Mẫu Trình Ký (Mục I - VIII).<br>• Xuất file Excel báo cáo và file Form Mẫu trình Ban Giám đốc.<br>• *Không có quyền xóa database hoặc sửa cấu hình định mức gốc.* |
| **Khách mời / VIP** | `khach_moi` | **Chỉ xem (Read-only):**<br>• Xem Dashboard, biểu đồ và số liệu đối soát.<br>• Tra cứu các kỳ sản xuất từ Tháng 1 đến Tháng 9.<br>• Xem Form mẫu báo cáo.<br>• *Bị vô hiệu hóa các nút Thêm, Sửa, Xóa, Nạp dữ liệu.* |

---

## ⏱️ II. CƠ CHẾ DÙNG THỬ 25H (25-HOUR TRIAL TOKEN)

Để tạo điều kiện cho các bộ phận nghiệp vụ hoặc lãnh đạo kiểm tra thử nghiệm nhanh mà không cần tạo tài khoản phức tạp:
1. **Gửi yêu cầu:** Người dùng nhập Email, Họ tên, Bộ phận và Mã thiết bị (`device_id`).
2. **Lưu trữ:** Thông tin được ghi vào bảng `auth_access_requests` với trạng thái `pending`.
3. **Phê duyệt:** Admin phê duyệt cấp quyền dùng thử `trial_25h` hoặc `permanent`.
4. **Bộ đếm thời gian:** Khi được cấp quyền, token lưu vào `localStorage` của trình duyệt (`pn_access_token`). Header hiển thị đồng hồ đếm ngược: `Đồng hồ 25h: 24:59:59` và tự động khóa màn hình khi hết giờ.

---

## 🔑 III. CƠ CHẾ XÁC THỰC QUẢN TRỊ KHẨN CẤP (SECURE OFFLINE ACCESS)

* **Nguyên tắc cấu hình:**
  * Mã xác thực quản trị/VIP được cấu hình độc lập qua biến môi trường (ví dụ `PN_MASTER_PIN`) hoặc thiết lập bảo mật cấp máy chủ.
  * **Tuyệt đối không lưu chuỗi bí mật dưới dạng văn bản rõ (plaintext)** trong tài liệu, kho mã nguồn hay phân phối cho bên thứ ba.
* **Mục đích sử dụng:**
  * Hỗ trợ Ban Lãnh đạo hoặc cán bộ kỹ thuật truy cập khẩn cấp khi hệ thống hoạt động ở chế độ ngoại tuyến (Offline) không có kết nối internet để kiểm tra số liệu.
  * Khi nhập mã hợp lệ khớp với cấu hình máy chủ, hệ thống cấp phiên làm việc tạm thời có thời hạn mà không cần kết nối mạng.
