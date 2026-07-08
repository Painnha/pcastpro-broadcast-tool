const path = require('path');
const fs = require('fs');
const OBSConfig = require('../models/OBSConfig');
const User = require('../models/User');
const Theme = require('../models/Theme');
const { projectRoot } = require('../config/pathHelper');

// API: Get OBS Config
const getOBSConfig = async (req, res) => {
    const { userId } = req.user;
    
    try {
        // Load the user's single config
        let obsConfig = await OBSConfig.findOne({ userId });
        
        // If no config exists, return empty config
        if (!obsConfig) {
            return res.status(200).send({
                success: true,
                data: {
                    pinned: [],
                    links: {},
                    contents: {},
                    swapPairs: []
                }
            });
        }
        
        // Convert Map to Object for JSON response
        const response = {
            _id: obsConfig._id,
            pinned: obsConfig.pinned,
            links: Object.fromEntries(obsConfig.links),
            contents: Object.fromEntries(obsConfig.contents),
            swapPairs: obsConfig.swapPairs || []
        };
        
        res.status(200).send({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error fetching OBS config:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi tải cấu hình OBS'
        });
    }
};

// API: Save OBS Config
const saveOBSConfig = async (req, res) => {
    const { userId } = req.user;
    const { pinned, links, contents, swapPairs } = req.body;
    
    try {
        // Try to find existing config
        let obsConfig = await OBSConfig.findOne({ userId });
        
        if (obsConfig) {
            // Update existing config
            obsConfig = await OBSConfig.findOneAndUpdate(
                { userId },
                {
                    pinned: pinned || [],
                    links: links || {},
                    contents: contents || {},
                    swapPairs: swapPairs || []
                },
                { new: true }
            );
        } else {
            // Create new config if it doesn't exist
            obsConfig = new OBSConfig({
                userId,
                pinned: pinned || [],
                links: links || {},
                contents: contents || {},
                swapPairs: swapPairs || []
            });
            await obsConfig.save();
        }
        
        res.status(200).send({
            success: true,
            message: 'Cấu hình OBS đã được lưu thành công',
            data: {
                _id: obsConfig._id,
                pinned: obsConfig.pinned,
                links: Object.fromEntries(obsConfig.links),
                contents: Object.fromEntries(obsConfig.contents),
                swapPairs: obsConfig.swapPairs || []
            }
        });
    } catch (error) {
        console.error('Error saving OBS config:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi lưu cấu hình OBS'
        });
    }
};

// API: Get latest file in directory
const getLatestFile = async (req, res) => {
    const { directory } = req.body;
    
    if (!directory) {
        return res.status(400).send({
            success: false,
            message: 'Thiếu thư mục'
        });
    }
    
    try {
        // Check if directory exists
        if (!fs.existsSync(directory)) {
            return res.status(404).send({
                success: false,
                message: 'Thư mục không tồn tại'
            });
        }
        
        // Read all files in directory
        const files = fs.readdirSync(directory);
        
        // Filter for video files only
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm'];
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return videoExtensions.includes(ext);
        });
        
        if (videoFiles.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Không tìm thấy file video nào trong thư mục'
            });
        }
        
        // Get file stats and find the latest one
        let latestFile = null;
        let latestTime = 0;
        
        videoFiles.forEach(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            const mtime = stats.mtime.getTime();
            
            if (mtime > latestTime) {
                latestTime = mtime;
                latestFile = filePath;
            }
        });
        
        if (latestFile) {
            // Convert backslashes to forward slashes for consistency
            latestFile = latestFile.replace(/\\/g, '/');
            
            res.status(200).send({
                success: true,
                filePath: latestFile,
                fileName: path.basename(latestFile)
            });
        } else {
            res.status(404).send({
                success: false,
                message: 'Không thể tìm file mới nhất'
            });
        }
    } catch (error) {
        console.error('Error finding latest file:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi tìm file: ' + error.message
        });
    }
};

// API: Serve OBS Pages (Dynamic theme loading based on user selection)
const serveOBSPage = async (req, res) => {
    const { page } = req.params;
    
    // Validate page name
    const validPages = [
        'BanPick',
        'PickListA',
        'PickListB',
        'BanListA',
        'BanListB',
        'CountDown',
        'PreviousListA',
        'PreviousListB',
        'FandomWarA',
        'FandomWarB',
        'CameraA',
        'CameraB',
        'VoteChatA',
        'VoteChatB',
        'ObjectiveA',
        'ObjectiveB'
    ];
    if (!validPages.includes(page)) {
        return res.status(404).send('Invalid OBS page');
    }
    
    try {
        // Find the most recently active user
        const activeUser = await User.findOne({ isActive: true }).sort({ lastActivity: -1 });
        
        // If no active user or user has no themes, return blank page
        if (!activeUser || !activeUser.ownedThemes || activeUser.ownedThemes.length === 0) {
            return res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
        }
        
        // If user has no current theme selected, return blank page
        if (!activeUser.currentTheme) {
            return res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
        }
        
        // Verify user owns the selected theme
        if (!activeUser.ownedThemes.includes(activeUser.currentTheme)) {
            return res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
        }
        
        // Get theme details from database
        const theme = await Theme.findOne({ themeID: activeUser.currentTheme });
        if (!theme) {
            return res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
        }
        
        // Construct file path
        const obsFilePath = path.join(projectRoot, theme.path, 'obs', `${page}.html`);
        
        // Check if file exists
        if (!fs.existsSync(obsFilePath)) {
            return res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
        }
        
        // Read and modify the HTML to use correct theme paths
        let htmlContent = fs.readFileSync(obsFilePath, 'utf8');
        
        // Use theme.path for URL replacement instead of hardcoded themeId
        const themeUrlPath = theme.path.startsWith('/') ? theme.path : `/${theme.path}`;
        
        // Replace CSS and JS paths to use the theme's path
        htmlContent = htmlContent
            .replace(/href="\/css\//g, `href="${themeUrlPath}/css/`)
            .replace(/src="\/js\//g, `src="${themeUrlPath}/js/`)
            .replace(/src="\/assets\//g, `src="${themeUrlPath}/assets/`)
            .replace(/src="\/audio\//g, `src="${themeUrlPath}/assets/audio/`)
            .replace(/src="\/images\//g, `src="${themeUrlPath}/assets/`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        console.error('Error serving OBS page:', error);
        // On any error, return blank page
        res.send('<!DOCTYPE html><html><head><title>OBS Display</title></head><body></body></html>');
    }
};

module.exports = {
    getOBSConfig,
    saveOBSConfig,
    getLatestFile,
    serveOBSPage
};
