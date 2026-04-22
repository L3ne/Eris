const {
    EmbedBuilder,
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");
const { TicketConfig } = require("../../../utils/ticketUtils");

module.exports = {
    name: "ticket-config",
    description: "Configure le système de tickets",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 5000,
    options: [
        {
            name: "log-channel",
            description: "Channel où envoyer les logs et transcriptions",
            type: ApplicationCommandOptionType.Channel,
            required: false
        },
        {
            name: "support-role",
            description: "Rôle autorisé à gérer les tickets",
            type: ApplicationCommandOptionType.Role,
            required: false
        },
        {
            name: "category",
            description: "Catégorie pour les tickets",
            type: ApplicationCommandOptionType.Channel,
            required: false
        }
    ],

    execute: async (client, interaction) => {
        await interaction.deferReply();

        const guildId = interaction.guildId;

        // Récupérer ou créer la configuration
        let config = await TicketConfig.findOne({ guildId });
        if (!config) {
            config = new TicketConfig({ guildId });
        }

        // Récupérer les options
        const logChannel = interaction.options.getChannel("log-channel");
        const supportRole = interaction.options.getRole("support-role");
        const category = interaction.options.getChannel("category");

        // Mettre à jour la config
        let changes = [];

        if (logChannel) {
            config.logChannelId = logChannel.id;
            changes.push(`Channel de logs: <#${logChannel.id}>`);
        }

        if (supportRole) {
            if (!config.supportRoles.includes(supportRole.id)) {
                config.supportRoles.push(supportRole.id);
            }
            changes.push(`Rôle support: <@&${supportRole.id}>`);
        }

        if (category) {
            config.categoryId = category.id;
            changes.push(`Catégorie: <#${category.id}>`);
        }

        if (changes.length === 0) {
            // Afficher la config actuelle
            const embed = new EmbedBuilder()
                .setColor(client.color || '#00ff00')
                .setTitle('⚙️ Configuration Actuelle du Système de Tickets')
                .addFields(
                    { 
                        name: 'Channel de Logs', 
                        value: config.logChannelId ? `<#${config.logChannelId}>` : 'Non configuré', 
                        inline: true 
                    },
                    { 
                        name: 'Rôles Support', 
                        value: config.supportRoles && config.supportRoles.length > 0 
                            ? config.supportRoles.map(id => `<@&${id}>`).join(', ') 
                            : 'Aucun', 
                        inline: true 
                    },
                    { 
                        name: 'Catégorie', 
                        value: config.categoryId ? `<#${config.categoryId}>` : 'Non configuré', 
                        inline: true 
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Utilisez les options pour modifier la configuration' });

            return interaction.editReply({ embeds: [embed] });
        }

        // Sauvegarder la config dans MongoDB
        try {
            await config.save();
        } catch (err) {
            console.error('Erreur lors de la sauvegarde de la configuration:', err);
            return interaction.editReply({
                content: '❌ Erreur lors de la sauvegarde de la configuration.'
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Configuration Mise à Jour')
            .setDescription('Les modifications suivantes ont été appliquées :')
            .addFields(
                { name: 'Modifications', value: changes.join('\n'), inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Configuration sauvegardée dans MongoDB' });

        await interaction.editReply({ embeds: [embed] });
    }
};
