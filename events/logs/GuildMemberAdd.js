const LogSettings = require('../../schemas/logsSchema');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(client, member) {

        const logSettings = await LogSettings.findOne({ guildId: member.guild.id });
            if (!logSettings || !logSettings.logChannels.join || !logSettings.logChannels.join.enabled) return;
        
            const logChannel = client.channels.cache.get(logSettings.logChannels.join.channelId);
            if (!logChannel) return;

        const isBot = member.user.bot ? "oui" : "non";

        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle('Informations sur l\'utilisateur')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }) || null)
            .addFields(
                { name: 'Nom d\'utilisateur', value: `<@${member.user.id}> - \`${member.user.tag}\``, inline: false },
                { name: 'ID', value: `${member.user.id}`, inline: false },
                { name: 'Bot', value: `${isBot}`, inline: false },
                { 
                    name: 'Création du compte', 
                    value: `<t:${parseInt(member.user.createdTimestamp / 1000)}:f> (<t:${parseInt(member.user.createdTimestamp / 1000)}:R>)`, 
                    inline: false 
                }
            )
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({dynamic: true})})
            .setTimestamp();

        // Boutons d'action
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`kick_${member.id}`)
                    .setLabel('Kick')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`ban_${member.id}`)
                    .setLabel('Ban')
                    .setStyle(ButtonStyle.Danger)
            );

        await logChannel.send({embeds: [embed], components: [row] });
    }
};