const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { GiveawayConfig, Giveaway } = require("../schemas/giveawaySchema");
const LogSettings = require("../schemas/logsSchema");

/**
 * Parse une durée humaine ("1d2h30m") en millisecondes.
 * @param {string} str
 * @returns {number} millisecondes (0 si invalide)
 */
function parseTime(str) {
  if (!str || typeof str !== "string") return 0;

  const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let total = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    total += value * (units[unit] || 0);
  }

  return total;
}

/**
 * Construit l'embed pour un giveaway ACTIF.
 * @param {Object}  giveaway
 * @param {Guild}   guild
 * @param {Client}  client
 * @param {Object}  config   GiveawayConfig document (peut être null)
 * @returns {EmbedBuilder}
 */
function buildGiveawayEmbed(giveaway, guild, client, config) {
  const color = giveaway.color || config?.defaultColor || "#dac7bb";
  const endsAtUnix = Math.floor(giveaway.endsAt.getTime() / 1000);

  // Lien cliquable vers le message (Timer) — disponible seulement si messageId existe
  const timerLink = giveaway.messageId
    ? ` [(Timer)](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})`
    : "";

  const lines = [
    `**${giveaway.prize}**`,
    ``,
    `Click 🎉 button to enter!`,
    `Winners: **${giveaway.winnersCount}**`,
    `Hosted by: <@${giveaway.hostId}>`,
    `Ends: <t:${endsAtUnix}:R>${timerLink}`,
  ];

  if (giveaway.requiredRoleId)
    lines.push(`Required Role: <@&${giveaway.requiredRoleId}>`);
  if (giveaway.bonusEntriesRoleId)
    lines.push(
      `Bonus Entries: <@&${giveaway.bonusEntriesRoleId}> (+${giveaway.bonusEntriesCount})`,
    );
  if (giveaway.status === "paused")
    lines.push(``, `⏸️ **This giveaway is paused.**`);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Ends" })
    .setTimestamp(giveaway.endsAt);

  if (giveaway.image) embed.setImage(giveaway.image);

  return embed;
}

/**
 * Construit l'embed pour un giveaway TERMINÉ.
 * @param {Object}  giveaway
 * @param {Guild}   guild
 * @param {Client}  client
 * @returns {EmbedBuilder}
 */
function buildEndedEmbed(giveaway, guild, client) {
  const winnersText =
    giveaway.winners.length > 0
      ? giveaway.winners.map((id) => `<@${id}>`).join(", ")
      : "No valid winners";

  const lines = [
    `**${giveaway.prize}**`,
    ``,
    `Winners: ${winnersText}`,
    `Hosted by: <@${giveaway.hostId}>`,
    `Ended`,
  ];

  return new EmbedBuilder()
    .setColor("#808080")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Ended" })
    .setTimestamp(new Date());
}

/**
 * Retourne les composants pour un giveaway actif.
 * @param {Object} giveaway
 * @returns {ActionRowBuilder[]}
 */
function buildGiveawayComponents(giveaway) {
  const participateBtn = new ButtonBuilder()
    .setCustomId("giveaway_participate")
    .setEmoji("🎉")
    .setLabel(giveaway.participants.length.toLocaleString("en-US"))
    .setStyle(ButtonStyle.Primary);

  const participantsBtn = new ButtonBuilder()
    .setCustomId("giveaway_participants_view")
    .setEmoji("👤")
    .setLabel("Participants")
    .setStyle(ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(participateBtn, participantsBtn),
  ];
}

/**
 * Retourne les composants pour un giveaway terminé (bouton désactivé).
 * @returns {ActionRowBuilder[]}
 */
function buildEndedComponents() {
  const endedBtn = new ButtonBuilder()
    .setCustomId("giveaway_participate")
    .setEmoji("🎉")
    .setLabel("Giveaway Ended")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const participantsBtn = new ButtonBuilder()
    .setCustomId("giveaway_participants_view")
    .setEmoji("👤")
    .setLabel("Participants")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(false);

  return [new ActionRowBuilder().addComponents(endedBtn, participantsBtn)];
}

/**
 * Construit l'embed paginé de la liste des participants (style Giveaway Boat).
 * @param {Object} giveaway
 * @param {Guild}  guild
 * @param {Client} client
 * @param {number} page     Page actuelle (1-based)
 * @param {number} perPage  Participants par page (défaut 10)
 * @returns {Promise<{ embed: EmbedBuilder, page: number, totalPages: number }>}
 */
async function buildEntriesEmbed(
  giveaway,
  guild,
  client,
  page = 1,
  perPage = 10,
) {
  // Tenter de remplir le cache des membres
  await guild.members.fetch().catch(() => null);

  // Construire la liste triée par nombre d'entrées (desc)
  const entriesList = giveaway.participants
    .map((userId) => {
      const member = guild.members.cache.get(userId);
      let entries = 1;
      if (
        giveaway.bonusEntriesRoleId &&
        member?.roles?.cache?.has(giveaway.bonusEntriesRoleId)
      ) {
        entries += giveaway.bonusEntriesCount;
      }
      return { userId, entries };
    })
    .sort((a, b) => b.entries - a.entries);

  const total = entriesList.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  page = Math.max(1, Math.min(page, totalPages));

  const start = (page - 1) * perPage;
  const pageItems = entriesList.slice(start, start + perPage);

  const listText =
    pageItems.length > 0
      ? pageItems
          .map(
            (e, i) =>
              `${start + i + 1}. <@${e.userId}> (${e.entries} ${e.entries === 1 ? "entry" : "entries"})`,
          )
          .join("\n")
      : "No participants yet.";

  const description = [
    `These are the members that have participated in the giveaway of **${giveaway.prize}**:`,
    ``,
    listText,
    ``,
    `Total Participants: **${total}**`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor("#dac7bb")
    .setTitle(`🎉 Giveaway Participants (Page ${page}/${totalPages})`)
    .setDescription(description)
    .setFooter({
      text: `${client.user?.username ?? "Giveaway"} • Today at`,
    })
    .setTimestamp();

  return { embed, page, totalPages };
}

/**
 * Construit les boutons de navigation pour la liste des participants.
 * @param {string} messageId   ID du message giveaway
 * @param {number} page        Page actuelle
 * @param {number} totalPages  Nombre total de pages
 * @returns {ActionRowBuilder[]}
 */
function buildEntriesPagination(messageId, page, totalPages) {
  const prevBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_prev_${messageId}_${page}`)
    .setLabel("◄")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const gotoBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_goto_${messageId}`)
    .setLabel("Go To Page")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(totalPages <= 1);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_next_${messageId}_${page}`)
    .setLabel("►")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  return [new ActionRowBuilder().addComponents(prevBtn, gotoBtn, nextBtn)];
}

/**
 * Tire les gagnants en tenant compte des rôles requis et des entrées bonus.
 * @param {Object} giveaway
 * @param {Guild}  guild
 * @returns {Promise<string[]>} tableau d'IDs gagnants
 */
async function drawWinners(giveaway, guild) {
  // S'assurer que le cache des membres est rempli
  await guild.members.fetch().catch(() => null);

  const pool = [];

  for (const userId of giveaway.participants) {
    const member = guild.members.cache.get(userId);
    if (!member) continue;

    // Vérification du rôle requis
    if (
      giveaway.requiredRoleId &&
      !member.roles.cache.has(giveaway.requiredRoleId)
    ) {
      continue;
    }

    // Entrée de base
    pool.push(userId);

    // Entrées bonus
    if (
      giveaway.bonusEntriesRoleId &&
      member.roles.cache.has(giveaway.bonusEntriesRoleId)
    ) {
      for (let i = 0; i < giveaway.bonusEntriesCount; i++) {
        pool.push(userId);
      }
    }
  }

  // Mélange Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Sélection des gagnants uniques
  const winners = [];
  const seen = new Set();

  for (const userId of pool) {
    if (seen.has(userId)) continue;
    seen.add(userId);
    winners.push(userId);
    if (winners.length >= giveaway.winnersCount) break;
  }

  return winners;
}

/**
 * Termine un giveaway : tire les gagnants, édite le message, envoie les annonces et DM.
 * @param {Client} client
 * @param {string} messageId
 * @param {string} guildId
 * @returns {Promise<{success: boolean, winners?: string[], error?: string}>}
 */
async function endGiveaway(client, messageId, guildId) {
  const giveaway = await Giveaway.findOne({ messageId, guildId });

  if (!giveaway || giveaway.status !== "active") {
    return { success: false, error: "Giveaway non trouvé ou déjà terminé" };
  }

  // Récupérer le guild
  const guild =
    client.guilds.cache.get(guildId) ||
    (await client.guilds.fetch(guildId).catch(() => null));

  // Tirer les gagnants
  const winners = await drawWinners(giveaway, guild);

  // Mettre à jour en base
  giveaway.status = "ended";
  giveaway.winners = winners;
  await giveaway.save();

  // Éditer le message d'origine
  const channel =
    client.channels.cache.get(giveaway.channelId) ||
    (await client.channels.fetch(giveaway.channelId).catch(() => null));

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
  }

  // Récupérer la config pour le salon d'annonce
  const config = await GiveawayConfig.findOne({ guildId });
  const announceChId = config?.announceChannelId || giveaway.channelId;
  const announceChannel =
    client.channels.cache.get(announceChId) ||
    (await client.channels.fetch(announceChId).catch(() => null));

  if (announceChannel) {
    if (winners.length > 0) {
      const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
      const host = await client.users.fetch(giveaway.hostId).catch(() => null);
      const giveawayLink = `https://discord.com/channels/${guildId}/${giveaway.channelId}/${messageId}`;

      const announceEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor(
          host
            ? { name: host.tag, iconURL: host.avatarURL({ dynamic: true }) }
            : { name: guild?.name ?? "Giveaway" },
        )
        .setThumbnail(host?.displayAvatarURL({ dynamic: true }) ?? null)
        .setDescription(
          `Félicitations ${winnerMentions} ! Vous avez gagné **${giveaway.prize}** !`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          { name: "Gagnant(s)", value: winnerMentions, inline: true },
          {
            name: "ID",
            value: `\`\`\`ini\nHost    = ${giveaway.hostId}\nChannel = ${giveaway.channelId}\nMessage = ${messageId}\`\`\``,
          },
        )
        .setFooter({
          text: client.user.username,
          iconURL: client.user.avatarURL({ dynamic: true }),
        })
        .setTimestamp();

      await announceChannel
        .send({
          content: `Félicitations ${winnerMentions} — [Voir le giveaway](${giveawayLink})`,
          embeds: [announceEmbed],
        })
        .catch(() => null);
    } else {
      await announceChannel
        .send({
          content: `Le giveaway **${giveaway.prize}** s'est terminé sans gagnant (pas assez de participants valides).`,
        })
        .catch(() => null);
    }
  }

  // DM aux gagnants
  for (const winnerId of winners) {
    const giveawayLink = `https://discord.com/channels/${guildId}/${giveaway.channelId}/${messageId}`;

    const dmEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: guild?.name ?? "Giveaway",
        iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
      })
      .setDescription(`Vous avez gagné **${giveaway.prize}** !`)
      .addFields(
        { name: "Serveur", value: guild?.name ?? guildId, inline: true },
        {
          name: "Lien",
          value: `[Voir le giveaway](${giveawayLink})`,
          inline: true,
        },
        {
          name: "ID",
          value: `\`\`\`ini\nMessage = ${messageId}\nChannel = ${giveaway.channelId}\`\`\``,
        },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const user = await client.users.fetch(winnerId).catch(() => null);
    if (user) {
      await user.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  }

  // Log + nettoyage du timer
  await sendGiveawayLog(client, guildId, "end", { giveaway, winners });
  cancelGiveawayTimer(client, messageId);

  return { success: true, winners };
}



/**
 * Programme un setTimeout pour terminer le giveaway à son échéance.
 * @param {Client} client
 * @param {Object} giveaway
 */
function scheduleGiveaway(client, giveaway) {
  if (!client.giveawayTimers) client.giveawayTimers = new Map();

  // Annuler l'éventuel timer existant
  cancelGiveawayTimer(client, giveaway.messageId);

  const delay = giveaway.endsAt.getTime() - Date.now();

  if (delay <= 0) {
    // Déjà expiré : terminer immédiatement
    endGiveaway(client, giveaway.messageId, giveaway.guildId);
    return;
  }

  const timeout = setTimeout(() => {
    endGiveaway(client, giveaway.messageId, giveaway.guildId);
    client.giveawayTimers.delete(giveaway.messageId);
  }, delay);

  client.giveawayTimers.set(giveaway.messageId, timeout);
}

/**
 * Annule et supprime le timer d'un giveaway.
 * @param {Client} client
 * @param {string} messageId
 */
function cancelGiveawayTimer(client, messageId) {
  if (!client.giveawayTimers) return;

  const existing = client.giveawayTimers.get(messageId);
  if (existing) {
    clearTimeout(existing);
    client.giveawayTimers.delete(messageId);
  }
}

/**
 * Envoie un log dans le salon de logs configuré.
 * @param {Client} client
 * @param {string} guildId
 * @param {'create'|'end'|'reroll'|'pause'|'resume'|'delete'} type
 * @param {Object} data
 */
async function sendGiveawayLog(client, guildId, type, data) {
  const [config, logSettings] = await Promise.all([
    GiveawayConfig.findOne({ guildId }),
    LogSettings.findOne({ guildId }),
  ]);

  const channelId =
    config?.logChannelId ||
    (logSettings?.logChannels?.giveaway?.enabled &&
      logSettings?.logChannels?.giveaway?.channelId) ||
    null;

  if (!channelId) return;

  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const { giveaway, winners, newEndsAt } = data;
  const giveawayChannelMention = giveaway?.channelId
    ? `<#${giveaway.channelId}>`
    : "Inconnu";

  const host = await client.users.fetch(giveaway.hostId).catch(() => null);
  const giveawayLink = giveaway.messageId
    ? `https://discord.com/channels/${guildId}/${giveaway.channelId}/${giveaway.messageId}`
    : null;

  const idBlock = `\`\`\`ini\nHost    = ${giveaway.hostId}\nChannel = ${giveaway.channelId}\nMessage = ${giveaway.messageId ?? "N/A"}\`\`\``;

  const base = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor(
      host
        ? { name: host.tag, iconURL: host.avatarURL({ dynamic: true }) }
        : { name: guild?.name ?? guildId },
    )
    .setThumbnail(host?.displayAvatarURL({ dynamic: true }) ?? null)
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  let embed;

  switch (type) {
    case "create":
      embed = base
        .setDescription(
          `<@${giveaway.hostId}> ${host?.tag ?? ""} a créé un giveaway pour **${giveaway.prize}**`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          {
            name: "Gagnants",
            value: String(giveaway.winnersCount),
            inline: true,
          },
          {
            name: "Se termine",
            value: `<t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          { name: "Salon", value: giveawayChannelMention, inline: true },
          { name: "ID", value: idBlock },
        );
      break;

    case "end":
      embed = base
        .setDescription(
          `Le giveaway **${giveaway.prize}** organisé par <@${giveaway.hostId}> est terminé`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          {
            name: "Participants",
            value: String(giveaway.participants.length),
            inline: true,
          },
          {
            name: "Gagnant(s)",
            value:
              winners?.length > 0
                ? winners.map((id) => `<@${id}>`).join(", ")
                : "Aucun gagnant valide",
            inline: false,
          },
          { name: "ID", value: idBlock },
        );
      break;

    case "reroll":
      embed = base
        .setDescription(
          `Un reroll a été effectué pour le giveaway **${giveaway.prize}**`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          {
            name: "Nouveaux gagnants",
            value:
              winners?.length > 0
                ? winners.map((id) => `<@${id}>`).join(", ")
                : "Aucun",
            inline: false,
          },
          { name: "ID", value: idBlock },
        );
      break;

    case "pause":
      embed = base
        .setDescription(
          `<@${giveaway.hostId}> ${host?.tag ?? ""} a mis en pause le giveaway **${giveaway.prize}**`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          { name: "Salon", value: giveawayChannelMention, inline: true },
          { name: "ID", value: idBlock },
        );
      break;

    case "resume":
      embed = base
        .setDescription(
          `<@${giveaway.hostId}> ${host?.tag ?? ""} a repris le giveaway **${giveaway.prize}**`,
        )
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          {
            name: "Nouvelle fin",
            value: newEndsAt
              ? `<t:${Math.floor(new Date(newEndsAt).getTime() / 1000)}:R>`
              : `<t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          { name: "ID", value: idBlock },
        );
      break;

    case "delete":
      embed = base
        .setDescription(`Le giveaway **${giveaway.prize}** a été supprimé`)
        .addFields(
          { name: "Prix", value: giveaway.prize, inline: true },
          { name: "Salon", value: giveawayChannelMention, inline: true },
          { name: "ID", value: idBlock },
        );
      break;

    default:
      return;
  }

  await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = {
  parseTime,
  buildGiveawayEmbed,
  buildEndedEmbed,
  buildGiveawayComponents,
  buildEndedComponents,
  buildEntriesEmbed,
  buildEntriesPagination,
  drawWinners,
  endGiveaway,
  scheduleGiveaway,
  cancelGiveawayTimer,
  sendGiveawayLog,
};
