const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'avatar',
    description: 'Montre l\'avatar d\'un utilisateur.',
    aliases: ['pp', 'pfp'],
    cooldown: 1000,
    execute: async (client, message, args) => {

        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id);

        const avatar = user.displayAvatarURL({ size: 4096 });
        const avatarServ = member.displayAvatarURL({ size: 4096 });
        
        if (member.avatar) {
            return await message.reply({
                content: `Avatar de ${user}'s [avatar](${avatar}) and [server avatar](${avatarServ})`,
                allowedMentions: {
                    repliedUser: false
                }
            });
        }

        await message.reply({ 
            content: `Avatar de ${user}'s [avatar](${avatar})` ,
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}
