const { EmbedBuilder } = require('discord.js');
const Level = require('../../schemas/levelSchema');
const LevelSettings = require('../../schemas/levelSettingsSchema');
const XPUtils = require('../../utils/xpUtils');

const voiceSessions = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        if (!newState || !newState.guild) return;

            console.log(`🎤 Voice state update: ${newState.member.user.username}`);
            console.log(`   oldState.channel: ${oldState.channel?.name || 'None'} (${oldState.channelId || 'None'})`);
            console.log(`   newState.channel: ${newState.channel?.name || 'None'} (${newState.channelId || 'None'})`);
            console.log(`   newState.channelId: ${newState.channelId}`);
            console.log(`   oldState.channelId: ${oldState.channelId}`);
            console.log(`   Is joining: ${!oldState.channel && !!newState.channel}`);
            console.log(`   Is leaving: ${!!oldState.channel && !newState.channel}`);
            console.log(`   Is switching: ${!!oldState.channel && !!newState.channel && oldState.channelId !== newState.channelId}`);
        console.log(`📊 Current voice sessions: ${voiceSessions.size}`);
        for (const [key, session] of voiceSessions.entries()) {
            console.log(`  - ${key}: joined at ${new Date(session.joinedAt).toLocaleTimeString()}, channel ${session.channelId}`);
        }

        // Check if user is currently in voice channel (for users already in voice when bot starts)
        if (newState.channel && !voiceSessions.has(`${newState.guild.id}-${newState.member.id}`)) {
            console.log(`⚠️ User ${newState.member.user.username} is in voice but not in sessions. Adding them...`);
        }

        try {
            let settings = await LevelSettings.findOne({ guildId: newState.guild.id });
            
            // Create default settings if none exist
            if (!settings) {
                console.log(`⚙️ Creating default XP settings for guild ${newState.guild.id}`);
                settings = await LevelSettings.create({
                    guildId: newState.guild.id,
                    messageXP: true,
                    voiceXP: true,
                    cooldown: 5000,
                    minXP: 15,
                    maxXP: 25,
                    voiceInterval: 600000, // 10 minutes
                    voiceXPAmount: 10,
                    levelUpChannel: null,
                    levelUpMessage: "🎉 Félicitations {user} ! \nVous avez atteint le niveau **{level}** !"
                });
                console.log(`✅ Default settings created for guild ${newState.guild.id}`);
            }
            
            console.log(`🔧 Voice XP settings for guild ${newState.guild.id}:`, {
                voiceXP: settings.voiceXP,
                voiceInterval: settings.voiceInterval,
                voiceXPAmount: settings.voiceXPAmount
            });
            
            if (!settings.voiceXP) {
                console.log(`❌ Voice XP disabled for guild ${newState.guild.id}`);
                return;
            }

            // Vérifier si le canal vocal est ignoré
            if (settings.ignoredChannels && settings.ignoredChannels.includes(newState.channelId)) {
                console.log(`🔇 Voice channel ${newState.channelId} is ignored for XP`);
                return;
            }

            const userId = newState.member.id;
            const guildId = newState.guild.id;
            const sessionKey = `${guildId}-${userId}`;

            if (newState.member.user.bot) {
                console.log(`🤖 Ignoring bot user: ${newState.member.user.username}`);
                return;
            }

            // User joins voice channel
            if (!oldState.channel && newState.channel) {
                voiceSessions.set(sessionKey, {
                    joinedAt: Date.now(),
                    channelId: newState.channelId
                });
                console.log(`✅ Added ${newState.member.user.username} to voice sessions. Total: ${voiceSessions.size}`);
                console.log(`   Session key: ${sessionKey}, Channel: ${newState.channel.name} (${newState.channelId})`);
            }

            // User leaves voice channel
            else if (oldState.channel && !newState.channel) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    voiceSessions.delete(sessionKey);
                    console.log(`❌ Removed ${newState.member.user.username} from voice sessions. Total: ${voiceSessions.size}`);
                } else {
                    console.log(`⚠️ No session found for ${newState.member.user.username} when leaving`);
                }
            }

            // User switches voice channels
            else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    session.channelId = newState.channelId;
                    session.joinedAt = Date.now(); // Reset timer when switching
                    console.log(`🔄 ${newState.member.user.username} switched to ${newState.channel.name}. Session updated.`);
                } else {
                    // Create new session if switching without existing one
                    voiceSessions.set(sessionKey, {
                        joinedAt: Date.now(),
                        channelId: newState.channelId
                    });
                    console.log(`✅ Created new session for ${newState.member.user.username} after channel switch. Total: ${voiceSessions.size}`);
                }
            }

            console.log(`📊 Updated voice sessions: ${voiceSessions.size}`);

        } catch (error) {
            console.error('Erreur dans le système d\'XP vocal:', error);
        }
    },

    async processVoiceXP() {
        console.log(`🔄 Processing voice XP for ${voiceSessions.size} active sessions...`);
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
                    console.log(`⚠️ No voice XP settings for guild ${guildId}`);
                    continue;
                }

                const guild = this.client.guilds.cache.get(guildId);
                if (!guild) {
                    console.log(`⚠️ Guild ${guildId} not found`);
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member || member.user.bot) {
                    console.log(`⚠️ Member ${userId} not found or is bot`);
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const voiceChannel = guild.channels.cache.get(session.channelId);
                if (!voiceChannel) {
                    console.log(`⚠️ Voice channel ${session.channelId} not found`);
                    voiceSessions.delete(sessionKey);
                    continue;
                }

                const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);
                console.log(`👥 Channel ${voiceChannel.name} has ${nonBotMembers.size} non-bot members`);
                
                if (nonBotMembers.size <= 1) {
                    console.log(`⚠️ User ${member.user.username} is alone in voice channel, no XP given`);
                    continue;
                }

                const now = Date.now();
                const timeSinceJoin = now - session.joinedAt;

                console.log(`⏰ User ${member.user.username} in channel for ${Math.floor(timeSinceJoin / 60000)} minutes, needs ${Math.floor(settings.voiceInterval / 60000)} minutes`);

                if (timeSinceJoin >= settings.voiceInterval) {
                    console.log(`🎉 Giving ${settings.voiceXPAmount} XP to ${member.user.username}`);
                    const result = await XPUtils.addVoiceXP(guildId, userId, settings.voiceXPAmount);
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
                                .setTimestamp();

                            await channel.send({ embeds: [embed] });
                            console.log(`🎊 Level up message sent for ${member.user.username}`);
                        }
                    }

                    session.joinedAt = now;
                }

            } catch (error) {
                console.error(`❌ Error processing XP vocal pour ${sessionKey}:`, error);
                voiceSessions.delete(sessionKey);
            }
        }
        
        console.log(`✅ Voice XP processing complete: ${processedCount} processed, ${xpGivenCount} received XP`);
    },

    // Function to scan for users already in voice channels
    async scanExistingVoiceUsers(client) {
        console.log('🔍 Scanning for users already in voice channels...');
        
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
                        console.log(`✅ Added existing voice user: ${member.user.username} in ${voiceChannel.name}`);
                    }
                }
            }
        }
        
        console.log(`🔍 Scan complete. Found ${voiceSessions.size} voice sessions`);
    }
};
