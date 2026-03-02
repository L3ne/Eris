const { Schema, model } = require('mongoose');

const whitelistSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: false
    },
    addedBy: {
        type: String,
        required: false
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = model('Whitelist', whitelistSchema);
