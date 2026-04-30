const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "renew",
    aliases: ["clone", "nuke"],
    description: "Renouvelle le channel actuel (clone et supprime)",
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator', 'ManageChannels'],
    cooldown: 5000,
    execute: async (client, message, args) => {
        const channel = message.channel;
        
        // Vérifier que c'est un channel textuel
        if (!channel.isTextBased() || channel.type === ChannelType.DM) {
            return message.reply({
                content: "❌ Cette commande ne peut être utilisée que dans un channel serveur.",
                ephemeral: true
            });
        }

        // Créer un embed de confirmation
        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle("Renouvellement du channel")
            .setDescription(`Êtes-vous sûr de vouloir renouveler **${channel.name}** ?\n\nCela va:\n- Cloner le channel\n- Supprimer l'ancien channel\n- Conserver les permissions et la position`)
            .setFooter({ text: "Cette action est irréversible" });

        const reply = await message.reply({ 
            embeds: [embed],
            fetchReply: true 
        });

        // Ajouter les réactions pour confirmation
        await reply.react('✅');
        await reply.react('❌');

        // Collector pour les réactions
        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        };

        const collector = reply.createReactionCollector({
            filter,
            time: 15000, // 15 secondes
            max: 1
        });

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === '✅') {
                try {
                    // Cloner le channel
                    const newChannel = await channel.clone({
                        name: channel.name,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        rateLimitPerUser: channel.rateLimitPerUser,
                        position: channel.position,
                        permissionOverwrites: channel.permissionOverwrites.cache,
                        parent: channel.parent, // Catégorie
                        reason: `Renouvellement par ${message.author.tag}`
                    });

                    // Envoyer un message de confirmation dans le nouveau channel
                    const confirmEmbed = new EmbedBuilder()
                        .setColor(client.color)
                        .setTitle("✅ Channel renouvelé")
                        .setDescription(`Channel renouvelé avec succès par **${message.author.tag}**`)
                        .setTimestamp();

                    await newChannel.send({ embeds: [confirmEmbed] });

                    // Supprimer l'ancien channel
                    await channel.delete(`Renouvellement par ${message.author.tag}`);

                } catch (error) {
                    console.error('Erreur lors du renouvellement du channel:', error);
                    await message.reply({
                        content: "❌ Une erreur est survenue lors du renouvellement du channel.",
                        ephemeral: true
                    });
                }
            } else {
                // Annulation
                await reply.edit({
                    content: "❌ Renouvellement annulé.",
                    embeds: []
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await reply.edit({
                    content: "⏰ Temps écoulé. Renouvellement annulé.",
                    embeds: []
                });
            }
        });
    }
}
