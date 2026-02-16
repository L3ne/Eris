const {
	PermissionsBitField,
    ApplicationCommandType,
} = require("discord.js");

module.exports = {
    name: "lock",
    description: "Vérrouillé un channel.",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['ManageChannels'],
    user_perms: ['ManageChannels'],
    bot_perms: ['Administrator'],
    cooldown: 1000,

execute: async(client, interaction) => {

    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
        SendMessages: false,
    });

    await interaction.reply({ content: "Le channel a été vérrouillé.",
        allowedMentions: {
            repliedUser: false
        }});
    }
}