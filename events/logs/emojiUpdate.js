const { EmbedBuilder, Events, ButtonStyle, AuditLogEvent, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildEmojiUpdate,

  async execute(client, oldEmoji, newEmoji) {

    const logSettings = await LogSettings.findOne({ guildId: oldEmoji.guild.id });
        if (!logSettings || !logSettings.logChannels.emojis || !logSettings.logChannels.emojis.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.emojis.channelId);
        if (!logChannel) return;

const fetchedLogs = await newEmoji.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.EmojiUpdate
}).catch(console.error);

const emojiLog = fetchedLogs?.entries.first();
let executor = 'Unknown';
if (emojiLog && emojiLog.target.id === newEmoji.id) {
    executor = emojiLog.executor.tag;
}


const embed = new EmbedBuilder()
    .setColor(client.color) 
    .setTitle('Emoji Updated 🔄')
    .setDescription(`An emoji has been updated in the server.`)
    .addFields(
        { name: 'Old Emoji Name', value: `\`${oldEmoji.name}\``, inline: true },
        { name: 'New Emoji Name', value: `\`${newEmoji.name}\``, inline: true },
        { name: 'Emoji ID', value: `\`${newEmoji.id}\``, inline: true },
        { name: 'Updated by', value: executor, inline: true }
    )
    .setThumbnail(newEmoji.url)
    .setTimestamp()
    .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
    .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(console.error);
    }
}