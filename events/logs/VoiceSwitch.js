const { EmbedBuilder, Events } = require('discord.js');
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const member = newState.member;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    const logSettings = await LogSettings.findOne({ guildId: oldState.guild.id });
    if (!logSettings || !logSettings.logChannels.voice || !logSettings.logChannels.voice.enabled) return;

    const logChannel = client.channels.cache.get(logSettings.logChannels.voice.channelId);
    if (!logChannel) return;

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const VoiceChannelSwitch = new EmbedBuilder()
        .setColor(client.color)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.avatarURL({ dynamic: true }) })
        .setDescription(`<@${member.user.id}> ${member.user.tag} est passé de **<#${oldChannel.id}> (${oldChannel.name})** à **<#${newChannel.id}> (${newChannel.name})**`)
        .addFields(
          { name: 'Ancien Channel', value: `<#${oldChannel.id}> (${oldChannel.name})` },
          { name: 'Nouveau Channel', value: `<#${newChannel.id}> (${newChannel.name})` },
          { name: 'ID', value: `\`\`\`ini\nUser = ${member.id}\nOld Channel = ${oldChannel.id}\nNew Channel = ${newChannel.id}\`\`\`` }
        )
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setTimestamp();

      logChannel.send({ embeds: [VoiceChannelSwitch] });
      console.log(`${member.user.tag} est passé de ${oldChannel.name} à ${newChannel.name}`);
    }
  }
};