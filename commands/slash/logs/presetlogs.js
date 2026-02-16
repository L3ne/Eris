const {
    ApplicationCommandType,
    PermissionsBitField,
    ChannelType,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle
} = require('discord.js');
const LogSettings = require('../../../schemas/logsSchema');

module.exports = {
    name: 'presetlogs',
    description: 'Configurer les logs pour différents événements',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],

    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        // Affichage de la confirmation
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_presetlogs')
            .setLabel('Confirmer')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_presetlogs')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({
            content: 'Êtes-vous sûr de vouloir configurer les logs ? Cette action supprimera les anciennes catégories et canaux existants.',
            components: [row],
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_presetlogs') {
                await i.deferUpdate();

                const guild = interaction.guild;

                // Rechercher la configuration existante
                let settings = await LogSettings.findOne({ guildId: guild.id });

                // Supprimer les anciennes catégories et canaux s'ils existent
                if (settings && settings.categoryId) {
                    const oldCategory = guild.channels.cache.get(settings.categoryId);
                    if (oldCategory) {
                        const childChannels = guild.channels.cache.filter(channel => channel.parentId === oldCategory.id);
                        for (const channel of childChannels.values()) {
                            await channel.delete().catch(console.error);
                        }
                        await oldCategory.delete().catch(console.error);
                    }
                }

                // Créer une nouvelle catégorie pour les logs
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

                // Créer les canaux de logs
                let count = 0;
                for (const [key, name] of Object.entries(logNames)) {
                    const channel = await guild.channels.create({
                        name,
                        type: ChannelType.GuildText,
                        parent: logCategory.id
                    });

                    logChannels[key] = { enabled: true, channelId: channel.id };

                    count++;
                    await interaction.editReply({ content: `Création des canaux de logs : ${count}/9`, ephemeral: true });
                }

                // Mettre à jour ou créer les paramètres
                if (!settings) {
                    settings = new LogSettings({
                        guildId: guild.id,
                        categoryId: logCategory.id,
                        logChannels
                    });
                } else {
                    settings.categoryId = logCategory.id;
                    settings.logChannels = logChannels;
                }

                await settings.save();

                await interaction.editReply({
                    content: 'Les canaux de logs ont été configurés avec succès et tous les logs sont activés.',
                    components: [],
                    ephemeral: true
                });
            } else if (i.customId === 'cancel_presetlogs') {
                await i.update({
                    content: 'Configuration des logs annulée.',
                    components: [],
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            await interaction.editReply({
                content: 'Confirmation expirée. Veuillez exécuter la commande à nouveau si nécessaire.',
                components: [],
                ephemeral: true
            });
        });
    }
};
