const {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} = require("discord.js");


module.exports = {
    name: "setname",
    description: "Change the bot's username.",
	type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "name",
            description: "New username for the bot.",
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

        const name = interaction.options.getString('name');
        
        try {
            await client.user.setUsername(name);
            await interaction.reply({ content: "Username changed successfully!", ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Failed to change username. Please make sure the name is valid and try again.", ephemeral: true });
        }
    }
};