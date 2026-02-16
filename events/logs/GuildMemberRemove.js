const { EmbedBuilder, Events } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(client, member) {
    
    const logSettings = await LogSettings.findOne({ guildId: member.guild.id });
    if (!logSettings || !logSettings.logChannels.leave || !logSettings.logChannels.leave.enabled) return;

    const logChannel = client.channels.cache.get(logSettings.logChannels.leave.channelId);
    if (!logChannel) return;

    const isBot = member.user.bot ? "oui" : "non";

    const embed = new EmbedBuilder()
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }) || null)
      .setColor(client.color)
      .setTitle('Un membre a quitté le serveur')
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
      .setFooter({ text: `${member.guild.name}`, iconURL: member.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await logChannel.send({ content: `Un membre a quitté le serveur : <@${member.id}>`, embeds: [embed] });
  }
};