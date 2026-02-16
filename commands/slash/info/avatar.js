const { Client, ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Montre l\'avatar d\'un utilisateur.',
    type: ApplicationCommandType.ChatInput,
    cooldown: 5000,
    options: [
        {
            name: "user",
            description: "Utilisateur à voir l'avatar.",
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply();

        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);

        const avatar = user.displayAvatarURL({ size: 4096 });
        const avatarServ = member.displayAvatarURL({ size: 4096 });

        if (member.avatar) {
            return await interaction.editReply({
                content: `Avatar de ${user}'s [avatar](${avatar}) and [server avatar](${avatarServ})`,
                allowedMentions: {
                    repliedUser: false
                }
            });
        }

        await interaction.editReply({ 
            content: `Avatar de ${user}'s [avatar](${avatar})` ,
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}