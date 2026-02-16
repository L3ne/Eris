const {
  ApplicationCommandType,
  PermissionsBitField
} = require("discord.js");

module.exports = {
    name: "unlock",
    description: "Unlock a channel.",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['ManageChannels'],
    user_perms: ['ManageChannels'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    execute: async(client, interaction) => {
    
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
    SendMessages: true,
  });

  await interaction.reply({ content: "Le channel a été déverrouillé.", allowedMentions: { repliedUser: false }});

  }
}