const {
    ApplicationCommandType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');
const LogSettings = require('../../../schemas/logsSchema');

module.exports = {
    name: 'statuslogs',
    description: 'Gérer les états des logs (activer/désactiver).',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],

    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        let settings = await LogSettings.findOne({ guildId: guild.id });

        if (!settings) {
            return interaction.editReply({
                content: "Aucune configuration de logs n'a été trouvée pour ce serveur. Veuillez d'abord configurer les logs avec `/presetlogs`. ",
                ephemeral: true
            });
        }

        const logOptions = [
            { label: 'Member Join', value: 'join', description: 'Logs pour les arrivées des membres.' },
            { label: 'Member Leave', value: 'leave', description: 'Logs pour les départs des membres.' },
            { label: 'Invite Logs', value: 'invite', description: 'Logs pour les invitations.' },
            { label: 'Boost Logs', value: 'boost', description: 'Logs pour les boosts du serveur.' },
            { label: 'Message Logs', value: 'message', description: 'Logs pour les messages (supprimés/édités).' },
            { label: 'Moderation Logs', value: 'mod', description: 'Logs pour les actions de modération.' },
            { label: 'Voice Logs', value: 'voice', description: 'Logs pour les activités vocales.' },
            { label: 'Emojis Logs', value: 'emojis', description: 'Logs pour les changements d’émojis.' },
            { label: 'Roles Logs', value: 'roles', description: 'Logs pour les changements de rôles.' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('Gestion des logs du serveur')
            .setDescription(
                logOptions
                    .map(option => {
                        const status = settings.logChannels[option.value]?.enabled ? '✅ Activé' : '❌ Désactivé';
                        return `**${option.label}**: ${status}`;
                    })
                    .join('\n')
            )
            .setColor('#0099ff');

        const menu = new StringSelectMenuBuilder()
            .setCustomId('log_status_menu')
            .setPlaceholder('Sélectionnez les logs à activer/désactiver')
            .setMinValues(1)
            .setMaxValues(logOptions.length)
            .addOptions(logOptions.map(option => ({
                label: option.label,
                value: option.value,
                description: option.description
            })));

        const disableAllButton = new ButtonBuilder()
            .setCustomId('disable_all_logs')
            .setLabel('Tout désactiver')
            .setStyle(ButtonStyle.Danger);

        const enableAllButton = new ButtonBuilder()
            .setCustomId('enable_all_logs')
            .setLabel('Tout activer')
            .setStyle(ButtonStyle.Success);

        const rowMenu = new ActionRowBuilder().addComponents(menu);
        const rowButton = new ActionRowBuilder().addComponents(enableAllButton, disableAllButton);

        await interaction.editReply({
            embeds: [embed],
            components: [rowMenu, rowButton],
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });  // Délai prolongé à 60 secondes

        collector.on('collect', async i => {
            if (i.customId === 'log_status_menu') {
                const selected = i.values;

                logOptions.forEach(option => {
                    settings.logChannels[option.value] = {
                        ...settings.logChannels[option.value],
                        enabled: selected.includes(option.value)
                    };
                });

                await settings.save();

                embed.setDescription(
                    logOptions
                        .map(option => {
                            const status = settings.logChannels[option.value]?.enabled ? '✅ Activé' : '❌ Désactivé';
                            return `**${option.label}**: ${status}`;
                        })
                        .join('\n')
                );

                await i.update({
                    embeds: [embed],
                    content: 'Les états des logs ont été mis à jour.',
                    components: [rowMenu, rowButton]
                });
            }

            if (i.customId === 'disable_all_logs') {
                logOptions.forEach(option => {
                    settings.logChannels[option.value] = {
                        ...settings.logChannels[option.value],
                        enabled: false
                    };
                });

                await settings.save();

                embed.setDescription(
                    logOptions
                        .map(option => `**${option.label}**: ❌ Désactivé`)
                        .join('\n')
                );

                await i.update({
                    embeds: [embed],
                    content: 'Tous les logs ont été désactivés avec succès.',
                    components: [rowMenu, rowButton]
                });
            }

            if (i.customId === 'enable_all_logs') {
                logOptions.forEach(option => {
                    settings.logChannels[option.value] = {
                        ...settings.logChannels[option.value],
                        enabled: true
                    };
                });

                await settings.save();

                embed.setDescription(
                    logOptions
                        .map(option => `**${option.label}**: ✅ Activé`)
                        .join('\n')
                );

                await i.update({
                    embeds: [embed],
                    content: 'Tous les logs ont été activés avec succès.',
                    components: [rowMenu, rowButton]
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({
                content: 'Commande expirée.',
                components: []
            });
        });
    }
};
