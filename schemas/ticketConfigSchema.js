const mongoose = require('mongoose');

const ticketConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    logChannelId: {
        type: String,
        default: null
    },
    supportRoles: [{
        type: String
    }],
    categoryId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);
