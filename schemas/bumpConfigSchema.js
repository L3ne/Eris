const mongoose = require("mongoose");

const bumpConfigSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    notifyUsers: {
      type: [String],
      default: [],
    },
    xpEnabled: {
      type: Boolean,
      default: true,
    },
    xpAmount: {
      type: Number,
      default: 300,
    },
    reminderChannelId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const BumpConfig = mongoose.model("BumpConfig", bumpConfigSchema);

module.exports = BumpConfig;
