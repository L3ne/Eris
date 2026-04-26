const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ChannelSelectMenuBuilder,
  Events,
} = require("discord.js");
const logsSchema = require("../../../schemas/logsSchema");

// ─── Meta-infos de chaque type de log ────────────────────────────────────────
const LOG_TYPES = {
  join: { label: "📥 Membre rejoint", name: "logs-join" },
  leave: { label: "📤 Membre part", name: "logs-leave" },
  invite: { label: "🔗 Invitations", name: "logs-invite" },
  boost: { label: "🚀 Boosts", name: "logs-boost" },
  message: { label: "💬 Messages", name: "logs-message" },
  mod: { label: "🔨 Modération", name: "logs-mod" },
  voice: { label: "🎙️ Vocal", name: "logs-voice" },
  emojis: { label: "😀 Emojis", name: "logs-emojis" },
  roles: { label: "🏷️ Rôles", name: "logs-roles" },
  giveaway: { label: "🎉 Giveaways", name: "logs-giveaway" },
  ticket: { label: "🎫 Tickets", name: "logs-ticket" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChannelStatus(lc, guild) {
  if (!lc || !lc.enabled || !lc.channelId) return "❌ Non configuré";
  const ch = guild.channels.cache.get(lc.channelId);
  return `✅ <#${lc.channelId}>${ch ? "" : " *(introuvable)*"}`;
}

/** Construit l'embed principal du panel de statut */
function buildStatusEmbed(cfg, guild) {
  const logChannels = cfg?.logChannels || {};
  const types = Object.keys(LOG_TYPES);
  const fields = [];

  // Grouper 2 par 2, avec un champ spacer pour forcer 2 colonnes
  for (let i = 0; i < types.length; i += 2) {
    const t1 = types[i];
    const t2 = types[i + 1];

    fields.push({
      name: LOG_TYPES[t1].label,
      value: getChannelStatus(logChannels[t1], guild),
      inline: true,
    });

    if (t2) {
      fields.push({
        name: LOG_TYPES[t2].label,
        value: getChannelStatus(logChannels[t2], guild),
        inline: true,
      });
      // Spacer invisible pour forcer la mise en page 2 colonnes
      fields.push({ name: "\u200B", value: "\u200B", inline: true });
    }
  }

  return new EmbedBuilder()
    .setTitle("⚙️ Configuration des Logs")
    .setDescription(
      "Sélectionnez un type de log dans le menu pour le configurer.",
    )
    .setColor("#dac7bb")
    .addFields(fields)
    .setTimestamp();
}

/** Construit le StringSelectMenu principal avec statut dans les descriptions */
function buildSelectMenu(cfg, guild) {
  const logChannels = cfg?.logChannels || {};

  const options = Object.entries(LOG_TYPES).map(([key, meta]) => {
    const lc = logChannels[key];
    const enabled = lc?.enabled && lc?.channelId;
    let description;

    if (enabled) {
      const ch = guild.channels.cache.get(lc.channelId);
      description = `✅ Activé → #${ch?.name ?? "inconnu"}`;
    } else {
      description = "❌ Désactivé";
    }

    return {
      label: meta.label,
      value: key,
      description: description.substring(0, 100),
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId("log_config_select")
    .setPlaceholder("Sélectionner un type de log à configurer")
    .addOptions(options);
}

/** Construit l'embed + les boutons du sous-panel pour un type donné */
function buildSubPanel(type, cfg, guild) {
  const meta = LOG_TYPES[type];
  const lc = cfg?.logChannels?.[type];
  const enabled = !!(lc?.enabled && lc?.channelId);

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ ${meta.label}`)
    .setDescription(
      `**Statut actuel :** ${enabled ? `✅ Activé → <#${lc.channelId}>` : "❌ Désactivé / Non configuré"}`,
    )
    .setColor("#dac7bb");

  const enableBtn = new ButtonBuilder()
    .setCustomId(`log_enable_${type}`)
    .setLabel("✅ Activer")
    .setStyle(ButtonStyle.Success)
    .setDisabled(enabled);

  const disableBtn = new ButtonBuilder()
    .setCustomId(`log_disable_${type}`)
    .setLabel("❌ Désactiver")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(!enabled);

  const setChannelBtn = new ButtonBuilder()
    .setCustomId(`log_setchannel_${type}`)
    .setLabel("📌 Changer le salon")
    .setStyle(ButtonStyle.Primary);

  const backBtn = new ButtonBuilder()
    .setCustomId("log_back")
    .setLabel("⬅️ Retour")
    .setStyle(ButtonStyle.Secondary);

  const btnRow = new ActionRowBuilder().addComponents(
    enableBtn,
    disableBtn,
    setChannelBtn,
    backBtn,
  );

  return { embed, components: [btnRow] };
}

/** Construit le ChannelSelectMenu pour choisir un salon */
function buildChannelSelectPanel(type) {
  const meta = LOG_TYPES[type];

  const embed = new EmbedBuilder()
    .setTitle(`📌 Changer le salon — ${meta.label}`)
    .setDescription(
      "Sélectionnez le salon texte à utiliser pour ce type de log.",
    )
    .setColor("#dac7bb");

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`log_channel_select_${type}`)
    .setPlaceholder("Sélectionner un salon texte")
    .setChannelTypes([ChannelType.GuildText]);

  const backBtn = new ButtonBuilder()
    .setCustomId("log_back")
    .setLabel("⬅️ Retour")
    .setStyle(ButtonStyle.Secondary);

  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(channelSelect),
      new ActionRowBuilder().addComponents(backBtn),
    ],
  };
}

// ─── Module Export ────────────────────────────────────────────────────────────

module.exports = {
  name: "logs",
  description: "Configure server logs",
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: [PermissionFlagsBits.Administrator],
  user_perms: ["Administrator"],
  bot_perms: ["Administrator"],
  options: [
    {
      name: "status",
      description: "Voir et modifier la configuration des logs",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "preset",
      description: "Appliquer un preset de logs",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Choisir un preset",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [{ name: "Full Logging", value: "full" }],
        },
      ],
    },
    {
      name: "set",
      description: "Configurer un type de log spécifique",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Type de log",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "📥 Membre rejoint", value: "join" },
            { name: "📤 Membre part", value: "leave" },
            { name: "🔗 Invitations", value: "invite" },
            { name: "🚀 Boosts", value: "boost" },
            { name: "💬 Messages", value: "message" },
            { name: "🔨 Modération", value: "mod" },
            { name: "🎙️ Vocal", value: "voice" },
            { name: "😀 Emojis", value: "emojis" },
            { name: "🏷️ Rôles", value: "roles" },
            { name: "🎉 Giveaways", value: "giveaway" },
            { name: "🎫 Tickets", value: "ticket" },
          ],
        },
        {
          name: "channel",
          description: "Salon de destination",
          type: ApplicationCommandOptionType.Channel,
          required: true,
          channel_types: [ChannelType.GuildText],
        },
      ],
    },
    {
      name: "toggle",
      description: "Activer/désactiver un type de log",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Type de log",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "📥 Membre rejoint", value: "join" },
            { name: "📤 Membre part", value: "leave" },
            { name: "🔗 Invitations", value: "invite" },
            { name: "🚀 Boosts", value: "boost" },
            { name: "💬 Messages", value: "message" },
            { name: "🔨 Modération", value: "mod" },
            { name: "🎙️ Vocal", value: "voice" },
            { name: "😀 Emojis", value: "emojis" },
            { name: "🏷️ Rôles", value: "roles" },
            { name: "🎉 Giveaways", value: "giveaway" },
            { name: "🎫 Tickets", value: "ticket" },
          ],
        },
      ],
    },
  ],

  execute: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "status":
          await handleStatus(interaction, client);
          break;
        case "preset":
          await handlePreset(interaction, client);
          break;
        case "set":
          await handleSet(interaction, client);
          break;
        case "toggle":
          await handleToggle(interaction, client);
          break;
        default:
          await interaction.reply({
            content: "Sous-commande invalide.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("LogConfig command error:", error);
      try {
        const payload = {
          content: `Une erreur est survenue : ${error.message}`,
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (_) {}
    }
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleStatus(interaction, client) {
  const guildId = interaction.guild.id;
  let config = await logsSchema.findOne({ guildId });

  const embed = buildStatusEmbed(config, interaction.guild);
  const selectMenu = buildSelectMenu(config, interaction.guild);
  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    try {
      // ── Menu principal : sélection d'un type ──────────────────────────
      if (i.customId === "log_config_select") {
        const type = i.values[0];
        config = await logsSchema.findOne({ guildId });
        const { embed: subEmbed, components } = buildSubPanel(
          type,
          config,
          interaction.guild,
        );
        await i.update({ embeds: [subEmbed], components });

        // ── Activer un type ───────────────────────────────────────────────
      } else if (i.customId.startsWith("log_enable_")) {
        const type = i.customId.replace("log_enable_", "");
        config = await logsSchema.findOneAndUpdate(
          { guildId },
          { $set: { [`logChannels.${type}.enabled`]: true } },
          { upsert: true, new: true },
        );
        const { embed: subEmbed, components } = buildSubPanel(
          type,
          config,
          interaction.guild,
        );
        await i.update({ embeds: [subEmbed], components });

        // ── Désactiver un type ────────────────────────────────────────────
      } else if (i.customId.startsWith("log_disable_")) {
        const type = i.customId.replace("log_disable_", "");
        config = await logsSchema.findOneAndUpdate(
          { guildId },
          { $set: { [`logChannels.${type}.enabled`]: false } },
          { upsert: true, new: true },
        );
        const { embed: subEmbed, components } = buildSubPanel(
          type,
          config,
          interaction.guild,
        );
        await i.update({ embeds: [subEmbed], components });

        // ── Changer le salon (afficher le ChannelSelect) ──────────────────
      } else if (i.customId.startsWith("log_setchannel_")) {
        const type = i.customId.replace("log_setchannel_", "");
        const { embed: selectEmbed, components } =
          buildChannelSelectPanel(type);
        await i.update({ embeds: [selectEmbed], components });

        // ── Salon sélectionné via ChannelSelectMenu ───────────────────────
      } else if (i.customId.startsWith("log_channel_select_")) {
        const type = i.customId.replace("log_channel_select_", "");
        const channelId = i.values[0];
        config = await logsSchema.findOneAndUpdate(
          { guildId },
          {
            $set: {
              [`logChannels.${type}.channelId`]: channelId,
              [`logChannels.${type}.enabled`]: true,
            },
          },
          { upsert: true, new: true },
        );
        const { embed: subEmbed, components } = buildSubPanel(
          type,
          config,
          interaction.guild,
        );
        await i.update({ embeds: [subEmbed], components });

        // ── Retour au panel principal ─────────────────────────────────────
      } else if (i.customId === "log_back") {
        config = await logsSchema.findOne({ guildId });
        const mainEmbed = buildStatusEmbed(config, interaction.guild);
        const menu = buildSelectMenu(config, interaction.guild);
        const mainRow = new ActionRowBuilder().addComponents(menu);
        await i.update({ embeds: [mainEmbed], components: [mainRow] });
      }
    } catch (err) {
      console.error("Status collector error:", err);
      try {
        await i.deferUpdate();
      } catch (_) {}
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [] });
    } catch (_) {}
  });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handleSet(interaction, client) {
  const type = interaction.options.getString("type");
  const channel = interaction.options.getChannel("channel");
  const guildId = interaction.guild.id;
  const meta = LOG_TYPES[type];

  await logsSchema.findOneAndUpdate(
    { guildId },
    {
      $set: {
        [`logChannels.${type}.enabled`]: true,
        [`logChannels.${type}.channelId`]: channel.id,
      },
    },
    { upsert: true, new: true },
  );

  const embed = new EmbedBuilder()
    .setTitle("✅ Log configuré")
    .setDescription(
      `**${meta.label}** redirigé vers <#${channel.id}> avec succès.`,
    )
    .setColor("#dac7bb")
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handleToggle(interaction, client) {
  const type = interaction.options.getString("type");
  const guildId = interaction.guild.id;
  const meta = LOG_TYPES[type];

  let config = await logsSchema.findOne({ guildId });
  const currentEnabled = config?.logChannels?.[type]?.enabled ?? false;
  const newEnabled = !currentEnabled;

  config = await logsSchema.findOneAndUpdate(
    { guildId },
    { $set: { [`logChannels.${type}.enabled`]: newEnabled } },
    { upsert: true, new: true },
  );

  const embed = new EmbedBuilder()
    .setTitle(newEnabled ? "✅ Log activé" : "❌ Log désactivé")
    .setDescription(
      `**${meta.label}** est maintenant **${newEnabled ? "activé" : "désactivé"}**.`,
    )
    .setColor("#dac7bb")
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handlePreset(interaction, client) {
  const guildId = interaction.guild.id;
  let config = await logsSchema.findOne({ guildId });

  const confirmBtn = new ButtonBuilder()
    .setCustomId("confirm_preset")
    .setLabel("✅ Confirmer")
    .setStyle(ButtonStyle.Success);

  const cancelBtn = new ButtonBuilder()
    .setCustomId("cancel_preset")
    .setLabel("❌ Annuler")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

  const previewEmbed = new EmbedBuilder()
    .setTitle("⚙️ Preset : Full Logging")
    .setDescription(
      "Cela va créer **11 salons** de logs dans une nouvelle catégorie et activer tous les types de logs.\n\n" +
        "⚠️ **L'ancienne configuration sera remplacée si elle existe.**",
    )
    .setColor("#dac7bb");

  await interaction.reply({
    embeds: [previewEmbed],
    components: [row],
    ephemeral: true,
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "confirm_preset") {
      await i.deferUpdate();
      const guild = interaction.guild;

      // Supprimer l'ancienne catégorie + salons si existants
      if (config?.categoryId) {
        const oldCategory = guild.channels.cache.get(config.categoryId);
        if (oldCategory) {
          const children = guild.channels.cache.filter(
            (c) => c.parentId === oldCategory.id,
          );
          for (const [, ch] of children) {
            await ch.delete().catch(console.error);
          }
          await oldCategory.delete().catch(console.error);
        }
      }

      // Créer la nouvelle catégorie
      const logCategory = await guild.channels.create({
        name: "Server Logs",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      const logNames = {
        join: "logs-join",
        leave: "logs-leave",
        invite: "logs-invite",
        boost: "logs-boost",
        message: "logs-message",
        mod: "logs-mod",
        voice: "logs-voice",
        emojis: "logs-emojis",
        roles: "logs-roles",
        giveaway: "logs-giveaway",
        ticket: "logs-ticket",
      };

      const newLogChannels = {};
      const total = Object.keys(logNames).length;
      let count = 0;

      for (const [key, name] of Object.entries(logNames)) {
        const channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: logCategory.id,
        });

        newLogChannels[key] = { enabled: true, channelId: channel.id };
        count++;

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⏳ Création des salons en cours...")
              .setDescription(`**${count}/${total}** — \`${name}\` créé.`)
              .setColor("#dac7bb"),
          ],
          components: [],
        });
      }

      // Sauvegarder en base
      await logsSchema.findOneAndUpdate(
        { guildId },
        { $set: { categoryId: logCategory.id, logChannels: newLogChannels } },
        { upsert: true, new: true },
      );

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Full Logging configuré")
            .setDescription(
              `**${total} salons** de logs ont été créés sous la catégorie **Server Logs** et tous les types sont activés.`,
            )
            .setColor("#dac7bb")
            .setTimestamp(),
        ],
        components: [],
      });

      collector.stop("done");
    } else if (i.customId === "cancel_preset") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Annulé")
            .setDescription("La configuration du preset a été annulée.")
            .setColor("#dac7bb"),
        ],
        components: [],
      });
      collector.stop("cancelled");
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason !== "done" && reason !== "cancelled") {
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⏱️ Délai expiré")
              .setDescription(
                "La confirmation a expiré. Relancez la commande si nécessaire.",
              )
              .setColor("#dac7bb"),
          ],
          components: [],
        });
      } catch (_) {}
    }
  });
}
