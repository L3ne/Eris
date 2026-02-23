const { ApplicationCommandType } = require("discord.js");

module.exports = {
    name: "Avatar",
    type: ApplicationCommandType.User,
    
    execute: async (client, interaction) => {

        await interaction.deferReply({ }).catch(err => console.log(err))

        const avatar = interaction.options.getUser('user').displayAvatarURL({ size: 4096 })
        const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id)
        const avatarServ = member.displayAvatarURL({ size: 4096 })

        if(member.avatar) {
            return interaction.editReply({ content: `Avatar de ${interaction.options.getUser('user').username}'s [avatar](${avatar}) and [server avatar](${avatarServ})` })
        }

        interaction.editReply({ content: `Avatar de ${interaction.options.getUser('user').username}'s [avatar](${avatar})` })
    }
}