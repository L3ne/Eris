const {
    ApplicationCommandType
} = require("discord.js");
const { EmbedBuilder } = require('discord.js');
const BotProfile = require("../../../schemas/botProfileSchema");

module.exports = {
    name: "list-profiles",
    description: "Liste tous les profils du bot",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,

    execute: async (client, interaction) => {
        await interaction.deferReply();

        try {
            const profiles = await BotProfile.find().sort({ isActive: -1, name: 1 });

            if (profiles.length === 0) {
                return await interaction.editReply({
                    content: "❌ Aucun profil n'existe. Utilisez `/add-profile` pour en créer un."
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Profils du Bot')
                .setColor(client.color || '#00ff00')
                .setTimestamp();

            profiles.forEach(profile => {
                const status = profile.isActive ? '✅ Actif' : '⬜ Inactif';
                embed.addFields({
                    name: `${status} ${profile.name}`,
                    value: `Display: ${profile.displayName || 'Non défini'}\nAvatar: ${profile.avatar ? '✓' : '✗'}\nBanner: ${profile.banner ? '✓' : '✗'}\nCouleur: ${profile.accentColor || 'Non définie'}`,
                    inline: false
                });
            });

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Erreur lors de la liste des profils:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue. ${error.message}`
            });
        }
    }
};
