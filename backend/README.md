# Ban Pick Backend Server

Backend server for Arena of Valor Ban/Pick management system.

## Features

- **WebSocket Server**: Real-time communication for ban/pick updates
- **License Management**: JWT-based license key activation and validation
- **Firebase Integration**: Real-time database for license storage
- **Static File Serving**: Serves frontend files and hero images
- **Admin Panel**: License management endpoints for administrators

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Update the `.env` file with your JWT secret:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Run the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Access the Application

- **Main Application**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **Activation Page**: http://localhost:3000/activate.html

## API Endpoints

### Public Endpoints
- `POST /activate` - Activate license key
- `GET /check-license` - Validate license key

### Admin Endpoints (Requires admin token)
- `GET /list-licenses` - List all license keys
- `POST /revoke-license` - Revoke a license key

## WebSocket Events

The WebSocket server handles real-time communication for:
- Ban/pick updates
- Player name updates
- Hero swapping
- Sound effects
- Countdown synchronization

## Dependencies

- **express**: Web server framework
- **firebase**: Firebase SDK for database operations
- **jsonwebtoken**: JWT token management
- **ws**: WebSocket server implementation
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## File Structure

```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
└── README.md         # This file
```

## Notes

- The server serves static files from `../frontend`, `../shared`, and `../obs` directories
- Firebase configuration is currently hardcoded in server.js
- Default port is 3000
- WebSocket and HTTP server run on the same port