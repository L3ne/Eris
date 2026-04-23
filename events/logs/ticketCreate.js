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
            .setColor(client.color || '#00ff00')
            .setTitle(`TICKET CREATED: "${ticket.ticketId}"`)
            .setDescription(`Un nouveau ticket a été créé par ${creator}`)
            .addFields(
                { name: 'Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
                { name: 'Creator', value: `${creator.tag} (\`${ticket.creatorId}\`)`, inline: true },
                { name: 'Reason', value: ticket.reason, inline: true },
                { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }
            )
            .setTimestamp()
            .setThumbnail(logChannel.guild.iconURL({ dynamic: true }) || null)
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) });

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erreur lors de l\'envoi du log de création de ticket:', err);
    }
};
