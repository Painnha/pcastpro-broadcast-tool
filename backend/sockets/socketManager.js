const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const tiktokLiveService = require('../services/tiktokLiveService');
const facebookLiveService = require('../services/facebookLiveService');

// Store WebSocket connections by deviceId for real-time logout
const deviceConnections = new Map();

const initSockets = (server) => {
    const wss = new WebSocket.Server({ server });
    const JWT_SECRET = process.env.JWT_SECRET;

    // Helper to broadcast to all connected clients
    const broadcast = (messageObject) => {
        const messageStr = JSON.stringify(messageObject);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    };

    // --- TikTok Service Broadcasts ---
    tiktokLiveService.onComment((comment) => {
        broadcast({ type: 'tiktok-comment', data: comment });
    });

    tiktokLiveService.on('connected', (data) => {
        broadcast({ type: 'tiktok-connected', data });
    });

    tiktokLiveService.on('disconnected', (data) => {
        broadcast({ type: 'tiktok-disconnected', data });
    });

    tiktokLiveService.on('error', (data) => {
        broadcast({ type: 'tiktok-error', data });
    });

    tiktokLiveService.on('viewers', (data) => {
        broadcast({ type: 'tiktok-viewers', data });
    });

    // --- Facebook Service Broadcasts ---
    facebookLiveService.onComment((comment) => {
        broadcast({ type: 'facebook-comment', data: comment });
    });

    facebookLiveService.on('connected', (data) => {
        broadcast({ type: 'facebook-connected', data });
    });

    facebookLiveService.on('disconnected', (data) => {
        broadcast({ type: 'facebook-disconnected', data });
    });

    facebookLiveService.on('error', (data) => {
        broadcast({ type: 'facebook-error', data });
    });

    // --- WebSocket Server Events ---
    wss.on('connection', (ws, req) => {
        let deviceId = null;
        let sessionId = null;
        
        try {
            const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const token = url.searchParams.get('token');
            
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET);
                deviceId = decoded.deviceId;
                sessionId = decoded.sessionId;
                
                if (!deviceConnections.has(deviceId)) {
                    deviceConnections.set(deviceId, new Set());
                }
                deviceConnections.get(deviceId).add(ws);
            }
        } catch (error) {
            console.error('WS Connection Auth Error:', error.message);
            ws.close(1008, 'Invalid token');
            return;
        }

        console.log(`🔌 WebSocket connected - Device: ${deviceId || 'anonymous'}`);
        
        ws.send(JSON.stringify({ 
            type: 'welcome', 
            message: 'Welcome to the WebSocket server!',
            deviceId,
            sessionId
        }));

        ws.on('message', async (message) => {
            if (sessionId) {
                try {
                    await Session.findOneAndUpdate(
                        { sessionId, isActive: true },
                        { lastActivity: new Date() }
                    );
                } catch (error) {
                    // Session update failed silently
                }
            }

            // Broadcast message to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });

        ws.on('close', () => {
            console.log(`🔌 WebSocket disconnected - Device: ${deviceId || 'anonymous'}`);
            if (deviceId && deviceConnections.has(deviceId)) {
                deviceConnections.get(deviceId).delete(ws);
                if (deviceConnections.get(deviceId).size === 0) {
                    deviceConnections.delete(deviceId);
                }
            }
        });

        ws.on('error', (error) => {
            console.error(`WS Error for device ${deviceId}:`, error.message);
        });
    });

    return { wss, deviceConnections };
};

module.exports = { initSockets, deviceConnections };
