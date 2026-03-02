const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    name: 'ping',
    description: 'Affiche la latence du bot',
    type: 1,
    cooldown: 3000,
    options: [],
    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const startTime = Date.now();
            
            const apiLatency = Math.round(client.ws.ping);
            
            const botLatency = Date.now() - startTime;

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle('Pong!')
                .setDescription('Voici les latences actuelles du bot:')
                .addFields(
                    {
                        name: 'Latence Bot',
                        value: `**${botLatency}ms**`,
                        inline: true
                    },
                    {
                        name: 'Latence API Discord',
                        value: `**${apiLatency}ms**`,
                        inline: true
                    },
                    {
                        name: 'Base de Données',
                        value: `jsp lv`,
                        inline: true
                    }
                )
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Demandé par ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Déterminer la couleur en fonction de la latence
            let status = 'Excellent';
            
            if (apiLatency > 500 || botLatency > 500) {
                status = 'Mauvais';
            } else if (apiLatency > 200 || botLatency > 200) {
                status = 'Moyen';
            }

            embed.addFields({
                name: 'État de Connexion',
                value: status,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans la commande ping:', error);
            await interaction.editReply('❌ Une erreur est survenue lors de la mesure de la latence.');
        }
    }
};
