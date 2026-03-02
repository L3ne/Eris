const { Client, Interaction, ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'unmute',
  description: 'Retirer le mute à un utilisateur.',
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: ['ManageChannels'],
  user_perms: ['ManageChannels'],
  bot_perms: ['Administrator'],
  options: [
    {
      name: 'user',
      description: 'Le membre à retirer le mute.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'La raisons du unmute.',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  execute: async (client, interaction) => {
    const mentionable = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetUser = await interaction.guild.members.fetch(mentionable);
    if (!targetUser) {
      await interaction.reply({ content: "That user doesn't exist in this server.", ephemeral: true });
      return;
    }

    if (!targetUser.isCommunicationDisabled()) {
      await interaction.reply({ content: "That user is not timed out.", ephemeral: true });
      return;
    }

    if (targetUser.user.bot) {
      await interaction.reply({ content: "You can't untimeout a bot.", ephemeral: true });
      return;
    }

    // Vérification des rôles
    if (interaction.user.id !== interaction.guild.ownerId) {
      const targetUserRolePosition = targetUser.roles.highest.position;
      const requestUserRolePosition = interaction.member.roles.highest.position;
      const botRolePosition = interaction.guild.members.me.roles.highest.position;

      if (targetUserRolePosition >= requestUserRolePosition) {
        await interaction.reply({
          content: "You can't untimeout that user because they have the same or higher role than you.",
          ephemeral: true,
        });
        return;
      }

      if (targetUserRolePosition >= botRolePosition) {
        await interaction.reply({
          content: "I can't untimeout that user because they have the same or higher role than me.",
          ephemeral: true,
        });
        return;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('Timeout Removed')
      .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: 'User', value: `${targetUser} (\`${targetUser.user?.tag}\`)`, inline: false },
        { name: 'Reason', value: `${reason}`, inline: false }
      )
      .setTimestamp();

    try {
      await targetUser.timeout(null, reason); // Passer `null` pour enlever le timeout
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`There was an error when removing the timeout: ${error}`);
      await interaction.reply({ content: "An error occurred while removing the timeout.", ephemeral: true });
    }
  },
};