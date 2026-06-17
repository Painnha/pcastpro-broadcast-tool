const mongoose = require('mongoose');

const tiktokGiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    icon: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    }
}, {
    collection: 'tiktokGifts'  // Chỉ định đúng tên collection trong MongoDB
});

module.exports = mongoose.model('TiktokGift', tiktokGiftSchema);

