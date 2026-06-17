const axios = require('axios');
const TiktokGift = require('../models/TiktokGift');
const tiktokLiveService = require('../services/tiktokLiveService');
const facebookLiveService = require('../services/facebookLiveService');

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';
const USE_PYTHON_BACKEND = process.env.USE_PYTHON_BACKEND !== 'false';

// API: Get TikTok Gifts List
const getGifts = async (req, res) => {
    try {
        const gifts = await TiktokGift.find({}).select('name icon value -_id');
        
        res.status(200).send({
            success: true,
            gifts: gifts
        });
    } catch (error) {
        console.error('Error fetching TikTok gifts:', error);
        res.status(500).send({
            success: false,
            message: 'Không thể tải danh sách quà tặng'
        });
    }
};

// API: Connect to TikTok Live
const connectTikTok = async (req, res) => {
    const { username, sessionId, sessionIdSs } = req.body;
    
    if (!username) {
        return res.status(400).send({ 
            success: false,
            message: 'TikTok username is required' 
        });
    }
    
    try {
        // Try Python backend first if enabled
        if (USE_PYTHON_BACKEND) {
            try {
                console.log('🐍 Attempting to connect via Python backend...');
                
                const pythonResponse = await axios.post(
                    `${PYTHON_BACKEND_URL}/connect`,
                    { 
                        username, 
                        sessionId: sessionId || sessionIdSs 
                    },
                    { timeout: 10000 }
                );
                
                if (pythonResponse.data.success) {
                    console.log('✅ Connected via Python backend');
                    return res.status(200).send({
                        success: true,
                        message: 'Connected to TikTok Live successfully (Python)',
                        data: pythonResponse.data.data,
                        backend: 'python'
                    });
                }
            } catch (pythonError) {
                console.warn('⚠️ Python backend unavailable, falling back to Node.js:', pythonError.message);
            }
        }
        
        // Fallback to Node.js backend
        console.log('🟢 Using Node.js backend...');
        
        // Disconnect existing connection if any
        if (tiktokLiveService.getStatus().isConnected) {
            tiktokLiveService.disconnect();
        }
        
        const result = await tiktokLiveService.connect(username, sessionId, sessionIdSs);
        
        res.status(200).send({
            success: true,
            message: 'Connected to TikTok Live successfully (Node.js)',
            data: result,
            backend: 'nodejs'
        });
    } catch (error) {
        console.error('Error connecting to TikTok Live:', error);
        res.status(500).send({ 
            success: false,
            message: error.message || 'Failed to connect to TikTok Live'
        });
    }
};

// API: Disconnect from TikTok Live
const disconnectTikTok = async (req, res) => {
    try {
        let disconnected = false;
        
        // Try Python backend first if enabled
        if (USE_PYTHON_BACKEND) {
            try {
                console.log('🐍 Attempting to disconnect via Python backend...');
                
                const pythonResponse = await axios.post(
                    `${PYTHON_BACKEND_URL}/disconnect`,
                    {},
                    { timeout: 5000 }
                );
                
                if (pythonResponse.data.success) {
                    console.log('✅ Disconnected via Python backend');
                    disconnected = true;
                }
            } catch (pythonError) {
                console.warn('⚠️ Python backend disconnect failed:', pythonError.message);
            }
        }
        
        // Also disconnect Node.js backend (in case it was used as fallback)
        if (tiktokLiveService.getStatus().isConnected) {
            tiktokLiveService.disconnect();
            disconnected = true;
        }
        
        res.status(200).send({
            success: true,
            message: 'Disconnected from TikTok Live'
        });
    } catch (error) {
        console.error('Error disconnecting from TikTok Live:', error);
        res.status(500).send({ 
            success: false,
            message: 'Failed to disconnect'
        });
    }
};

// API: Get TikTok/Facebook Live connection status
const getStatus = async (req, res) => {
    try {
        let tiktokStatus = tiktokLiveService.getStatus();
        const facebookStatus = facebookLiveService.getStatus();
        
        // Check Python backend status if enabled
        if (USE_PYTHON_BACKEND) {
            try {
                const pythonResponse = await axios.get(
                    `${PYTHON_BACKEND_URL}/status`,
                    { timeout: 3000 }
                );
                
                if (pythonResponse.data.success && pythonResponse.data.data.isConnected) {
                    // Python backend is connected, use its status
                    tiktokStatus = pythonResponse.data.data;
                }
            } catch (pythonError) {
                // Python backend not available, use Node.js status
            }
        }
        
        // Determine which platform is connected
        const status = tiktokStatus.isConnected ? tiktokStatus : facebookStatus;
        
        res.status(200).send({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).send({
            success: false,
            message: 'Error getting status'
        });
    }
};

// API: Connect to Facebook Live
const connectFacebook = async (req, res) => {
    const { videoId, accessToken } = req.body;
    
    if (!videoId || !accessToken) {
        return res.status(400).send({ 
            success: false,
            message: 'Video ID và Access Token là bắt buộc'
        });
    }
    
    try {
        // Disconnect TikTok if connected
        if (tiktokLiveService.getStatus().isConnected) {
            tiktokLiveService.disconnect();
        }
        
        const result = await facebookLiveService.connect(videoId, accessToken);
        
        res.status(200).send({
            success: true,
            message: 'Đã kết nối với Facebook Live',
            data: result
        });
    } catch (error) {
        console.error('Facebook Live connection error:', error);
        res.status(500).send({
            success: false,
            message: error.message || 'Không thể kết nối với Facebook Live'
        });
    }
};

// API: Disconnect from Facebook Live
const disconnectFacebook = (req, res) => {
    try {
        facebookLiveService.disconnect();
        
        res.status(200).send({
            success: true,
            message: 'Đã ngắt kết nối khỏi Facebook Live'
        });
    } catch (error) {
        console.error('Facebook Live disconnect error:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi ngắt kết nối'
        });
    }
};

module.exports = {
    getGifts,
    connectTikTok,
    disconnectTikTok,
    getStatus,
    connectFacebook,
    disconnectFacebook
};
