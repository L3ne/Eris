const {
    EmbedBuilder,
    ActionRowBuilder,
    ApplicationCommandOptionType,
    AttachmentBuilder,
	ApplicationCommandType,
} = require("discord.js");

module.exports = {
    name: "snipe",
    description: "Voir le dernier message supprimé du salon.",
	type: ApplicationCommandType.ChatInput,
    
    execute: async (client, interaction) => {

    const msg = client.snipes.get(interaction.channel.id)
    if(!msg) return interaction.channel.send("Aucun message à snipe")

    const embed = new EmbedBuilder()
    .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL({dynamic : true })})
    .setDescription(msg.content || null)
    .setColor(client.color)
    .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
    .setTimestamp()
    if(msg.image)embed.setImage(msg.image)

    
    interaction.reply({ embeds: [embed],
        allowedMentions: {
            repliedUser: false
        }
        })
    }
}