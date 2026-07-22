# 🎬 TÀI LIỆU HƯỚNG DẪN TÍNH NĂNG MOTION HERO (TƯỚNG ĐỘNG)

> **Hệ thống Ban/Pick PCastPro Broadcast Tool**  
> *Tính năng hiển thị video tướng động mã hóa bảo mật cao dành cho livestream giải đấu chuyên nghiệp.*

---

## 📌 1. TỔNG QUAN TÍNH NĂNG

**Motion Hero** là tính năng cao cấp cho phép hiển thị hình ảnh tướng động (`.mp4`) tự động lặp mượt mà tại các vị trí chọn tướng (**Pick**) trên màn hình cấm chọn dành cho livestream (OBS Studio / vMix).

### 🌟 Các Điểm Nổi Bật:
- **Bảo mật mã hóa 3 lớp (AES-256-GCM):** Chống tải trộm video gốc, ngăn chặn truy cập đường dẫn trực tiếp.
- **Tải ngầm chống giật lag (Zero-Flash Engine):** Nạp bộ đệm video trong bộ nhớ RAM, hiển thị tức thì **0ms**, không bị chớp đen khi Pick / Lock / Swap.
- **Tự động dọn dẹp RAM (Garbage Collection):** Thu hồi bộ nhớ Blob URL liên tục, đảm bảo RAM luôn ổn định (~50MB) trong suốt trận đấu.
- **Đồng bộ 100% 9 Theme:** Hỗ trợ đầy đủ tất cả 9 Theme hiển thị của hệ thống PCastPro.

---

## 👤 2. HƯỚNG DẪN CHO NGƯỜI DÙNG CUỐI (END-USER)

### A. Bật / Tắt Motion Hero Trên Trang Quản Lý
1. Đăng nhập vào trang điều khiển Ban/Pick Quản Lý (`http://localhost:3000/`).
2. Trên thanh công cụ phía trên, tìm công tắc **"Motion Hero"**.
3. gạt công tắc để **Bật (ON)** hoặc **Tắt (OFF)**:
   - **Bật (ON):** Các ô Pick trên OBS Overlay sẽ hiển thị tướng động `.mp4`.
   - **Tắt (OFF):** Hệ thống quay về hiển thị ảnh tĩnh `.jpg` truyền thống.
   *(Lưu ý: Nếu tài khoản chưa được Admin cấp quyền, hệ thống sẽ thông báo lỗi và yêu cầu liên hệ Admin).*

### B. Sử Dụng Trên OBS Studio / Streamlab / vMix
1. Trong OBS Studio, thêm nguồn mới loại **Browser Source**.
2. Nhập URL của Theme bất kỳ (Ví dụ: `http://localhost:3000/obs/PickListA` hoặc `http://localhost:3000/themes/blvChanh_dtdv2026/`).
3. OBS Overlay tự động nhận diện thiết lập Motion Hero từ trang Quản lý mà không cần cấu hình thêm.

---

## 👨‍💻 3. HƯỚNG DẪN DÀNH CHO DEVELOPER & ADMINISTRATOR

### A. Cấu Hình Backend (`.env`)
```env
MOTION_HERO_KEY=b2c4e6a8f1d3c5e7a9b0c2d4e6f8a0b2c4e6a8f1d3c5e7a9b0c2d4e6f8a0b2c4
```

### B. Mã Hóa Video Tướng Mới (Encrypt Tool)
Khi bạn thêm video tướng mới dạng `.mp4` vào hệ thống:
1. Đặt file video `.mp4` vào thư mục: `frontend/images/heroMotion/<TênTướng>.mp4`
   *(Ví dụ: `Airi.mp4`, `Valhein.mp4`, `Bijan.mp4`)*
2. Chạy lệnh mã hóa:
   ```bash
   node scripts/encryptHeroMotion.js
   ```
   *Tool sẽ tự động mã hóa tất cả file `.mp4` thành các file `.dat` tại `frontend/images/heroMotionEncrypted/`.*
   > ⚠️ **Lưu ý:** Không xóa file `.mp4` gốc nếu bạn muốn giữ file gốc để cập nhật sau này.

### C. Cấp / Thu Hồi Quyền Tài Khoản (CLI Tool)
Sử dụng công cụ CLI để cấp quyền `motionhero` cho người dùng trong cơ sở dữ liệu:

- **Cấp quyền cho tài khoản:**
  ```bash
  node scripts/grantMotionHeroPermission.js email_nguoidung@gmail.com grant
  ```
- **Thu hồi quyền tài khoản:**
  ```bash
  node scripts/grantMotionHeroPermission.js email_nguoidung@gmail.com revoke
  ```

---

## 📐 4. KIẾN TRÚC KỸ THUẬT & BẢO MẬT

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────────┐
│   Client Browser/OBS   │ ──── │   Backend (Express/WS)  │ ──── │   Encrypted Storage      │
└────────────────────────┘      └─────────────────────────┘      └──────────────────────────┘
  1. Fetch Session Key     ───►    Verify Auth & Permission  ───►   Return AES-256 Key
  2. Stream /stream/:hero  ───►    Stream Encrypted .dat     ───►   Read .dat File
  3. Web Crypto Decrypt    ───►    Create In-Memory Blob URL ───►   Render <video src="blob:">
```

### 🔒 Các Lớp Bảo Mật Được Áp Dụng:
1. **AES-256-GCM Encryption:** Video được mã hóa dưới dạng file nhị phân `.dat`. Không thể mở bằng phần mềm đọc video thông thường.
2. **Session Key Ephemeral Auth:** Key giải mã chỉ được trả về qua API `/api/motion-hero/session-key` khi request có JWT Auth Token hoặc phiên activeUser hợp lệ.
3. **Anti-Direct File Access:** Cấu hình Middleware ngăn chặn mọi hành vi truy cập trực tiếp file tĩnh `.dat` hay đường dẫn công khai.
4. **Anti-Context-Menu Shield:** Lớp khiên `glass-shield` chặn hành vi click chuột phải -> Save Video As trên trình duyệt.

---

## 🎨 5. DANH SÁCH 9 THEME HỖ TRỢ

Tất cả 9 Theme sau đều đã được tích hợp engine Motion Hero sẵn sàng sử dụng:
1. `default`
2. `blvChanh_dtdv2026`
3. `apl2025`
4. `default2`
5. `FIT`
6. `Lolkgc`
7. `mcuongcup`
8. `rpls25`
9. `tsu`

---
*Tài liệu được cập nhật tự động bởi hệ thống PCastPro Broadcast Tool.*
