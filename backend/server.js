const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs');

const { projectRoot } = require('./config/pathHelper');
const { checkForUpdates } = require('./services/updateService');

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
const { initSockets } = require('./sockets/socketManager');

// Import routes
const authRoutes = require('./routes/authRoutes');
const themeRoutes = require('./routes/themeRoutes');
const teamRoutes = require('./routes/teamRoutes');
const obsRoutes = require('./routes/obsRoutes');
const fandomRoutes = require('./routes/fandomRoutes');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
initSockets(server);

// Middleware
app.use(bodyParser.json());
app.use(cors());

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

// Start Server wrapped in an async function to allow update checks first
async function startServer() {
    // Check and apply updates if packaged
    await checkForUpdates();

    // Initialize database connection
    connectDB();

    const HTTP_PORT = process.env.PORT || 3000;
    server.listen(HTTP_PORT, () => {
        const { CURRENT_VERSION } = require('./services/updateService');
        console.log('');
        console.log('  ====================================');
        console.log('   PCastPro Broadcast Tool');
        console.log(`   Version : ${CURRENT_VERSION}`);
        console.log(`   URL     : http://localhost:${HTTP_PORT}`);
        console.log('  ====================================');
        console.log('');
    });
}

startServer();