const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(client, role) {

        const logSettings = await LogSettings.findOne({ guildId: role.guild.id });
        if (!logSettings || !logSettings.logChannels.roles || !logSettings.logChannels.roles.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.roles.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
        .setColor(role.hexColor) 
        .setTitle('ROLE DELETED')
        .addFields(
            { name: 'ROLE', value: role.name, inline: true },
            { name: 'ROLEID', value: role.id, inline: true },
            { name: 'HEXCOLOR', value: role.hexColor, inline: true },
            { name: 'POSITION', value: role.position.toString(), inline: true }
        )
        .setThumbnail(role.guild.iconURL({ dynamic: true }) || null)    
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
        .setTimestamp();


    logChannel.send({ embeds: [embed] });
    }
}