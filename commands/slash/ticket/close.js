const {
    ApplicationCommandType
} = require("discord.js");
const { closeTicket } = require("../../../utils/ticketUtils");

module.exports = {
    name: "ticket-close",
    description: "Ferme le ticket actuel",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['ManageChannels'],
    cooldown: 5000,

    execute: async (client, interaction) => {
        await interaction.deferReply();

        const result = await closeTicket(client, interaction, interaction.channelId, interaction.user.id);

        if (result.success) {
            await interaction.editReply({
                content: '✅ Ticket fermé avec succès. Le channel sera supprimé dans 5 minutes.'
            });
        } else {
            await interaction.editReply({
                content: `❌ ${result.message}`
            });
        }
    }
};
