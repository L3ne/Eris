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
        }
    ],
    execute: async (client, interaction) => {
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('canal');

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
                    voiceXPAmount: 10,
                    levelUpChannel: null,
                    ignoredChannels: []
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

                    if (settings.ignoredChannels.includes(channel.id)) {
                        embed.setDescription(`❌ Le canal ${channel} est déjà dans la liste des canaux ignorés.`);
                    } else {
                        settings.ignoredChannels.push(channel.id);
                        await settings.save();
                        embed.setDescription(`✅ Le canal ${channel} a été ajouté à la liste des canaux ignorés.`);
                    }
                    break;

                case 'remove':
                    if (!channel) {
                        return interaction.reply({ 
                            content: '❌ Vous devez spécifier un canal à retirer.', 
                            ephemeral: true 
                        });
                    }

                    const index = settings.ignoredChannels.indexOf(channel.id);
                    if (index === -1) {
                        embed.setDescription(`❌ Le canal ${channel} n'est pas dans la liste des canaux ignorés.`);
                    } else {
                        settings.ignoredChannels.splice(index, 1);
                        await settings.save();
                        embed.setDescription(`✅ Le canal ${channel} a été retiré de la liste des canaux ignorés.`);
                    }
                    break;

                case 'list':
                    if (settings.ignoredChannels.length === 0) {
                        embed.setDescription('📋 Aucun canal n\'est actuellement ignoré.');
                    } else {
                        const channelList = settings.ignoredChannels
                            .map(id => {
                                const ch = interaction.guild.channels.cache.get(id);
                                return ch ? `• ${ch}` : `• Canal inconnu (${id})`;
                            })
                            .join('\n');
                        
                        embed
                            .setTitle('📋 Canaux ignorés pour l\'XP')
                            .setDescription(channelList)
                            .addFields({ 
                                name: 'Total', 
                                value: `${settings.ignoredChannels.length} canal(x)`, 
                                inline: true 
                            });
                    }
                    break;

                case 'clear':
                    if (settings.ignoredChannels.length === 0) {
                        embed.setDescription('📋 La liste des canaux ignorés est déjà vide.');
                    } else {
                        const count = settings.ignoredChannels.length;
                        settings.ignoredChannels = [];
                        await settings.save();
                        embed.setDescription(`✅ ${count} canal(x) ont été retirés de la liste des canaux ignorés.`);
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
