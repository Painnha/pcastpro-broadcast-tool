const axios = require('axios');

class FacebookLiveService {
    constructor() {
        this.isConnected = false;
        this.videoId = '';
        this.accessToken = '';
        this.pollingInterval = null;
        this.commentCallbacks = [];
        this.processedCommentIds = new Set(); // Tránh xử lý comment trùng
        this.lastCommentTime = null;
        
        this.eventCallbacks = {
            connected: [],
            disconnected: [],
            error: []
        };
    }

    /**
     * Kết nối đến Facebook Live video
     * @param {string} videoId - Facebook Live Video ID
     * @param {string} accessToken - Facebook Page Access Token
     */
    async connect(videoId, accessToken) {
        if (this.isConnected) {
            throw new Error('Already connected to a live video');
        }

        try {
            this.videoId = videoId;
            this.accessToken = accessToken;

            // Verify video exists and is live
            const videoInfo = await this.getVideoInfo();
            
            if (!videoInfo) {
                throw new Error('Video not found or access denied');
            }

            this.isConnected = true;
            this.lastCommentTime = new Date().toISOString();
            
            // Start polling comments
            this.startPolling();
            
            this.triggerEvent('connected', { 
                videoId: videoInfo.id,
                title: videoInfo.title || 'Facebook Live'
            });
            
            return {
                success: true,
                videoId: videoInfo.id,
                title: videoInfo.title
            };
        } catch (error) {
            this.isConnected = false;
            this.triggerEvent('error', { error: error.message });
            throw new Error(`Failed to connect: ${error.message}`);
        }
    }

    /**
     * Get video info from Facebook Graph API
     */
    async getVideoInfo() {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${this.videoId}`,
                {
                    params: {
                        fields: 'id,title,live_status,description',
                        access_token: this.accessToken
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting video info:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Start polling comments
     */
    startPolling() {
        // Poll every 2 seconds
        this.pollingInterval = setInterval(() => {
            this.fetchNewComments();
        }, 2000);
        
        // Fetch immediately
        this.fetchNewComments();
    }

    /**
     * Fetch new comments from Facebook Graph API
     */
    async fetchNewComments() {
        if (!this.isConnected) return;

        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${this.videoId}/comments`,
                {
                    params: {
                        fields: 'id,from,message,created_time',
                        filter: 'stream',
                        order: 'chronological',
                        since: this.lastCommentTime,
                        access_token: this.accessToken
                    }
                }
            );

            const comments = response.data.data || [];
            
            // Process new comments
            comments.forEach(comment => {
                // Skip if already processed
                if (this.processedCommentIds.has(comment.id)) {
                    return;
                }
                
                this.processedCommentIds.add(comment.id);
                
                // Limit set size to prevent memory leak
                if (this.processedCommentIds.size > 10000) {
                    const firstId = this.processedCommentIds.values().next().value;
                    this.processedCommentIds.delete(firstId);
                }
                
                const formattedComment = {
                    username: comment.from?.id || 'unknown',
                    nickname: comment.from?.name || 'Facebook User',
                    text: comment.message || '',
                    timestamp: new Date(comment.created_time),
                    commentId: comment.id
                };
                
                // Trigger callbacks
                this.commentCallbacks.forEach(callback => {
                    try {
                        callback(formattedComment);
                    } catch (error) {
                        console.error('Callback error:', error);
                    }
                });
                
                // Update last comment time
                this.lastCommentTime = comment.created_time;
            });
            
        } catch (error) {
            console.error('Error fetching comments:', error.response?.data || error.message);
            
            // If token expired or video ended, disconnect
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.disconnect();
                this.triggerEvent('error', { error: 'Access token expired or invalid' });
            }
        }
    }

    /**
     * Ngắt kết nối
     */
    disconnect() {
        if (!this.isConnected) return;

        try {
            // Stop polling
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
            
            this.isConnected = false;
            this.videoId = '';
            this.accessToken = '';
            this.processedCommentIds.clear();
            
            this.triggerEvent('disconnected', {});
        } catch (error) {
            console.error('Disconnect error:', error);
        }
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
     * @param {string} event - 'connected', 'disconnected', 'error'
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
                    console.error('Event callback error:', error);
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
            videoId: this.videoId,
            platform: 'facebook'
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
            error: []
        };
    }
}

// Singleton instance
const facebookLiveService = new FacebookLiveService();

module.exports = facebookLiveService;

