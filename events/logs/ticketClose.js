const { EmbedBuilder } = require('discord.js');
const TicketConfig = require('../../schemas/ticketConfigSchema');

module.exports = async (client, ticket, closedBy) => {
    const config = await TicketConfig.findOne({ guildId: ticket.guildId });
    const logChannelId = config?.logChannelId;

    if (!logChannelId) return;

    try {
        const logChannel = await client.channels.fetch(logChannelId);
        const creator = await client.users.fetch(ticket.creatorId);
        const closer = await client.users.fetch(closedBy);

        const duration = ticket.closedAt - ticket.createdAt;
        const durationStr = Math.floor(duration / 60000) + ' minutes';

        const embed = new EmbedBuilder()
            .setColor(client.color || '#ff0000')
            .setTitle(`TICKET CLOSED: "${ticket.ticketId}"`)
            .setDescription(`Le ticket a été fermé par ${closer}`)
            .addFields(
                { name: 'Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
                { name: 'Creator', value: `${creator.tag} (\`${ticket.creatorId}\`)`, inline: true },
                { name: 'Closed by', value: `${closer.tag} (\`${closedBy}\`)`, inline: true },
                { name: 'Reason', value: ticket.reason, inline: true },
                { name: 'Duration', value: durationStr, inline: true }
            )
            .setTimestamp()
            .setThumbnail(logChannel.guild.iconURL({ dynamic: true }) || null)
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) });

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erreur lors de l\'envoi du log de fermeture de ticket:', err);
    }
};
