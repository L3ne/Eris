const { EmbedBuilder, Events } = require('discord.js');
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
      
    const logSettings = await LogSettings.findOne({ guildId: oldMember.guild.id });
    if (!logSettings || !logSettings.logChannels.boost || !logSettings.logChannels.boost.enabled) return;

    const logChannel = client.channels.cache.get(logSettings.logChannels.boost.channelId);
    if (!logChannel) return;

    // Si un membre arrête de booster le serveur
    if (oldMember.premiumSince && !newMember.premiumSince) {
      const UnboostEmbed = new EmbedBuilder()
        .setColor(0xF54242) // Couleur pour l'unboost
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setAuthor({ name: `${newMember.user.tag}`, iconURL: newMember.user.avatarURL({ dynamic: true }) })
        .setDescription(`<@${newMember.user.id}> a arrêté de booster le serveur.`)
        .addFields(
          { name: 'User ID', value: `${newMember.user.id}`, inline: true },
          { name: 'Total Boosts Restants', value: `${newMember.guild.premiumSubscriptionCount}`, inline: true }
        )
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setTimestamp();

      logChannel.send({ embeds: [UnboostEmbed] });
      console.log(`${newMember.user.tag} a arrêté de booster le serveur.`);
    }
  }
};