const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "lock",
    aliases: ["verrouiller"],
    description: "Verrouille le channel actuel",
    default_member_permissions: ['ManageChannels'],
    user_perms: ['ManageChannels'],
    bot_perms: ['ManageChannels'],
    cooldown: 2000,
    execute: async (client, message, args) => {
        const channel = message.channel;
        
        try {
            // Vérifier si le channel est déjà verrouillé
            const everyoneRole = message.guild.roles.everyone;
            const existingPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
            
            if (existingPerms && existingPerms.deny.has(PermissionsBitField.Flags.SendMessages)) {
                return message.reply({
                    content: "❌ Ce channel est déjà verrouillé.",
                    ephemeral: true
                });
            }

            // Verrouiller le channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle("🔒 Channel verrouillé")
                .setDescription(`Le channel **${channel.name}** a été verrouillé par **${message.author.tag}**`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors du verrouillage du channel:', error);
            return message.reply({
                content: "❌ Je n'ai pas pu verrouiller ce channel.",
                ephemeral: true
            });
        }
    }
}
