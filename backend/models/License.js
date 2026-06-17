const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    licenseKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    active: {
        type: Boolean,
        default: true
    },
    deviceId: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    maxDevices: {
        type: Number,
        default: 1
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        loginCount: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Index for faster queries
licenseSchema.index({ deviceId: 1 });
licenseSchema.index({ active: 1 });
licenseSchema.index({ lastActivity: 1 });

module.exports = mongoose.model('License', licenseSchema);