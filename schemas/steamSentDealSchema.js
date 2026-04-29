const mongoose = require('mongoose');

const steamSentDealSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  appId:   { type: String, required: true },
  sentAt:  { type: Date, default: Date.now, expires: '30d' },  // TTL 30 jours
});

// Index unique guildId + appId pour éviter les doublons par serveur
steamSentDealSchema.index({ guildId: 1, appId: 1 }, { unique: true });

module.exports = mongoose.model('SteamSentDeal', steamSentDealSchema);
