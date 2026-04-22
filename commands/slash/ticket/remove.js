const {
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const { removeMemberFromTicket } = require("../../../utils/ticketUtils");

module.exports = {
    name: "ticket-remove",
    description: "Retire un membre du ticket",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['ManageChannels'],
    cooldown: 5000,
    options: [
        {
            name: "user",
            description: "L'utilisateur à retirer",
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, interaction) => {
        await interaction.deferReply();

        const user = interaction.options.getUser("user");

        const result = await removeMemberFromTicket(client, interaction, interaction.channelId, user.id);

        if (result.success) {
            await interaction.editReply({
                content: `✅ ${user} a été retiré du ticket.`
            });
        } else {
            await interaction.editReply({
                content: `❌ ${result.message}`
            });
        }
    }
};
