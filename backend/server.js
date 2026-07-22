const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

const { projectRoot } = require('./config/pathHelper');
const { checkForUpdates, CURRENT_VERSION } = require('./services/updateService');

// Load .env from project root first, fall back to backend/ folder
const envPathRoot = path.join(projectRoot, '.env');
const envPathBackend = path.join(projectRoot, 'backend', '.env');

if (fs.existsSync(envPathRoot)) {
    require('dotenv').config({ path: envPathRoot });
} else if (fs.existsSync(envPathBackend)) {
    require('dotenv').config({ path: envPathBackend });
} else {
    require('dotenv').config();
}

// Fallback values for security and convenience
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
process.env.PORT = process.env.PORT || '3000';

const connectDB = require('./config/db');
const { serveThemeAssets } = require('./middleware/themeServer');
const { initSockets, broadcast } = require('./sockets/socketManager');

// Import routes
const authRoutes = require('./routes/authRoutes');
const themeRoutes = require('./routes/themeRoutes');
const teamRoutes = require('./routes/teamRoutes');
const obsRoutes = require('./routes/obsRoutes');
const fandomRoutes = require('./routes/fandomRoutes');
const motionHeroRoutes = require('./routes/motionHeroRoutes');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
initSockets(server);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Block direct access to hero motion files (encrypted .dat and source .mp4)
app.use('/images/heroMotion', (req, res) => {
    res.status(403).send('Access denied');
});

// Serve static assets using projectRoot
app.use(express.static(path.join(projectRoot, 'frontend')));
app.use(express.static(path.join(projectRoot, 'shared')));

// Dynamic theme asset routing
app.use('/themes/:themeFolder', serveThemeAssets);

// API/Page Routes
app.use(authRoutes);
app.use(themeRoutes);
app.use(teamRoutes);
app.use(obsRoutes);
app.use(fandomRoutes);
app.use(motionHeroRoutes);

// Update Status & Manual Sync Endpoint
app.get(['/api/update/status', '/update/status'], (req, res) => {
    res.json({
        success: true,
        version: CURRENT_VERSION,
        timestamp: new Date().toISOString()
    });
});

app.post(['/api/update/check', '/update/check'], (req, res) => {
    checkForUpdates(broadcast);
    res.json({ success: true, message: 'Đã kích hoạt quét & đồng bộ dữ liệu ngầm.' });
});

// Start Server asynchronously (Non-blocking)
async function startServer() {
    // Initialize database connection
    connectDB();

    const HTTP_PORT = process.env.PORT || 3000;
    server.listen(HTTP_PORT, () => {
        console.log('');
        console.log('  ====================================');
        console.log('   PCastPro Broadcast Tool');
        console.log(`   Version : ${CURRENT_VERSION}`);
        console.log(`   URL     : http://localhost:${HTTP_PORT}`);
        console.log('  ====================================');
        console.log('');

        // Launch background Unified Delta Updater (Core check -> Asset Self-Healing)
        checkForUpdates(broadcast).catch(err => {
            console.warn('Unified Updater background run finished with warning:', err.message);
        });

        // Tự động mở trình duyệt nếu chạy từ file EXE
        if (process.pkg) {
            const url = `http://localhost:${HTTP_PORT}/index.html`;
            const cmd = process.platform === 'win32'
                ? `start "" "${url}"`
                : process.platform === 'darwin'
                    ? `open "${url}"`
                    : `xdg-open "${url}"`;
            exec(cmd, (err) => {
                if (err) {
                    console.error('Không thể tự động mở trình duyệt:', err.message);
                }
            });
        }
    });
}

startServer();