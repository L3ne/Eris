const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Level = require('../../../schemas/levelSchema');
const XPUtils = require('../../../utils/xpUtils');
const { Profile } = require('discord-arts');

module.exports = {
    name: 'rank',
    description: 'Affiche votre niveau et votre XP',
    type: 1,
    cooldown: 3000,
    options: [
        {
            name: 'utilisateur',
            description: 'L\'utilisateur dont vous voulez voir le rang',
            type: 6,
            required: false
        }
    ],
    async execute(client, interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('utilisateur') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.editReply('❌ Utilisateur introuvable.');
        }

        try {
            const levelData = await Level.findOne({ 
                guildId: interaction.guild.id, 
                userId: user.id 
            });

            if (!levelData) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle(`Rang de ${user.username}`)
                    .setDescription('Cet utilisateur n\'a pas encore d\'XP.')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const xpInfo = XPUtils.formatXP(levelData.xp, levelData.level);
            const rank = await Level.countDocuments({ 
                guildId: interaction.guild.id, 
                xp: { $gt: levelData.xp } 
            }) + 1;
            
            console.log(`📊 Rang de ${user.username}: XP=${levelData.xp}, Level=${levelData.level}, Rank=${rank}`);
            console.log(`📈 XP Info: current=${xpInfo.current}, needed=${xpInfo.needed}, progress=${xpInfo.progress}%`);

            // Créer la rank card
            const rankCard = await new Profile(user.id, {
               removeBadges: true,
               customFont: "Arial",
               customDate: new Date(),
               moreBackgroundBlur: true,
               rankData: {
                    currentXp: xpInfo.current,
                    requiredXp: xpInfo.needed,
                    level: levelData.level,
                    rank: rank,
                    barColor: '#fcdce1',
                    levelColor: '#ada8c6',
                    autoColorRank: true,
                }, 
            });

            // Envoyer uniquement la rank card
            await interaction.editReply({ 
                files: [{ 
                    attachment: rankCard, 
                    name: 'rank.png' 
                }]
            });

        } catch (error) {
            console.error('Erreur commande rank:', error);
            interaction.editReply('❌ Une erreur est survenue lors de l\'affichage du rang.');
        }
    }
};
