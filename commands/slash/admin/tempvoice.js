const {
    ApplicationCommandType,
    ApplicationCommandOptionType,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { TempVoiceConfig } = require('../../../schemas/tempVoiceSchema');

module.exports = {
    name: 'tempvoice',
    description: 'Gérez le système de salons vocaux temporaires',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: [PermissionFlagsBits.Administrator],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: 'setup',
            description: 'Configure le système TempVoice (crée la catégorie et le salon de création)',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'delete',
            description: 'Supprime la configuration TempVoice et les salons créés',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'info',
            description: 'Affiche la configuration actuelle du système TempVoice',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],

    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'setup':
                    await handleSetup(client, interaction);
                    break;
                case 'delete':
                    await handleDelete(client, interaction);
                    break;
                case 'info':
                    await handleInfo(client, interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Sous-commande invalide.', ephemeral: true });
            }
        } catch (error) {
            console.error('[TempVoice] Erreur commande:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ Une erreur est survenue : ${error.message}`, ephemeral: true });
            } else {
                await interaction.editReply({ content: `❌ Une erreur est survenue : ${error.message}` });
            }
        }
    }
};

// ─── Setup ────────────────────────────────────────────────────────────────────

async function handleSetup(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    const existing = await TempVoiceConfig.findOne({ guildId: guild.id });
    if (existing) {
        return interaction.editReply({
            content: '⚠️ Le système TempVoice est déjà configuré sur ce serveur. Utilisez `/tempvoice delete` pour supprimer la configuration existante avant de la reconfigurer.'
        });
    }

    // Créer la catégorie
    const category = await guild.channels.create({
        name: '🎙️ Salons Temporaires',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ]
            }
        ]
    });

    // Créer le salon "Join to Create"
    const joinChannel = await guild.channels.create({
        name: '➕ Rejoindre',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.ViewChannel
                ]
            }
        ]
    });

    // Sauvegarder dans MongoDB
    const config = new TempVoiceConfig({
        guildId: guild.id,
        joinChannelId: joinChannel.id,
        categoryId: category.id,
        defaultLimit: 0,
        defaultName: '🎙️ {username}'
    });
    await config.save();

    const embed = new EmbedBuilder()
        .setColor('#dac7bb')
        .setTitle('✅ TempVoice configuré avec succès !')
        .setDescription('Le système de salons vocaux temporaires est maintenant actif.\nRejoignez le salon **➕ Rejoindre** pour créer votre propre salon vocal.')
        .addFields(
            { name: '📁 Catégorie', value: `${category}`, inline: true },
            { name: '🔊 Salon de création', value: `${joinChannel}`, inline: true },
            { name: '👥 Limite par défaut', value: 'Illimitée', inline: true },
            { name: '📝 Nom par défaut', value: '🎙️ {username}', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'TempVoice System', iconURL: client.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function handleDelete(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const config = await TempVoiceConfig.findOne({ guildId: guild.id });

    if (!config) {
        return interaction.editReply({
            content: '❌ Aucune configuration TempVoice trouvée pour ce serveur.'
        });
    }

    // Supprimer le salon "Join to Create" s'il existe encore
    const joinChannel = guild.channels.cache.get(config.joinChannelId);
    if (joinChannel) await joinChannel.delete('Suppression TempVoice').catch(() => null);

    // Supprimer les éventuels salons restants dans la catégorie, puis la catégorie
    const category = guild.channels.cache.get(config.categoryId);
    if (category) {
        const children = guild.channels.cache.filter(c => c.parentId === category.id);
        for (const [, child] of children) {
            await child.delete('Suppression TempVoice').catch(() => null);
        }
        await category.delete('Suppression TempVoice').catch(() => null);
    }

    // Supprimer la configuration MongoDB
    await TempVoiceConfig.deleteOne({ guildId: guild.id });

    const embed = new EmbedBuilder()
        .setColor('#dac7bb')
        .setTitle('🗑️ TempVoice supprimé')
        .setDescription('La configuration TempVoice ainsi que tous les salons associés ont été supprimés.')
        .setTimestamp()
        .setFooter({ text: 'TempVoice System', iconURL: client.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
}

// ─── Info ─────────────────────────────────────────────────────────────────────

async function handleInfo(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const config = await TempVoiceConfig.findOne({ guildId: guild.id });

    if (!config) {
        return interaction.editReply({
            content: '❌ Aucune configuration TempVoice trouvée. Utilisez `/tempvoice setup` pour configurer le système.'
        });
    }

    const joinChannel = guild.channels.cache.get(config.joinChannelId);
    const category = guild.channels.cache.get(config.categoryId);

    const embed = new EmbedBuilder()
        .setColor('#dac7bb')
        .setTitle('ℹ️ Configuration TempVoice')
        .addFields(
            {
                name: '🔊 Canal de création',
                value: joinChannel ? `${joinChannel}` : `\`${config.joinChannelId}\` *(introuvable)*`,
                inline: true
            },
            {
                name: '📁 Catégorie',
                value: category ? `\`${category.name}\`` : `\`${config.categoryId}\` *(introuvable)*`,
                inline: true
            },
            {
                name: '👥 Limite par défaut',
                value: config.defaultLimit > 0 ? `${config.defaultLimit} membres` : 'Illimitée',
                inline: true
            },
            {
                name: '📝 Nom par défaut',
                value: `\`${config.defaultName}\``,
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({ text: 'TempVoice System', iconURL: client.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
}
