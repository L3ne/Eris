const { EmbedBuilder, Events, ButtonStyle, ActionRowBuilder,AuditLogEvent, ButtonBuilder } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildBanRemove,



async execute (client, ban)  {

    const logSettings = await LogSettings.findOne({ guildId: ban.guild.id });
        if (!logSettings || !logSettings.logChannels.mod || !logSettings.logChannels.mod.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.mod.channelId);
        if (!logChannel) return;

    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove
    }).catch(console.error);
    
    const unbanLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (unbanLog) {
        executor = unbanLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor(client.color) 
        .setTitle('User Unbanned')
        .setDescription(`**${ban.user.tag}** has been unbanned from **${ban.guild.name}**.`)
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: 'Unbanned User', value: `${ban.user.tag}`, inline: false },
            { name: 'User ID', value: `${ban.user.id}`, inline: false },
            { name: 'Unbanned by', value: executor, inline: false }
        )
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
        .setTimestamp()
    logChannel.send({ embeds: [embed] }).catch(console.error);
    }
}