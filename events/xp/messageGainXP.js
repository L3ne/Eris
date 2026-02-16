const { EmbedBuilder } = require('discord.js');
const Level = require('../../schemas/levelSchema');
const LevelSettings = require('../../schemas/levelSettingsSchema');
const XPUtils = require('../../utils/xpUtils');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (!message || !message.author || message.author.bot || !message.guild) return;

        try {
            const settings = await LevelSettings.findOne({ guildId: message.guild.id });
            
            if (!settings || !settings.messageXP) return;

            // Vérifier si le canal est ignoré
            if (settings.ignoredChannels && settings.ignoredChannels.includes(message.channel.id)) {
                return;
            }

            const now = Date.now();
            const lastMessage = await Level.findOne({ 
                guildId: message.guild.id, 
                userId: message.author.id 
            }).select('lastMessage');

            if (lastMessage && lastMessage.lastMessage) {
                const timeDiff = now - lastMessage.lastMessage.getTime();
                if (timeDiff < settings.cooldown) return;
            }

            const xpAmount = XPUtils.getRandomXP(settings.minXP, settings.maxXP);
            const result = await XPUtils.addXP(message.guild.id, message.author.id, xpAmount);

            if (result.levelUp && settings.levelUpChannel) {
                const channel = message.guild.channels.cache.get(settings.levelUpChannel);
                if (channel && channel.isTextBased()) {
                    const levelUpMessage = settings.levelUpMessage
                        .replace('{user}', message.author.toString())
                        .replace('{level}', result.newLevel)
                        .replace('{oldLevel}', result.oldLevel);

                    const embed = new EmbedBuilder()
                        .setDescription(levelUpMessage)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                    console.log(`🎊 Level up message sent for ${message.author.username}`);
                }
            }

        } catch (error) {
            console.error('Erreur dans le système d\'XP par message:', error);
        }
    }
};
