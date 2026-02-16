const { EmbedBuilder, Events, AuditLogEvent, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildEmojiCreate,

  async execute(client, emoji) {

    const logSettings = await LogSettings.findOne({ guildId: emoji.guild.id });
        if (!logSettings || !logSettings.logChannels.emojis || !logSettings.logChannels.emojis.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.emojis.channelId);
        if (!logChannel) return;

    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiCreate
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle('New Emoji Added')
        .setDescription(`A new emoji has been added to the server!`)
        .addFields(
            { name: 'Emoji', value: `${emoji}`, inline: true },
            { name: 'Emoji Name', value: `\`${emoji.name}\``, inline: true },
            { name: 'Emoji ID', value: `\`${emoji.id}\``, inline: true },
            { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
            { name: 'Uploader', value: executor, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp()
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
    }
}