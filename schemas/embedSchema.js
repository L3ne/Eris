const mongoose = require('mongoose');
 
const embedSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    authorId: { type: String, required: true },
    data: mongoose.Schema.Types.Mixed
});
 
embedSchema.index({ guildId: 1, name: 1 }, { unique: true });
 
module.exports = mongoose.model('Embed', embedSchema);