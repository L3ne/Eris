const {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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

    const embed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle('Ticket')
        .setThumbnail(channel.guild.iconURL())
        .setDescription('Pour créer un ticket réagissez avec 📩')
        .setFooter({ text: '1 ticket inutile = 1 séance de méditation d\'1 heure gratuite' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open')
                .setLabel('📩')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: `✅ Panel de tickets envoyé dans ${channel}`,
            ephemeral: true
        });
    }
};
