const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    themeID: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    path: {
        type: String,
        required: true,
        trim: true
    }
});

// Indexes
// Note: themeID index is automatically created by unique: true

module.exports = mongoose.model('Theme', themeSchema);