const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const LevelSettings = require('../../../schemas/levelSettingsSchema');

module.exports = {
    name: "ignorechannel",
    description: "Gérer les canaux ignorés par le système d'XP",
    type: 1, // ChatInput
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 3000,
    options: [
        {
            name: "action",
            description: "Action à effectuer",
            type: 3, // String
            required: true,
            choices: [
                { name: "Ajouter un canal", value: "add" },
                { name: "Retirer un canal", value: "remove" },
                { name: "Lister les canaux", value: "list" },
                { name: "Vider la liste", value: "clear" }
            ]
        },
        {
            name: "canal",
            description: "Le canal à ajouter ou retirer",
            type: 7, // Channel
            required: false
        },
        {
            name: "type",
            description: "Type d'XP à ignorer pour ce canal",
            type: 3, // String
            required: false,
            choices: [
                { name: "Messages et vocal", value: "both" },
                { name: "Messages uniquement", value: "message" },
                { name: "Vocal uniquement", value: "voice" }
            ]
        }
    ],
    execute: async (client, interaction) => {
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('canal');
        const type = interaction.options.getString('type') || 'both';

        try {
            let settings = await LevelSettings.findOne({ guildId: interaction.guild.id });
            
            if (!settings) {
                settings = await LevelSettings.create({
                    guildId: interaction.guild.id,
                    messageXP: true,
                    voiceXP: true,
                    cooldown: 5000,
                    minXP: 15,
                    maxXP: 25,
                    voiceInterval: 600000,
                    voiceMinXP: 15,
                    voiceMaxXP: 25,
                    levelUpChannel: null,
                    ignoredChannels: [],
                    ignoredChannelsMessage: [],
                    ignoredChannelsVoice: []
                });
            }

            const embed = new EmbedBuilder()
                .setColor(client.color || '#0099ff')
                .setTimestamp()
                .setFooter({ text: interaction.guild.name });

            switch (action) {
                case 'add':
                    if (!channel) {
                        return interaction.reply({ 
                            content: '❌ Vous devez spécifier un canal à ajouter.', 
                            ephemeral: true 
                        });
                    }

                    let added = false;
                    let message = '';
                    
                    if (type === 'both' || type === 'message') {
                        if (!settings.ignoredChannelsMessage.includes(channel.id)) {
                            settings.ignoredChannelsMessage.push(channel.id);
                            added = true;
                            message += '✅ Messages ignorés\n';
                        } else {
                            message += '⚠️ Messages déjà ignorés\n';
                        }
                    }
                    
                    if (type === 'both' || type === 'voice') {
                        if (!settings.ignoredChannelsVoice.includes(channel.id)) {
                            settings.ignoredChannelsVoice.push(channel.id);
                            added = true;
                            message += '✅ Vocal ignoré\n';
                        } else {
                            message += '⚠️ Vocal déjà ignoré\n';
                        }
                    }
                    
                    if (added) {
                        await settings.save();
                        embed.setDescription(`**${channel}** configuré :\n${message}`);
                    } else {
                        embed.setDescription(`**${channel}** déjà configuré :\n${message}`);
                    }
                    break;

                case 'remove':
                    if (!channel) {
                        return interaction.reply({ 
                            content: '❌ Vous devez spécifier un canal à retirer.', 
                            ephemeral: true 
                        });
                    }

                    let removed = false;
                    let removeMessage = '';
                    
                    if (type === 'both' || type === 'message') {
                        const index = settings.ignoredChannelsMessage.indexOf(channel.id);
                        if (index !== -1) {
                            settings.ignoredChannelsMessage.splice(index, 1);
                            removed = true;
                            removeMessage += '✅ Messages réactivés\n';
                        } else {
                            removeMessage += '⚠️ Messages n\'étaient pas ignorés\n';
                        }
                    }
                    
                    if (type === 'both' || type === 'voice') {
                        const index = settings.ignoredChannelsVoice.indexOf(channel.id);
                        if (index !== -1) {
                            settings.ignoredChannelsVoice.splice(index, 1);
                            removed = true;
                            removeMessage += '✅ Vocal réactivé\n';
                        } else {
                            removeMessage += '⚠️ Vocal n\'était pas ignoré\n';
                        }
                    }
                    
                    if (removed) {
                        await settings.save();
                        embed.setDescription(`**${channel}** mis à jour :\n${removeMessage}`);
                    } else {
                        embed.setDescription(`**${channel}** n\'avait pas de changement :\n${removeMessage}`);
                    }
                    break;

                case 'list':
                    const allIgnored = [
                        ...settings.ignoredChannelsMessage.map(id => ({ id, type: 'message' })),
                        ...settings.ignoredChannelsVoice.map(id => ({ id, type: 'voice' }))
                    ];
                    
                    if (allIgnored.length === 0) {
                        embed.setDescription('📋 Aucun canal n\'est actuellement ignoré.');
                    } else {
                        const channelMap = new Map();
                        
                        allIgnored.forEach(({ id, type }) => {
                            if (!channelMap.has(id)) {
                                channelMap.set(id, new Set());
                            }
                            channelMap.get(id).add(type);
                        });
                        
                        const channelList = Array.from(channelMap.entries())
                            .map(([id, types]) => {
                                const ch = interaction.guild.channels.cache.get(id);
                                const typeIcons = {
                                    message: '💬',
                                    voice: '🎤',
                                    both: '🔄'
                                };
                                const typeText = Array.from(types).map(t => typeIcons[t]).join(' ');
                                return ch ? `• ${typeText} ${ch}` : `• ${typeText} Canal inconnu (${id})`;
                            })
                            .join('\n');
                        
                        embed
                            .setTitle('📋 Canaux ignorés pour l\'XP')
                            .setDescription(channelList)
                            .addFields({ 
                                name: 'Total', 
                                value: `${channelMap.size} canal(x)`, 
                                inline: true 
                            });
                    }
                    break;

                case 'clear':
                    const messageCount = settings.ignoredChannelsMessage.length;
                    const voiceCount = settings.ignoredChannelsVoice.length;
                    const total = messageCount + voiceCount;
                    
                    if (total === 0) {
                        embed.setDescription('📋 La liste des canaux ignorés est déjà vide.');
                    } else {
                        settings.ignoredChannelsMessage = [];
                        settings.ignoredChannelsVoice = [];
                        await settings.save();
                        embed.setDescription(`✅ ${total} canal(x) ont été retirés :\n• ${messageCount} pour les messages\n• ${voiceCount} pour le vocal`);
                    }
                    break;
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans la commande ignorechannel:', error);
            await interaction.reply({ 
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
                ephemeral: true 
            });
        }
    }
};
