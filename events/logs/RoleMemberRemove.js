const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(client, oldMember, newMember) {

        const logSettings = await LogSettings.findOne({ guildId: oldMember.guild.id });
        if (!logSettings || !logSettings.logChannels.roles || !logSettings.logChannels.roles.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.roles.channelId);
        if (!logChannel) return;

    const removedRole = oldMember.roles.cache.find(role => !newMember.roles.cache.has(role.id));

    if (removedRole) {

        const embed = new EmbedBuilder()
            .setColor(removedRole.hexColor) 
            .setTitle('ROLE REMOVED')
            .addFields(
                { name: 'Member', value: `<@${newMember.id}>`, inline: true },
                { name: 'Member ID', value: newMember.id, inline: true },
                { name: 'Role Removed', value: `<@&${removedRole.id}>`, inline: true },
                { name: 'Role ID', value: removedRole.id, inline: true },
                { name: 'Total User Roles', value: newMember.roles.cache.size.toString(), inline: true }
            )
            .setThumbnail(newMember.displayAvatarURL() || null)      
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
            .setTimestamp();


        logChannel.send({ embeds: [embed] });
        }
    }
}