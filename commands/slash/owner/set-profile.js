const {
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const BotProfile = require("../../../schemas/botProfileSchema");

module.exports = {
    name: "set-profile",
    description: "Change le profil actuel du bot",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,
    options: [
        {
            name: "profile",
            description: "Le nom du profil à activer",
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

            // Désactiver tous les profils actifs
            await BotProfile.updateMany({}, { isActive: false });

            // Activer le profil sélectionné
            profile.isActive = true;
            await profile.save();

            // Appliquer les changements au bot
            if (profile.displayName) {
                await client.user.setUsername(profile.displayName);
            }

            if (profile.avatar) {
                await client.user.setAvatar(profile.avatar);
            }

            if (profile.banner) {
                await client.user.setBanner(profile.banner);
            }

            if (profile.accentColor) {
                // Discord API ne supporte pas setAccentColor directement, mais peut être utilisé dans les embeds
                client.color = profile.accentColor;
            }

            await interaction.editReply({
                content: `✅ Profil "${profileName}" activé avec succès!`
            });

        } catch (error) {
            console.error('Erreur lors du changement de profil:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue lors du changement de profil. ${error.message}`
            });
        }
    }
};
