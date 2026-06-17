const mongoose = require('mongoose');

const obsConfigSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    pinned: {
        type: [String],
        default: []
    },
    links: {
        type: Map,
        of: [String],
        default: {}
    },
    contents: {
        type: Map,
        of: String,
        default: {}
    },
    swapPairs: {
        type: [{
            sourceA: String,
            sourceB: String
        }],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OBSConfig', obsConfigSchema);
