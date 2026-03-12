const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'whitelist',
    description: 'Manage the bot whitelist',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: [PermissionFlagsBits.Administrator],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: 'add',
            description: 'Add a user to the whitelist',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user to add to the whitelist',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'remove',
            description: 'Remove a user from the whitelist',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user to remove from the whitelist',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'list',
            description: 'List all whitelisted users',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],

    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add':
                    await handleAdd(interaction, client);
                    break;
                case 'remove':
                    await handleRemove(interaction, client);
                    break;
                case 'list':
                    await handleList(interaction, client);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Invalid subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Whitelist command error:', error);
            await interaction.reply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

async function handleAdd(interaction, client) {
    const user = interaction.options.getUser('user');
    const result = await client.whitelistManager.addUser(user.id, user.tag, interaction.user.id);

    const embed = new EmbedBuilder()
        .setTitle(result.success ? '✅ User Added to Whitelist' : '⚠️ Already Whitelisted')
        .setDescription(
            result.success 
                ? `**${user.tag}** has been added to the whitelist.`
                : `**${user.tag}** is already in the whitelist.`
        )
        .addFields(
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Total Whitelisted', value: client.whitelistManager.getWhitelistSize().toString(), inline: true }
        )
        .setColor(result.success ? '#00ff00' : '#ffaa00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, client) {
    const user = interaction.options.getUser('user');
    const result = await client.whitelistManager.removeUser(user.id);

    const embed = new EmbedBuilder()
        .setTitle(result.success ? '✅ User Removed from Whitelist' : '⚠️ Not Whitelisted')
        .setDescription(
            result.success 
                ? `**${user.tag}** has been removed from the whitelist.`
                : `**${user.tag}** is not in the whitelist.`
        )
        .addFields(
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Total Whitelisted', value: client.whitelistManager.getWhitelistSize().toString(), inline: true }
        )
        .setColor(result.success ? '#00ff00' : '#ffaa00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction, client) {
    const whitelistedUsers = await client.whitelistManager.getWhitelistedUsers();
    
    if (whitelistedUsers.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('Whitelist')
            .setDescription('No users are currently whitelisted.')
            .setColor(client.color)
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed] });
    }

    const userDetails = whitelistedUsers.map(user => {
        const addedDate = new Date(user.addedAt).toLocaleDateString();
        return `• **<@${user.userId}>** (\`${user.userId}\`) - Added: ${addedDate}`;
    });

    const embed = new EmbedBuilder()
        .setTitle('Whitelist')
        .setDescription(`**${whitelistedUsers.length}** users are currently whitelisted:\n\n${userDetails.join('\n')}`)
        .setColor(client.color)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
