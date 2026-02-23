const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const LevelSettings = require('../../../schemas/levelSettingsSchema');

module.exports = {
    name: 'setxp',
    description: 'Configure les paramètres du système d\'XP',
    type: 1,
    cooldown: 2000,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: 'message_xp',
            description: 'Activer/désactiver l\'XP par message',
            type: 5,
            required: false
        },
        {
            name: 'voice_xp',
            description: 'Activer/désactiver l\'XP vocal',
            type: 5,
            required: false
        },
        {
            name: 'cooldown',
            description: 'Cooldown entre les gains d\'XP (en millisecondes)',
            type: 10,
            required: false,
            min_value: 1000,
            max_value: 60000
        },
        {
            name: 'min_xp',
            description: 'XP minimum par message',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'max_xp',
            description: 'XP maximum par message',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'voice_interval',
            description: 'Intervalle de gain d\'XP vocal (en minutes)',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 60
        },
        {
            name: 'voice_xp_amount',
            description: 'Quantité d\'XP par intervalle vocal',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'voice_min_xp',
            description: 'XP minimum par intervalle vocal',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'voice_max_xp',
            description: 'XP maximum par intervalle vocal',
            type: 4,
            required: false,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'levelup_channel',
            description: 'Salon pour les messages de level up',
            type: 7,
            required: false,
            channel_types: [0]
        }
    ],
    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const settings = await LevelSettings.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { },
                { upsert: true, new: true }
            );

            const updates = {};
            const changes = [];

            if (interaction.options.get('message_xp') !== null) {
                updates.messageXP = interaction.options.getBoolean('message_xp');
                changes.push(`XP par message: ${updates.messageXP ? '✅ Activé' : '❌ Désactivé'}`);
            }

            if (interaction.options.get('voice_xp') !== null) {
                updates.voiceXP = interaction.options.getBoolean('voice_xp');
                changes.push(`XP vocal: ${updates.voiceXP ? '✅ Activé' : '❌ Désactivé'}`);
            }

            if (interaction.options.get('cooldown') !== null) {
                updates.cooldown = interaction.options.getInteger('cooldown');
                changes.push(`Cooldown: ${updates.cooldown}ms`);
            }

            if (interaction.options.get('min_xp') !== null) {
                updates.minXP = interaction.options.getInteger('min_xp');
                changes.push(`XP minimum: ${updates.minXP}`);
            }

            if (interaction.options.get('max_xp') !== null) {
                updates.maxXP = interaction.options.getInteger('max_xp');
                changes.push(`XP maximum: ${updates.maxXP}`);
            }

            if (interaction.options.get('voice_interval') !== null) {
                updates.voiceInterval = interaction.options.getInteger('voice_interval') * 60000;
                changes.push(`Intervalle vocal: ${interaction.options.getInteger('voice_interval')} minutes`);
            }

            if (interaction.options.get('voice_xp_amount') !== null) {
                updates.voiceXPAmount = interaction.options.getInteger('voice_xp_amount');
                changes.push(`XP par intervalle vocal: ${updates.voiceXPAmount}`);
            }

            if (interaction.options.get('voice_min_xp') !== null) {
                updates.voiceMinXP = interaction.options.getInteger('voice_min_xp');
                changes.push(`XP minimum vocal: ${updates.voiceMinXP}`);
            }

            if (interaction.options.get('voice_max_xp') !== null) {
                updates.voiceMaxXP = interaction.options.getInteger('voice_max_xp');
                changes.push(`XP maximum vocal: ${updates.voiceMaxXP}`);
            }

            if (interaction.options.get('levelup_channel') !== null) {
                const channel = interaction.options.getChannel('levelup_channel');
                updates.levelUpChannel = channel ? channel.id : null;
                changes.push(`Salon level up: ${channel ? channel.toString() : 'Aucun'}`);
            }

            if (changes.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚙️ Paramètres XP actuels')
                    .setDescription('Voici les paramètres actuels du système d\'XP:')
                    .addFields(
                        { name: 'XP par message', value: settings.messageXP ? '✅ Activé' : '❌ Désactivé', inline: true },
                        { name: 'XP vocal', value: settings.voiceXP ? '✅ Activé' : '❌ Désactivé', inline: true },
                        { name: 'Cooldown', value: `${settings.cooldown}ms`, inline: true },
                        { name: 'XP minimum', value: `${settings.minXP}`, inline: true },
                        { name: 'XP maximum', value: `${settings.maxXP}`, inline: true },
                        { name: 'Intervalle vocal', value: `${settings.voiceInterval / 60000} minutes`, inline: true },
                        { name: 'XP minimum vocal', value: `${settings.voiceMinXP || 15}`, inline: true },
                        { name: 'XP maximum vocal', value: `${settings.voiceMaxXP || 25}`, inline: true },
                        { name: 'Salon level up', value: settings.levelUpChannel ? `<#${settings.levelUpChannel}>` : 'Aucun', inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            await LevelSettings.updateOne(
                { guildId: interaction.guild.id },
                { $set: updates }
            );

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Paramètres XP mis à jour')
                .setDescription('Les paramètres suivants ont été modifiés:')
                .addFields({ name: 'Changements', value: changes.join('\n'), inline: false })
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur commande setxp:', error);
            interaction.editReply('❌ Une erreur est survenue lors de la modification des paramètres.');
        }
    }
};
