const { PermissionFlagsBits, ChannelType } = require("discord.js");
const {
  TempVoiceConfig,
  TempVoiceChannel,
  TempVoiceUser,
} = require("../../schemas/tempVoiceSchema");
const {
  buildPanelEmbed,
  buildPanelComponents,
} = require("../../utils/tempVoiceUtils");

module.exports = {
  name: "voiceStateUpdate",
  execute: async (client, oldState, newState) => {
    const guild = newState.guild ?? oldState.guild;

    try {
      // ── Cas 1 : l'utilisateur rejoint le salon "Join to Create" ──────────
      if (newState.channelId) {
        const config = await TempVoiceConfig.findOne({ guildId: guild.id });

        if (config && newState.channelId === config.joinChannelId) {
          const member = newState.member;

          // Nom du salon : priorité au lastName sauvegardé, sinon defaultName
          const userPref = await TempVoiceUser.findOne({
            guildId: guild.id,
            userId: member.id,
          });
          const channelName =
            userPref?.lastName ??
            (config.defaultName || "🎙️ {username}").replace(
              "{username}",
              member.displayName,
            );

          // Créer le salon vocal dans la catégorie configurée
          const voiceChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: config.categoryId,
            userLimit: config.defaultLimit || 0,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.Connect,
                ],
              },
              {
                id: member.id,
                allow: [
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.MoveMembers,
                  PermissionFlagsBits.MuteMembers,
                  PermissionFlagsBits.DeafenMembers,
                  PermissionFlagsBits.Connect,
                  PermissionFlagsBits.ViewChannel,
                ],
              },
              {
                id: client.user.id,
                allow: [
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.MoveMembers,
                  PermissionFlagsBits.Connect,
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
            ],
          });

          // Déplacer le membre dans le nouveau salon
          await member.voice.setChannel(voiceChannel).catch((err) => {
            console.error("[TempVoice] Impossible de déplacer le membre:", err);
          });

          // Sauvegarder le document dans MongoDB
          const tempVoiceDoc = new TempVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            ownerId: member.id,
            locked: false,
            hidden: false,
            bannedUsers: [],
            userLimit: config.defaultLimit || 0,
            panelMessageId: null,
          });
          await tempVoiceDoc.save();

          // Envoyer le panel de contrôle directement dans le salon vocal
          const embed = buildPanelEmbed(member, tempVoiceDoc, voiceChannel);
          const components = buildPanelComponents(tempVoiceDoc);

          const panelMessage = await voiceChannel
            .send({
              embeds: [embed],
              components,
            })
            .catch((err) => {
              console.error("[TempVoice] Impossible d'envoyer le panel:", err);
              return null;
            });

          // Sauvegarder l'ID du message panel
          if (panelMessage) {
            tempVoiceDoc.panelMessageId = panelMessage.id;
            await tempVoiceDoc.save();
          }
        }
      }

      // ── Cas 2 : l'utilisateur quitte un salon temporaire ─────────────────
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const tempVoiceDoc = await TempVoiceChannel.findOne({
          channelId: oldState.channelId,
        });

        if (tempVoiceDoc) {
          // Récupérer le salon depuis le cache ou via oldState
          const channel =
            oldState.channel ?? guild.channels.cache.get(oldState.channelId);

          if (channel && channel.members.size === 0) {
            // Salon vide → on le supprime et on nettoie MongoDB
            await channel
              .delete("Salon vocal temporaire vide")
              .catch(() => null);
            await TempVoiceChannel.deleteOne({ channelId: oldState.channelId });
          }
        }
      }
    } catch (err) {
      console.error("[TempVoice] voiceStateUpdate error:", err);
    }
  },
};
