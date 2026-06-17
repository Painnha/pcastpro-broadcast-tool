const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userAgent: String,
    ipAddress: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    loggedOutAt: {
        type: Date,
        default: null
    },
    logoutReason: {
        type: String,
        enum: ['manual', 'force_logout', 'expired', 'invalid_token'],
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ email: 1, isActive: 1 });
sessionSchema.index({ deviceId: 1, isActive: 1 });

// TTL index for automatic cleanup of old sessions (only one lastActivity index needed)
sessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days

module.exports = mongoose.model('Session', sessionSchema);