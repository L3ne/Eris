const { EmbedBuilder } = require('discord.js');
const Level = require('../../schemas/levelSchema');
const LevelSettings = require('../../schemas/levelSettingsSchema');
const XPUtils = require('../../utils/xpUtils');

const voiceSessions = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        if (!newState || !newState.guild) return;

        try {
            let settings = await LevelSettings.findOne({ guildId: newState.guild.id });
            
            // Create default settings if none exist
            if (!settings) {
                settings = await LevelSettings.create({
                    guildId: newState.guild.id,
                    messageXP: true,
                    voiceXP: true,
                    cooldown: 5000,
                    minXP: 15,
                    maxXP: 25,
                    voiceInterval: 600000, // 10 minutes
                    voiceMinXP: 15,
                    voiceMaxXP: 25,
                    levelUpChannel: null,
                    levelUpMessage: "🎉 Félicitations {user} ! \nVous avez atteint le niveau **{level}** !"
                });
            }
            
            if (!settings.voiceXP) {
                return;
            }

            // Vérifier si le canal vocal est ignoré
            if (settings.ignoredChannelsVoice && settings.ignoredChannelsVoice.includes(newState.channelId)) {
                return;
            }

            const userId = newState.member.id;
            const guildId = newState.guild.id;
            const sessionKey = `${guildId}-${userId}`;

            if (newState.member.user.bot) {
                return;
            }

            // User joins voice channel
            if (!oldState.channel && newState.channel) {
                voiceSessions.set(sessionKey, {
                    joinedAt: Date.now(),
                    channelId: newState.channelId
                });
            }

            // User leaves voice channel
            else if (oldState.channel && !newState.channel) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    voiceSessions.delete(sessionKey);
                }
            }

            // User switches voice channels
            else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    session.channelId = newState.channelId;
                    session.joinedAt = Date.now(); // Reset timer when switching
                } else {
                    // Create new session if switching without existing one
                    voiceSessions.set(sessionKey, {
                        joinedAt: Date.now(),
                        channelId: newState.channelId
                    });
                }
            }

        } catch (error) {
            console.error('Erreur dans le système d\'XP vocal:', error);
        }
    },

    async processVoiceXP(client) {
        if (voiceSessions.size === 0) return;

        const settingsCache = new Map();
        let processedCount = 0;
        let xpGivenCount = 0;

        for (const [sessionKey, session] of voiceSessions.entries()) {
            try {
                const [guildId, userId] = sessionKey.split('-');
                processedCount++;
                
                if (!settingsCache.has(guildId)) {
                    const settings = await LevelSettings.findOne({ guildId });
                    settingsCache.set(guildId, settings);
                }

                const settings = settingsCache.get(guildId);
                if (!settings || !settings.voiceXP) {
                    continue;
                }

                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member || member.user.bot) {
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const voiceChannel = guild.channels.cache.get(session.channelId);
                if (!voiceChannel) {
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);
                
                const now = Date.now();
                const timeSinceJoin = now - session.joinedAt;
                
                if (nonBotMembers.size <= 1) {
                    continue;
                }

                if (timeSinceJoin >= settings.voiceInterval) {
                    const xpAmount = XPUtils.getRandomXP(settings.voiceMinXP, settings.voiceMaxXP);
                    const result = await XPUtils.addVoiceXP(guildId, userId, xpAmount);
                    xpGivenCount++;

                    if (result.levelUp && settings.levelUpChannel) {
                        const channel = guild.channels.cache.get(settings.levelUpChannel);
                        if (channel && channel.isTextBased()) {
                            const levelUpMessage = settings.levelUpMessage
                                .replace('{user}', member.toString())
                                .replace('{level}', result.newLevel)
                                .replace('{oldLevel}', result.oldLevel);

                            const embed = new EmbedBuilder()
                                .setDescription(levelUpMessage)
                                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                                .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
                                .setTimestamp();

                            await channel.send({ embeds: [embed] });
                        }
                    }

                    session.joinedAt = now;
                }

            } catch (error) {
                console.error(`❌ Error processing XP vocal pour ${sessionKey}:`, error);
                voiceSessions.delete(sessionKey);
            }
        }
    },

    // Function to scan for users already in voice channels
    async scanExistingVoiceUsers(client) {
        for (const guild of client.guilds.cache.values()) {
            const settings = await LevelSettings.findOne({ guildId: guild.id });
            if (!settings || !settings.voiceXP) continue;

            for (const voiceChannel of guild.channels.cache.filter(c => c.type === 2).values()) { // 2 = voice channel
                for (const member of voiceChannel.members.values()) {
                    if (member.user.bot) continue;
                    
                    const sessionKey = `${guild.id}-${member.id}`;
                    if (!voiceSessions.has(sessionKey)) {
                        voiceSessions.set(sessionKey, {
                            joinedAt: Date.now(),
                            channelId: voiceChannel.id
                        });
                    }
                }
            }
        }
    }
};
