const mongoose = require("mongoose");

const steamTrackedAppSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    appId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    headerImage: {
      type: String,
      default: null,
    },
    addedBy: {
      type: String, // userId
      default: null,
    },
  },
  { timestamps: true },
);

// Index unique : un appId ne peut être suivi qu'une fois par guild
steamTrackedAppSchema.index({ guildId: 1, appId: 1 }, { unique: true });

module.exports = mongoose.model("SteamTrackedApp", steamTrackedAppSchema);
