const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const tiktokLiveService = require('../services/tiktokLiveService');
const facebookLiveService = require('../services/facebookLiveService');

let wssInstance = null;

// Store WebSocket connections by deviceId for real-time logout
const deviceConnections = new Map();

// Helper to broadcast to all connected clients
const broadcast = (messageObject) => {
    if (!wssInstance) return;
    const messageStr = typeof messageObject === 'string' ? messageObject : JSON.stringify(messageObject);
    wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
};

const initSockets = (server) => {
    const wss = new WebSocket.Server({ server });
    wssInstance = wss;
    const JWT_SECRET = process.env.JWT_SECRET;

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
    wss.on('connection', async (ws, req) => {
        let deviceId = null;
        let sessionId = null;
        
        ws.userPermissions = [];
        ws.userRole = 'user';
        
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
                
                // Fetch user permissions from database
                const User = require('../models/User');
                const user = await User.findById(decoded.userId);
                if (user) {
                    ws.userPermissions = user.permissions || [];
                    ws.userRole = user.role;
                }
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

            // Validate permissions before broadcasting control updates
            try {
                const msgObj = JSON.parse(message);
                
                if (msgObj.type !== 'connected') {
                    if (!deviceId) {
                        console.warn('WS Security warning: Blocked control message from anonymous connection');
                        return;
                    }
                    
                    const hasBasic = ws.userRole === 'admin' || ws.userPermissions.includes('basic');
                    const hasFandom = ws.userRole === 'admin' || ws.userPermissions.includes('fandomwar');
                    const hasObs = ws.userRole === 'admin' || ws.userPermissions.includes('quanlyobs');

                    if (msgObj.type === 'fandomwar-config' || msgObj.type?.startsWith('tiktok-') || msgObj.type?.startsWith('facebook-')) {
                        if (!hasFandom) {
                            console.warn(`WS Security warning: Blocked fandomwar message from user without permission`);
                            return;
                        }
                    } else if (msgObj.type === 'obs-command' || msgObj.type === 'obs-status') {
                        if (!hasObs) {
                            console.warn(`WS Security warning: Blocked obs message from user without permission`);
                            return;
                        }
                    } else {
                        // All other messages (banpick, custom match etc) require basic
                        if (!hasBasic) {
                            console.warn(`WS Security warning: Blocked control/banpick message from user without permission`);
                            return;
                        }
                    }
                }
            } catch (err) {
                // Ignore parse errors (non-JSON messages)
            }

            // Broadcast message to all connected clients
            // Inject motionHero permission flag for ban/pick messages
            let broadcastMessage = message;
            try {
                const msgObj = JSON.parse(message);
                if (msgObj.type === 'lock' || msgObj.type === 'select' || msgObj.type === 'banActive') {
                    const User = require('../models/User');
                    const activeUser = await User.findOne({ isActive: true }).sort({ lastActivity: -1 });
                    const hasPermission = activeUser && (
                        activeUser.role === 'admin' ||
                        (activeUser.permissions && activeUser.permissions.includes('motionhero'))
                    );
                    msgObj.motionHeroEnabled = !!(hasPermission && activeUser.motionHeroEnabled !== false);
                    broadcastMessage = JSON.stringify(msgObj);
                }
            } catch (e) {
                // Non-JSON or parse error — broadcast as-is
            }

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastMessage);
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

module.exports = { initSockets, deviceConnections, broadcast };
