<div align="center">

> 🇻🇳 **Đọc phiên bản tiếng Việt tại đây:** [README-vi.md](README-vi.md)

# 🎮 PCastPro — Esports Broadcast Control Tool

### *Real-time tournament broadcast orchestration for Arena of Valor (Liên Quân Mobile)*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-RFC_6455-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![OBS Studio](https://img.shields.io/badge/OBS_Studio-WebSocket_5.x-302E31?style=for-the-badge&logo=obsstudio&logoColor=white)](https://obsproject.com/)

---

**PCastPro** eliminates the chaos of manually manipulating OBS Studio during high-pressure esports broadcasts. It provides a unified web-based control panel that synchronizes ban/pick phases, manages OBS scenes & sources, and integrates live social media interactions — all in real-time, from a single browser tab.

> 🎥 **Watch the Full Demo Video:** [INSERT_YOUTUBE_LINK_HERE] *(2–3 minute walkthrough of the complete broadcast workflow)*

</div>

---

## 📑 Table of Contents

- [✨ Core Features](#-core-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 System Architecture](#-system-architecture)
- [⚡ Local Installation & Setup](#-local-installation--setup)
- [📄 License](#-license)

---

## ✨ Core Features

<details>
<summary><strong>🎯 Real-time Ban/Pick Management</strong></summary>

<br>

PCastPro's Ban/Pick system fully digitizes the Arena of Valor draft phase, replacing manual OBS text updates with an automated, real-time pipeline.

**How it works:**

- **Full Draft Sequence:** Implements the complete AoV tournament draft order — 4 bans per team, 5 picks per team, including double-pick and double-ban phases — with automatic slot progression.
- **Champion Database:** Contains the entire AoV hero roster with portraits, filterable by name. Operators click a hero portrait to assign it to the current active slot.
- **Role-based Lanes:** Each pick slot is mapped to a lane role (Top / Jungle / Mid / ADC / Support), with lane logos displayed on the overlay.
- **Live Timer:** A 60-second countdown per phase syncs to OBS via WebSocket, automatically resetting after each lock-in.
- **Player Name Sync:** Operator enters player names once; they propagate to all OBS overlays instantly.
- **Previous Match History:** "Next Match" saves the current draft to RAM and sends historical pick data to OBS for side-by-side display in subsequent games of a Best-of-N series.
- **Team Swap:** One-click swap reverses all team data — names, scores, picks, cameras, Fandom War votes — across every connected system.
- **Auto-fill (Testing):** Populates all draft slots with random heroes for rapid end-to-end testing.

**OBS Overlay Output:**
Generates 1080p Browser Source URLs for: `BanPick`, `PickListA/B`, `BanListA/B`, `CountDown`, `PreviousListA/B` — each dynamically themed per user's selected tournament package.

![Ban/Pick Sync]([INSERT_GIF_LINK_HERE])
> *⬆️ Web-based ban/pick control instantly updating the OBS broadcast overlay in real-time*

</details>

---

<details>
<summary><strong>🖥 Remote OBS Manager</strong></summary>

<br>

A comprehensive OBS Studio remote control that eliminates the need to Alt-Tab during a live broadcast. Connects directly to OBS via the `obs-websocket` protocol (v5.x).

**Scene Control:**

- **Scene Grid:** All OBS scenes rendered as clickable buttons. One click = instant scene switch on the live program output.
- **Active Scene Highlight:** The currently active scene is visually highlighted in real-time.

**Source Manipulation:**

- **Full Source Viewer:** A two-panel layout (Scenes → Sources) lets operators browse every source across all scenes, including nested Group sources (recursive scanning).
- **Inline Content Editing:** Each source displays its current content (Text, URL, Media Path, File Path) in an editable input field. Edit + Enter = instant OBS update.
- **Visibility Toggle:** Show/hide any source in any scene with a single click.
- **Browser Source Reload:** One-click refresh for Browser Sources without touching OBS.

**Advanced Features:**

- **📌 Pin System:** Pin frequently-used sources to a persistent "Dashboard" section at the top for quick access during live broadcast.
- **🔗 Link Groups:** Group multiple OBS sources by name (e.g., "TeamA_Score"). When any source in a group is updated, all linked sources update simultaneously — critical for scores, team names, or any data that appears on multiple scenes.
- **🔄 Swap Pairs:** Define source pairs (e.g., Camera_A ⇄ Camera_B). Executing a swap atomically exchanges all content between paired sources, respecting Link Groups. Used for team-side swaps between games.
- **📹 Camera Rotation (VDO.ninja):** Manages per-lane player camera URLs (via VDO.ninja or similar). Supports auto-rotation mode that cycles through all 5 player cameras at a configurable interval (default: 15 seconds).
- **🎬 Replay Buffer:** Fetches the latest replay file from a configured directory and loads it into an OBS Media Source for instant highlight replays.
- **💾 Cloud Config Persistence:** All pinned sources, link groups, swap pairs, and camera data are saved to MongoDB per-user via authenticated API, surviving browser refreshes and device changes.

![OBS Remote Control]([INSERT_GIF_LINK_HERE])
> *⬆️ Changing a score on the web panel instantly reflects in the OBS broadcast output*

</details>

---

<details>
<summary><strong>🔥 Fandom War — Live Social Interaction Engine</strong></summary>

<br>

Fandom War transforms passive viewers into active participants by parsing live social media streams and translating audience engagement into real-time on-screen effects.

**Supported Platforms:**

| Platform | Connection Method | Comment Parsing | Gift/Reaction Parsing |
|----------|------------------|-----------------|-----------------------|
| TikTok Live | `tiktok-live-connector` (WebSocket) | ✅ Real-time | ✅ With value multipliers |
| Facebook Live | Graph API (Polling @ 2s) | ✅ Near real-time | ❌ N/A |

**Keyword Voting:**
- Operators define a keyword per team (e.g., `#SGP` for Team A, `#BOX` for Team B).
- Every live comment containing a keyword = **+1 vote** for that team.
- Vote counts broadcast to OBS overlays (`FandomWarA`, `FandomWarB`) in real-time via WebSocket.

**Gift Voting (TikTok):**
- Operators assign specific TikTok virtual gifts to each team via dropdown selectors.
- Gift values are pulled from a MongoDB collection (`TiktokGift`) with pre-configured point multipliers.
- A Rose (1 point) assigned to Team A → Team A gets +1. A Universe (10,000 points) assigned to Team B → Team B gets +10,000.
- Gifts streaked (sent repeatedly) are counted correctly using TikTok's `repeatEnd` signal.

**Live Comment Feed:**
- The last 30 comments are displayed in a scrolling feed, color-coded by team assignment.
- Gift-type comments are visually distinguished with a gift badge.

**Viewer Count:**
- Live viewer count synced from TikTok's `roomUser` event, displayed with human-readable formatting (1.2K, 3.5M).

**Visual Effects:**
- Vote counts trigger real-time visual updates on the broadcast overlay, creating a dynamic "tug-of-war" effect between fan groups.

**OBS Overlay Output:**
Generates themed Browser Source URLs: `FandomWarA`, `FandomWarB`, `VoteChatA`, `VoteChatB`

![Fandom War Live Vote]([INSERT_GIF_LINK_HERE])
> *⬆️ A TikTok comment containing a team keyword instantly adds points to the broadcast overlay*

</details>

---

<details>
<summary><strong>🎨 Dynamic Theme Overlays & Account Licensing</strong></summary>

<br>

PCastPro operates as a commercialized SaaS tool with a full authentication and licensing system, supporting multiple tournament branding themes.

**Authentication & Session Management:**
- **JWT-based Auth:** Secure login with `bcryptjs` password hashing (12 salt rounds) and 7-day JWT tokens.
- **OTP Email Verification:** New accounts require email OTP verification (via SMTP/Nodemailer) with 5-minute expiry and 3-attempt limits.
- **Single-device Enforcement:** Only one active session per account. Logging in from a second device shows a conflict dialog with a "Force Login" option that terminates the previous session.
- **Session Tracking:** Active sessions tracked in MongoDB with device ID, user agent, IP address, and last activity timestamps.

**Theme & License System:**
- **Theme Ownership:** Each user account has an `ownedThemes` array. Admins assign tournament theme packages to users via the `/api/admin/assign-theme` endpoint.
- **Dynamic Theme Loading:** All OBS overlay pages (BanPick, FandomWar, Countdown, etc.) dynamically load CSS, JS, and assets from the user's currently selected theme directory.
- **Available Theme Packs:**

| Theme ID | Tournament | Resolution |
|----------|-----------|------------|
| `apl2025` | Arena Premier League 2025 | 1080p |
| `rpls25` | RPL Season 25 | 1080p |
| `FIT` | FIT Tournament | 1080p |
| `mcuongcup` | MCuong Cup | 1080p |
| `tsu` | TSU Tournament | 1080p |
| `default` | Generic / Custom | 1080p |

- **Hot-swap:** Operators can switch between owned themes mid-broadcast. The OBS Browser Sources automatically load the new theme's assets on the next refresh.

**OBS Browser Source URLs:**
All overlays are served at `http://localhost:3000/obs/{PageName}` and dynamically resolve to the correct theme:
```
http://localhost:3000/obs/BanPick
http://localhost:3000/obs/CountDown
http://localhost:3000/obs/FandomWarA
http://localhost:3000/obs/CameraA
...and 12 more overlay pages
```

![Dynamic Theme Swap]([INSERT_GIF_LINK_HERE])
> *⬆️ Switching from APL 2025 to RPL theme — all OBS overlays update seamlessly*

</details>

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla HTML/CSS/JS | Control panel UI (single-page with tab navigation) |
| **Backend** | Node.js + Express 4.x | REST API server, static file serving, theme routing |
| **Database** | MongoDB (Mongoose 8.x) | Users, sessions, OTP, licenses, OBS configs, themes, TikTok gifts |
| **Real-time** | Native WebSocket (`ws` 8.x) | Bi-directional sync: Control Panel ↔ OBS Overlays |
| **OBS Integration** | `obs-websocket-js` (client) | Direct OBS Studio control (scenes, sources, media, replay) |
| **TikTok Live** | `tiktok-live-connector` 2.x | WebSocket connection to TikTok Live streams |
| **Facebook Live** | Facebook Graph API v18.0 | Comment polling via REST (2-second interval) |
| **Auth** | JWT + bcryptjs | Token-based authentication with password hashing |
| **Email** | Nodemailer (SMTP) | OTP delivery for account verification |
| **DevOps** | Batch scripts (`/scripts`) | One-click setup & auto-start with GitHub sync |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OPERATOR BROWSER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Ban/Pick     │  │  OBS Manager │  │  Fandom War  │              │
│  │  Manager      │  │  (Remote)    │  │  (Social)    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └────────────┬────┴──────────┬───────┘                      │
│                      │               │                              │
│              WebSocket (ws://)    REST API (HTTP)                    │
└──────────────────────┼───────────────┼──────────────────────────────┘
                       │               │
┌──────────────────────┼───────────────┼──────────────────────────────┐
│                 NODE.JS BACKEND (Express + WS)                      │
│                      │               │                              │
│  ┌───────────────────┴───────────────┴─────────────────────┐       │
│  │              Socket Manager (Broadcast Hub)              │       │
│  │   • Receives messages from Control Panel                 │       │
│  │   • Broadcasts to ALL connected clients (OBS overlays)   │       │
│  │   • Manages device sessions & JWT auth                   │       │
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
│  │  Browser Sources (1080p)          Served by Node.js backend  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ BanPick  │ │CountDown │ │FandomWarA│ │ CameraA  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │PickListA │ │PickListB │ │FandomWarB│ │ CameraB  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │                    ...and more overlay pages                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Text Sources, Media Sources, Scene Switching                        │
│  ← All controlled remotely by OBS Manager via obs-websocket →       │
└──────────────────────────────────────────────────────────────────────┘
```

**Data Flow Summary:**
1. **Operator** interacts with the web Control Panel (ban/pick, score changes, fandom war config).
2. **Node.js Backend** receives the action via WebSocket or REST API.
3. **Socket Manager** broadcasts the update to all connected WebSocket clients.
4. **OBS Browser Sources** (running as clients in OBS) receive the WebSocket message and update their DOM in real-time.
5. **OBS Manager** additionally communicates directly with OBS Studio via `obs-websocket` for scene switching, source manipulation, and replay buffer control.
6. **Social Services** (TikTok/Facebook) push live comment data into the same WebSocket broadcast pipeline.

---

## ⚡ Local Installation & Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ | LTS recommended. Run `scripts/install-nodejs.bat` if needed. |
| [OBS Studio](https://obsproject.com/) | 28+ | Must have **obs-websocket** plugin v5.x (bundled since OBS 28). |
| [MongoDB](https://www.mongodb.com/) | 6+ | Local instance or MongoDB Atlas (cloud). |
| [Git](https://git-scm.com/) | Any | For cloning and auto-update scripts. |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/pcastpro-broadcast-tool.git
cd pcastpro-broadcast-tool
```

### 2️⃣ Configure Environment Variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your values:

```env
# JWT Secret Key - Change this!
JWT_SECRET=your-secure-random-string

# Server
PORT=3000

# MongoDB (local or Atlas connection string)
MONGODB_URI=mongodb://localhost:27017/pcastpro

# SMTP Email (for OTP verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-smtp-app-password
EMAIL_FROM="PCastPro <your-email@gmail.com>"

# Session & OTP
SESSION_TIMEOUT_HOURS=24
OTP_EXPIRY_MINUTES=5

# Python Backend (optional, for advanced TikTok features)
PYTHON_BACKEND_URL=http://127.0.0.1:5000
USE_PYTHON_BACKEND=false
```

### 3️⃣ Install Dependencies

```bash
cd backend
npm install
```

### 4️⃣ Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Or use the one-click batch scripts:

```bash
# Quick start (auto-installs, syncs with GitHub, opens browser)
scripts/quick-start.bat

# Start backend only
scripts/start-backend.bat
```

### 5️⃣ Access the Application

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | 🖥 Main Control Panel (Login/Register) |
| `http://localhost:3000/obs/BanPick` | 📺 OBS Browser Source — Ban/Pick Overlay |
| `http://localhost:3000/obs/CountDown` | 📺 OBS Browser Source — Timer |
| `http://localhost:3000/obs/FandomWarA` | 📺 OBS Browser Source — Team A Votes |
| `http://localhost:3000/obs/FandomWarB` | 📺 OBS Browser Source — Team B Votes |
| `http://localhost:3000/obs/CameraA` | 📺 OBS Browser Source — Team A Camera |

### 6️⃣ Connect OBS Studio

1. Open **OBS Studio** → Tools → WebSocket Server Settings.
2. Enable WebSocket server (default port: `4455`).
3. In the PCastPro Control Panel → OBS Manager tab → enter `localhost`, port `4455`, and password → click **Connect**.
4. Add Browser Sources pointing to the overlay URLs above (1920×1080 recommended).

---

## 📂 Project Structure

```
pcastpro-broadcast-tool/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Route handlers (auth, obs, fandom, theme, team)
│   ├── middleware/       # Theme asset serving middleware
│   ├── models/          # Mongoose schemas (User, Session, OTP, License, Theme, OBSConfig, TiktokGift)
│   ├── routes/          # Express route definitions
│   ├── services/        # TikTok Live & Facebook Live connectors, Email service
│   ├── sockets/         # WebSocket manager (broadcast hub)
│   └── server.js        # Application entry point
├── frontend/
│   ├── css/             # Control panel styles
│   ├── js/              # Client-side logic (banpickManager, obs-manager, fandomWar)
│   ├── services/        # API & WebSocket client services
│   ├── images/          # Hero portraits & UI assets
│   └── index.html       # Main control panel SPA
├── themes/              # Tournament theme packages
│   ├── apl2025/         # APL 2025 overlays (css, js, obs, assets)
│   ├── rpls25/          # RPL S25 overlays
│   ├── FIT/             # FIT Tournament overlays
│   ├── mcuongcup/       # MCuong Cup overlays
│   └── default/         # Generic overlays
├── shared/              # Shared assets (fonts, audio effects)
├── scripts/             # Batch scripts for setup & deployment
├── obs-data/            # OBS data storage
└── .env.example         # Environment variable template
```

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with ❤️ for the Vietnamese esports broadcasting community**

*PCastPro — Because every champion deserves a professional broadcast.*

</div>
