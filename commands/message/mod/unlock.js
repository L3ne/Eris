const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "unlock",
    aliases: ["deverrouiller"],
    description: "Déverrouille le channel actuel",
    default_member_permissions: ['ManageChannels'],
    user_perms: ['ManageChannels'],
    bot_perms: ['ManageChannels'],
    cooldown: 2000,
    execute: async (client, message, args) => {
        const channel = message.channel;
        
        try {
            // Vérifier si le channel est déjà déverrouillé
            const everyoneRole = message.guild.roles.everyone;
            const existingPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
            
            if (!existingPerms || !existingPerms.deny.has(PermissionsBitField.Flags.SendMessages)) {
                return message.reply({
                    content: "❌ Ce channel n'est pas verrouillé.",
                    ephemeral: true
                });
            }

            // Déverrouiller le channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle("🔓 Channel déverrouillé")
                .setDescription(`Le channel **${channel.name}** a été déverrouillé par **${message.author.tag}**`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors du déverrouillage du channel:', error);
            return message.reply({
                content: "❌ Je n'ai pas pu déverrouiller ce channel.",
                ephemeral: true
            });
        }
    }
}
