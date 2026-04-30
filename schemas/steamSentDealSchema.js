const mongoose = require("mongoose");

const steamSentDealSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  appId: { type: String, required: true },

  // Date de fin de promotion (timestamp Unix) — utilisée pour supprimer le message à expiration
  promoEndTs: { type: Number, default: null },

  // Message Discord à supprimer quand la promo expire
  messageId: { type: String, default: null },
  channelId: { type: String, default: null },

  // Safety net TTL : MongoDB supprime le document après 90 jours
  // (couvre les deals sans promoEndTs ou dont la suppression a échoué)
  sentAt: { type: Date, default: Date.now, expires: "90d" },
});

// Index unique guildId + appId : un deal envoyé une seule fois par serveur
steamSentDealSchema.index({ guildId: 1, appId: 1 }, { unique: true });

// Index pour la requête de nettoyage des promos expirées
steamSentDealSchema.index({ promoEndTs: 1 });

module.exports = mongoose.model("SteamSentDeal", steamSentDealSchema);
