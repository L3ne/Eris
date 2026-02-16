const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(client, oldMember, newMember) {

        const logSettings = await LogSettings.findOne({ guildId: oldMember.guild.id });
        if (!logSettings || !logSettings.logChannels.roles || !logSettings.logChannels.roles.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.roles.channelId);
        if (!logChannel) return;

        const addedRole = newMember.roles.cache.find(role => !oldMember.roles.cache.has(role.id));


        if (addedRole) {


        const embed = new EmbedBuilder()
            .setColor(addedRole.hexColor) 
            .setTitle('ROLE ADDED')
            .addFields(
                { name: 'Member', value: `<@${newMember.id}>`, inline: true },
                { name: 'Member ID', value: newMember.id, inline: true },
                { name: 'Role Added', value: `<@&${addedRole.id}>`, inline: true },
                { name: 'Role ID', value: addedRole.id, inline: true },
                { name: 'Total User Roles', value: newMember.roles.cache.size.toString(), inline: true }
            )
            .setThumbnail(newMember.displayAvatarURL() || null)   
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
            .setTimestamp(); 


        logChannel.send({ embeds: [embed] });
        }
    }
}