const {
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const BotProfile = require("../../../schemas/botProfileSchema");

module.exports = {
    name: "add-profile",
    description: "Ajoute ou met à jour un profil pour le bot",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,
    options: [
        {
            name: "name",
            description: "Le nom unique du profil",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "display-name",
            description: "Le nom d'affichage du bot",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "avatar",
            description: "L'URL de l'avatar",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "banner",
            description: "L'URL de la bannière",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "description",
            description: "La description du profil",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "accent-color",
            description: "La couleur d'accent (hex)",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    execute: async (client, interaction) => {
        await interaction.deferReply();

        const name = interaction.options.getString("name");
        const displayName = interaction.options.getString("display-name");
        const avatar = interaction.options.getString("avatar");
        const banner = interaction.options.getString("banner");
        const description = interaction.options.getString("description");
        const accentColor = interaction.options.getString("accent-color");

        try {
            let profile = await BotProfile.findOne({ name });

            if (profile) {
                // Mettre à jour le profil existant
                if (displayName) profile.displayName = displayName;
                if (avatar) profile.avatar = avatar;
                if (banner) profile.banner = banner;
                if (description) profile.description = description;
                if (accentColor) profile.accentColor = accentColor;
                
                await profile.save();
                await interaction.editReply({
                    content: `✅ Profil "${name}" mis à jour avec succès!`
                });
            } else {
                // Créer un nouveau profil
                profile = new BotProfile({
                    name,
                    displayName,
                    avatar,
                    banner,
                    description,
                    accentColor,
                    isActive: false
                });
                
                await profile.save();
                await interaction.editReply({
                    content: `✅ Profil "${name}" créé avec succès!`
                });
            }
        } catch (error) {
            console.error('Erreur lors de la création/mise à jour du profil:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue. ${error.message}`
            });
        }
    }
};
