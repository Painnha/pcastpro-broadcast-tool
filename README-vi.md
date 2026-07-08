<div align="center">

> 🇬🇧 **Read the English version here:** [README.md](README.md)

# 🎮 PCastPro — Công Cụ Điều Khiển Phát Sóng Esports

### *Hệ thống điều khiển phát sóng giải đấu Liên Quân Mobile theo thời gian thực*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-RFC_6455-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![OBS Studio](https://img.shields.io/badge/OBS_Studio-WebSocket_5.x-302E31?style=for-the-badge&logo=obsstudio&logoColor=white)](https://obsproject.com/)

---

**PCastPro** loại bỏ hoàn toàn sự hỗn loạn khi phải thao tác thủ công trên OBS Studio trong các buổi phát sóng esports áp lực cao. Ứng dụng cung cấp một bảng điều khiển web thống nhất, đồng bộ giai đoạn Ban/Pick, quản lý scene & source trên OBS, và tích hợp tương tác mạng xã hội trực tiếp — tất cả theo thời gian thực, chỉ từ một tab trình duyệt duy nhất.

> 🎥 **Xem Video Demo Đầy Đủ:** https://www.youtube.com/watch?v=--rLZCz46pg&t=1s *(Hướng dẫn quy trình phát sóng hoàn chỉnh trong 2–3 phút)*

</div>

---

## 📑 Mục Lục

- [✨ Tính Năng Chính](#-tính-năng-chính)
- [🛠 Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [🏗 Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [⚡ Cài Đặt & Khởi Chạy](#-cài-đặt--khởi-chạy)
- [📄 Giấy Phép](#-giấy-phép)

---

## ✨ Tính Năng Chính

<details>
<summary><strong>🎯 Quản Lý Ban/Pick Thời Gian Thực</strong></summary>

<br>

Hệ thống Ban/Pick của PCastPro số hoá hoàn toàn giai đoạn chọn tướng trong giải đấu Liên Quân Mobile, thay thế việc cập nhật text thủ công trên OBS bằng một pipeline tự động, hoạt động theo thời gian thực.

**Cách hoạt động:**

- **Trình Tự Draft Đầy Đủ:** Triển khai toàn bộ thứ tự draft theo format giải đấu LQMB — 4 ban mỗi đội, 5 pick mỗi đội, bao gồm các giai đoạn double-pick và double-ban — với chức năng tự động chuyển ô.
- **Cơ Sở Dữ Liệu Tướng:** Chứa toàn bộ danh sách tướng LQMB kèm ảnh đại diện, hỗ trợ tìm kiếm theo tên. Người vận hành click vào ảnh tướng để gán vào ô đang active.
- **Vị Trí Theo Lane:** Mỗi ô pick được gán với một vị trí (Top / Rừng / Mid / ADC / Support), với logo lane hiển thị trên overlay.
- **Đồng Hồ Đếm Ngược:** Bộ đếm 60 giây cho mỗi giai đoạn, đồng bộ với OBS qua WebSocket, tự động reset sau mỗi lần khóa tướng.
- **Đồng Bộ Tên Người Chơi:** Nhập tên người chơi một lần, tự động cập nhật lên tất cả các overlay OBS ngay lập tức.
- **Lịch Sử Trận Đấu:** Chức năng "Trận Tiếp Theo" lưu draft hiện tại vào RAM và gửi dữ liệu pick lịch sử lên OBS để hiển thị so sánh trong các ván tiếp theo của series Bo3/Bo5.
- **Đổi Bên:** Một click đổi toàn bộ dữ liệu đội — tên, tỉ số, pick, camera, số vote Fandom War — trên mọi hệ thống đã kết nối.
- **Tự Động Điền (Testing):** Điền random tất cả các ô draft bằng tướng ngẫu nhiên để test nhanh toàn bộ hệ thống.

**Output Overlay OBS:**
Tạo các URL Browser Source 1080p cho: `BanPick`, `PickListA/B`, `BanListA/B`, `CountDown`, `PreviousListA/B` — mỗi cái được áp theme động theo gói giải đấu mà user chọn.

![Ban/Pick Sync]([INSERT_GIF_LINK_HERE])
> *⬆️ Điều khiển ban/pick trên web cập nhật ngay lập tức lên overlay phát sóng OBS*

</details>

---

<details>
<summary><strong>🖥 Quản Lý OBS Từ Xa</strong></summary>

<br>

Một trình điều khiển OBS Studio toàn diện từ xa, giúp loại bỏ việc phải Alt-Tab trong khi đang phát sóng trực tiếp. Kết nối trực tiếp với OBS thông qua giao thức `obs-websocket` (v5.x).

**Điều Khiển Scene:**

- **Lưới Scene:** Tất cả scene trong OBS được hiển thị dưới dạng các nút bấm. Một click = chuyển scene ngay trên chương trình phát sóng.
- **Đánh Dấu Scene Đang Active:** Scene đang phát được đánh dấu trực quan theo thời gian thực.

**Thao Tác Source:**

- **Trình Duyệt Source Đầy Đủ:** Giao diện hai cột (Scene → Source) cho phép duyệt mọi source trên tất cả các scene, bao gồm cả source lồng nhau trong Group (quét đệ quy).
- **Chỉnh Sửa Nội Dung Trực Tiếp:** Mỗi source hiển thị nội dung hiện tại (Text, URL, Đường dẫn Media, Đường dẫn File) trong ô input có thể chỉnh sửa. Sửa + Enter = cập nhật OBS ngay lập tức.
- **Bật/Tắt Hiển Thị:** Ẩn/hiện bất kỳ source nào ở bất kỳ scene nào chỉ với một click.
- **Reload Browser Source:** Tải lại Browser Source bằng một click mà không cần chạm vào OBS.

**Tính Năng Nâng Cao:**

- **📌 Hệ Thống Ghim (Pin):** Ghim các source thường dùng vào mục "Dashboard" cố định ở đầu trang để truy cập nhanh trong khi phát sóng.
- **🔗 Nhóm Liên Kết (Link Groups):** Gom nhiều source OBS theo tên nhóm (ví dụ: "TeamA_Score"). Khi bất kỳ source nào trong nhóm được cập nhật, tất cả các source liên kết sẽ cập nhật đồng thời — rất quan trọng cho tỉ số, tên đội, hoặc bất kỳ dữ liệu nào xuất hiện trên nhiều scene.
- **🔄 Cặp Swap (Swap Pairs):** Định nghĩa các cặp source (ví dụ: Camera_A ⇄ Camera_B). Khi thực thi swap, nội dung giữa các cặp source được trao đổi nguyên tử, tương thích với Link Groups. Dùng khi đổi bên đội giữa các ván.
- **📹 Xoay Camera (VDO.ninja):** Quản lý URL camera người chơi theo từng lane (qua VDO.ninja hoặc tương tự). Hỗ trợ chế độ tự động xoay, lần lượt hiển thị 5 camera người chơi theo chu kỳ có thể cấu hình (mặc định: 15 giây).
- **🎬 Replay Buffer:** Lấy file replay mới nhất từ thư mục đã cấu hình và load vào OBS Media Source để phát replay highlight ngay lập tức.
- **💾 Lưu Cấu Hình Trên Cloud:** Tất cả source đã ghim, nhóm liên kết, cặp swap và dữ liệu camera được lưu vào MongoDB theo từng user thông qua API có xác thực, không mất dữ liệu khi refresh trình duyệt hay đổi thiết bị.

![OBS Remote Control]([INSERT_GIF_LINK_HERE])
> *⬆️ Thay đổi tỉ số trên web panel cập nhật ngay lập tức trên OBS*

</details>

---

<details>
<summary><strong>🔥 Fandom War — Hệ Thống Tương Tác Khán Giả Trực Tiếp</strong></summary>

<br>

Fandom War biến khán giả thụ động thành những người tham gia tích cực bằng cách phân tích luồng bình luận mạng xã hội trực tiếp và chuyển đổi tương tác của khán giả thành hiệu ứng trên màn hình phát sóng theo thời gian thực.

**Nền Tảng Được Hỗ Trợ:**

| Nền Tảng | Phương Thức Kết Nối | Phân Tích Bình Luận | Phân Tích Quà Tặng |
|----------|---------------------|---------------------|---------------------|
| TikTok Live | `tiktok-live-connector` (WebSocket) | ✅ Thời gian thực | ✅ Có hệ số nhân giá trị |
| Facebook Live | Graph API (Polling mỗi 2 giây) | ✅ Gần thời gian thực | ❌ Không hỗ trợ |

**Bình Chọn Bằng Keyword:**
- Người vận hành định nghĩa keyword cho từng đội (ví dụ: `#SGP` cho Team A, `#BOX` cho Team B).
- Mỗi bình luận trực tiếp chứa keyword = **+1 vote** cho đội tương ứng.
- Số vote được broadcast lên overlay OBS (`FandomWarA`, `FandomWarB`) theo thời gian thực qua WebSocket.

**Bình Chọn Bằng Quà Tặng (TikTok):**
- Người vận hành gán các quà tặng ảo TikTok cụ thể cho từng đội thông qua dropdown chọn quà.
- Giá trị quà tặng được lấy từ MongoDB collection (`TiktokGift`) với hệ số nhân điểm đã cấu hình sẵn.
- Hoa Hồng (1 điểm) gán cho Team A → Team A được +1. Universe (10.000 điểm) gán cho Team B → Team B được +10.000.
- Quà tặng streak (tặng liên tục) được đếm chính xác sử dụng tín hiệu `repeatEnd` của TikTok.

**Dòng Bình Luận Trực Tiếp:**
- 30 bình luận gần nhất được hiển thị trong feed cuộn, đánh dấu màu theo đội.
- Bình luận loại quà tặng được phân biệt bằng badge quà tặng.

**Số Lượng Người Xem:**
- Số người xem trực tiếp đồng bộ từ sự kiện `roomUser` của TikTok, hiển thị với format dễ đọc (1.2K, 3.5M).

**Hiệu Ứng Hình Ảnh:**
- Số vote kích hoạt cập nhật trực quan theo thời gian thực trên overlay phát sóng, tạo hiệu ứng "kéo co" động giữa các nhóm fan.

**Output Overlay OBS:**
Tạo các URL Browser Source theo theme: `FandomWarA`, `FandomWarB`, `VoteChatA`, `VoteChatB`

![Fandom War Live Vote]([INSERT_GIF_LINK_HERE])
> *⬆️ Bình luận TikTok chứa keyword của đội lập tức cộng điểm lên overlay phát sóng*

</details>

---

<details>
<summary><strong>🎨 Overlay Theme Động & Hệ Thống Tài Khoản/Giấy Phép</strong></summary>

<br>

PCastPro hoạt động như một công cụ SaaS thương mại hoá với hệ thống xác thực và cấp phép đầy đủ, hỗ trợ nhiều theme thương hiệu giải đấu khác nhau.

**Xác Thực & Quản Lý Session:**
- **Xác Thực JWT:** Đăng nhập bảo mật với mã hoá mật khẩu `bcryptjs` (12 salt rounds) và JWT token có thời hạn 7 ngày.
- **Xác Minh Email OTP:** Tài khoản mới yêu cầu xác minh OTP qua email (thông qua SMTP/Nodemailer) với thời hạn 5 phút và giới hạn 3 lần thử.
- **Giới Hạn Một Thiết Bị:** Chỉ cho phép một session hoạt động trên mỗi tài khoản. Đăng nhập từ thiết bị thứ hai sẽ hiển thị hộp thoại xung đột với tuỳ chọn "Đăng Nhập Buộc" để kết thúc session trước đó.
- **Theo Dõi Session:** Các session hoạt động được theo dõi trong MongoDB với Device ID, User Agent, địa chỉ IP, và thời gian hoạt động gần nhất.

**Hệ Thống Theme & Giấy Phép:**
- **Quyền Sở Hữu Theme:** Mỗi tài khoản user có mảng `ownedThemes`. Admin gán gói theme giải đấu cho user thông qua endpoint `/api/admin/assign-theme`.
- **Tải Theme Động:** Tất cả trang overlay OBS (BanPick, FandomWar, Countdown, v.v.) tự động load CSS, JS, và assets từ thư mục theme mà user đang chọn.
- **Các Gói Theme Có Sẵn:**

| Theme ID | Giải Đấu | Độ Phân Giải |
|----------|----------|-------------|
| `apl2025` | Arena Premier League 2025 | 1080p |
| `rpls25` | RPL Mùa 25 | 1080p |
| `FIT` | Giải Đấu FIT | 1080p |
| `mcuongcup` | MCuong Cup | 1080p |
| `tsu` | Giải Đấu TSU | 1080p |
| `default` | Mặc định / Tuỳ chỉnh | 1080p |

- **Đổi Theme Nóng:** Người vận hành có thể chuyển đổi giữa các theme đã sở hữu ngay giữa buổi phát sóng. OBS Browser Source tự động load assets của theme mới khi refresh.

**URL Browser Source OBS:**
Tất cả overlay được phục vụ tại `http://localhost:3000/obs/{TenTrang}` và tự động trỏ đến theme chính xác:
```
http://localhost:3000/obs/BanPick
http://localhost:3000/obs/CountDown
http://localhost:3000/obs/FandomWarA
http://localhost:3000/obs/CameraA
...và 12 trang overlay khác
```

![Dynamic Theme Swap]([INSERT_GIF_LINK_HERE])
> *⬆️ Chuyển từ theme APL 2025 sang RPL — tất cả overlay OBS cập nhật liền mạch*

</details>

---

## 🛠 Công Nghệ Sử Dụng

| Tầng | Công Nghệ | Mục Đích |
|------|-----------|----------|
| **Frontend** | Vanilla HTML/CSS/JS | Giao diện bảng điều khiển (ứng dụng đơn trang với điều hướng tab) |
| **Backend** | Node.js + Express 4.x | REST API server, phục vụ file tĩnh, routing theme |
| **Cơ Sở Dữ Liệu** | MongoDB (Mongoose 8.x) | Users, sessions, OTP, giấy phép, cấu hình OBS, themes, quà tặng TikTok |
| **Thời Gian Thực** | Native WebSocket (`ws` 8.x) | Đồng bộ hai chiều: Bảng Điều Khiển ↔ Overlay OBS |
| **Tích Hợp OBS** | `obs-websocket-js` (client) | Điều khiển trực tiếp OBS Studio (scenes, sources, media, replay) |
| **TikTok Live** | `tiktok-live-connector` 2.x | Kết nối WebSocket đến luồng TikTok Live |
| **Facebook Live** | Facebook Graph API v18.0 | Polling bình luận qua REST (chu kỳ 2 giây) |
| **Xác Thực** | JWT + bcryptjs | Xác thực dựa trên token với mã hoá mật khẩu |
| **Email** | Nodemailer (SMTP) | Gửi OTP để xác minh tài khoản |
| **DevOps** | Batch scripts (`/scripts`) | Cài đặt & khởi chạy một click với đồng bộ GitHub |

---

## 🏗 Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRÌNH DUYỆT NGƯỜI VẬN HÀNH                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Quản Lý      │  │  Quản Lý OBS │  │  Fandom War  │              │
│  │  Ban/Pick     │  │  (Từ Xa)     │  │  (MXH)       │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └────────────┬────┴──────────┬───────┘                      │
│                      │               │                              │
│              WebSocket (ws://)    REST API (HTTP)                    │
└──────────────────────┼───────────────┼──────────────────────────────┘
                       │               │
┌──────────────────────┼───────────────┼──────────────────────────────┐
│               NODE.JS BACKEND (Express + WS)                        │
│                      │               │                              │
│  ┌───────────────────┴───────────────┴─────────────────────┐       │
│  │            Socket Manager (Trung Tâm Broadcast)          │       │
│  │   • Nhận message từ Bảng Điều Khiển                      │       │
│  │   • Broadcast tới TẤT CẢ client (overlay OBS)            │       │
│  │   • Quản lý session thiết bị & xác thực JWT              │       │
│  └────────┬────────────────┬────────────────┬──────────────┘       │
│           │                │                │                       │
│  ┌────────┴──────┐  ┌─────┴──────┐  ┌──────┴───────┐              │
│  │  Auth         │  │  OBS       │  │  Fandom      │              │
│  │  Controller   │  │  Controller│  │  Controller   │              │
│  │  (JWT/OTP)    │  │  (Config)  │  │  (TikTok/FB)  │              │
│  └───────────────┘  └────────────┘  └──────┬───────┘              │
│                                            │                       │
│                          ┌─────────────────┼──────────────┐        │
│                          │                 │              │        │
│                   ┌──────┴──────┐  ┌───────┴─────┐       │        │
│                   │ TikTok Live │  │ Facebook    │       │        │
│                   │ Service     │  │ Live Service│       │        │
│                   │ (WebSocket) │  │ (Graph API) │       │        │
│                   └──────┬──────┘  └───────┬─────┘       │        │
│                          │                 │              │        │
│                          ▼                 ▼              │        │
│                    TikTok Live      Facebook Live         │        │
│                    Servers          Graph API             │        │
│                                                          │        │
│  ┌───────────────────────────────────────────────────────┘        │
│  │                     MongoDB Atlas                               │
│  │  Users │ Sessions │ OTP │ Themes │ OBSConfig │ TiktokGifts     │
│  └────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
                       │
                       │ obs-websocket (ws://)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        OBS STUDIO                                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Browser Sources (1080p)     Phục vụ bởi Node.js backend     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ BanPick  │ │CountDown │ │FandomWarA│ │ CameraA  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │PickListA │ │PickListB │ │FandomWarB│ │ CameraB  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │                    ...và nhiều trang overlay khác            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Text Sources, Media Sources, Chuyển Scene                           │
│  ← Tất cả được điều khiển từ xa bởi OBS Manager qua obs-websocket → │
└──────────────────────────────────────────────────────────────────────┘
```

**Tóm Tắt Luồng Dữ Liệu:**
1. **Người vận hành** tương tác với Bảng Điều Khiển web (ban/pick, thay đổi tỉ số, cấu hình fandom war).
2. **Node.js Backend** nhận hành động qua WebSocket hoặc REST API.
3. **Socket Manager** broadcast cập nhật tới tất cả WebSocket client đã kết nối.
4. **OBS Browser Sources** (chạy như client trong OBS) nhận message WebSocket và cập nhật DOM theo thời gian thực.
5. **OBS Manager** ngoài ra còn giao tiếp trực tiếp với OBS Studio qua `obs-websocket` để chuyển scene, thao tác source, và điều khiển replay buffer.
6. **Dịch Vụ Mạng Xã Hội** (TikTok/Facebook) đẩy dữ liệu bình luận trực tiếp vào cùng pipeline broadcast WebSocket.

---

## ⚡ Cài Đặt & Khởi Chạy

### Yêu Cầu Hệ Thống

| Yêu Cầu | Phiên Bản | Ghi Chú |
|----------|-----------|---------|
| [Node.js](https://nodejs.org/) | 18+ | Khuyến nghị bản LTS. Chạy `scripts/install-nodejs.bat` nếu cần. |
| [OBS Studio](https://obsproject.com/) | 28+ | Phải có plugin **obs-websocket** v5.x (đã tích hợp sẵn từ OBS 28). |
| [MongoDB](https://www.mongodb.com/) | 6+ | Instance local hoặc MongoDB Atlas (cloud). |
| [Git](https://git-scm.com/) | Bất kỳ | Để clone và chạy script tự động cập nhật. |

### 1️⃣ Clone Dự Án

```bash
git clone https://github.com/YOUR_USERNAME/pcastpro-broadcast-tool.git
cd pcastpro-broadcast-tool
```

### 2️⃣ Cấu Hình Biến Môi Trường

```bash
cp .env.example backend/.env
```

Chỉnh sửa `backend/.env` với giá trị của bạn:

```env
# JWT Secret Key - Hãy thay đổi!
JWT_SECRET=chuoi-bi-mat-cua-ban

# Server
PORT=3000

# MongoDB (kết nối local hoặc Atlas)
MONGODB_URI=mongodb://localhost:27017/pcastpro

# Email SMTP (cho xác minh OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=email-cua-ban@gmail.com
EMAIL_PASS=mat-khau-app-smtp
EMAIL_FROM="PCastPro <email-cua-ban@gmail.com>"

# Session & OTP
SESSION_TIMEOUT_HOURS=24
OTP_EXPIRY_MINUTES=5

# Python Backend (tuỳ chọn, cho tính năng TikTok nâng cao)
PYTHON_BACKEND_URL=http://127.0.0.1:5000
USE_PYTHON_BACKEND=false
```

### 3️⃣ Cài Đặt Dependencies

```bash
cd backend
npm install
```

### 4️⃣ Khởi Động Server

```bash
# Development (tự động reload)
npm run dev

# Production
npm start
```

Hoặc sử dụng batch script một click:

```bash
# Khởi động nhanh (tự cài đặt, đồng bộ GitHub, mở trình duyệt)
scripts/quick-start.bat

# Chỉ khởi động backend
scripts/start-backend.bat
```

### 📦 Đóng gói thành file EXE (Bảo mật mã nguồn)

Để chia sẻ dự án cho người dùng cuối mà **không bị lộ mã nguồn** của thư mục `backend/` và các tài khoản MongoDB/SMTP Gmail nhạy cảm, bạn có thể biên dịch backend thành một file chạy `.exe` độc lập:

1. Chạy file đóng gói dành cho nhà phát triển:
   ```bash
   scripts/build-exe.bat
   ```
   *Lệnh này sẽ tự động tải thư viện `pkg` và biên dịch toàn bộ mã nguồn backend thành file chạy `pcastpro-backend.exe` nằm ở thư mục gốc.*

2. **Cấu trúc phân phối cho người dùng cuối** (Chỉ cần gửi các file này, tuyệt đối **không gửi thư mục `backend/`**):
   ```
   pcastpro-broadcast-tool/
   ├── frontend/            # Giao diện web tĩnh
   ├── shared/              # Assets dùng chung
   ├── themes/              # Các gói theme giải đấu
   ├── obs-data/            # Dữ liệu OBS (tự sinh)
   ├── scripts/
   │   ├── quick-start.bat  # Khách hàng nhấp đúp chạy file này
   │   └── start-backend.bat
   ├── pcastpro-backend.exe # File chạy chính đã được đóng gói bảo mật
   └── .env.example         # File cấu hình mẫu (tuỳ chọn)
   ```
   *Người dùng cuối chỉ cần nhấp đúp chạy `quick-start.bat` hoặc file `pcastpro-backend.exe` để khởi chạy chương trình mà không cần cài đặt Node.js hay chạy lệnh npm nào cả.*

---

### 🔄 Cấu hình Tự động Cập nhật thông qua Netlify

Hệ thống được tích hợp tính năng tự kiểm tra và cập nhật phiên bản mới trực tiếp trong file EXE mà không làm lộ link dự án GitHub:

1. Thiết lập một dự án **Netlify** trỏ tới tên miền phụ của bạn (ví dụ: `pcastpro.nguyentriphong.id.vn`).
2. Khi bạn cập nhật tính năng mới và muốn đẩy cập nhật đến toàn bộ người dùng:
   - Chạy `scripts/build-exe.bat` để tạo file `pcastpro-backend.exe` mới.
   - Nén các mục cần phân phối gồm: `frontend/`, `shared/`, `themes/`, `scripts/` và file `pcastpro-backend.exe` thành tệp ZIP đặt tên là **`pcastpro-latest.zip`**.
   - Tạo file **`version.json`** mới với nội dung phiên bản cập nhật (ví dụ tăng lên `1.0.1`):
     ```json
     {
       "version": "1.0.1",
       "downloadUrl": "https://pcastpro.nguyentriphong.id.vn/pcastpro-latest.zip"
     }
     ```
   - Upload 2 file `version.json` và `pcastpro-latest.zip` lên trang Netlify của bạn.
3. Khi khách hàng khởi chạy file `pcastpro-backend.exe` trên máy của họ, chương trình sẽ tự động phát hiện phiên bản mới, tự tải bản ZIP về giải nén ghi đè (giữ lại file `.env` cấu hình riêng của khách nếu có) và tự khởi động lại phiên bản mới.


### 5️⃣ Truy Cập Ứng Dụng

| URL | Mục Đích |
|-----|----------|
| `http://localhost:3000` | 🖥 Bảng Điều Khiển Chính (Đăng Nhập/Đăng Ký) |
| `http://localhost:3000/obs/BanPick` | 📺 OBS Browser Source — Overlay Ban/Pick |
| `http://localhost:3000/obs/CountDown` | 📺 OBS Browser Source — Đồng Hồ Đếm Ngược |
| `http://localhost:3000/obs/FandomWarA` | 📺 OBS Browser Source — Vote Team A |
| `http://localhost:3000/obs/FandomWarB` | 📺 OBS Browser Source — Vote Team B |
| `http://localhost:3000/obs/CameraA` | 📺 OBS Browser Source — Camera Team A |

### 6️⃣ Kết Nối OBS Studio

1. Mở **OBS Studio** → Tools → WebSocket Server Settings.
2. Bật WebSocket server (port mặc định: `4455`).
3. Trong Bảng Điều Khiển PCastPro → Tab OBS Manager → nhập `localhost`, port `4455`, và mật khẩu → click **Connect**.
4. Thêm Browser Source trỏ tới các URL overlay ở trên (khuyến nghị 1920×1080).

---

## 📂 Cấu Trúc Dự Án

```
pcastpro-broadcast-tool/
├── backend/
│   ├── config/          # Kết nối cơ sở dữ liệu
│   ├── controllers/     # Xử lý route (auth, obs, fandom, theme, team)
│   ├── middleware/       # Middleware phục vụ asset theme
│   ├── models/          # Mongoose schemas (User, Session, OTP, License, Theme, OBSConfig, TiktokGift)
│   ├── routes/          # Định nghĩa route Express
│   ├── services/        # TikTok Live & Facebook Live connectors, dịch vụ Email
│   ├── sockets/         # WebSocket manager (trung tâm broadcast)
│   └── server.js        # Điểm khởi chạy ứng dụng
├── frontend/
│   ├── css/             # Styles bảng điều khiển
│   ├── js/              # Logic phía client (banpickManager, obs-manager, fandomWar)
│   ├── services/        # Dịch vụ API & WebSocket client
│   ├── images/          # Ảnh tướng & assets UI
│   └── index.html       # Bảng điều khiển SPA chính
├── themes/              # Các gói theme giải đấu
│   ├── apl2025/         # Overlay APL 2025 (css, js, obs, assets)
│   ├── rpls25/          # Overlay RPL S25
│   ├── FIT/             # Overlay giải FIT
│   ├── mcuongcup/       # Overlay MCuong Cup
│   └── default/         # Overlay mặc định
├── shared/              # Assets dùng chung (font, hiệu ứng âm thanh)
├── scripts/             # Batch scripts cài đặt & triển khai
├── obs-data/            # Lưu trữ dữ liệu OBS
└── .env.example         # Template biến môi trường
```

---

## 📄 Giấy Phép

Đây là phần mềm bản quyền. Mọi quyền được bảo lưu.

---

<div align="center">

**Được xây dựng với ❤️ cho cộng đồng phát sóng esports Việt Nam**

*PCastPro — Vì mỗi nhà vô địch đều xứng đáng có một buổi phát sóng chuyên nghiệp.*

</div>
