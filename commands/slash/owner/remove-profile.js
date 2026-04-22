const {
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const BotProfile = require("../../../schemas/botProfileSchema");

module.exports = {
    name: "remove-profile",
    description: "Supprime un profil du bot",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,
    options: [
        {
            name: "profile",
            description: "Le nom du profil à supprimer",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],

    autocomplete: async (client, interaction) => {
        const focusedValue = interaction.options.getFocused();
        const profiles = await BotProfile.find().sort({ name: 1 });

        const filtered = profiles.filter(profile =>
            profile.name.toLowerCase().includes(focusedValue.toLowerCase())
        ).slice(0, 25);

        await interaction.respond(
            filtered.map(profile => ({
                name: profile.name,
                value: profile.name
            }))
        );
    },

    execute: async (client, interaction) => {
        await interaction.deferReply();

        const profileName = interaction.options.getString("profile");

        try {
            const profile = await BotProfile.findOne({ name: profileName });

            if (!profile) {
                return await interaction.editReply({
                    content: `❌ Le profil "${profileName}" n'existe pas.`
                });
            }

            if (profile.isActive) {
                return await interaction.editReply({
                    content: `❌ Impossible de supprimer le profil actif "${profileName}". Veuillez d'abord activer un autre profil.`
                });
            }

            await BotProfile.deleteOne({ name: profileName });

            await interaction.editReply({
                content: `✅ Profil "${profileName}" supprimé avec succès!`
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du profil:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue. ${error.message}`
            });
        }
    }
};
