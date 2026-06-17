const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true // Temporary store hashed password until verification
    },
    displayName: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0,
        max: 3
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        index: { expireAfterSeconds: 0 }
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
// Note: email index is automatically created by index: true in schema
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 }); // Auto delete after 5 minutes

module.exports = mongoose.model('OTP', otpSchema);