const { EmbedBuilder } = require("discord.js");
const TicketConfig = require("../../schemas/ticketConfigSchema");

module.exports = async (client, ticket) => {
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

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: creator ? creator.tag : ticket.creatorId,
        iconURL: creator?.avatarURL({ dynamic: true }) ?? null,
      })
      .setThumbnail(creator?.displayAvatarURL({ dynamic: true }) ?? null)
      .setDescription(
        `<@${ticket.creatorId}> ${creator?.tag ?? ticket.creatorId} a ouvert le ticket <#${ticket.channelId}>`,
      )
      .addFields(
        { name: "Ticket", value: `\`${ticket.ticketId}\``, inline: true },
        {
          name: "Raison",
          value: ticket.reason ?? "Aucune raison",
          inline: true,
        },
        {
          name: "ID",
          value: `\`\`\`ini\nUser = ${ticket.creatorId}\nChannel = ${ticket.channelId}\`\`\``,
        },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[Ticket] Erreur log ticketCreate:", err);
  }
};
