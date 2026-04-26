const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

/**
 * Construit l'embed du panel de contrôle du salon vocal temporaire
 */
function buildPanelEmbed(owner, tempVoiceDoc, channel) {
  const bannedList =
    tempVoiceDoc.bannedUsers && tempVoiceDoc.bannedUsers.length > 0
      ? tempVoiceDoc.bannedUsers.map((id) => `<@${id}>`).join(", ")
      : "Aucun";

  return new EmbedBuilder()
    .setColor("#dac7bb")
    .setTitle("Salon Vocal Temporaire")
    .setDescription(
      "Gérez votre salon vocal temporaire à l'aide des boutons ci-dessous.",
    )
    .addFields(
      { name: "Propriétaire", value: `<@${owner.id}>`, inline: true },
      {
        name: "Statut",
        value: tempVoiceDoc.locked ? "Verrouillé" : "Déverrouillé",
        inline: true,
      },
      {
        name: "Visibilité",
        value: tempVoiceDoc.hidden ? "Masqué" : "Visible",
        inline: true,
      },
      {
        name: "Limite",
        value:
          channel.userLimit > 0
            ? `${channel.userLimit} membre(s)`
            : "Illimitée",
        inline: true,
      },
      { name: "Membres bannis", value: bannedList, inline: false },
    )
    .setTimestamp()
    .setFooter({
      text: "Salon Vocal Temporaire",
      iconURL: owner.displayAvatarURL(),
    });
}

/**
 * Construit les 2 ActionRows de boutons du panel
 */
function buildPanelComponents(tempVoiceDoc) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("tv_lock")
      .setLabel(tempVoiceDoc.locked ? "Déverrouiller" : "Verrouiller")
      .setStyle(tempVoiceDoc.locked ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tv_hide")
      .setLabel(tempVoiceDoc.hidden ? "Afficher" : "Masquer")
      .setStyle(
        tempVoiceDoc.hidden ? ButtonStyle.Success : ButtonStyle.Secondary,
      ),
    new ButtonBuilder()
      .setCustomId("tv_rename")
      .setLabel("Renommer")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("tv_limit")
      .setLabel("Limite")
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("tv_kick")
      .setLabel("Expulser")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tv_ban")
      .setLabel("Bannir")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tv_transfer")
      .setLabel("Transférer")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("tv_reset")
      .setLabel("Réinitialiser")
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Met à jour le message du panel dans le salon vocal
 */
async function updatePanel(voiceChannel, tempVoiceDoc, guild) {
  if (!tempVoiceDoc.panelMessageId) return;

  try {
    const message = await voiceChannel.messages
      .fetch(tempVoiceDoc.panelMessageId)
      .catch(() => null);
    if (!message) return;

    const owner = await guild.members
      .fetch(tempVoiceDoc.ownerId)
      .catch(() => null);
    if (!owner) return;

    const embed = buildPanelEmbed(owner, tempVoiceDoc, voiceChannel);
    const components = buildPanelComponents(tempVoiceDoc);

    await message.edit({ embeds: [embed], components });
  } catch (err) {
    console.error("[TempVoice] Erreur lors de la mise à jour du panel:", err);
  }
}

module.exports = { buildPanelEmbed, buildPanelComponents, updatePanel };
