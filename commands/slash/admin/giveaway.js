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
const { GiveawayConfig, Giveaway } = require("../../../schemas/giveawaySchema");
const {
  parseTime,
  buildGiveawayEmbed,
  buildEndedEmbed,
  buildGiveawayComponents,
  buildEndedComponents,
  endGiveaway,
  scheduleGiveaway,
  cancelGiveawayTimer,
  sendGiveawayLog,
  drawWinners,
  buildEntriesPagination,
} = require("../../../utils/giveawayUtils");

module.exports = {
  name: "giveaway",
  description: "Gérer les giveaways du serveur",
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: [PermissionFlagsBits.ManageGuild],
  user_perms: [],
  bot_perms: ["Administrator"],
  options: [
    {
      name: "start",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Créer un nouveau giveaway",
      options: [
        {
          name: "prize",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "Le lot à gagner",
        },
        {
          name: "duration",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "Durée ex: 1d, 2h, 30m",
        },
        {
          name: "winners",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          description: "Nombre de gagnants",
          min_value: 1,
          max_value: 20,
        },
        {
          name: "channel",
          type: ApplicationCommandOptionType.Channel,
          required: false,
          description: "Salon cible",
          channel_types: [ChannelType.GuildText],
        },
        {
          name: "required_role",
          type: ApplicationCommandOptionType.Role,
          required: false,
          description: "Rôle requis pour participer",
        },
        {
          name: "bonus_entries_role",
          type: ApplicationCommandOptionType.Role,
          required: false,
          description: "Rôle bonus (+3 entrées)",
        },
        {
          name: "host_mention",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
          description: "Mentionner l'hôte dans l'embed",
        },
        {
          name: "image",
          type: ApplicationCommandOptionType.String,
          required: false,
          description: "URL image",
        },
        {
          name: "color",
          type: ApplicationCommandOptionType.String,
          required: false,
          description: "Couleur hex ex: #FF0000",
        },
      ],
    },
    {
      name: "end",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Terminer un giveaway immédiatement",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "reroll",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Reroll les gagnants d'un giveaway terminé",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "pause",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Mettre en pause un giveaway actif",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "resume",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Reprendre un giveaway en pause",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "delete",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Supprimer un giveaway",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "list",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Lister tous les giveaways actifs et en pause",
    },
    {
      name: "info",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Afficher les détails d'un giveaway",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "entries",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Voir les participants d'un giveaway",
      options: [
        {
          name: "message_id",
          type: ApplicationCommandOptionType.String,
          required: true,
          description: "ID du message du giveaway",
        },
      ],
    },
    {
      name: "config",
      type: ApplicationCommandOptionType.SubcommandGroup,
      description: "Configurer le système de giveaway",
      options: [
        {
          name: "manager_role",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir le rôle gestionnaire des giveaways",
          options: [
            {
              name: "role",
              type: ApplicationCommandOptionType.Role,
              required: true,
              description: "Le rôle à définir",
            },
          ],
        },
        {
          name: "log_channel",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir le salon de logs des giveaways",
          options: [
            {
              name: "channel",
              type: ApplicationCommandOptionType.Channel,
              required: true,
              description: "Le salon à définir",
              channel_types: [ChannelType.GuildText],
            },
          ],
        },
        {
          name: "announce_channel",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir le salon d'annonce des gagnants",
          options: [
            {
              name: "channel",
              type: ApplicationCommandOptionType.Channel,
              required: true,
              description: "Le salon à définir",
              channel_types: [ChannelType.GuildText],
            },
          ],
        },
        {
          name: "default_color",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Définir la couleur par défaut des embeds de giveaway",
          options: [
            {
              name: "color",
              type: ApplicationCommandOptionType.String,
              required: true,
              description: "Couleur hex ex: #FF0000 ou FF0000",
            },
          ],
        },
      ],
    },
  ],

  execute: async (client, interaction) => {
    const { guild } = interaction;

    // ─── Vérification des permissions ────────────────────────────────────
    const config = await GiveawayConfig.findOne({ guildId: guild.id });
    const isAdmin = interaction.member.permissions.has(
      PermissionFlagsBits.Administrator,
    );
    //   const isManager = config?.managerRoleId && interaction.member.roles.cache.has(config.managerRoleId);

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // ─── Defer ───────────────────────────────────────────────────────────
    // 'start' répond en public puis editReply ephemeral, les autres sont directement ephemeral
    if (sub === "start") {
      await interaction.deferReply();
    } else {
      await interaction.deferReply({ ephemeral: true });
    }

    // ─── Router ──────────────────────────────────────────────────────────
    try {
      if (group === "config") {
        return await handleConfig(client, interaction, guild, sub);
      }

      switch (sub) {
        case "start":
          return await handleStart(client, interaction, guild, config);
        case "end":
          return await handleEnd(client, interaction, guild);
        case "reroll":
          return await handleReroll(client, interaction, guild);
        case "pause":
          return await handlePause(client, interaction, guild, config);
        case "resume":
          return await handleResume(client, interaction, guild, config);
        case "delete":
          return await handleDelete(client, interaction, guild);
        case "list":
          return await handleList(client, interaction, guild);
        case "info":
          return await handleInfo(client, interaction, guild);
        case "entries":
          return await handleEntries(client, interaction, guild);
        default:
          return interaction.editReply({
            content: "❌ Sous-commande inconnue.",
          });
      }
    } catch (err) {
      console.error(
        `[Giveaway] Erreur commande /${group ? group + " " : ""}${sub}:`,
        err,
      );
      return interaction.editReply({
        content: `❌ Une erreur est survenue : ${err.message}`,
      });
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  HANDLERS
// ════════════════════════════════════════════════════════════════════════════

// ─── START ───────────────────────────────────────────────────────────────────
async function handleStart(client, interaction, guild, config) {
  const prize = interaction.options.getString("prize");
  const durationStr = interaction.options.getString("duration");
  const winnersCount = interaction.options.getInteger("winners");
  const targetChannel =
    interaction.options.getChannel("channel") || interaction.channel;
  const requiredRole = interaction.options.getRole("required_role");
  const bonusRole = interaction.options.getRole("bonus_entries_role");
  const hostMention = interaction.options.getBoolean("host_mention") ?? false;
  const image = interaction.options.getString("image");
  const color = interaction.options.getString("color");

  const durationMs = parseTime(durationStr);
  if (!durationMs || durationMs <= 0) {
    return interaction.editReply({
      content:
        "❌ Durée invalide. Exemples valides : `1d`, `2h30m`, `45m`, `30s`.",
    });
  }

  const endsAt = new Date(Date.now() + durationMs);

  // Construire un objet plain pour buildGiveawayEmbed (on n'a pas encore le messageId)
  const giveawayData = {
    guildId: guild.id,
    channelId: targetChannel.id,
    prize,
    winnersCount,
    endsAt,
    startedAt: new Date(),
    hostId: interaction.user.id,
    requiredRoleId: requiredRole?.id ?? null,
    bonusEntriesRoleId: bonusRole?.id ?? null,
    bonusEntriesCount: 3,
    participants: [],
    winners: [],
    status: "active",
    image: image ?? null,
    color: color ?? null,
    hostMention,
    pausedAt: null,
    pausedRemainingMs: null,
  };

  // Envoyer le message dans le salon cible
  let msg;
  try {
    msg = await targetChannel.send({
      embeds: [buildGiveawayEmbed(giveawayData, guild, client, config)],
      components: buildGiveawayComponents(giveawayData),
    });
  } catch (err) {
    console.error("[Giveaway] Impossible d'envoyer le message:", err);
    return interaction.editReply({
      content: `❌ Impossible d'envoyer le message dans ${targetChannel}. Vérifiez les permissions du bot.`,
    });
  }

  // Créer et sauvegarder le document Mongoose avec le messageId
  const giveaway = new Giveaway({ ...giveawayData, messageId: msg.id });
  await giveaway.save();

  // Planifier la fin automatique
  scheduleGiveaway(client, giveaway);

  // Log
  await sendGiveawayLog(client, guild.id, "create", { giveaway }).catch(
    () => null,
  );

  return interaction.editReply({
    content: `Giveaway créé dans ${targetChannel} — [Voir le message](https://discord.com/channels/${guild.id}/${targetChannel.id}/${msg.id})`,
  });
}

// ─── END ─────────────────────────────────────────────────────────────────────
async function handleEnd(client, interaction, guild) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }
  if (giveaway.status !== "active" && giveaway.status !== "paused") {
    return interaction.editReply({
      content: `❌ Ce giveaway ne peut pas être terminé (statut actuel : \`${giveaway.status}\`).`,
    });
  }

  const result = await endGiveaway(client, messageId, guild.id);

  if (!result) {
    return interaction.editReply({
      content: "❌ Une erreur est survenue lors de la fin du giveaway.",
    });
  }

  if (result.success) {
    const winnerMentions = result.winners?.length
      ? result.winners.map((id) => `<@${id}>`).join(", ")
      : "Aucun";
    return interaction.editReply({
      content: `Giveaway **${giveaway.prize}** terminé. Gagnant(s) : ${winnerMentions}`,
    });
  } else {
    return interaction.editReply({
      content: `Giveaway terminé mais : ${result.error || "pas assez de participants valides."}`,
    });
  }
}

// ─── REROLL ──────────────────────────────────────────────────────────────────
async function handleReroll(client, interaction, guild) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }
  if (giveaway.status !== "ended") {
    return interaction.editReply({
      content: `❌ Ce giveaway n'est pas encore terminé (statut : \`${giveaway.status}\`).`,
    });
  }

  // Tirer les nouveaux gagnants
  const newWinners = await drawWinners(giveaway, guild);
  giveaway.winners = newWinners;
  await giveaway.save();

  // Mettre à jour le message Discord
  const channel =
    guild.channels.cache.get(giveaway.channelId) ||
    (await guild.channels.fetch(giveaway.channelId).catch(() => null));

  if (channel) {
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message
        .edit({
          embeds: [buildEndedEmbed(giveaway, guild, client)],
          components: buildEndedComponents(),
        })
        .catch(() => null);
    }

    // Annoncer les nouveaux gagnants dans le salon du giveaway
    const winnerMentions =
      newWinners.length > 0
        ? newWinners.map((id) => `<@${id}>`).join(", ")
        : "Aucun gagnant valide";

    const rerollEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.avatarURL({ dynamic: true }),
      })
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `<@${interaction.user.id}> ${interaction.user.tag} a effectué un reroll pour **${giveaway.prize}**`,
      )
      .addFields(
        { name: "Gagnant(s)", value: winnerMentions, inline: false },
        {
          name: "ID",
          value: `\`\`\`ini\nMessage  = ${messageId}\nRerollBy = ${interaction.user.id}\nChannel  = ${giveaway.channelId}\`\`\``,
        },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await channel.send({ embeds: [rerollEmbed] }).catch(() => null);

    // DM les nouveaux gagnants
    for (const winnerId of newWinners) {
      const user = await client.users.fetch(winnerId).catch(() => null);
      if (!user) continue;

      const dmEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({
          name: guild.name,
          iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
        })
        .setDescription(
          `Vous avez été re-sélectionné(e) comme gagnant(e) du giveaway **${giveaway.prize}** dans **${guild.name}** !`,
        )
        .addFields({
          name: "Lien",
          value: `[Voir le giveaway](https://discord.com/channels/${guild.id}/${giveaway.channelId}/${messageId})`,
          inline: true,
        })
        .setFooter({
          text: client.user.username,
          iconURL: client.user.avatarURL({ dynamic: true }),
        })
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  }

  await sendGiveawayLog(client, guild.id, "reroll", { giveaway }).catch(
    () => null,
  );

  const winnerList =
    newWinners.length > 0
      ? newWinners.map((id) => `<@${id}>`).join(", ")
      : "Aucun gagnant valide";

  return interaction.editReply({
    content: `Reroll effectué. Nouveau(x) gagnant(s) : ${winnerList}`,
  });
}

// ─── PAUSE ───────────────────────────────────────────────────────────────────
async function handlePause(client, interaction, guild, config) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }
  if (giveaway.status !== "active") {
    return interaction.editReply({
      content: `❌ Ce giveaway n'est pas actif (statut actuel : \`${giveaway.status}\`).`,
    });
  }

  giveaway.pausedRemainingMs = giveaway.endsAt.getTime() - Date.now();
  giveaway.pausedAt = new Date();
  giveaway.status = "paused";
  await giveaway.save();

  cancelGiveawayTimer(client, messageId);

  // Mettre à jour le message avec indicateur de pause
  try {
    const channel =
      guild.channels.cache.get(giveaway.channelId) ||
      (await guild.channels.fetch(giveaway.channelId).catch(() => null));

    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        const pauseEmbed = buildGiveawayEmbed(giveaway, guild, client, config)
          .setTitle("GIVEAWAY — EN PAUSE")
          .addFields({
            name: "Statut",
            value: "En pause — sera repris manuellement",
            inline: true,
          });

        await message
          .edit({
            embeds: [pauseEmbed],
            components: buildGiveawayComponents(giveaway),
          })
          .catch(() => null);
      }
    }
  } catch (err) {
    console.error("[Giveaway] Erreur mise à jour message pause:", err);
  }

  await sendGiveawayLog(client, guild.id, "pause", { giveaway }).catch(
    () => null,
  );

  return interaction.editReply({
    content: `Giveaway **${giveaway.prize}** mis en pause. Utilisez \`/giveaway resume\` pour le reprendre.`,
  });
}

// ─── RESUME ──────────────────────────────────────────────────────────────────
async function handleResume(client, interaction, guild, config) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }
  if (giveaway.status !== "paused") {
    return interaction.editReply({
      content: `❌ Ce giveaway n'est pas en pause (statut actuel : \`${giveaway.status}\`).`,
    });
  }

  giveaway.endsAt = new Date(Date.now() + giveaway.pausedRemainingMs);
  giveaway.pausedAt = null;
  giveaway.pausedRemainingMs = null;
  giveaway.status = "active";
  await giveaway.save();

  // Mettre à jour l'embed (normal sans indicateur de pause)
  try {
    const channel =
      guild.channels.cache.get(giveaway.channelId) ||
      (await guild.channels.fetch(giveaway.channelId).catch(() => null));

    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message
          .edit({
            embeds: [buildGiveawayEmbed(giveaway, guild, client, config)],
            components: buildGiveawayComponents(giveaway),
          })
          .catch(() => null);
      }
    }
  } catch (err) {
    console.error("[Giveaway] Erreur mise à jour message resume:", err);
  }

  scheduleGiveaway(client, giveaway);

  await sendGiveawayLog(client, guild.id, "resume", { giveaway }).catch(
    () => null,
  );

  const newEndsAtUnix = Math.floor(giveaway.endsAt.getTime() / 1000);
  return interaction.editReply({
    content: `Giveaway **${giveaway.prize}** repris. Il se terminera <t:${newEndsAtUnix}:R>.`,
  });
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
async function handleDelete(client, interaction, guild) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }

  cancelGiveawayTimer(client, messageId);

  // Supprimer le message Discord
  try {
    const channel =
      guild.channels.cache.get(giveaway.channelId) ||
      (await guild.channels.fetch(giveaway.channelId).catch(() => null));

    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) await message.delete().catch(() => null);
    }
  } catch (err) {
    console.error("[Giveaway] Erreur suppression message:", err);
  }

  giveaway.status = "deleted";
  await giveaway.save();

  await sendGiveawayLog(client, guild.id, "delete", { giveaway }).catch(
    () => null,
  );

  return interaction.editReply({
    content: `Giveaway **${giveaway.prize}** supprimé avec succès.`,
  });
}

// ─── LIST ────────────────────────────────────────────────────────────────────
async function handleList(client, interaction, guild) {
  const giveaways = await Giveaway.find({
    guildId: guild.id,
    status: { $in: ["active", "paused"] },
  });

  if (!giveaways.length) {
    return interaction.editReply({
      content: "📭 Aucun giveaway actif ou en pause sur ce serveur.",
    });
  }

  const displayed = giveaways.slice(0, 10);
  const remaining = giveaways.length - displayed.length;

  const fields = displayed.map((g) => {
    const endsAtUnix = Math.floor(g.endsAt.getTime() / 1000);
    const link = `[Voir le message](https://discord.com/channels/${guild.id}/${g.channelId}/${g.messageId})`;
    const statusLabel =
      g.status === "paused" ? "En pause" : `Se termine <t:${endsAtUnix}:R>`;

    return {
      name: g.prize,
      value: [
        statusLabel,
        `**${g.participants.length}** participant(s) · **${g.winnersCount}** gagnant(s)`,
        `${link} · \`${g.messageId}\``,
      ].join("\n"),
      inline: false,
    };
  });

  const embed = new EmbedBuilder()
    .setColor(client.color || "#dac7bb")
    .setTitle(`Giveaways en cours — ${guild.name}`)
    .setDescription(
      `**${giveaways.length}** giveaway(s) actif(s) ou en pause sur ce serveur.`,
    )
    .addFields(fields)
    .setTimestamp();

  if (remaining > 0) {
    embed.setFooter({
      text: `+ ${remaining} giveaway(s) non affiché(s). Utilisez /giveaway info pour les détails.`,
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

// ─── INFO ────────────────────────────────────────────────────────────────────
async function handleInfo(client, interaction, guild) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }

  const statusLabels = {
    active: "Actif",
    paused: "En pause",
    ended: "Terminé",
    deleted: "Supprimé",
  };

  const endsAtUnix = Math.floor(giveaway.endsAt.getTime() / 1000);
  const startedAtUnix = Math.floor(giveaway.startedAt.getTime() / 1000);
  const link = `[Accéder au message](https://discord.com/channels/${guild.id}/${giveaway.channelId}/${giveaway.messageId})`;

  const embed = new EmbedBuilder()
    .setColor(giveaway.color || client.color || "#dac7bb")
    .setTitle(`Informations — ${giveaway.prize}`)
    .addFields(
      { name: "Lot", value: giveaway.prize, inline: true },
      {
        name: "Statut",
        value: statusLabels[giveaway.status] || giveaway.status,
        inline: true,
      },
      {
        name: "Gagnants",
        value: String(giveaway.winnersCount),
        inline: true,
      },
      {
        name: "Participants",
        value: String(giveaway.participants.length),
        inline: true,
      },
      { name: "Organisateur", value: `<@${giveaway.hostId}>`, inline: true },
      { name: "Commencé le", value: `<t:${startedAtUnix}:f>`, inline: true },
      {
        name: "Se termine",
        value: `<t:${endsAtUnix}:f> (<t:${endsAtUnix}:R>)`,
        inline: false,
      },
    );

  if (giveaway.requiredRoleId) {
    embed.addFields({
      name: "Rôle requis",
      value: `<@&${giveaway.requiredRoleId}>`,
      inline: true,
    });
  }
  if (giveaway.bonusEntriesRoleId) {
    embed.addFields({
      name: "Rôle bonus",
      value: `<@&${giveaway.bonusEntriesRoleId}> (+${giveaway.bonusEntriesCount} chances)`,
      inline: true,
    });
  }
  if (giveaway.status === "ended" && giveaway.winners.length > 0) {
    embed.addFields({
      name: "Gagnant(s)",
      value: giveaway.winners.map((id) => `<@${id}>`).join(", "),
      inline: false,
    });
  }
  if (giveaway.status === "paused" && giveaway.pausedRemainingMs != null) {
    const remainingSec = Math.floor(giveaway.pausedRemainingMs / 1000);
    const h = Math.floor(remainingSec / 3600);
    const m = Math.floor((remainingSec % 3600) / 60);
    const s = remainingSec % 60;
    embed.addFields({
      name: "Temps restant (en pause)",
      value: `${h}h ${m}m ${s}s`,
      inline: true,
    });
  }

  embed
    .addFields({ name: "Message", value: link, inline: false })
    .setFooter({ text: `ID : ${giveaway.messageId}` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─── ENTRIES ─────────────────────────────────────────────────────────────────

const ENTRIES_PER_PAGE = 10;

/** Construit la liste triée par entries décroissant. */
function buildEntriesListCmd(giveaway, guild) {
  return giveaway.participants
    .map((userId) => {
      const member = guild.members.cache.get(userId);
      let entries = 1;
      if (
        giveaway.bonusEntriesRoleId &&
        member?.roles?.cache?.has(giveaway.bonusEntriesRoleId)
      ) {
        entries += giveaway.bonusEntriesCount ?? 3;
      }
      return { userId, entries };
    })
    .sort((a, b) => b.entries - a.entries);
}

/** Construit l'embed paginé style Giveaway Boat. */
function buildEntriesEmbedCmd(giveaway, entriesList, page, totalPages, client) {
  const total = entriesList.length;
  const start = (page - 1) * ENTRIES_PER_PAGE;
  const items = entriesList.slice(start, start + ENTRIES_PER_PAGE);

  const listText =
    items.length > 0
      ? items
          .map((e, i) => {
            const n = start + i + 1;
            const label = e.entries === 1 ? "entry" : "entries";
            return `${n}. <@${e.userId}> (${e.entries} ${label})`;
          })
          .join("\n")
      : "*No participants yet.*";

  const description = [
    `These are the members that have participated in the giveaway of **${giveaway.prize}**:`,
    ``,
    listText,
    ``,
    `Total Participants: **${total}**`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor("#dac7bb")
    .setTitle(`🎉 Giveaway Participants (Page ${page}/${totalPages})`)
    .setDescription(description)
    .setFooter({ text: `${client.user?.username ?? "Giveaway"} • Today at` })
    .setTimestamp();
}

async function handleEntries(client, interaction, guild) {
  const messageId = interaction.options.getString("message_id");

  const giveaway = await Giveaway.findOne({ messageId, guildId: guild.id });
  if (!giveaway) {
    return interaction.editReply({
      content: "❌ Aucun giveaway trouvé avec cet ID de message.",
    });
  }

  if (giveaway.participants.length === 0) {
    return interaction.editReply({
      content: "📭 Aucun participant pour ce giveaway.",
    });
  }

  // Fetch membres pour vérifier les bonus roles
  await guild.members.fetch().catch(() => null);

  const page = 1;
  const entriesList = buildEntriesListCmd(giveaway, guild);
  const totalPages = Math.max(
    1,
    Math.ceil(entriesList.length / ENTRIES_PER_PAGE),
  );

  const embed = buildEntriesEmbedCmd(
    giveaway,
    entriesList,
    page,
    totalPages,
    client,
  );
  const components = buildEntriesPagination(
    giveaway.messageId,
    page,
    totalPages,
  );

  return interaction.editReply({ embeds: [embed], components });
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
async function handleConfig(client, interaction, guild, sub) {
  let config = await GiveawayConfig.findOne({ guildId: guild.id });
  if (!config) {
    config = new GiveawayConfig({ guildId: guild.id });
  }

  const embed = new EmbedBuilder()
    .setColor(client.color || "#dac7bb")
    .setTimestamp();

  switch (sub) {
    case "manager_role": {
      const role = interaction.options.getRole("role");
      config.managerRoleId = role.id;
      await config.save();

      embed
        .setTitle("Rôle gestionnaire mis à jour")
        .setDescription(
          `Le rôle <@&${role.id}> peut désormais gérer les giveaways.`,
        )
        .addFields({ name: "Rôle", value: `<@&${role.id}>`, inline: true });
      break;
    }

    case "log_channel": {
      const channel = interaction.options.getChannel("channel");
      config.logChannelId = channel.id;
      await config.save();

      embed
        .setTitle("Salon de logs mis à jour")
        .setDescription(
          `Les logs des giveaways seront envoyés dans ${channel}.`,
        )
        .addFields({ name: "Salon", value: `${channel}`, inline: true });
      break;
    }

    case "announce_channel": {
      const channel = interaction.options.getChannel("channel");
      config.announceChannelId = channel.id;
      await config.save();

      embed
        .setTitle("Salon d'annonce mis à jour")
        .setDescription(
          `Les annonces de gagnants seront envoyées dans ${channel}.`,
        )
        .addFields({ name: "Salon", value: `${channel}`, inline: true });
      break;
    }

    case "default_color": {
      const colorStr = interaction.options.getString("color").trim();
      const hexRegex = /^#?([0-9A-Fa-f]{6})$/;
      if (!hexRegex.test(colorStr)) {
        return interaction.editReply({
          content:
            "❌ Format de couleur invalide. Exemples acceptés : `#FF0000` ou `FF0000`.",
        });
      }
      const normalized = colorStr.startsWith("#") ? colorStr : `#${colorStr}`;
      config.defaultColor = normalized;
      await config.save();

      embed
        .setTitle("✅ Couleur par défaut mise à jour")
        .setDescription(
          `La couleur des embeds de giveaway est maintenant \`${normalized}\`.`,
        )
        .setColor(normalized)
        .addFields({ name: "🎨 Couleur", value: normalized, inline: true });
      break;
    }

    default:
      return interaction.editReply({
        content: "❌ Sous-commande de configuration inconnue.",
      });
  }

  return interaction.editReply({ embeds: [embed] });
}
