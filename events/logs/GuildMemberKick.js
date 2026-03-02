const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildMemberRemove,

async execute (client, member)  {

    const logSettings = await LogSettings.findOne({ guildId: member.guild.id });
        if (!logSettings || !logSettings.logChannels.mod || !logSettings.logChannels.mod.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.mod.channelId);
        if (!logChannel) return;
    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberKick
        });

        const kickLog = fetchedLogs.entries.first();
        if (!kickLog || kickLog.target.id !== member.id) return;

        const executor = kickLog.executor.tag;
        const reason = kickLog.reason || 'No reason provided';

        const embed = new EmbedBuilder()
            .setColor(client.color) 
            .setTitle('User Kicked')
            .setDescription(`**${member.user.tag}** has been removed from the server.`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Username', value: `${member.user.tag}`, inline: false },
                { name: 'User ID', value: `${member.user.id}`, inline: false },
                { name: 'Kicked By', value: executor, inline: false },
                { name: 'Reason for Kick', value: reason, inline: false },
                { name: 'Time of Kick', value: `<t:${Math.floor(kickLog.createdTimestamp / 1000)}:F>`, inline: false })
                .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
                .setTimestamp()

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching logs:', error);
        }
    }
}