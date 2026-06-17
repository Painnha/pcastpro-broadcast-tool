const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Session = require('./models/Session');
const OTP = require('./models/OTP');
const Theme = require('./models/Theme');
const TiktokGift = require('./models/TiktokGift');
const OBSConfig = require('./models/OBSConfig');
const otpEmailService = require('./services/otpEmailService');
const tiktokLiveService = require('./services/tiktokLiveService');
const facebookLiveService = require('./services/facebookLiveService');
const axios = require('axios');

// Python Backend Configuration
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';
const USE_PYTHON_BACKEND = process.env.USE_PYTHON_BACKEND !== 'false'; // Default to true

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Store WebSocket connections by deviceId for real-time logout
const deviceConnections = new Map();

// Utility functions
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateDeviceId = (userAgent, ipAddress) => {
    const hash = require('crypto').createHash('md5');
    hash.update(userAgent + ipAddress + Date.now());
    return `device_${hash.digest('hex').substr(0, 16)}`;
};

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../shared')));

// Serve theme assets dynamically
app.use('/themes/:themeFolder', async (req, res, next) => {
    const { themeFolder } = req.params;
    
    try {
        // First try to find theme by themeID matching the folder name
        let theme = await Theme.findOne({ themeID: themeFolder });
        
        // If not found, try to find theme by path matching the folder
        if (!theme) {
            theme = await Theme.findOne({ 
                $or: [
                    { path: `themes/${themeFolder}` },
                    { path: `/themes/${themeFolder}` }
                ]
            });
        }
        
        if (!theme) {
            return res.status(404).send('Theme not found');
        }
        
        const themePath = path.join(__dirname, '..', theme.path);
        
        // Handle CSS files with path replacement
        if (req.path.endsWith('.css')) {
            const cssFilePath = path.join(themePath, req.path);
            
            if (fs.existsSync(cssFilePath)) {
                let cssContent = fs.readFileSync(cssFilePath, 'utf8');
                
                // Use the folder name from URL for consistent path replacement
                const themeUrlPath = `/themes/${themeFolder}`;
                
                // Replace relative paths with theme-specific paths
                cssContent = cssContent
                    .replace(/url\(['"]?\/assets\//g, `url('${themeUrlPath}/assets/`)
                    .replace(/url\(['"]?\/font\//g, `url('${themeUrlPath}/assets/font/`)
                    .replace(/url\(['"]?\/images\//g, `url('${themeUrlPath}/assets/`)
                    .replace(/url\(['"]?\/audio\//g, `url('${themeUrlPath}/assets/audio/`);
                
                res.setHeader('Content-Type', 'text/css');
                res.send(cssContent);
                return;
            }
        }
        
        // Default static file serving for other files
        express.static(themePath)(req, res, next);
    } catch (error) {
        console.error('Error serving theme:', error);
        res.status(500).send('Internal server error');
    }
});

// Middleware: JWT Authentication
const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Không có token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const session = await Session.findOne({
            userId: decoded.userId,
            deviceId: decoded.deviceId,
            isActive: true
        });
        
        if (!session) {
            return res.status(403).send({ 
                message: 'Session không hợp lệ hoặc đã hết hạn',
                forceLogout: true
            });
        }
        
        await Session.findByIdAndUpdate(session._id, {
            lastActivity: new Date()
        });
        
        req.user = decoded;
        req.session = session;
        next();
    } catch (err) {
        console.error('Invalid token:', err);
        res.status(403).send({ 
            message: 'Token không hợp lệ',
            forceLogout: true
        });
    }
};

// Fixed OBS Routes - Dynamic theme loading based on user selection
app.get('/obs/:page', async (req, res) => {
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
        const obsFilePath = path.join(__dirname, '..', theme.path, 'obs', `${page}.html`);
        
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
});

// API: Send OTP for registration
app.post('/send-otp', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: 'Thiếu thông tin đăng ký' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send({ message: 'Định dạng email không hợp lệ' });
    }

    if (password.length < 6) {
        return res.status(400).send({ message: 'Mật khẩu phải ít nhất 6 ký tự' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).send({ message: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await OTP.deleteMany({ email });

        const otpCode = generateOTP();
        const displayName = email.split('@')[0];
        const newOTP = new OTP({
            email,
            password: hashedPassword,
            otp: otpCode,
            displayName
        });

        await newOTP.save();

        const emailSent = await otpEmailService.sendOTP(email, otpCode);
        
        if (!emailSent) {
            return res.status(500).send({ message: 'Không thể gửi email OTP. Vui lòng thử lại sau.' });
        }

        res.status(200).send({ 
            message: 'Mã OTP đã được gửi đến email của bạn',
            email: email,
            expiresIn: '5 phút'
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).send({ message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    }
});

// API: Verify OTP and create account
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).send({ message: 'Thiếu thông tin xác thực' });
    }

    try {
        const otpRecord = await OTP.findOne({ 
            email,
            isVerified: false
        });

        if (!otpRecord) {
            return res.status(404).send({ message: 'OTP không tồn tại hoặc đã được sử dụng' });
        }

        if (new Date() > otpRecord.expiresAt) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(410).send({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
        }

        if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(429).send({ message: 'Đã vượt quá số lần thử. Vui lòng yêu cầu mã OTP mới.' });
        }

        if (otpRecord.otp !== otp) {
            await OTP.findByIdAndUpdate(otpRecord._id, {
                $inc: { attempts: 1 }
            });
            
            const remainingAttempts = 3 - (otpRecord.attempts + 1);
            return res.status(400).send({ 
                message: `Mã OTP không chính xác. Còn lại ${remainingAttempts} lần thử.` 
            });
        }

        const displayName = email.split('@')[0];
        const newUser = new User({
            email,
            password: otpRecord.password,
            displayName,
            isEmailVerified: true
        });

        await newUser.save();

        await OTP.findByIdAndUpdate(otpRecord._id, {
            isVerified: true
        });

        res.status(201).send({ 
            message: 'Tài khoản đã được tạo thành công!',
            email,
            displayName
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).send({ message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    }
});

// API: Login
app.post('/login', async (req, res) => {
    const { email, password, deviceId, forceLogin } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!email || !password || !deviceId) {
        return res.status(400).send({ message: 'Thiếu thông tin đăng nhập' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: 'Email không tồn tại' });
        }

        if (!user.isActive) {
            return res.status(403).send({ message: 'Tài khoản đã bị khóa' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).send({ message: 'Mật khẩu không chính xác' });
        }

        const existingSession = await Session.findOne({
            userId: user._id,
            isActive: true,
            deviceId: { $ne: deviceId }
        });

        if (existingSession && !forceLogin) {
            return res.status(409).send({ 
                message: 'Tài khoản đang được sử dụng trên thiết bị khác!',
                conflict: true,
                currentDeviceId: existingSession.deviceId,
                lastActivity: existingSession.lastActivity
            });
        }

        if (forceLogin && existingSession) {
            await Session.updateMany(
                { userId: user._id, isActive: true },
                { 
                    isActive: false,
                    loggedOutAt: new Date(),
                    logoutReason: 'force_logout'
                }
            );
        }

        const sessionId = generateSessionId();
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email, 
            role: user.role,
            deviceId, 
            sessionId 
        }, JWT_SECRET, { expiresIn: '7d' });
        
        const newSession = new Session({
            sessionId,
            userId: user._id,
            email: user.email,
            deviceId,
            token,
            userAgent,
            ipAddress,
            lastActivity: new Date()
        });
        
        await newSession.save();
        
        await User.findByIdAndUpdate(user._id, {
            deviceId,
            lastLogin: new Date(),
            lastActivity: new Date(),
            $inc: { 'metadata.loginCount': 1 },
            'metadata.userAgent': userAgent,
            'metadata.ipAddress': ipAddress
        });

        res.status(200).send({ 
            message: 'Đăng nhập thành công!', 
            token,
            sessionId,
            deviceId,
            user: {
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                currentTheme: user.currentTheme,
                ownedThemes: user.ownedThemes
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({ message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
    }
});

// API: Check session
app.get('/check-session', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Không có token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, deviceId } = decoded;

        const user = await User.findById(userId);
        if (!user || !user.isActive) {
            return res.status(403).send({ 
                message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa',
                forceLogout: true
            });
        }

        const session = await Session.findOne({
            userId,
            deviceId,
            isActive: true
        });
        
        if (!session) {
            return res.status(403).send({ 
                message: 'Session không hợp lệ hoặc đã hết hạn',
                forceLogout: true
            });
        }
        
        await Session.findByIdAndUpdate(session._id, {
            lastActivity: new Date()
        });
        
        await User.findByIdAndUpdate(user._id, {
            lastActivity: new Date()
        });

        res.send({ 
            message: 'Session hợp lệ',
            user: {
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                currentTheme: user.currentTheme,
                ownedThemes: user.ownedThemes
            },
            deviceId,
            lastActivity: new Date()
        });
    } catch (err) {
        console.error('Error in /check-session:', err);
        res.status(403).send({ 
            message: 'Token không hợp lệ',
            forceLogout: true
        });
    }
});

// API: Update user theme
app.put('/user/update-theme', authenticateToken, async (req, res) => {
    const { currentTheme } = req.body;
    const { userId } = req.user;
    
    if (!currentTheme) {
        return res.status(400).send({ message: 'Theme ID is required' });
    }
    
    try {
        const user = await User.findById(userId);
        if (!user.ownedThemes || !user.ownedThemes.includes(currentTheme)) {
            return res.status(403).send({ message: 'Bạn không sở hữu theme này' });
        }
        
        await User.findByIdAndUpdate(userId, { currentTheme });
        
        res.send({ message: 'Theme đã được cập nhật thành công' });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).send({ message: 'Lỗi khi cập nhật theme' });
    }
});

// API: Get available themes
app.get('/api/themes', async (req, res) => {
    try {
        const themes = await Theme.find({}, 'themeID path -_id');
        res.json({ themes });
    } catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).send({ message: 'Error fetching themes' });
    }
});

// API: Initialize themes
app.get('/init-themes', async (req, res) => {
    try {
        const defaultExists = await Theme.findOne({ themeID: 'default' });
        if (!defaultExists) {
            const defaultTheme = new Theme({
                themeID: 'default',
                path: 'themes/default'
            });
            await defaultTheme.save();
        }
        
        const apl2025Exists = await Theme.findOne({ themeID: 'apl2025' });
        if (!apl2025Exists) {
            const apl2025Theme = new Theme({
                themeID: 'apl2025',
                path: 'themes/apl2025'
            });
            await apl2025Theme.save();
        }
        
        res.send({ message: 'Themes initialized successfully' });
    } catch (error) {
        console.error('Error initializing themes:', error);
        res.status(500).send({ message: 'Error initializing themes' });
    }
});

// API: Assign theme to user (admin only)
app.post('/api/admin/assign-theme', authenticateToken, async (req, res) => {
    const { userEmail, themeId } = req.body;
    const { role } = req.user;
    
    // Check if user is admin
    if (role !== 'admin') {
        return res.status(403).send({ message: 'Chỉ admin mới có thể thực hiện thao tác này' });
    }
    
    if (!userEmail || !themeId) {
        return res.status(400).send({ message: 'Email và theme ID là bắt buộc' });
    }
    
    try {
        // Check if theme exists
        const theme = await Theme.findOne({ themeID: themeId });
        if (!theme) {
            return res.status(404).send({ message: 'Theme không tồn tại' });
        }
        
        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).send({ message: 'Người dùng không tồn tại' });
        }
        
        // Add theme to user's owned themes if not already owned
        if (!user.ownedThemes.includes(themeId)) {
            user.ownedThemes.push(themeId);
            await user.save();
        }
        
        res.send({ 
            message: `Theme ${themeId} đã được gán cho ${userEmail}`,
            user: {
                email: user.email,
                ownedThemes: user.ownedThemes
            }
        });
    } catch (error) {
        console.error('Error assigning theme:', error);
        res.status(500).send({ message: 'Lỗi khi gán theme' });
    }
});

// API: Get team information from text files
app.get('/api/get-team-info', async (req, res) => {
    try {
        const obsDataPath = path.join(__dirname, '../obs-data');
        
        let teamAName = 'team xanh';
        let teamBName = 'team đỏ';
        let scoreA = '0';
        let scoreB = '0';
        
        // Read files if they exist
        try {
            const nameAPath = path.join(obsDataPath, 'nameA.txt');
            const nameBPath = path.join(obsDataPath, 'nameB.txt');
            const scoreAPath = path.join(obsDataPath, 'scoreA.txt');
            const scoreBPath = path.join(obsDataPath, 'scoreB.txt');
            
            if (fs.existsSync(nameAPath)) {
                teamAName = fs.readFileSync(nameAPath, 'utf8').trim();
            }
            if (fs.existsSync(nameBPath)) {
                teamBName = fs.readFileSync(nameBPath, 'utf8').trim();
            }
            if (fs.existsSync(scoreAPath)) {
                scoreA = fs.readFileSync(scoreAPath, 'utf8').trim();
            }
            if (fs.existsSync(scoreBPath)) {
                scoreB = fs.readFileSync(scoreBPath, 'utf8').trim();
            }
        } catch (error) {
            // Some text files not found, using defaults
        }
        
        const result = {
            teamAName,
            teamBName,
            scoreA: parseInt(scoreA) || 0,
            scoreB: parseInt(scoreB) || 0
        };
        
        res.status(200).send(result);
    } catch (error) {
        console.error('Error reading team info:', error);
        res.status(500).send({ message: 'Lỗi khi đọc thông tin đội' });
    }
});

// API: Save team information to text files
app.post('/api/save-team-info', async (req, res) => {
    const { teamAName, teamBName, scoreA, scoreB } = req.body;
    
    if (!teamAName || !teamBName) {
        return res.status(400).send({ message: 'Thiếu tên đội' });
    }
    
    if (scoreA < 0 || scoreB < 0 || scoreA > 99 || scoreB > 99) {
        return res.status(400).send({ message: 'Điểm số phải từ 0 đến 99' });
    }
    
    try {
        // Create obs-data directory if it doesn't exist (at root level)
        const obsDataPath = path.join(__dirname, '../obs-data');
        if (!fs.existsSync(obsDataPath)) {
            fs.mkdirSync(obsDataPath, { recursive: true });
        }
        
        // Write to separate text files
        fs.writeFileSync(path.join(obsDataPath, 'nameA.txt'), teamAName, 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'nameB.txt'), teamBName, 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'scoreA.txt'), scoreA.toString(), 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'scoreB.txt'), scoreB.toString(), 'utf8');
        
        
        res.status(200).send({ 
            message: 'Thông tin đội đã được lưu thành công!',
            files: ['nameA.txt', 'nameB.txt', 'scoreA.txt', 'scoreB.txt']
        });
    } catch (error) {
        console.error('Error saving team info:', error);
        res.status(500).send({ message: 'Lỗi khi lưu thông tin đội' });
    }
});

// API: Migrate existing users to have default themes
app.get('/api/admin/migrate-users', async (req, res) => {
    try {
        // Update all users who don't have ownedThemes or have empty ownedThemes
        const result = await User.updateMany(
            { 
                $or: [
                    { ownedThemes: { $exists: false } },
                    { ownedThemes: { $size: 0 } },
                    { ownedThemes: null }
                ]
            },
            { 
                $set: { 
                    ownedThemes: ['default'],
                    currentTheme: 'default'
                }
            }
        );
        
        res.send({ 
            message: `Migration completed. Updated ${result.modifiedCount} users with default theme.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error migrating users:', error);
        res.status(500).send({ message: 'Error during migration' });
    }
});

// ========== OBS MANAGER APIs ==========

// API: Get OBS Config
app.get('/api/obs/config', authenticateToken, async (req, res) => {
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
});

// API: Save OBS Config
app.post('/api/obs/config', authenticateToken, async (req, res) => {
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
});

// API: Get latest file in directory
app.post('/api/obs/latest-file', authenticateToken, async (req, res) => {
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
});

// ========== FANDOM WAR APIs ==========

// API: Get TikTok Gifts List
app.get('/api/fandomwar/gifts', authenticateToken, async (req, res) => {
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
});

// API: Connect to TikTok Live
app.post('/api/fandomwar/connect', authenticateToken, async (req, res) => {
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
                // Continue to fallback below
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
});

// API: Disconnect from TikTok Live
app.post('/api/fandomwar/disconnect', authenticateToken, async (req, res) => {
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
                // Continue to Node.js disconnect
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
});

// API: Get TikTok Live connection status
app.get('/api/fandomwar/status', authenticateToken, async (req, res) => {
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
});

// ========== FACEBOOK LIVE APIs ==========

// API: Connect to Facebook Live
app.post('/api/fandomwar/facebook/connect', authenticateToken, async (req, res) => {
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
});

// API: Disconnect from Facebook Live
app.post('/api/fandomwar/facebook/disconnect', authenticateToken, (req, res) => {
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
});

// Setup TikTok Live comment broadcasting via WebSocket
tiktokLiveService.onComment((comment) => {
    const message = JSON.stringify({
        type: 'tiktok-comment',
        data: comment
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

// Listen to TikTok Live connection events
tiktokLiveService.on('connected', (data) => {
    const message = JSON.stringify({
        type: 'tiktok-connected',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

tiktokLiveService.on('disconnected', (data) => {
    const message = JSON.stringify({
        type: 'tiktok-disconnected',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

tiktokLiveService.on('error', (data) => {
    const message = JSON.stringify({
        type: 'tiktok-error',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

tiktokLiveService.on('viewers', (data) => {
    const message = JSON.stringify({
        type: 'tiktok-viewers',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

// ========== Facebook Live WebSocket Broadcasting ==========

// Setup Facebook Live comment broadcasting via WebSocket
facebookLiveService.onComment((comment) => {
    const message = JSON.stringify({
        type: 'facebook-comment',
        data: comment
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

// Listen to Facebook Live connection events
facebookLiveService.on('connected', (data) => {
    const message = JSON.stringify({
        type: 'facebook-connected',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

facebookLiveService.on('disconnected', (data) => {
    const message = JSON.stringify({
        type: 'facebook-disconnected',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

facebookLiveService.on('error', (data) => {
    const message = JSON.stringify({
        type: 'facebook-error',
        data
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

// WebSocket Server
wss.on('connection', (ws, req) => {
    let deviceId = null;
    let sessionId = null;
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            deviceId = decoded.deviceId;
            sessionId = decoded.sessionId;
            
            if (!deviceConnections.has(deviceId)) {
                deviceConnections.set(deviceId, new Set());
            }
            deviceConnections.get(deviceId).add(ws);
        } catch (error) {
            ws.close(1008, 'Invalid token');
            return;
        }
    }

    // WebSocket connected successfully
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
                // Session update failed
            }
        }

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
        // WebSocket error
    });
});

// Start Server
const HTTP_PORT = 3000;
server.listen(HTTP_PORT, () => {
    console.log(`HTTP & WebSocket server running on http://localhost:${HTTP_PORT}`);
});