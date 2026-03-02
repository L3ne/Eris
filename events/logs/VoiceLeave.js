const { EmbedBuilder, Events } = require('discord.js');
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const member = oldState.member;
    const channel = oldState.channel;

    const logSettings = await LogSettings.findOne({ guildId: oldState.guild.id });
    if (!logSettings || !logSettings.logChannels.voice || !logSettings.logChannels.voice.enabled) return;

    const logChannel = client.channels.cache.get(logSettings.logChannels.voice.channelId);
    if (!logChannel) return;

    if (oldState.channelId && !newState.channelId) {
      const VoiceChannelLeave = new EmbedBuilder()
        .setColor(client.color)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.avatarURL({ dynamic: true }) })
        .setDescription(`<@${member.user.id}> ${member.user.tag} a quitté le salon <#${channel.id}> (${channel.name})`)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}> (${channel.name})` },
          { name: 'ID', value: `\`\`\`ini\nUser = ${member.id}\nChannel = ${channel.id}\`\`\`` }
        )
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setTimestamp();

      logChannel.send({ embeds: [VoiceChannelLeave] });
      console.log(`${member.user.tag} a quitté ${channel.name}`);
    }
  }
};