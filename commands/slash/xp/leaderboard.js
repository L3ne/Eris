const { EmbedBuilder } = require('discord.js');
const Level = require('../../../schemas/levelSchema');
const XPUtils = require('../../../utils/xpUtils');

module.exports = {
    name: 'leaderboard',
    description: 'Affiche le classement des 10 meilleurs membres',
    type: 1,
    cooldown: 5000,
    options: [],

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const topUsers = await Level.find({
                guildId: interaction.guild.id
            })
                .sort({ xp: -1 })
                .limit(10);

            if (!topUsers.length) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF6B6B')
                            .setTitle('🏆 Classement du serveur')
                            .setDescription('Aucun membre n\'a encore gagné d\'XP.')
                            .setTimestamp()
                    ]
                });
            }

            let leaderboard = '';
            let rank = 1;

            for (const userData of topUsers) {
                const member = await interaction.guild.members
                    .fetch(userData.userId)
                    .catch(() => null);

                if (!member) continue;

                const xpInfo = XPUtils.formatXP(userData.xp, userData.level);

                const medal =
                    rank === 1 ? '🥇' :
                    rank === 2 ? '🥈' :
                    rank === 3 ? '🥉' :
                    `\`${rank}.\``;

                leaderboard += `${medal} <@${member.user.id}>\n`;
                leaderboard += `> Niveau **${userData.level}** • ${userData.xp.toLocaleString()} XP\n`;
                leaderboard += `> Progression: **${xpInfo.progress.toFixed(1)}%** vers niveau ${userData.level + 1}\n\n`;

                rank++;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🏆 Classement de ${interaction.guild.name}`)
                .setDescription(leaderboard || 'Aucun membre valide trouvé.')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({
                    text: `Demandé par ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur leaderboard:', error);

            return interaction.editReply({
                content: '❌ Une erreur est survenue lors de l\'affichage du classement.'
            });
        }
    }
};
