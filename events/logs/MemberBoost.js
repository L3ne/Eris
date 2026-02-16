const { EmbedBuilder, Events } = require('discord.js');
const LogSettings = require('../../schemas/logsSchema');
module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
      
    const logSettings = await LogSettings.findOne({ guildId: oldMember.guild.id });
    if (!logSettings || !logSettings.logChannels.boost || !logSettings.logChannels.boost.enabled) return;

    const logChannel = client.channels.cache.get(logSettings.logChannels.boost);
    if (!logChannel) return;

    // Si un membre booste le serveur
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const BoostEmbed = new EmbedBuilder()
        .setColor(0xE1A6F2) // Couleur pour le boost
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setAuthor({ name: `${newMember.user.tag}`, iconURL: newMember.user.avatarURL({ dynamic: true }) })
        .setDescription(`<@${newMember.user.id}> a boosté le serveur !`)
        .addFields(
          { name: 'User ID', value: `${newMember.user.id}`, inline: true },
          { name: 'Total Boosts', value: `${newMember.guild.premiumSubscriptionCount}`, inline: true }
        )
        .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setTimestamp();

      logChannel.send({ embeds: [BoostEmbed] });
      console.log(`${newMember.user.tag} a boosté le serveur.`);
    }
  }
};