const {
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ActionRowBuilder,
    ApplicationCommandOptionType,
    StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
        name: 'clear',
        description: 'Permet de supprimer un certain nombre de messages.',
        type: ApplicationCommandType.ChatInput,
        default_member_permissions: ['Administrator'],
        user_perms: ['Administrator'],
        bot_perms: ['Administrator'],
        options: [
                {
                    name: 'amount',
                    description: 'Le nombre de messages que vous souhaitez supprimer.',
                    type: ApplicationCommandOptionType.Number,
                    minValue: 1,
                    maxValue: 100,
                    required: true
                },
                {
                    name: 'member',
                    description: 'Le membre dont vous souhaitez supprimer les messages.',
                    type: ApplicationCommandOptionType.User
                }
            ],

    execute: async(client, interaction) => {
        const amount = interaction.options.getNumber('amount');
        const member = interaction.options.getMember('member');

        const filteredMessages = (await interaction.channel.messages.fetch({ limit: amount }));

        const messages = member ? filteredMessages.filter((message) => message.author.id === member.user.id) : filteredMessages;

        interaction.channel.bulkDelete(messages).then(({ size }) => {
        
        const success = new EmbedBuilder()
        .setTitle('Success')
        .setColor(client.color)
        .setDescription(size ? `${size} message${size > 1 ? 's' : ''} ${member ? `de ${member} ` : ''}${size > 1 ? 'ont été supprimés' : 'a été supprimé'}.` : 'Je n\'ai pas pu supprimer de message.')
            interaction.reply({
                embeds: [success],
                ephemeral: true
            });
        })
        .catch(() => {

        const error = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Je n\'ai pas pu supprimer de message.')
            interaction.reply({
                embeds: [error],
                ephemeral: true
            });
        });
    }
}