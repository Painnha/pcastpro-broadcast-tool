const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Không có token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

const checkPermission = (permissionName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({ message: 'Chưa xác thực' });
        }

        try {
            const User = require('../models/User');
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).send({ message: 'Người dùng không tồn tại' });
            }

            if (!user.isActive) {
                return res.status(403).send({ message: 'Tài khoản đã bị khóa' });
            }

            // Admins bypass all permission checks
            if (user.role === 'admin' || (user.permissions && user.permissions.includes(permissionName))) {
                return next();
            }

            return res.status(403).send({ message: `Bạn không có quyền sử dụng chức năng này (${permissionName})` });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).send({ message: 'Lỗi hệ thống khi kiểm tra quyền hạn' });
        }
    };
};

module.exports = { authenticateToken, checkPermission };
