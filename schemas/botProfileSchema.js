const mongoose = require('mongoose');

const botProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    banner: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    },
    accentColor: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BotProfile', botProfileSchema);
