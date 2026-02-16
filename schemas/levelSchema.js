const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    },
    lastMessage: {
        type: Date,
        default: null
    },
    voiceTime: {
        type: Number,
        default: 0
    },
    lastVoiceReward: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

levelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
levelSchema.index({ guildId: 1, xp: -1 });

module.exports = mongoose.model('Level', levelSchema);
