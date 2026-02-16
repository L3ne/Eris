const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
    name: Events.MessageDelete,
    async execute(client, message) {

        if (!message.author || message.author.bot || !message.guild) return;

        if (message.embeds.length > 0) return;

        const logSettings = await LogSettings.findOne({ guildId: message.guild.id });
        if (!logSettings || !logSettings.logChannels.message || !logSettings.logChannels.message.enabled) return;

        const logChannel = client.channels.cache.get(logSettings.logChannels.message.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle('Message Deleted')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }) || null)
            .addFields(
                { name: 'Author', value: `@${message.author.tag} - ${message.author}`, inline: false },
                { name: 'Date', value: `<t:${parseInt(message.createdAt / 1000)}:f> (<t:${parseInt(message.createdAt / 1000)}:R>)`, inline: false },
                { name: 'Channel', value: `${message.channel}`, inline: false },
                { name: 'Deleted Message', value: message.content ? message.content : 'No text content', inline: false }
            )
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        if (message.attachments.size > 0) {
            embed.addFields({ name: 'Attachment URL(s)', value: message.attachments.map(a => a.url).join('\n') });
            embed.setImage(`${message.attachments.first().url}`);
        }

        logChannel.send({ embeds: [embed] });
    }
};
