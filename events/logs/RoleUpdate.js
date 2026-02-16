const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, Events, PermissionsBitField } = require("discord.js");

module.exports = {
name: Events.GuildRoleUpdate,
    async execute(client, oldRole, newRole) {

    const logSettings = await LogSettings.findOne({ guildId: oldRole.guild.id });
    if (!logSettings || !logSettings.logChannels.roles || !logSettings.logChannels.roles.enabled) return;
    
    const logChannel = client.channels.cache.get(logSettings.logChannels.roles.channelId);
    if (!logChannel) return;

    let descriptionText = '';


    if (oldRole.hexColor !== newRole.hexColor) {
        descriptionText += `**Color:** Changed from \`${oldRole.hexColor.toUpperCase()}\` to \`${newRole.hexColor.toUpperCase()}\`\n`;
    }


    const oldPerms = new PermissionsBitField(oldRole.permissions);
    const newPerms = new PermissionsBitField(newRole.permissions);
    const addedPerms = newPerms.remove(oldPerms).toArray();
    const removedPerms = oldPerms.remove(newPerms).toArray();

    if (addedPerms.length > 0 || removedPerms.length > 0) {
        descriptionText += '**Permissions:**\n';
        if (addedPerms.length > 0) {
            descriptionText += `Added: \`${addedPerms.join('`, `')}\`\n`;
        }
        if (removedPerms.length > 0) {
            descriptionText += `Removed: \`${removedPerms.join('`, `')}\`\n`;
        }
    }


    if (descriptionText !== '') {
        const embed = new EmbedBuilder()
            .setColor(newRole.hexColor) 
            .setTitle(`ROLE UPDATED: "${newRole.name}"`)
            .setDescription(descriptionText)
            .addFields({ name: 'Role ID', value: `\`${newRole.id}\``, inline: false })
            .setTimestamp()
            .setThumbnail(oldRole.guild.iconURL({ dynamic: true }) || null)    
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
            .setTimestamp(); 
        logChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
}