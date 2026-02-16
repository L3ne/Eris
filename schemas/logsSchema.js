const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    guildId: String,
    categoryId: { type: String, default: null },
    logChannels: {
        join: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        leave: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        invite: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        boost: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        message: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        mod: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        voice: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        emojis: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } },
        roles: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: null } }
    }
});

module.exports = mongoose.model('LogSettings', logSchema);
