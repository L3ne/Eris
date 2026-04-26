const {
  Events,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const {
  TempVoiceChannel,
  TempVoiceConfig,
  TempVoiceUser,
} = require("../../schemas/tempVoiceSchema");
const { updatePanel } = require("../../utils/tempVoiceUtils");
const LogSettings = require("../../schemas/logsSchema");

module.exports = {
  name: Events.InteractionCreate,
  execute: async (client, interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith("tv_")) {
      await handleButton(client, interaction);
      return;
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("tv_modal_")
    ) {
      await handleModal(client, interaction);
      return;
    }

    if (
      interaction.isUserSelectMenu() &&
      interaction.customId.startsWith("tv_select_")
    ) {
      await handleUserSelect(client, interaction);
      return;
    }
  },
};

// ─── Log Helper ───────────────────────────────────────────────────────────────

async function sendTempVoiceLog(
  client,
  guild,
  member,
  channel,
  action,
  extra = {},
) {
  try {
    const logSettings = await LogSettings.findOne({ guildId: guild.id });
    if (!logSettings?.logChannels?.voice?.enabled) return;

    const logChannel = client.channels.cache.get(
      logSettings.logChannels.voice.channelId,
    );
    if (!logChannel) return;

    let description = "";
    const extraFields = [];

    switch (action) {
      case "lock":
        description = `<@${member.id}> ${member.user.tag} a **verrouillé** son salon temporaire <#${channel.id}> (${channel.name})`;
        break;
      case "unlock":
        description = `<@${member.id}> ${member.user.tag} a **déverrouillé** son salon temporaire <#${channel.id}> (${channel.name})`;
        break;
      case "hide":
        description = `<@${member.id}> ${member.user.tag} a **masqué** son salon temporaire <#${channel.id}> (${channel.name})`;
        break;
      case "show":
        description = `<@${member.id}> ${member.user.tag} a rendu **visible** son salon temporaire <#${channel.id}> (${channel.name})`;
        break;
      case "rename":
        description = `<@${member.id}> ${member.user.tag} a **renommé** son salon temporaire`;
        extraFields.push(
          {
            name: "Ancien nom",
            value: extra.oldName ?? "Inconnu",
            inline: true,
          },
          {
            name: "Nouveau nom",
            value: extra.newName ?? "Inconnu",
            inline: true,
          },
        );
        break;
      case "limit":
        description = `<@${member.id}> ${member.user.tag} a modifié la **limite** de son salon temporaire <#${channel.id}> (${channel.name})`;
        extraFields.push({
          name: "Nouvelle limite",
          value: extra.limit === 0 ? "Illimitée" : `${extra.limit} membre(s)`,
          inline: true,
        });
        break;
      case "kick":
        description = `<@${member.id}> ${member.user.tag} a **expulsé** <@${extra.targetId}> de son salon temporaire <#${channel.id}> (${channel.name})`;
        extraFields.push({
          name: "Membre expulsé",
          value: `<@${extra.targetId}> (${extra.targetName ?? extra.targetId})`,
          inline: true,
        });
        break;
      case "ban":
        description = `<@${member.id}> ${member.user.tag} a **banni** <@${extra.targetId}> de son salon temporaire <#${channel.id}> (${channel.name})`;
        extraFields.push({
          name: "Membre banni",
          value: `<@${extra.targetId}> (${extra.targetName ?? extra.targetId})`,
          inline: true,
        });
        break;
      case "transfer":
        description = `<@${member.id}> ${member.user.tag} a **transféré** la propriété de <#${channel.id}> (${channel.name}) à <@${extra.targetId}>`;
        extraFields.push({
          name: "Nouveau propriétaire",
          value: `<@${extra.targetId}> (${extra.targetName ?? extra.targetId})`,
          inline: true,
        });
        break;
      case "reset":
        description = `<@${member.id}> ${member.user.tag} a **réinitialisé** son salon temporaire <#${channel.id}> (${channel.name})`;
        break;
      default:
        return;
    }

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.avatarURL({ dynamic: true }),
      })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(description)
      .addFields(
        ...extraFields,
        { name: "Salon", value: `<#${channel.id}> (${channel.name})` },
        {
          name: "ID",
          value: `\`\`\`ini\nUser = ${member.id}\nChannel = ${channel.id}\`\`\``,
        },
      )
      .setFooter({
        text: `${client.user.username}`,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (err) {
    console.error("[TempVoice] Erreur log voice:", err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTempVoiceDoc(interaction) {
  const voiceChannelId = interaction.member?.voice?.channelId;
  if (!voiceChannelId) return null;
  return TempVoiceChannel.findOne({ channelId: voiceChannelId });
}

async function checkOwnership(interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc) {
    await interaction.reply({
      content:
        "Vous devez être dans un salon vocal temporaire pour utiliser cette action.",
      ephemeral: true,
    });
    return null;
  }

  if (tempVoiceDoc.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: "Vous n'êtes pas le propriétaire de ce salon vocal temporaire.",
      ephemeral: true,
    });
    return null;
  }

  return tempVoiceDoc;
}

// ─── Boutons ──────────────────────────────────────────────────────────────────

async function handleButton(client, interaction) {
  switch (interaction.customId) {
    case "tv_lock":
      return handleLock(client, interaction);
    case "tv_hide":
      return handleHide(client, interaction);
    case "tv_rename":
      return handleRename(client, interaction);
    case "tv_limit":
      return handleLimit(client, interaction);
    case "tv_kick":
      return handleKick(client, interaction);
    case "tv_ban":
      return handleBan(client, interaction);
    case "tv_transfer":
      return handleTransfer(client, interaction);
    case "tv_reset":
      return handleReset(client, interaction);
  }
}

// Verrouiller / Déverrouiller
async function handleLock(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  tempVoiceDoc.locked = !tempVoiceDoc.locked;

  await channel.permissionOverwrites
    .edit(interaction.guild.roles.everyone, {
      Connect: tempVoiceDoc.locked ? false : null,
    })
    .catch(console.error);

  await tempVoiceDoc.save();
  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    tempVoiceDoc.locked ? "lock" : "unlock",
  );

  await interaction.editReply({
    content: tempVoiceDoc.locked
      ? "Salon verrouillé. Personne ne peut rejoindre sans invitation."
      : "Salon déverrouillé. Tout le monde peut rejoindre.",
  });
}

// Masquer / Afficher
async function handleHide(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  tempVoiceDoc.hidden = !tempVoiceDoc.hidden;

  await channel.permissionOverwrites
    .edit(interaction.guild.roles.everyone, {
      ViewChannel: tempVoiceDoc.hidden ? false : null,
    })
    .catch(console.error);

  await tempVoiceDoc.save();
  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    tempVoiceDoc.hidden ? "hide" : "show",
  );

  await interaction.editReply({
    content: tempVoiceDoc.hidden
      ? "Salon masqué. Il n'apparaît plus dans la liste des salons."
      : "Salon visible. Il apparaît maintenant dans la liste des salons.",
  });
}

// Renommer (affiche un modal)
async function handleRename(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  const modal = new ModalBuilder()
    .setCustomId("tv_modal_rename")
    .setTitle("Renommer le salon")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("tv_rename_input")
          .setLabel("Nouveau nom du salon")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Salon de gaming")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
    );

  await interaction.showModal(modal);
}

// Limite (affiche un modal)
async function handleLimit(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  const modal = new ModalBuilder()
    .setCustomId("tv_modal_limit")
    .setTitle("Limite de membres")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("tv_limit_input")
          .setLabel("Limite de membres (0 = illimitée)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Entrez un nombre entre 0 et 99")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2),
      ),
    );

  await interaction.showModal(modal);
}

// Expulser (UserSelectMenu)
async function handleKick(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId("tv_select_kick")
    .setPlaceholder("Sélectionnez un membre à expulser")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: "Sélectionnez le membre à expulser du salon :",
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
}

// Bannir (UserSelectMenu)
async function handleBan(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId("tv_select_ban")
    .setPlaceholder("Sélectionnez un membre à bannir")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: "Sélectionnez le membre à bannir du salon :",
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
}

// Transférer (UserSelectMenu)
async function handleTransfer(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId("tv_select_transfer")
    .setPlaceholder("Sélectionnez le nouveau propriétaire")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: "Sélectionnez le nouveau propriétaire du salon :",
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
}

// Réinitialiser
async function handleReset(client, interaction) {
  const tempVoiceDoc = await checkOwnership(interaction);
  if (!tempVoiceDoc) return;

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  const config = await TempVoiceConfig.findOne({
    guildId: interaction.guild.id,
  });
  const defaultName = config
    ? config.defaultName.replace("{username}", interaction.member.displayName)
    : channel.name;
  const defaultLimit = config?.defaultLimit ?? 0;

  await channel.setName(defaultName).catch(() => null);
  await channel.setUserLimit(defaultLimit).catch(() => null);

  await channel.permissionOverwrites
    .set([
      {
        id: interaction.guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: interaction.user.id,
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
    ])
    .catch(() => null);

  // Réinitialiser le document MongoDB (limite incluse)
  tempVoiceDoc.locked = false;
  tempVoiceDoc.hidden = false;
  tempVoiceDoc.bannedUsers = [];
  tempVoiceDoc.userLimit = defaultLimit;
  await tempVoiceDoc.save();

  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "reset",
  );

  await interaction.editReply({
    content: "Salon réinitialisé avec succès aux paramètres par défaut.",
  });
}

// ─── Modals ───────────────────────────────────────────────────────────────────

async function handleModal(client, interaction) {
  switch (interaction.customId) {
    case "tv_modal_rename":
      return handleModalRename(client, interaction);
    case "tv_modal_limit":
      return handleModalLimit(client, interaction);
  }
}

// Modal : renommer
async function handleModalRename(client, interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc || tempVoiceDoc.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Action non autorisée.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  const oldName = channel.name;
  const newName = interaction.fields.getTextInputValue("tv_rename_input");

  await channel.setName(newName).catch(() => null);
  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  // Persister le nom choisi par l'utilisateur pour la prochaine session
  await TempVoiceUser.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: interaction.user.id },
    { lastName: newName },
    { upsert: true, new: true },
  ).catch(() => null);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "rename",
    { oldName, newName },
  );

  await interaction.editReply({ content: `Salon renommé en **${newName}**.` });
}

// Modal : limite
async function handleModalLimit(client, interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc || tempVoiceDoc.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Action non autorisée.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const limitStr = interaction.fields.getTextInputValue("tv_limit_input");
  const limit = parseInt(limitStr, 10);

  if (isNaN(limit) || limit < 0 || limit > 99) {
    return interaction.editReply({
      content:
        "La limite doit être un nombre entre **0** et **99** (0 = illimitée).",
    });
  }

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  await channel.setUserLimit(limit).catch(() => null);

  // Sauvegarde dans le schema (comme locked / hidden)
  tempVoiceDoc.userLimit = limit;
  await tempVoiceDoc.save();

  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "limit",
    { limit },
  );

  await interaction.editReply({
    content:
      limit === 0
        ? "Limite supprimée — le salon est maintenant illimité."
        : `Limite fixée à **${limit}** membre(s).`,
  });
}

// ─── UserSelectMenus ──────────────────────────────────────────────────────────

async function handleUserSelect(client, interaction) {
  switch (interaction.customId) {
    case "tv_select_kick":
      return handleSelectKick(client, interaction);
    case "tv_select_ban":
      return handleSelectBan(client, interaction);
    case "tv_select_transfer":
      return handleSelectTransfer(client, interaction);
  }
}

// Expulser
async function handleSelectKick(client, interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc || tempVoiceDoc.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Action non autorisée.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetId = interaction.values[0];

  if (targetId === interaction.user.id) {
    return interaction.editReply({
      content: "Vous ne pouvez pas vous expulser vous-même.",
    });
  }

  const targetMember = await interaction.guild.members
    .fetch(targetId)
    .catch(() => null);
  if (!targetMember) {
    return interaction.editReply({ content: "Membre introuvable." });
  }

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);

  if (targetMember.voice?.channelId !== tempVoiceDoc.channelId) {
    return interaction.editReply({
      content: "Ce membre n'est pas dans votre salon vocal.",
    });
  }

  await targetMember.voice.disconnect().catch(() => null);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "kick",
    { targetId, targetName: targetMember.displayName },
  );

  await interaction.editReply({
    content: `**${targetMember.displayName}** a été expulsé du salon.`,
  });
}

// Bannir
async function handleSelectBan(client, interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc || tempVoiceDoc.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Action non autorisée.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetId = interaction.values[0];

  if (targetId === interaction.user.id) {
    return interaction.editReply({
      content: "Vous ne pouvez pas vous bannir vous-même.",
    });
  }

  if (tempVoiceDoc.bannedUsers.includes(targetId)) {
    return interaction.editReply({
      content: "Cet utilisateur est déjà banni de votre salon.",
    });
  }

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  const targetMember = await interaction.guild.members
    .fetch(targetId)
    .catch(() => null);

  tempVoiceDoc.bannedUsers.push(targetId);
  await tempVoiceDoc.save();

  await channel.permissionOverwrites
    .edit(targetId, { Connect: false })
    .catch(console.error);

  if (targetMember?.voice?.channelId === tempVoiceDoc.channelId) {
    await targetMember.voice.disconnect().catch(() => null);
  }

  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "ban",
    { targetId, targetName: targetMember?.displayName ?? targetId },
  );

  await interaction.editReply({
    content: `**${targetMember?.displayName ?? targetId}** a été banni du salon.`,
  });
}

// Transférer la propriété
async function handleSelectTransfer(client, interaction) {
  const tempVoiceDoc = await getTempVoiceDoc(interaction);

  if (!tempVoiceDoc || tempVoiceDoc.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Action non autorisée.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetId = interaction.values[0];

  if (targetId === interaction.user.id) {
    return interaction.editReply({
      content: "Vous êtes déjà le propriétaire de ce salon.",
    });
  }

  const targetMember = await interaction.guild.members
    .fetch(targetId)
    .catch(() => null);
  if (!targetMember) {
    return interaction.editReply({ content: "Membre introuvable." });
  }

  const channel = interaction.guild.channels.cache.get(tempVoiceDoc.channelId);
  if (!channel) return interaction.editReply({ content: "Salon introuvable." });

  const oldOwnerId = tempVoiceDoc.ownerId;

  tempVoiceDoc.ownerId = targetId;
  await tempVoiceDoc.save();

  await channel.permissionOverwrites
    .edit(oldOwnerId, {
      ManageChannels: null,
      MoveMembers: null,
      MuteMembers: null,
      DeafenMembers: null,
    })
    .catch(() => null);

  await channel.permissionOverwrites
    .edit(targetId, {
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      DeafenMembers: true,
      Connect: true,
      ViewChannel: true,
    })
    .catch(() => null);

  await updatePanel(channel, tempVoiceDoc, interaction.guild);

  await sendTempVoiceLog(
    client,
    interaction.guild,
    interaction.member,
    channel,
    "transfer",
    { targetId, targetName: targetMember.displayName },
  );

  await interaction.editReply({
    content: `La propriété du salon a été transférée à **${targetMember.displayName}**.`,
  });
}
