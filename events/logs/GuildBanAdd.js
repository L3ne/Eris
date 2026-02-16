const { EmbedBuilder, Events, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const LogSettings = require('../../schemas/logsSchema');

module.exports = {
  name: Events.GuildBanAdd,

  async execute(client, ban) {

    const logSettings = await LogSettings.findOne({ guildId: ban.guild.id });
        if (!logSettings || !logSettings.logChannels.mod || !logSettings.logChannels.mod.enabled) return;
    
        const logChannel = client.channels.cache.get(logSettings.logChannels.mod.channelId);
        if (!logChannel) return;

    // Récupérer les logs d'audit du serveur
    const fetchedLogs = await ban.guild.fetchAuditLogs({
      limit: 1,
      type: 22, // Type 22 = ban
    }).catch(console.error);

    const banLog = fetchedLogs?.entries.first();
    let executor = banLog?.executor?.tag || 'Unknown';
    let reason = banLog?.reason || 'No reason provided';

    // Créer l'embed d'information sur le ban
    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle('Utilisateur banni')
      .setDescription(`**${ban.user.tag}** a été banni du serveur.`)
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: 'Nom d\'utilisateur', value: `${ban.user.tag}`, inline: false },
        { name: 'ID de l\'utilisateur', value: `${ban.user.id}`, inline: false },
        { name: 'Banni par', value: executor, inline: false },
        { name: 'Raison', value: reason, inline: false },
        { name: 'Date du bannissement', value: `<t:${Math.floor(banLog.createdTimestamp / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
      .setTimestamp();

    // Envoyer le message dans le canal de logs
    logChannel.send({ embeds: [embed] }).catch(console.error);
  }
};