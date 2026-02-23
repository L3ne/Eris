const mongoose = require('mongoose');

const levelSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    messageXP: {
        type: Boolean,
        default: true
    },
    voiceXP: {
        type: Boolean,
        default: true
    },
    cooldown: {
        type: Number,
        default: 5000
    },
    minXP: {
        type: Number,
        default: 15
    },
    maxXP: {
        type: Number,
        default: 25
    },
    voiceInterval: {
        type: Number,
        default: 600000
    },
    voiceXPAmount: {
        type: Number,
        default: 10
    },
    voiceMinXP: {
        type: Number,
        default: 15
    },
    voiceMaxXP: {
        type: Number,
        default: 25
    },
    levelUpChannel: {
        type: String,
        default: null
    },
    levelUpMessage: {
        type: String,
        default: "🎉 Félicitations {user} ! \nVous avez atteint le niveau **{level}** !"
    },
    ignoredChannels: {
        type: [String],
        default: []
    },
    ignoredChannelsMessage: {
        type: [String],
        default: []
    },
    ignoredChannelsVoice: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LevelSettings', levelSettingsSchema);
