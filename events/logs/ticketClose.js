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
            .setColor('#ff0000')
            .setTitle('🔒 Ticket Fermé')
            .setDescription(`Le ticket a été fermé`)
            .addFields(
                { name: 'ID du Ticket', value: ticket.ticketId, inline: true },
                { name: 'Créateur', value: `${creator} (${creator.tag})`, inline: true },
                { name: 'Fermé par', value: `${closer} (${closer.tag})`, inline: true },
                { name: 'Raison', value: ticket.reason, inline: true },
                { name: 'Durée', value: durationStr, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${closedBy}` });

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erreur lors de l\'envoi du log de fermeture de ticket:', err);
    }
};
