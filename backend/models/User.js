const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
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
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    displayName: {
        type: String,
        default: ''
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        loginCount: {
            type: Number,
            default: 0
        }
    },
    currentTheme: {
        type: String,
        default: null
    },
    ownedThemes: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Indexes
// Note: email index is automatically created by unique: true
userSchema.index({ deviceId: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Skip hashing if password is not modified or if it's already hashed
    if (!this.isModified('password') || this.password.startsWith('$2')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);