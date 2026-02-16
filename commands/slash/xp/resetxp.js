const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Level = require('../../../schemas/levelSchema');
const XPUtils = require('../../../utils/xpUtils');

module.exports = {
    name: 'resetxp',
    description: 'Réinitialise l\'XP d\'un membre',
    type: 1,
    cooldown: 2000,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: 'utilisateur',
            description: 'L\'utilisateur dont vous voulez réinitialiser l\'XP',
            type: 6,
            required: true
        },
        {
            name: 'raison',
            description: 'La raison de la réinitialisation',
            type: 3,
            required: false
        }
    ],
    async execute(client, interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!member) {
                return interaction.editReply('❌ Utilisateur introuvable sur le serveur.');
            }

            const existingData = await Level.findOne({ 
                guildId: interaction.guild.id, 
                userId: user.id 
            });

            if (!existingData) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚠️ Réinitialisation d\'XP')
                    .setDescription(`${user.toString()} n'a pas d'XP à réinitialiser.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            await XPUtils.resetXP(interaction.guild.id, user.id);

            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🔄 XP Réinitialisé')
                .setDescription(`L'XP de ${user.toString()} a été réinitialisé.`)
                .addFields(
                    { 
                        name: '📊 Anciennes statistiques', 
                        value: `Niveau: ${existingData.level}\nXP: ${existingData.xp.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '👤 Modérateur', 
                        value: interaction.user.toString(), 
                        inline: true 
                    },
                    { 
                        name: '📝 Raison', 
                        value: reason, 
                        inline: false 
                    }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

            try {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🔄 XP Réinitialisé')
                    .setDescription(`L'XP d'un membre a été réinitialisé.`)
                    .addFields(
                        { name: 'Membre', value: `${user.toString()} (${user.id})`, inline: true },
                        { name: 'Modérateur', value: `${interaction.user.toString()} (${interaction.user.id})`, inline: true },
                        { name: 'Raison', value: reason, inline: false },
                        { name: 'Ancien niveau', value: existingData.level.toString(), inline: true },
                        { name: 'Ancien XP', value: existingData.xp.toLocaleString(), inline: true }
                    )
                    .setTimestamp();

            } catch (logError) {
                console.error('Erreur lors de l\'envoi des logs:', logError);
            }

        } catch (error) {
            console.error('Erreur commande resetxp:', error);
            interaction.editReply('❌ Une erreur est survenue lors de la réinitialisation de l\'XP.');
        }
    }
};
