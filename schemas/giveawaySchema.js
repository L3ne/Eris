const mongoose = require('mongoose');

// ─── GiveawayConfig ───────────────────────────────────────────────────────────

const giveawayConfigSchema = new mongoose.Schema(
    {
        guildId:           { type: String, required: true, unique: true, index: true },
        managerRoleId:     { type: String, default: null },
        logChannelId:      { type: String, default: null },
        announceChannelId: { type: String, default: null },
        defaultColor:      { type: String, default: '#dac7bb' }
    },
    { timestamps: true }
);

const GiveawayConfig = mongoose.model('GiveawayConfig', giveawayConfigSchema);

// ─── Giveaway ─────────────────────────────────────────────────────────────────

const giveawaySchema = new mongoose.Schema(
    {
        messageId:            { type: String, required: true, unique: true, index: true },
        channelId:            { type: String, required: true },
        guildId:              { type: String, required: true, index: true },
        prize:                { type: String, required: true },
        winnersCount:         { type: Number, required: true, default: 1 },
        endsAt:               { type: Date,   required: true },
        startedAt:            { type: Date,   default: Date.now },
        hostId:               { type: String, required: true },
        requiredRoleId:       { type: String, default: null },
        bonusEntriesRoleId:   { type: String, default: null },
        bonusEntriesCount:    { type: Number, default: 3 },
        participants:         { type: [String], default: [] },
        winners:              { type: [String], default: [] },
        status:               { type: String, enum: ['active', 'ended', 'paused', 'deleted'], default: 'active', index: true },
        image:                { type: String, default: null },
        color:                { type: String, default: null },
        hostMention:          { type: Boolean, default: false },
        pausedAt:             { type: Date,   default: null },
        pausedRemainingMs:    { type: Number, default: null }
    },
    { timestamps: true }
);

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { GiveawayConfig, Giveaway };
