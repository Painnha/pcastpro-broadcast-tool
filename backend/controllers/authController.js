const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const OTP = require('../models/OTP');
const otpEmailService = require('../services/otpEmailService');

// Utility functions
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// API: Send OTP for registration
const sendOTP = async (req, res) => {
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
};

// API: Verify OTP and create account
const verifyOTP = async (req, res) => {
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
};

// API: Login
const login = async (req, res) => {
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
        }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
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
};

// API: Check session
const checkSession = async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Không có token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
};

module.exports = {
    sendOTP,
    verifyOTP,
    login,
    checkSession
};
