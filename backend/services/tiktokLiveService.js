let WebcastPushConnection = null;

async function loadWebcastPushConnection() {
    if (!WebcastPushConnection) {
        const module = await import('../node_modules/tiktok-live-connector/dist/legacy.js');
        WebcastPushConnection = module.WebcastPushConnection;
    }
    return WebcastPushConnection;
}

class TikTokLiveService {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.username = '';
        this.sessionId = null;
        this.sessionIdSs = null;
        this.commentCallbacks = [];
        this.eventCallbacks = {
            connected: [],
            disconnected: [],
            error: [],
            viewers: []
        };
    }

    /**
     * Kết nối đến TikTok Live stream
     * @param {string} username - TikTok username hoặc uniqueId
     * @param {string} sessionId - TikTok sessionId cookie (optional)
     * @param {string} sessionIdSs - TikTok sessionId_ss cookie (optional, for v2.x)
     */
    async connect(username, sessionId = null, sessionIdSs = null) {
        if (this.isConnected) {
            throw new Error('Already connected to a live stream');
        }

        try {
            await loadWebcastPushConnection();
            
            this.username = username;
            this.sessionId = sessionId;
            this.sessionIdSs = sessionIdSs;
            
            // Simple configuration - theo pattern của code test thành công
            const options = {
                processInitialData: true,           // ✅ Bật để nhận initial data
                enableExtendedGiftInfo: false,      // ❌ Tắt do signature endpoint EulerStream yêu cầu gói Business
                fetchRoomInfoOnConnect: true        // ✅ Bật để fetch room info
            };
            
            // Add sessionId if provided
            if (sessionId && sessionId.trim().length > 0) {
                options.sessionId = sessionId.trim();
                console.log('✅ Using provided sessionId');
            } else {
                console.log('🌐 Connecting anonymously');
            }
            
            this.connection = new WebcastPushConnection(username, options);

            // Setup event listeners
            this.setupEventListeners();

            // Connect
            const state = await this.connection.connect();
            
            this.isConnected = true;
            
            // Safely extract room info (tương thích cả v1.x/v2.1.0 và v2.4.0)
            const roomOwner = state?.roomInfo?.data?.owner?.displayId || state?.roomInfo?.owner?.uniqueId || username;
            const roomId = state?.roomId || state?.roomInfo?.roomId || 'unknown';
            const viewerCount = state?.roomInfo?.data?.user_count || state?.roomInfo?.viewerCount || 0;
            
            console.log(`✅ Connected to @${roomOwner}`);
            console.log(`📊 Room ID: ${roomId}`);
            console.log(`👥 Viewers: ${viewerCount}`);
            
            this.triggerEvent('connected', { 
                username: roomOwner,
                viewerCount: viewerCount
            });
            
            return {
                success: true,
                username: roomOwner,
                roomId: roomId,
                viewerCount: viewerCount
            };
        } catch (error) {
            // Cleanup nếu có lỗi
            this.isConnected = false;
            if (this.connection) {
                try {
                    this.connection.disconnect();
                } catch (e) {
                    // Ignore disconnect errors
                }
                this.connection = null;
            }
            
            let errMsg = error.message;
            if (!errMsg) {
                if (error.errors && Array.isArray(error.errors)) {
                    errMsg = error.errors.map(e => e.message || String(e)).join('; ');
                } else if (error.info) {
                    errMsg = error.info;
                } else {
                    errMsg = String(error);
                }
            }
            
            this.triggerEvent('error', { error: errMsg });
            
            console.error('❌ Connection error:', errMsg);
            throw new Error(`Không thể kết nối TikTok Live: ${errMsg}`);
        }
    }

    /**
     * Ngắt kết nối
     */
    disconnect() {
        if (!this.isConnected || !this.connection) {
            return;
        }

        try {
            this.connection.disconnect();
            this.isConnected = false;
            this.username = '';
            
            console.log('🔌 Disconnected from TikTok Live');
            this.triggerEvent('disconnected', {});
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }

    /**
     * Setup event listeners cho TikTok Live connection
     */
    setupEventListeners() {
        if (!this.connection) return;

        // Chat comments
        this.connection.on('chat', (data) => {
            const comment = {
                username: data.uniqueId,
                nickname: data.nickname,
                text: data.comment || data.content,
                timestamp: new Date(),
                profilePictureUrl: data.profilePictureUrl,
                userId: data.userId
            };
            
            // console.log(`💬 ${data.uniqueId}: ${data.comment || data.content}`);
            
            // Trigger all registered callbacks
            this.commentCallbacks.forEach(callback => {
                try {
                    callback(comment);
                } catch (error) {
                    console.error('Comment callback error:', error);
                }
            });
        });

        // Gifts - xử lý streak theo documentation
        this.connection.on('gift', (data) => {
            // Chỉ xử lý khi:
            // - Gift type 1 (có streak) và repeatEnd = true (streak kết thúc)
            // - Gift type khác 1 (không có streak) thì xử lý luôn
            const giftType = data.giftType !== undefined ? data.giftType : data.gift?.type;
            const giftName = data.giftName || data.gift?.name;
            const giftId = data.giftId || data.gift?.id;
            
            const shouldProcess = (giftType === 1 && data.repeatEnd) || giftType !== 1;
            
            if (shouldProcess) {
                const giftComment = {
                    username: data.uniqueId,
                    nickname: data.nickname,
                    text: `🎁 Tặng ${giftName} x${data.repeatCount || 1}`,
                    timestamp: new Date(),
                    profilePictureUrl: data.profilePictureUrl,
                    userId: data.userId,
                    isGift: true,
                    giftName: giftName,
                    giftCount: data.repeatCount || 1,
                    giftId: giftId
                };
                
                // console.log(`🎁 ${data.uniqueId} → ${giftName} x${data.repeatCount || 1}`);
                
                // Trigger comment callbacks để hiển thị gift như comment
                this.commentCallbacks.forEach(callback => {
                    try {
                        callback(giftComment);
                    } catch (error) {
                        console.error('Gift callback error:', error);
                    }
                });
            }
        });

        // Member joined
        this.connection.on('member', (data) => {
            // console.log(`👋 ${data.uniqueId} joined`);
        });

        // Likes
        this.connection.on('like', (data) => {
            // console.log(`❤️ ${data.uniqueId} sent ${data.likeCount} likes`);
        });

        // Shares
        this.connection.on('share', (data) => {
            // console.log(`📤 ${data.uniqueId} shared the stream`);
        });

        // Follows
        this.connection.on('social', (data) => {
            // console.log(`🔔 ${data.uniqueId} followed`);
        });

        // Room stats update (viewer count)
        this.connection.on('roomUser', (data) => {
            const viewerCount = parseInt(data.viewerCount || data.total) || 0;
            const viewerData = {
                viewerCount: viewerCount
            };
            
            // console.log(`📊 Viewers: ${viewerCount}`);
            this.triggerEvent('viewers', viewerData);
        });

        // Stream ended
        this.connection.on('streamEnd', () => {
            console.log('🔚 TikTok Live stream ended');
            this.isConnected = false;
            this.triggerEvent('disconnected', { reason: 'Stream ended' });
        });

        // Connection errors
        this.connection.on('error', (error) => {
            let errorMsg = error.message || error.info;
            if (!errorMsg && error.exception) {
                errorMsg = error.exception.message || String(error.exception);
            }
            if (!errorMsg) {
                errorMsg = JSON.stringify(error);
            }
            
            // Ignore non-critical errors
            if (errorMsg.includes('Missing cursor')) {
                return;
            }
            
            // Ignore fallback messages (không phải lỗi thực sự)
            if (errorMsg.includes('falling back to API source')) {
                return;
            }
            
            // Chỉ log các lỗi thực sự quan trọng
            console.error('❌ TikTok error:', errorMsg);
            this.triggerEvent('error', { error: errorMsg });
        });

        // Disconnected
        this.connection.on('disconnected', () => {
            console.log('🔌 TikTok Live disconnected');
            this.isConnected = false;
            this.triggerEvent('disconnected', {});
        });
    }

    /**
     * Đăng ký callback cho comments
     * @param {Function} callback 
     */
    onComment(callback) {
        if (typeof callback === 'function') {
            this.commentCallbacks.push(callback);
        }
    }

    /**
     * Đăng ký callback cho events
     * @param {string} event - 'connected', 'disconnected', 'error', 'viewers'
     * @param {Function} callback 
     */
    on(event, callback) {
        if (this.eventCallbacks[event] && typeof callback === 'function') {
            this.eventCallbacks[event].push(callback);
        }
    }

    /**
     * Trigger event callbacks
     */
    triggerEvent(event, data) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error (${event}):`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            username: this.username
        };
    }

    /**
     * Clear all callbacks
     */
    clearCallbacks() {
        this.commentCallbacks = [];
        this.eventCallbacks = {
            connected: [],
            disconnected: [],
            error: [],
            viewers: []
        };
    }
}

// Singleton instance
const tiktokLiveService = new TikTokLiveService();

module.exports = tiktokLiveService;
