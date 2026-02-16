const { EmbedBuilder } = require('discord.js');
const InvitesTracker = require('@androz2091/discord-invites-tracker');
const LogSettings = require('../../schemas/logsSchema');

module.exports = (client) => {
  const tracker = InvitesTracker.init(client, {
    fetchGuilds: true,
    fetchVanity: true,
    fetchAuditLogs: true,
  });

  tracker.on('guildMemberAdd', async (member, type, invite) => {

    const logSettings = await LogSettings.findOne({ guildId: member.guild.id });
    if (!logSettings?.logChannels?.invite?.enabled) return;

    const logChannel = member.guild.channels.cache.get(
      logSettings.logChannels.invite.channelId
    );
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setFooter({
        text: client.user.username,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    if (type === 'normal' && invite) {
      embed
        .setTitle('📨 Nouveau Membre Rejoint')
        .setDescription(
          `<@${member.id}> ${member.user.tag} a rejoint le serveur via une invitation.`
        )
        .addFields(
          {
            name: 'Invitation',
            value: `Code : ${invite.code}\nUtilisations : ${invite.uses}`,
            inline: false
          },
          {
            name: 'Invité par',
            value: `${invite.inviter.tag} <@${invite.inviter.id}>`,
            inline: false
          },
          {
            name: 'ID',
            value:
              `\`\`\`ini\nUser = ${member.id}\nInviter = ${invite.inviter.id}\nCode = ${invite.code}\`\`\``,
            inline: false
          }
        );
    }

    /* ================= VANITY ================= */
    else if (type === 'vanity') {
      embed
        .setTitle('📨 Nouveau Membre Rejoint')
        .setDescription(
          `<@${member.id}> ${member.user.tag} a rejoint via l'URL personnalisée du serveur.`
        )
        .addFields({
          name: 'ID',
          value: `\`\`\`ini\nUser = ${member.id}\nType = Vanity URL\`\`\``,
          inline: false
        });
    }

    /* ================= PERMISSIONS ================= */
    else if (type === 'permissions') {
      embed
        .setTitle('⚠️ Invitation Non Vérifiée')
        .setDescription(
          `<@${member.id}> ${member.user.tag} a rejoint mais je n'ai pas la permission **Gérer le serveur**.`
        )
        .addFields({
          name: 'Erreur',
          value: `\`\`\`ini\nPermissions insuffisantes\`\`\``,
          inline: false
        });
    }

    /* ================= UNKNOWN ================= */
    else {
      embed
        .setTitle('❓ Invitation Inconnue')
        .setDescription(
          `<@${member.id}> ${member.user.tag} a rejoint avec une invitation inconnue.`
        )
        .addFields({
          name: 'Erreur',
          value: `\`\`\`ini\nType = Unknown\`\`\``,
          inline: false
        });
    }

    logChannel.send({ embeds: [embed] });
  });
};
