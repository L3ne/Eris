const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const SteamGuildConfig = require("../../../schemas/steamGuildConfigSchema");
const SteamTrackedApp = require("../../../schemas/steamTrackedAppSchema");
const SteamSentDeal = require("../../../schemas/steamSentDealSchema");
const {
  fetchAppDetails,
  checkGuildDeals,
} = require("../../../utils/checkVNDeals");

module.exports = {
  name: "steam",
  description: "Gérer les alertes de deals Steam",
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: [PermissionFlagsBits.Administrator],
  user_perms: ["Administrator"],
  bot_perms: ["Administrator"],
  options: [
    // ── /steam add ────────────────────────────────────────────────────────
    {
      name: "add",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Ajouter une app Steam à surveiller",
      options: [
        {
          name: "appid",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "L'App ID Steam à surveiller (ex: 1044490)",
          min_value: 1,
        },
      ],
    },
    // ── /steam remove ─────────────────────────────────────────────────────
    {
      name: "remove",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Retirer une app Steam du suivi",
      options: [
        {
          name: "appid",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "L'App ID Steam à retirer",
          min_value: 1,
        },
      ],
    },
    // ── /steam list ───────────────────────────────────────────────────────────────────
    {
      name: "list",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Afficher toutes les apps Steam surveillées",
    },
    // ── /steam check ──────────────────────────────────────────────────────
    {
      name: "check",
      type: ApplicationCommandOptionType.Subcommand,
      description:
        "Déclencher le tracking immédiatement sans attendre l'intervalle",
    },
    // ── /steam fetch ──────────────────────────────────────────────────────
    {
      name: "fetch",
      type: ApplicationCommandOptionType.Subcommand,
      description:
        "Appel direct à Steam appdetails pour un App ID — debug & preview",
      options: [
        {
          name: "appid",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "L'App ID Steam à interroger",
          min_value: 1,
        },
      ],
    },
    // ── /steam config ─────────────────────────────────────────────────────
    {
      name: "config",
      type: ApplicationCommandOptionType.SubcommandGroup,
      description: "Configurer le système d'alertes Steam",
      options: [
        {
          name: "set",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir le salon, le rôle et l'intervalle",
          options: [
            {
              name: "channel",
              type: ApplicationCommandOptionType.Channel,
              required: true,
              description: "Salon où envoyer les alertes",
              channel_types: [ChannelType.GuildText],
            },
            {
              name: "interval",
              type: ApplicationCommandOptionType.Integer,
              required: false,
              description:
                "Intervalle de vérification en heures (1–24, défaut 6)",
              min_value: 1,
              max_value: 24,
            },
            {
              name: "role",
              type: ApplicationCommandOptionType.Role,
              required: false,
              description: "Rôle à mentionner lors d'une alerte",
            },
          ],
        },
        {
          name: "view",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Afficher la configuration actuelle",
        },
        {
          name: "toggle",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Activer ou désactiver les alertes",
        },
        {
          name: "reset",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Supprimer la configuration Steam pour ce serveur",
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
          case "set":
            return await handleConfigSet(client, interaction);
          case "view":
            return await handleConfigView(client, interaction);
          case "toggle":
            return await handleConfigToggle(client, interaction);
          case "reset":
            return await handleConfigReset(client, interaction);
        }
      } else {
        switch (sub) {
          case "add":
            return await handleAdd(client, interaction);
          case "remove":
            return await handleRemove(client, interaction);
          case "list":
            return await handleList(client, interaction);
          case "check":
            return await handleCheck(client, interaction);
          case "fetch":
            return await handleFetch(client, interaction);
        }
      }
    } catch (err) {
      console.error("[Steam] Erreur commande:", err);
      return interaction.editReply({
        content: `Une erreur est survenue : ${err.message}`,
      });
    }
  },
};

// ─── Helper embed base ────────────────────────────────────────────────────────

function embedBase(client, interaction) {
  return new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: interaction.guild.name,
      iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
    })
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();
}

// ─── /steam add ───────────────────────────────────────────────────────────────

async function handleAdd(client, interaction) {
  const appid = interaction.options.getInteger("appid");
  const guildId = interaction.guild.id;

  // 1. Vérifier si l'app est déjà trackée
  const existing = await SteamTrackedApp.findOne({
    guildId,
    appId: String(appid),
  });

  if (existing) {
    // ── App déjà trackée : proposer de la retirer ─────────────────────────
    const embed = embedBase(client, interaction)
      .setThumbnail(existing.headerImage ?? null)
      .setDescription(
        `**${existing.name}** (\`${appid}\`) est déjà suivi sur ce serveur.\nVoulez-vous le retirer du suivi ?`,
      )
      .addFields(
        { name: "App ID", value: String(appid), inline: true },
        {
          name: "Ajouté le",
          value: `<t:${Math.floor(existing.createdAt.getTime() / 1000)}:D>`,
          inline: true,
        },
        {
          name: "Ajouté par",
          value: existing.addedBy ? `<@${existing.addedBy}>` : "Inconnu",
          inline: true,
        },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("steam_untrack_yes")
        .setLabel("Oui, retirer")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("steam_untrack_no")
        .setLabel("Non, garder")
        .setStyle(ButtonStyle.Secondary),
    );

    const reply = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    // Collector 30 secondes
    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "steam_untrack_yes") {
        await SteamTrackedApp.deleteOne({ guildId, appId: String(appid) });
        await i.update({
          content: `**${existing.name}** retiré du suivi.`,
          embeds: [],
          components: [],
        });
      } else {
        await i.update({
          content: "Annulé — l'app reste dans le suivi.",
          embeds: [],
          components: [],
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction
          .editReply({ content: "Temps expiré.", embeds: [], components: [] })
          .catch(() => null);
      }
    });

    return;
  }

  // 2. Nouvelle app : valider via l'API Steam
  await interaction.editReply({ content: "Recherche de l'app sur Steam..." });

  const appData = await fetchAppDetails(appid);

  if (!appData) {
    return interaction.editReply({
      content: `App ID \`${appid}\` introuvable sur Steam. Vérifiez l'ID et réessayez.`,
    });
  }

  // 3. Ajouter au suivi
  await SteamTrackedApp.create({
    guildId,
    appId: String(appid),
    name: appData.name,
    headerImage: appData.header_image ?? null,
    addedBy: interaction.user.id,
  });

  const embed = embedBase(client, interaction)
    .setThumbnail(appData.header_image ?? null)
    .setDescription(`**${appData.name}** ajouté au suivi !`)
    .addFields(
      { name: "App ID", value: String(appid), inline: true },
      { name: "Ajouté par", value: `<@${interaction.user.id}>`, inline: true },
    );

  return interaction.editReply({
    content: null,
    embeds: [embed],
    components: [],
  });
}

// ─── /steam remove ────────────────────────────────────────────────────────────

async function handleRemove(client, interaction) {
  const appid = interaction.options.getInteger("appid");
  const guildId = interaction.guild.id;

  const existing = await SteamTrackedApp.findOne({
    guildId,
    appId: String(appid),
  });

  if (!existing) {
    return interaction.editReply({
      content: `L'app \`${appid}\` n'est pas dans la liste de suivi.`,
    });
  }

  await SteamTrackedApp.deleteOne({ guildId, appId: String(appid) });

  const embed = embedBase(client, interaction)
    .setThumbnail(existing.headerImage ?? null)
    .setDescription(`**${existing.name}** retiré du suivi.`)
    .addFields({ name: "App ID", value: String(appid), inline: true });

  return interaction.editReply({ embeds: [embed] });
}

// ─── /steam list ──────────────────────────────────────────────────────────────

async function handleList(client, interaction) {
  const guildId = interaction.guild.id;

  const apps = await SteamTrackedApp.find({ guildId }).sort({ createdAt: 1 });

  if (!apps.length) {
    return interaction.editReply({
      content:
        "Aucune app surveillée. Utilisez `/steam add <appid>` pour en ajouter.",
    });
  }

  const PER_PAGE = 10;
  let currentPage = 1;
  const totalPages = Math.ceil(apps.length / PER_PAGE);

  // Fonction pour générer l'embed d'une page
  const generateEmbed = (page) => {
    const start = (page - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const pageApps = apps.slice(start, end);

    const lines = pageApps.map((app, i) => {
      const storeUrl = `https://store.steampowered.com/app/${app.appId}`;
      return `${start + i + 1}. [${app.name}](${storeUrl}) — \`${app.appId}\``;
    });

    return embedBase(client, interaction)
      .setDescription(lines.join("\n"))
      .addFields(
        {
          name: "Apps surveillées",
          value: String(apps.length),
          inline: true,
        },
        {
          name: "Page",
          value: `${page}/${totalPages}`,
          inline: true,
        }
      );
  };

  // Fonction pour générer les boutons
  const generateButtons = (page) => {
    const row = new ActionRowBuilder();

    row.addComponents(
      new ButtonBuilder()
        .setCustomId("steam_list_first")
        .setLabel("⏮")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("steam_list_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("steam_list_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId("steam_list_last")
        .setLabel("⏭")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages)
    );

    return row;
  };

  const embed = generateEmbed(currentPage);
  const row = generateButtons(currentPage);

  const reply = await interaction.editReply({
    embeds: [embed],
    components: [row],
  });

  // Collector pour les boutons de pagination
  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 120_000, // 2 minutes
  });

  collector.on("collect", async (i) => {
    await i.deferUpdate();

    switch (i.customId) {
      case "steam_list_first":
        currentPage = 1;
        break;
      case "steam_list_prev":
        currentPage = Math.max(1, currentPage - 1);
        break;
      case "steam_list_next":
        currentPage = Math.min(totalPages, currentPage + 1);
        break;
      case "steam_list_last":
        currentPage = totalPages;
        break;
    }

    const newEmbed = generateEmbed(currentPage);
    const newRow = generateButtons(currentPage);

    await i.editReply({
      embeds: [newEmbed],
      components: [newRow],
    });
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await reply
        .edit({ components: [] })
        .catch(() => null);
    }
  });
}

// ─── /steam config set ────────────────────────────────────────────────────────

async function handleConfigSet(client, interaction) {
  const channel = interaction.options.getChannel("channel");
  const interval = interaction.options.getInteger("interval") ?? 6;
  const role = interaction.options.getRole("role");

  const config = await SteamGuildConfig.findOneAndUpdate(
    { guildId: interaction.guild.id },
    {
      $set: {
        channelId: channel.id,
        interval,
        roleId: role?.id ?? null,
        enabled: true,
      },
    },
    { upsert: true, new: true },
  );

  const embed = embedBase(client, interaction)
    .setDescription("Configuration Steam enregistrée")
    .addFields(
      { name: "Salon", value: `<#${config.channelId}>`, inline: true },
      { name: "Intervalle", value: `${config.interval}h`, inline: true },
      {
        name: "Rôle",
        value: config.roleId ? `<@&${config.roleId}>` : "Aucun",
        inline: true,
      },
      {
        name: "Statut",
        value: config.enabled ? "Activé" : "Désactivé",
        inline: true,
      },
    );

  return interaction.editReply({ embeds: [embed] });
}

// ─── /steam config view ───────────────────────────────────────────────────────

async function handleConfigView(client, interaction) {
  const guildId = interaction.guild.id;
  const config = await SteamGuildConfig.findOne({ guildId });
  const count = await SteamTrackedApp.countDocuments({ guildId });

  if (!config) {
    return interaction.editReply({
      content:
        "Aucune configuration. Utilisez `/steam config set` pour démarrer.",
    });
  }

  const embed = embedBase(client, interaction)
    .setDescription("Configuration actuelle du système d'alertes Steam")
    .addFields(
      {
        name: "Salon",
        value: config.channelId ? `<#${config.channelId}>` : "Non défini",
        inline: true,
      },
      { name: "Intervalle", value: `${config.interval}h`, inline: true },
      {
        name: "Rôle",
        value: config.roleId ? `<@&${config.roleId}>` : "Aucun",
        inline: true,
      },
      {
        name: "Statut",
        value: config.enabled ? "Activé" : "Désactivé",
        inline: true,
      },
      { name: "Apps surveillées", value: String(count), inline: true },
      {
        name: "Dernier check",
        value: config.lastChecked
          ? `<t:${Math.floor(config.lastChecked.getTime() / 1000)}:R>`
          : "Jamais",
        inline: true,
      },
    );

  return interaction.editReply({ embeds: [embed] });
}

// ─── /steam config toggle ─────────────────────────────────────────────────────

async function handleConfigToggle(client, interaction) {
  const config = await SteamGuildConfig.findOne({
    guildId: interaction.guild.id,
  });

  if (!config) {
    return interaction.editReply({
      content:
        "Aucune configuration. Utilisez `/steam config set` pour démarrer.",
    });
  }

  config.enabled = !config.enabled;
  await config.save();

  const embed = embedBase(client, interaction)
    .setDescription(
      config.enabled
        ? "Les alertes Steam sont maintenant **activées**."
        : "Les alertes Steam sont maintenant **désactivées**.",
    )
    .addFields({
      name: "Statut",
      value: config.enabled ? "Activé" : "Désactivé",
      inline: true,
    });

  return interaction.editReply({ embeds: [embed] });
}

// ─── /steam config reset ──────────────────────────────────────────────────────

async function handleConfigReset(client, interaction) {
  const guildId = interaction.guild.id;
  const result = await SteamGuildConfig.deleteOne({ guildId });

  if (result.deletedCount === 0) {
    return interaction.editReply({
      content: "Aucune configuration à supprimer.",
    });
  }

  // Confirmation avec bouton pour aussi supprimer les apps trackées
  const appCount = await SteamTrackedApp.countDocuments({ guildId });

  const embed = embedBase(client, interaction).setDescription(
    `Configuration supprimée.\n\n${appCount > 0 ? `Il reste **${appCount}** app(s) dans le suivi. Voulez-vous aussi les supprimer ?` : "Aucune app trackée à supprimer."}`,
  );

  if (appCount === 0) {
    return interaction.editReply({ embeds: [embed] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("steam_reset_apps_yes")
      .setLabel("Oui, tout supprimer")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("steam_reset_apps_no")
      .setLabel("Non, garder les apps")
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await interaction.editReply({
    embeds: [embed],
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "steam_reset_apps_yes") {
      await SteamTrackedApp.deleteMany({ guildId });
      await SteamSentDeal.deleteMany({ guildId });
      await i.update({
        content: `Configuration et ${appCount} app(s) supprimées.`,
        embeds: [],
        components: [],
      });
    } else {
      await i.update({
        content: "Configuration supprimée — apps conservées.",
        embeds: [],
        components: [],
      });
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction
        .editReply({ content: "Temps expiré.", embeds: [], components: [] })
        .catch(() => null);
    }
  });
}

// ─── /steam fetch ─────────────────────────────────────────────────────────────

const axios = require("axios");

/**
 * Appel direct à https://store.steampowered.com/api/appdetails?appids=APPID
 * Affiche les données brutes retournées + un aperçu embed.
 */
async function handleFetch(client, interaction) {
  const appid = interaction.options.getInteger("appid");
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}`;

  await interaction.editReply({ content: `Fetch en cours → \`${url}\`` });

  let raw;
  try {
    const response = await axios.get(url, {
      timeout: 10_000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    raw = response.data;
  } catch (err) {
    return interaction.editReply({
      content: `Erreur réseau : \`${err.message}\`\nURL : \`${url}\``,
    });
  }

  // ── Vérifier la structure de la réponse ───────────────────────────────
  const entry = raw?.[String(appid)];

  if (!entry) {
    return interaction.editReply({
      content: [
        `Aucune entrée pour l'appid \`${appid}\` dans la réponse.`,
        `**Clés reçues :** \`${Object.keys(raw ?? {}).join(", ") || "(vide)"}\``,
        `**Raw (500 chars) :**`,
        `\`\`\`json\n${JSON.stringify(raw).slice(0, 500)}\n\`\`\``,
      ].join("\n"),
    });
  }

  if (!entry.success) {
    return interaction.editReply({
      content: [
        `L'API retourne \`success: false\` pour l'appid \`${appid}\`.`,
        `L'app est peut-être introuvable, régionale, ou non disponible.`,
        `**Raw entry :** \`${JSON.stringify(entry).slice(0, 300)}\``,
      ].join("\n"),
    });
  }

  const data = entry.data;
  const price = data.price_overview ?? null;

  // ── Log console de la réponse complète ───────────────────────────────
  console.log(
    `[Steam/fetch] appid=${appid} →`,
    JSON.stringify(
      {
        name: data.name,
        type: data.type,
        steam_appid: data.steam_appid,
        price_overview: price,
        header_image: data.header_image,
        is_free: data.is_free,
      },
      null,
      2,
    ),
  );

  // ── Embed de prévisualisation ─────────────────────────────────────────
  const priceLines = price
    ? [
        `Prix original : \`${price.initial_formatted}\` (${price.initial} centimes)`,
        `Prix final    : \`${price.final_formatted}\` (${price.final} centimes)`,
        `Réduction     : \`-${price.discount_percent}%\``,
        `Devise        : \`${price.currency}\``,
      ].join("\n")
    : data.is_free
      ? "Jeu gratuit (is_free = true)"
      : "Aucun `price_overview` — le jeu n'est peut-être pas disponible dans cette région.";

  const embed = embedBase(client, interaction)
    .setTitle(data.name)
    .setURL(`https://store.steampowered.com/app/${appid}`)
    .setImage(data.header_image ?? null)
    .setDescription(
      [
        `**App ID :** \`${data.steam_appid}\``,
        `**Type :** \`${data.type}\``,
        `**Gratuit :** \`${data.is_free}\``,
        "",
        "**Prix :**",
        priceLines,
        "",
        `**URL :** \`${url}\``,
      ].join("\n"),
    );

  return interaction.editReply({ content: null, embeds: [embed] });
}

// ─── /steam check ───────────────────────────────────────────────────────────

/**
 * Lance un check immédiat pour ce serveur, sans vérifier l'intervalle.
 * Utile pour tester le système ou forcer la détection d'une promo.
 */
async function handleCheck(client, interaction) {
  const guildId = interaction.guild.id;

  // Vérifier que la config existe
  const config = await SteamGuildConfig.findOne({ guildId });

  if (!config) {
    return interaction.editReply({
      content: "Aucune configuration. Utilisez `/steam config set` d'abord.",
    });
  }

  if (!config.enabled) {
    return interaction.editReply({
      content:
        "Les alertes sont désactivées. Utilisez `/steam config toggle` pour les réactiver.",
    });
  }

  if (!config.channelId) {
    return interaction.editReply({
      content:
        "Aucun salon configuré. Utilisez `/steam config set channel:#salon`.",
    });
  }

  const appCount = await SteamTrackedApp.countDocuments({ guildId });

  if (appCount === 0) {
    return interaction.editReply({
      content: "Aucune app surveillée. Ajoutez-en avec `/steam add <appid>`.",
    });
  }

  // Informer que ça tourne
  await interaction.editReply({
    content: `Vérification de **${appCount}** app(s) en cours...`,
  });

  // Déclencher le check (bypass total de l'intervalle)
  const result = await checkGuildDeals(client, config);

  const embed = embedBase(client, interaction)
    .setDescription("Vérification manuelle terminée")
    .addFields(
      {
        name: "Apps vérifiées",
        value: String(result.checked),
        inline: true,
      },
      {
        name: "En promotion",
        value: String(result.onSale),
        inline: true,
      },
      {
        name: "Nouveaux deals envoyés",
        value: String(result.sent),
        inline: true,
      },
      {
        name: "Salon",
        value: `<#${config.channelId}>`,
        inline: true,
      },
    );

  return interaction.editReply({ content: null, embeds: [embed] });
}
