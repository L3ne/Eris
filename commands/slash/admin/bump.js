const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const BumpConfig = require("../../../schemas/bumpConfigSchema");

module.exports = {
  name: "bump",
  description: "Gérer la configuration du système de bump",
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: [PermissionFlagsBits.Administrator],
  user_perms: ["Administrator"],
  bot_perms: ["Administrator"],
  options: [
    {
      name: "info",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Afficher la configuration actuelle du système de bump",
    },
    {
      name: "config",
      type: ApplicationCommandOptionType.SubcommandGroup,
      description: "Configurer le système de bump",
      options: [
        {
          name: "xp",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Activer/désactiver les XP et définir le montant par bump",
          options: [
            {
              name: "enabled",
              type: ApplicationCommandOptionType.Boolean,
              required: true,
              description: "Activer ou désactiver les récompenses XP pour le bump",
            },
            {
              name: "amount",
              type: ApplicationCommandOptionType.Integer,
              required: false,
              description: "Quantité d'XP accordée par bump (défaut : 300)",
              min_value: 1,
              max_value: 10000,
            },
          ],
        },
        {
          name: "channel",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir le salon pour les rappels de bump",
          options: [
            {
              name: "channel",
              type: ApplicationCommandOptionType.Channel,
              required: true,
              description: "Salon où envoyer les rappels de bump",
              channel_types: [ChannelType.GuildText],
            },
          ],
        },
        {
          name: "reset-notify",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Vider la liste des utilisateurs en attente de notification",
        },
      ],
    },
  ],

  execute: async (client, interaction) => {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    try {
      if (group === "config") {
        switch (sub) {
          case "xp":
            return await handleConfigXP(client, interaction);
          case "channel":
            return await handleConfigChannel(client, interaction);
          case "reset-notify":
            return await handleResetNotify(client, interaction);
        }
      } else {
        switch (sub) {
          case "info":
            return await handleInfo(client, interaction);
        }
      }
    } catch (err) {
      console.error("[Bump] Erreur commande:", err);
      return interaction.editReply({
        content: `Une erreur est survenue : ${err.message}`,
      });
    }
  },
};

// ─── Info ─────────────────────────────────────────────────────────────────────

async function handleInfo(client, interaction) {
  const guild = interaction.guild;
  const config = await BumpConfig.findOne({ guildId: guild.id });

  const reminderChannel = config?.reminderChannelId
    ? guild.channels.cache.get(config.reminderChannelId)
    : null;

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
    })
    .setDescription("Configuration actuelle du système de bump")
    .addFields(
      {
        name: "XP activé",
        value: config?.xpEnabled !== false ? "Oui" : "Non",
        inline: true,
      },
      {
        name: "XP par bump",
        value: String(config?.xpAmount ?? 300),
        inline: true,
      },
      {
        name: "Salon de rappel",
        value: reminderChannel
          ? `<#${reminderChannel.id}>`
          : "Même salon que le bump",
        inline: true,
      },
      {
        name: "Notify Me — en attente",
        value: String(config?.notifyUsers?.length ?? 0),
        inline: true,
      },
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─── Config XP ────────────────────────────────────────────────────────────────

async function handleConfigXP(client, interaction) {
  const guild = interaction.guild;
  const enabled = interaction.options.getBoolean("enabled");
  const amount = interaction.options.getInteger("amount");

  const update = { xpEnabled: enabled };
  if (amount !== null) update.xpAmount = amount;

  const config = await BumpConfig.findOneAndUpdate(
    { guildId: guild.id },
    { $set: update },
    { upsert: true, new: true },
  );

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setDescription(
      `XP pour le bump : **${config.xpEnabled ? "activé" : "désactivé"}**\nMontant : **${config.xpAmount} XP** par bump`,
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─── Config Channel ───────────────────────────────────────────────────────────

async function handleConfigChannel(client, interaction) {
  const guild = interaction.guild;
  const channel = interaction.options.getChannel("channel");

  await BumpConfig.findOneAndUpdate(
    { guildId: guild.id },
    { $set: { reminderChannelId: channel.id } },
    { upsert: true, new: true },
  );

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setDescription(`Les rappels de bump seront envoyés dans <#${channel.id}>`)
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─── Reset Notify ─────────────────────────────────────────────────────────────

async function handleResetNotify(client, interaction) {
  const guild = interaction.guild;

  const config = await BumpConfig.findOneAndUpdate(
    { guildId: guild.id },
    { $set: { notifyUsers: [] } },
    { upsert: true, new: true },
  );

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setDescription("La liste des notifications a été réinitialisée.")
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}
