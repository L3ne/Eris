const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
            
            // Mesurer le temps de réponse de l'API Discord
            const apiLatency = Math.round(client.ws.ping);
            
            // Mesurer le temps de réponse du bot
            const botLatency = Date.now() - startTime;
            
            // Obtenir le temps de réponse de la base de données si disponible
            let dbLatency = 'N/A';
            try {
                const dbStart = Date.now();
                // Test simple de connexion à la base de données
                await require('../../schemas/levelSettingsSchema').findOne({ guildId: 'test' }).catch(() => {});
                dbLatency = `${Date.now() - dbStart}ms`;
            } catch (error) {
                dbLatency = 'Erreur';
            }

            const embed = new EmbedBuilder()
                .setColor(client.color || '#0099ff')
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
                        name: 'Latence Base de Données',
                        value: `**${dbLatency}**`,
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
            let statusColor = '#00ff00';
            
            if (apiLatency > 500 || botLatency > 500) {
                status = 'Mauvais';
                statusColor = '#ff0000';
            } else if (apiLatency > 200 || botLatency > 200) {
                status = 'Moyen';
                statusColor = '#ffff00';
            }

            embed.addFields({
                name: 'État de Connexion',
                value: status,
                inline: false
            });

            embed.setColor(statusColor);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans la commande ping:', error);
            await interaction.editReply('❌ Une erreur est survenue lors de la mesure de la latence.');
        }
    }
};
