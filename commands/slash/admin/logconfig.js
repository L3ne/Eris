const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const logsSchema = require('../../../schemas/logsSchema');

module.exports = {
    name: 'logs',
    description: 'Configure server logs',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: [PermissionFlagsBits.Administrator],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: 'status',
            description: 'View and modify log configuration',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'preset',
            description: 'Apply predefined log presets',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'type',
                    description: 'Choose a preset configuration',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        {
                            name: 'Full Logging',
                            value: 'full',
                        }
                    ]
                }
            ]
        }
    ],

    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'status':
                    await handleStatus(interaction, client);
                    break;
                case 'preset':
                    await handlePreset(interaction, client);
                    break;
                default:
                    await interaction.reply({
                        content: 'Invalid subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('LogConfig command error:', error);
            await interaction.reply({
                content: `An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

async function handleStatus(interaction, client) {
    const config = await logsSchema.findOne({ guildId: interaction.guild.id });
    
    if (!config) {
        const noConfigEmbed = new EmbedBuilder()
            .setTitle('Log Configuration Status')
            .setDescription('No log configuration found. Use `/logs preset` to configure logs.')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noConfigEmbed], ephemeral: true });
    }

    // Create log type select menu
    const logTypeSelect = new StringSelectMenuBuilder()
        .setCustomId('log-type-select')
        .setPlaceholder('Select a log type to modify')
        .addOptions(
            { label: 'Boost Logs', value: 'boost' },
            { label: 'Member Join', value: 'join' },
            { label: 'Member Leave', value: 'leave' },
            { label: 'Invite Logs', value: 'invite' },
            { label: 'Message Logs', value: 'message' },
            { label: 'Moderation Logs', value: 'mod' },
            { label: 'Voice Logs', value: 'voice' },
            { label: 'Emoji Logs', value: 'emojis' },
            { label: 'Role Logs', value: 'roles' }
        );

    const logTypeRow = new ActionRowBuilder().addComponents(logTypeSelect);

    // Create enable/disable select menu
    const statusSelect = new StringSelectMenuBuilder()
        .setCustomId('log-status-select')
        .setPlaceholder('Enable or disable logs')
        .addOptions(
            { label: 'Enable Selected', value: 'enable' },
            { label: 'Disable Selected', value: 'disable' }
        );

    const statusRow = new ActionRowBuilder().addComponents(statusSelect);

    // Create channel select menu
    const channelSelect = new StringSelectMenuBuilder()
        .setCustomId('log-channel-select')
        .setPlaceholder('Select a channel for logs')
        .addOptions(
            ...Array.from(interaction.guild.channels.cache
                .filter(channel => channel.type === 0) // Text channels only
                .values())
                .slice(0, 25) // Limit to 25 options max
                .map(channel => ({
                    label: channel.name,
                    description: `#${channel.name}`,
                    value: channel.id
                }))
        );

    const channelRow = new ActionRowBuilder().addComponents(channelSelect);

    const logTypes = Object.keys(config.logChannels);
    const enabledLogs = logTypes.filter(type => config.logChannels[type].enabled);
    const disabledLogs = logTypes.filter(type => !config.logChannels[type].enabled);

    const enabledList = enabledLogs.map(type => {
        const channel = interaction.guild.channels.cache.get(config.logChannels[type].channelId);
        return `Enabled **${type}**: ${channel ? `#${channel.name}` : 'Unknown channel'}`;
    }).join('\n') || 'None';

    const disabledList = disabledLogs.map(type => `Disabled **${type}**: Disabled`).join('\n') || 'None';

    const statusEmbed = new EmbedBuilder()
        .setTitle('Log Configuration Status')
        .setDescription(`Total Log Types: ${logTypes.length}\nEnabled: ${enabledLogs.length}\nDisabled: ${disabledLogs.length}`)
        .setColor(client.color)
        .addFields(
            { 
                name: 'Enabled Logs', 
                value: enabledList, 
                inline: false 
            },
            { 
                name: 'Disabled Logs', 
                value: disabledList, 
                inline: false 
            },
            {
                name: 'Instructions',
                value: '1. Select log type(s) to modify\n2. Select enable/disable\n3. Select a channel (if enabling)',
                inline: false
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [statusEmbed], components: [logTypeRow, statusRow, channelRow], ephemeral: true });

    // Handle interactions
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000
    });

    let selectedLogTypes = [];
    let selectedAction = null;
    let selectedChannel = null;

    collector.on('collect', async (i) => {
        await i.deferUpdate();

        if (i.customId === 'log-type-select') {
            selectedLogTypes = i.values;
            await i.followUp({ content: `Selected log types: ${selectedLogTypes.join(', ')}`, ephemeral: true });
        } else if (i.customId === 'log-status-select') {
            selectedAction = i.values[0];
            await i.followUp({ content: `Action: ${selectedAction}`, ephemeral: true });
        } else if (i.customId === 'log-channel-select') {
            selectedChannel = i.values[0];
            await i.followUp({ content: `Channel selected: <#${selectedChannel}>`, ephemeral: true });
        }

        // Apply changes if all selections are made
        if (selectedLogTypes.length > 0 && selectedAction && (selectedAction === 'disable' || selectedChannel)) {
            for (const logType of selectedLogTypes) {
                if (selectedAction === 'disable') {
                    config.logChannels[logType] = { enabled: false, channelId: null };
                } else {
                    config.logChannels[logType] = { enabled: true, channelId: selectedChannel };
                }
            }
            
            await config.save();
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('Configuration Updated')
                .setDescription(`Updated ${selectedLogTypes.length} log types`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'Action', value: selectedAction, inline: true },
                    { name: 'Log Types', value: selectedLogTypes.join(', '), inline: true },
                    { name: 'Channel', value: selectedChannel ? `<#${selectedChannel}>` : 'Disabled', inline: true }
                )
                .setTimestamp();

            await i.followUp({ embeds: [resultEmbed], ephemeral: true });
            
            // Reset selections
            selectedLogTypes = [];
            selectedAction = null;
            selectedChannel = null;
        }
    });

    collector.on('end', async () => {
        await interaction.editReply({ content: 'Configuration session ended.', components: [] });
    });
}

async function handlePreset(interaction, client) {
    const presetType = interaction.options.getString('type');
    
    let config = await logsSchema.findOne({ guildId: interaction.guild.id });
    if (!config) {
        config = new logsSchema({ guildId: interaction.guild.id });
    }

    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_preset')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_preset')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({
        content: 'Are you sure you want to apply the Full Logging preset? This will enable all log types and create channels.',
        components: [row],
        ephemeral: true
    });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_preset') {
            await i.deferUpdate();

            const guild = interaction.guild;

            // Delete old category and channels if they exist
            if (config && config.categoryId) {
                const oldCategory = guild.channels.cache.get(config.categoryId);
                if (oldCategory) {
                    const childChannels = Array.from(guild.channels.cache.filter(channel => channel.parentId === oldCategory.id).values());
                    for (const channel of childChannels.values()) {
                        await channel.delete().catch(console.error);
                    }
                    await oldCategory.delete().catch(console.error);
                }
            }

            // Create new category for logs
            const logCategory = await guild.channels.create({
                name: 'Server Logs',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            const logChannels = {};
            const logNames = {
                join: 'logs-join',
                leave: 'logs-leave',
                invite: 'logs-invite',
                boost: 'logs-boost',
                message: 'logs-message',
                mod: 'logs-mod',
                voice: 'logs-voice',
                emojis: 'logs-emojis',
                roles: 'logs-roles'
            };

            // Create log channels
            let count = 0;
            for (const [key, name] of Object.entries(logNames)) {
                const channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildText,
                    parent: logCategory.id
                });

                logChannels[key] = { enabled: true, channelId: channel.id };

                count++;
                await interaction.editReply({ content: `Creating log channels: ${count}/9`, ephemeral: true });
            }

            // Update or create settings
            if (!config) {
                config = new logsSchema({
                    guildId: guild.id,
                    categoryId: logCategory.id,
                    logChannels
                });
            } else {
                config.categoryId = logCategory.id;
                config.logChannels = logChannels;
            }

            await config.save();

            await interaction.editReply({
                content: 'Log channels have been configured successfully and all logs are enabled.',
                components: [],
                ephemeral: true
            });
        } else if (i.customId === 'cancel_preset') {
            await i.update({
                content: 'Log configuration cancelled.',
                components: [],
                ephemeral: true
            });
        }
    });

    collector.on('end', async () => {
        await interaction.editReply({
            content: 'Confirmation expired. Please run the command again if necessary.',
            components: [],
            ephemeral: true
        });
    });
}
