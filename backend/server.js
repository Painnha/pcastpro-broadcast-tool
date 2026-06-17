const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/db');
const { serveThemeAssets } = require('./middleware/themeServer');
const { initSockets } = require('./sockets/socketManager');

// Import routes
const authRoutes = require('./routes/authRoutes');
const themeRoutes = require('./routes/themeRoutes');
const teamRoutes = require('./routes/teamRoutes');
const obsRoutes = require('./routes/obsRoutes');
const fandomRoutes = require('./routes/fandomRoutes');

// Initialize database connection
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
initSockets(server);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static assets
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../shared')));

// Dynamic theme asset routing
app.use('/themes/:themeFolder', serveThemeAssets);

// API/Page Routes
app.use(authRoutes);
app.use(themeRoutes);
app.use(teamRoutes);
app.use(obsRoutes);
app.use(fandomRoutes);

// Start Server
const HTTP_PORT = process.env.PORT || 3000;
server.listen(HTTP_PORT, () => {
    console.log(`HTTP & WebSocket server running on http://localhost:${HTTP_PORT}`);
});