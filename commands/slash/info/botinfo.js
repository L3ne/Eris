const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    name: 'botinfo',
    description: 'Affiche les informations du bot',
    type: 1,
    cooldown: 3000,
    options: [],
    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const guildCount = client.guilds.cache.size;
            const userCount = client.users.cache.size;
            const channelCount = client.channels.cache.size;
            const nodeVersion = process.version;
            const discordJSVersion = require('discord.js').version;
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

            const embed = new EmbedBuilder()
                .setColor(client.color || '#0099ff')
                .setTitle(`Informations de ${client.user.username}`)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: 'Statistiques',
                        value: [
                            `**Serveurs:** ${guildCount}`,
                            `**Utilisateurs:** ${userCount}`,
                            `**Salons:** ${channelCount}`,
                            `**Uptime:** <t:${Math.floor(client.uptime / 1000)}:D>`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Système',
                        value: [
                            `**Node.js:** ${nodeVersion}`,
                            `**Discord.js:** v${discordJSVersion}`,
                            `**Plateforme:** ${os.type()} ${os.release()}`,
                            `**Architecture:** ${os.arch()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Mémoire',
                        value: [
                            `**Utilisée:** ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                            `**Total:** ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                            `**Système:** ${memoryUsagePercent}%`,
                            `**RSS:** ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Propriétaire',
                        value: `<@435068712786198538>`,
                        inline: true
                    },
                    {
                        name: 'Créé le',
                        value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`,
                        inline: true
                    },
                    {
                        name: 'Version',
                        value: `v1.1.2`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Demandé par ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans la commande botinfo:', error);
            await interaction.editReply('❌ Une erreur est survenue lors de l\'affichage des informations du bot.');
        }
    }
};
