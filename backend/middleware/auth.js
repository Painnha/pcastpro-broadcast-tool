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

module.exports = { authenticateToken };
