const { EmbedBuilder } = require('discord.js');
const TicketConfig = require('../../schemas/ticketConfigSchema');

module.exports = async (client, ticket) => {
    const config = await TicketConfig.findOne({ guildId: ticket.guildId });
    const logChannelId = config?.logChannelId;

    if (!logChannelId) return;

    try {
        const logChannel = await client.channels.fetch(logChannelId);
        const creator = await client.users.fetch(ticket.creatorId);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎫 Ticket Créé')
            .setDescription(`Un nouveau ticket a été créé`)
            .addFields(
                { name: 'ID du Ticket', value: ticket.ticketId, inline: true },
                { name: 'Créateur', value: `${creator} (${creator.tag})`, inline: true },
                { name: 'Raison', value: ticket.reason, inline: true },
                { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${ticket.creatorId}` });

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erreur lors de l\'envoi du log de création de ticket:', err);
    }
};
