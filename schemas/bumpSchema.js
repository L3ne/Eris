const { Schema, model } = require('mongoose');

const bumpSchema = new Schema({
    guildId: {
        type: String,
        required: true
    },

    userId: {
        type: String,
        required: true
    },

    count: {
        type: Number,
        default: 0
    },

    lastBump: {
        type: Date,
        default: null
    },

    notify: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = model('Bump', bumpSchema);