const { EmbedBuilder, Events, AuditLogEvent, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildEmojiDelete,

  async execute(client, emoji) {

    const logSettings = await LogSettings.findOne({ guildId: emoji.guild.id });
            if (!logSettings || !logSettings.logChannels.emojis || !logSettings.logChannels.emojis.enabled) return;
        
            const logChannel = client.channels.cache.get(logSettings.logChannels.emojis.channelId);
            if (!logChannel) return;

    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiDelete
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor(client.color) 
        .setTitle('Emoji Deleted')
        .setDescription(`An emoji was deleted from the server.`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F893811882807410759.gif%3Fv%3D1&w=128&q=75')
        .addFields(
            { name: 'Emoji Name', value: `\`${emoji.name}\``, inline: true },
            { name: 'Emoji ID', value: `\`${emoji.id}\``, inline: true },
            { name: 'Deleted by', value: executor, inline: true }
        )
      	.setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
      	.setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(console.error);
    }
};