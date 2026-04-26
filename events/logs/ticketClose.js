const { EmbedBuilder } = require("discord.js");
const TicketConfig = require("../../schemas/ticketConfigSchema");

module.exports = async (client, ticket, closedBy) => {
  const config = await TicketConfig.findOne({ guildId: ticket.guildId });
  const logChannelId = config?.logChannelId;

  if (!logChannelId) return;

  try {
    const logChannel = await client.channels
      .fetch(logChannelId)
      .catch(() => null);
    if (!logChannel) return;

    const creator = await client.users
      .fetch(ticket.creatorId)
      .catch(() => null);
    const closer = await client.users.fetch(closedBy).catch(() => null);

    const durationMs = (ticket.closedAt ?? new Date()) - ticket.createdAt;
    const totalSec = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const durationStr =
      hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: closer?.tag ?? closedBy,
        iconURL: closer?.avatarURL({ dynamic: true }) ?? undefined,
      })
      .setThumbnail(creator?.displayAvatarURL({ dynamic: true }) ?? null)
      .setDescription(
        `<@${closedBy}> ${closer?.tag ?? ""} a fermé le ticket créé par <@${ticket.creatorId}>`,
      )
      .addFields(
        { name: "Ticket", value: `\`${ticket.ticketId}\``, inline: true },
        {
          name: "Créateur",
          value: creator
            ? `${creator.tag} (\`${ticket.creatorId}\`)`
            : `\`${ticket.creatorId}\``,
          inline: true,
        },
        {
          name: "Raison",
          value: ticket.reason || "Aucune raison",
          inline: true,
        },
        { name: "Durée", value: durationStr, inline: true },
        {
          name: "ID",
          value: `\`\`\`ini\nCreator  = ${ticket.creatorId}\nClosedBy = ${closedBy}\nChannel  = ${ticket.channelId}\`\`\``,
          inline: false,
        },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[Ticket] Erreur log fermeture:", err);
  }
};
