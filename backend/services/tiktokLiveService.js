const { WebcastPushConnection } = require('tiktok-live-connector');

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
            this.username = username;
            this.sessionId = sessionId;
            this.sessionIdSs = sessionIdSs;
            
            // Simple configuration - theo pattern của code test thành công
            const options = {
                processInitialData: true,           // ✅ Bật để nhận initial data
                enableExtendedGiftInfo: true,       // ✅ Bật để có thông tin gift đầy đủ
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
            
            // Safely extract room info (có thể undefined)
            const roomOwner = state?.roomInfo?.owner?.uniqueId || username;
            const roomId = state?.roomInfo?.roomId || 'unknown';
            const viewerCount = state?.roomInfo?.viewerCount || 0;
            
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
            
            this.triggerEvent('error', { error: error.message });
            
            console.error('❌ Connection error:', error.message);
            throw new Error(`Không thể kết nối TikTok Live: ${error.message}`);
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
                text: data.comment,
                timestamp: new Date(),
                profilePictureUrl: data.profilePictureUrl,
                userId: data.userId
            };
            
            // console.log(`💬 ${data.uniqueId}: ${data.comment}`);
            
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
            const shouldProcess = (data.giftType === 1 && data.repeatEnd) || data.giftType !== 1;
            
            if (shouldProcess) {
                const giftComment = {
                    username: data.uniqueId,
                    nickname: data.nickname,
                    text: `🎁 Tặng ${data.giftName} x${data.repeatCount || 1}`,
                    timestamp: new Date(),
                    profilePictureUrl: data.profilePictureUrl,
                    userId: data.userId,
                    isGift: true,
                    giftName: data.giftName,
                    giftCount: data.repeatCount || 1,
                    giftId: data.giftId
                };
                
                // console.log(`🎁 ${data.uniqueId} → ${data.giftName} x${data.repeatCount || 1}`);
                
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
            const viewerData = {
                viewerCount: data.viewerCount || 0
            };
            
            // console.log(`📊 Viewers: ${data.viewerCount}`);
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
            const errorMsg = error.message || error.info || JSON.stringify(error);
            
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
