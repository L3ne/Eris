const mongoose = require("mongoose");

const tempVoiceConfigSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    joinChannelId: {
      type: String,
      required: true,
    },
    categoryId: {
      type: String,
      required: true,
    },
    defaultLimit: {
      type: Number,
      default: 0,
    },
    defaultName: {
      type: String,
      default: "{username}",
    },
  },
  { timestamps: true },
);

const tempVoiceChannelSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    bannedUsers: [
      {
        type: String,
      },
    ],
    userLimit: {
      type: Number,
      default: 0,
    },
    panelMessageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const tempVoiceUserSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    lastName: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Index composé pour garantir l'unicité par serveur + membre
tempVoiceUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const TempVoiceConfig = mongoose.model(
  "TempVoiceConfig",
  tempVoiceConfigSchema,
);
const TempVoiceChannel = mongoose.model(
  "TempVoiceChannel",
  tempVoiceChannelSchema,
);
const TempVoiceUser = mongoose.model("TempVoiceUser", tempVoiceUserSchema);

module.exports = { TempVoiceConfig, TempVoiceChannel, TempVoiceUser };
