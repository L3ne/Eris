const {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} = require("discord.js");

module.exports = {
    name: "setavatar",
    type: ApplicationCommandType.ChatInput,
    description: "Change the bot's avatar.",
    options: [
        {
            name: "url",
            description: "URL of the new avatar image.",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    execute: async (client, interaction, args) => {

         const ownerId = '435068712786198538'; // Remplacez par votre ID Discord
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: "❌ Vous n'avez pas la permission d'exécuter cette commande.", ephemeral: true });
        }

        const url = interaction.options.getString('url');
        
        try {
            await client.user.setAvatar(url);
            await interaction.reply({ content: "Avatar changed successfully!", ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Failed to change avatar. Please make sure the URL is valid and try again.", ephemeral: true });
        }
    }
};