const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const Level = require("../../../schemas/levelSchema");
const LevelSettings = require("../../../schemas/levelSettingsSchema");
const XPUtils = require("../../../utils/xpUtils");

module.exports = {
  name: "xp",
  description: "Gérer le système XP",
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: [PermissionFlagsBits.Administrator],
  user_perms: ["Administrator"],
  bot_perms: ["Administrator"],
  options: [

    {
      name: "add",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Ajouter des XP à un membre",
      options: [
        {
          name: "utilisateur",
          type: ApplicationCommandOptionType.User,
          required: true,
          description: "Le membre à qui ajouter des XP",
        },
        {
          name: "montant",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "Quantité d'XP à ajouter",
          min_value: 1,
          max_value: 1_000_000,
        },
      ],
    },
    {
      name: "remove",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Retirer des XP à un membre",
      options: [
        {
          name: "utilisateur",
          type: ApplicationCommandOptionType.User,
          required: true,
          description: "Le membre à qui retirer des XP",
        },
        {
          name: "montant",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "Quantité d'XP à retirer",
          min_value: 1,
          max_value: 1_000_000,
        },
      ],
    },
    // ── reset ──────────────────────────────────────────────────────────────
    {
      name: "reset",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Réinitialiser les XP d'un membre",
      options: [
        {
          name: "utilisateur",
          type: ApplicationCommandOptionType.User,
          required: true,
          description: "Le membre dont vous voulez réinitialiser les XP",
        },
        {
          name: "raison",
          type: ApplicationCommandOptionType.String,
          required: false,
          description: "Raison de la réinitialisation",
        },
      ],
    },
    // ── settings ───────────────────────────────────────────────────────────
    {
      name: "settings",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Afficher ou modifier les paramètres du système XP",
      options: [
        {
          name: "message_xp",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
          description: "Activer/désactiver l'XP par message",
        },
        {
          name: "voice_xp",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
          description: "Activer/désactiver l'XP vocal",
        },
        {
          name: "cooldown",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "Cooldown entre les gains d'XP en ms (1000–60000)",
          min_value: 1000,
          max_value: 60000,
        },
        {
          name: "min_xp",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "XP minimum par message",
          min_value: 1,
          max_value: 500,
        },
        {
          name: "max_xp",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "XP maximum par message",
          min_value: 1,
          max_value: 500,
        },
        {
          name: "voice_interval",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "Intervalle vocal en minutes (1–60)",
          min_value: 1,
          max_value: 60,
        },
        {
          name: "voice_min_xp",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "XP minimum par intervalle vocal",
          min_value: 1,
          max_value: 500,
        },
        {
          name: "voice_max_xp",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          description: "XP maximum par intervalle vocal",
          min_value: 1,
          max_value: 500,
        },
        {
          name: "levelup_channel",
          type: ApplicationCommandOptionType.Channel,
          required: false,
          description: "Salon pour les messages de level up",
          channel_types: [ChannelType.GuildText],
        },
      ],
    },
    // ── ignore ─────────────────────────────────────────────────────────────
    {
      name: "ignore",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Gérer les salons ignorés par le système XP",
      options: [
        {
          name: "action",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "Action à effectuer",
          choices: [
            { name: "Ajouter un salon", value: "add" },
            { name: "Retirer un salon", value: "remove" },
            { name: "Lister les salons", value: "list" },
            { name: "Tout vider", value: "clear" },
          ],
        },
        {
          name: "salon",
          type: ApplicationCommandOptionType.Channel,
          required: false,
          description: "Le salon à ajouter ou retirer",
        },
        {
          name: "type",
          type: ApplicationCommandOptionType.String,
          required: false,
          description: "Type d'XP à ignorer pour ce salon",
          choices: [
            { name: "Messages et vocal", value: "both" },
            { name: "Messages uniquement", value: "message" },
            { name: "Vocal uniquement", value: "voice" },
          ],
        },
      ],
    },
  ],

  execute: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      switch (sub) {
        case "add":
          return await handleAdd(client, interaction);
        case "remove":
          return await handleRemove(client, interaction);
        case "reset":
          return await handleReset(client, interaction);
        case "settings":
          return await handleSettings(client, interaction);
        case "ignore":
          return await handleIgnore(client, interaction);
      }
    } catch (err) {
      console.error(`[XP] Erreur sous-commande /${sub}:`, err);
      return interaction.editReply({
        content: `Une erreur est survenue : ${err.message}`,
      });
    }
  },
};

// ─── Helper embed base ────────────────────────────────────────────────────────

function base(client, interaction) {
  return new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.avatarURL({ dynamic: true }),
    })
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();
}

// ─── /xp add ─────────────────────────────────────────────────────────────────

async function handleAdd(client, interaction) {
  const user = interaction.options.getUser("utilisateur");
  const amount = interaction.options.getInteger("montant");
  const guild = interaction.guild;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.editReply({ content: "Membre introuvable." });

  const before = await Level.findOne({ guildId: guild.id, userId: user.id });
  const result = await XPUtils.addXP(guild.id, user.id, amount);

  const levelTag = result.levelUp
    ? `Niveau **${before?.level ?? 1}** → **${result.newLevel}**`
    : `Niveau **${result.newLevel}**`;

  const embed = base(client, interaction)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`${amount.toLocaleString()} XP ajoutés à <@${user.id}>`)
    .addFields(
      { name: "Membre", value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: "XP ajoutés", value: amount.toLocaleString(), inline: true },
      { name: "Progression", value: levelTag, inline: true },
      {
        name: "ID",
        value: `\`\`\`ini\nMod  = ${interaction.user.id}\nUser = ${user.id}\`\`\``,
      },
    );

  return interaction.editReply({ embeds: [embed] });
}

// ─── /xp remove ──────────────────────────────────────────────────────────────

async function handleRemove(client, interaction) {
  const user = interaction.options.getUser("utilisateur");
  const amount = interaction.options.getInteger("montant");
  const guild = interaction.guild;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.editReply({ content: "Membre introuvable." });

  const levelData = await Level.findOne({ guildId: guild.id, userId: user.id });
  if (!levelData || levelData.xp === 0) {
    return interaction.editReply({
      content: `<@${user.id}> n'a pas d'XP à retirer.`,
    });
  }

  const oldLevel = levelData.level;
  const newXP = Math.max(0, levelData.xp - amount);
  const removed = levelData.xp - newXP;
  const newLevel = XPUtils.calculateLevel(newXP);

  await Level.updateOne(
    { guildId: guild.id, userId: user.id },
    { $set: { xp: newXP, level: newLevel } },
  );

  const levelTag =
    newLevel < oldLevel
      ? `Niveau **${oldLevel}** → **${newLevel}**`
      : `Niveau **${newLevel}**`;

  const embed = base(client, interaction)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`${removed.toLocaleString()} XP retirés à <@${user.id}>`)
    .addFields(
      { name: "Membre", value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: "XP retirés", value: removed.toLocaleString(), inline: true },
      { name: "XP restants", value: newXP.toLocaleString(), inline: true },
      { name: "Progression", value: levelTag, inline: true },
      {
        name: "ID",
        value: `\`\`\`ini\nMod  = ${interaction.user.id}\nUser = ${user.id}\`\`\``,
      },
    );

  return interaction.editReply({ embeds: [embed] });
}

// ─── /xp reset ───────────────────────────────────────────────────────────────

async function handleReset(client, interaction) {
  const user = interaction.options.getUser("utilisateur");
  const reason = interaction.options.getString("raison") ?? "Aucune raison";
  const guild = interaction.guild;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.editReply({ content: "Membre introuvable." });

  const existing = await Level.findOne({ guildId: guild.id, userId: user.id });
  if (!existing) {
    return interaction.editReply({
      content: `<@${user.id}> n'a pas d'XP à réinitialiser.`,
    });
  }

  const oldXP = existing.xp;
  const oldLevel = existing.level;

  await XPUtils.resetXP(guild.id, user.id);

  const embed = base(client, interaction)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`XP de <@${user.id}> réinitialisés`)
    .addFields(
      { name: "Membre", value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: "Modérateur", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Ancien niveau", value: String(oldLevel), inline: true },
      { name: "Ancien XP", value: oldXP.toLocaleString(), inline: true },
      { name: "Raison", value: reason, inline: false },
      {
        name: "ID",
        value: `\`\`\`ini\nMod  = ${interaction.user.id}\nUser = ${user.id}\`\`\``,
      },
    );

  return interaction.editReply({ embeds: [embed] });
}

// ─── /xp settings ────────────────────────────────────────────────────────────

async function handleSettings(client, interaction) {
  const guild = interaction.guild;

  let settings = await LevelSettings.findOneAndUpdate(
    { guildId: guild.id },
    {},
    { upsert: true, new: true },
  );

  const updates = {};
  const changes = [];

  const optBool = (key, label, field) => {
    const val = interaction.options.getBoolean(key);
    if (val !== null) {
      updates[field] = val;
      changes.push(`${label}: **${val ? "Activé" : "Désactivé"}**`);
    }
  };
  const optInt = (key, label, field, transform) => {
    const val = interaction.options.getInteger(key);
    if (val !== null) {
      updates[field] = transform ? transform(val) : val;
      changes.push(`${label}: **${val}**`);
    }
  };

  optBool("message_xp", "XP par message", "messageXP");
  optBool("voice_xp", "XP vocal", "voiceXP");
  optInt("cooldown", "Cooldown", "cooldown");
  optInt("min_xp", "XP minimum", "minXP");
  optInt("max_xp", "XP maximum", "maxXP");
  optInt(
    "voice_interval",
    "Intervalle vocal",
    "voiceInterval",
    (v) => v * 60000,
  );
  optInt("voice_min_xp", "XP min vocal", "voiceMinXP");
  optInt("voice_max_xp", "XP max vocal", "voiceMaxXP");

  const levelupChannel = interaction.options.getChannel("levelup_channel");
  if (levelupChannel !== null) {
    updates.levelUpChannel = levelupChannel?.id ?? null;
    changes.push(
      `Salon level up: ${levelupChannel ? `<#${levelupChannel.id}>` : "Aucun"}`,
    );
  }

  // ── Afficher la config actuelle si aucune option passée ─────────────────
  if (changes.length === 0) {
    const embed = base(client, interaction)
      .setDescription("Configuration actuelle du système XP")
      .addFields(
        {
          name: "XP par message",
          value: settings.messageXP ? "Activé" : "Désactivé",
          inline: true,
        },
        {
          name: "XP vocal",
          value: settings.voiceXP ? "Activé" : "Désactivé",
          inline: true,
        },
        { name: "Cooldown", value: `${settings.cooldown} ms`, inline: true },
        { name: "XP min message", value: String(settings.minXP), inline: true },
        { name: "XP max message", value: String(settings.maxXP), inline: true },
        {
          name: "Intervalle vocal",
          value: `${settings.voiceInterval / 60000} min`,
          inline: true,
        },
        {
          name: "XP min vocal",
          value: String(settings.voiceMinXP ?? 15),
          inline: true,
        },
        {
          name: "XP max vocal",
          value: String(settings.voiceMaxXP ?? 25),
          inline: true,
        },
        {
          name: "Salon level up",
          value: settings.levelUpChannel
            ? `<#${settings.levelUpChannel}>`
            : "Aucun",
          inline: true,
        },
      );
    return interaction.editReply({ embeds: [embed] });
  }

  // ── Appliquer les changements ────────────────────────────────────────────
  await LevelSettings.updateOne({ guildId: guild.id }, { $set: updates });

  const embed = base(client, interaction)
    .setDescription("Paramètres XP mis à jour")
    .addFields({
      name: "Changements",
      value: changes.join("\n"),
      inline: false,
    });

  return interaction.editReply({ embeds: [embed] });
}

// ─── /xp ignore ──────────────────────────────────────────────────────────────

async function handleIgnore(client, interaction) {
  const action = interaction.options.getString("action");
  const channel = interaction.options.getChannel("salon");
  const type = interaction.options.getString("type") ?? "both";
  const guild = interaction.guild;

  let settings = await LevelSettings.findOne({ guildId: guild.id });
  if (!settings) {
    settings = await LevelSettings.create({ guildId: guild.id });
  }

  const embed = base(client, interaction);

  switch (action) {
    case "add": {
      if (!channel)
        return interaction.editReply({
          content: "Vous devez spécifier un salon.",
        });

      const lines = [];
      if (
        (type === "both" || type === "message") &&
        !settings.ignoredChannelsMessage.includes(channel.id)
      ) {
        settings.ignoredChannelsMessage.push(channel.id);
        lines.push("Messages ignorés");
      }
      if (
        (type === "both" || type === "voice") &&
        !settings.ignoredChannelsVoice.includes(channel.id)
      ) {
        settings.ignoredChannelsVoice.push(channel.id);
        lines.push("Vocal ignoré");
      }

      if (lines.length === 0) {
        return interaction.editReply({
          content: `<#${channel.id}> est déjà ignoré pour ce type.`,
        });
      }

      await settings.save();
      embed.setDescription(
        `<#${channel.id}> ajouté aux salons ignorés\n${lines.join("\n")}`,
      );
      break;
    }

    case "remove": {
      if (!channel)
        return interaction.editReply({
          content: "Vous devez spécifier un salon.",
        });

      const lines = [];
      if (type === "both" || type === "message") {
        const i = settings.ignoredChannelsMessage.indexOf(channel.id);
        if (i !== -1) {
          settings.ignoredChannelsMessage.splice(i, 1);
          lines.push("Messages réactivés");
        }
      }
      if (type === "both" || type === "voice") {
        const i = settings.ignoredChannelsVoice.indexOf(channel.id);
        if (i !== -1) {
          settings.ignoredChannelsVoice.splice(i, 1);
          lines.push("Vocal réactivé");
        }
      }

      if (lines.length === 0) {
        return interaction.editReply({
          content: `<#${channel.id}> n'était pas ignoré pour ce type.`,
        });
      }

      await settings.save();
      embed.setDescription(
        `<#${channel.id}> retiré des salons ignorés\n${lines.join("\n")}`,
      );
      break;
    }

    case "list": {
      const msgIds = settings.ignoredChannelsMessage ?? [];
      const voiceIds = settings.ignoredChannelsVoice ?? [];

      if (msgIds.length === 0 && voiceIds.length === 0) {
        embed.setDescription("Aucun salon ignoré.");
        break;
      }

      const map = new Map();
      msgIds.forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push("Messages");
      });
      voiceIds.forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push("Vocal");
      });

      const lines = Array.from(map.entries()).map(([id, types]) => {
        const ch = guild.channels.cache.get(id);
        return `${ch ? `<#${id}>` : `\`${id}\``} — ${types.join(", ")}`;
      });

      embed
        .setDescription("Salons ignorés par le système XP")
        .addFields(
          { name: "Salons", value: lines.join("\n") || "Aucun", inline: false },
          { name: "Total", value: String(map.size), inline: true },
        );
      break;
    }

    case "clear": {
      const total =
        (settings.ignoredChannelsMessage?.length ?? 0) +
        (settings.ignoredChannelsVoice?.length ?? 0);
      if (total === 0) {
        return interaction.editReply({ content: "La liste est déjà vide." });
      }
      settings.ignoredChannelsMessage = [];
      settings.ignoredChannelsVoice = [];
      await settings.save();
      embed.setDescription(
        `${total} salon(s) retirés de la liste des ignorés.`,
      );
      break;
    }
  }

  return interaction.editReply({ embeds: [embed] });
}
