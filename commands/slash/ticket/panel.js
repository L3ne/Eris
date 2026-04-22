const {
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const { createTicketPanel } = require("../../../utils/ticketUtils");

module.exports = {
    name: "ticket-panel",
    description: "Crée le panel de création de tickets",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,
    options: [
        {
            name: "channel",
            description: "Le channel où envoyer le panel",
            type: ApplicationCommandOptionType.Channel,
            required: false
        }
    ],

    execute: async (client, interaction) => {
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        const { embed, components } = createTicketPanel(client);

        await channel.send({
            embeds: [embed],
            components: components
        });

        await interaction.reply({
            content: `✅ Panel de tickets envoyé dans ${channel}`,
            ephemeral: true
        });
    }
};
