const mongoose = require('mongoose');

const steamGuildConfigSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, unique: true, index: true },
  channelId:   { type: String, default: null },
  roleId:      { type: String, default: null },
  interval:    { type: Number, default: 6, min: 1, max: 24 },  // heures
  enabled:     { type: Boolean, default: true },
  lastChecked: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('SteamGuildConfig', steamGuildConfigSchema);
