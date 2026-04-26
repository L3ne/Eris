const {
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const Ticket = require("../schemas/ticketSchema");
const TicketConfig = require("../schemas/ticketConfigSchema");

/**
 * Crée un nouveau ticket
 * @param {Client} client - Le client Discord
 * @param {Interaction} interaction - L'interaction Discord
 * @param {string} reason - La raison du ticket
 * @returns {Promise<Object>} - Les informations du ticket créé
 */
async function createTicket(client, interaction, reason) {
  const guild = interaction.guild;
  const member = interaction.member;

  // Vérifier si l'utilisateur a déjà un ticket ouvert
  const hasOpenTicket = await Ticket.hasOpenTicket(guild.id, member.id);
  if (hasOpenTicket) {
    return {
      success: false,
      message: "Vous avez déjà un ticket ouvert.",
    };
  }

  // Obtenir le prochain ID de ticket
  const ticketId = await Ticket.getNextTicketId(guild.id);

  // Récupérer la configuration MongoDB
  const config = await TicketConfig.findOne({ guildId: guild.id });
  const categoryId = config?.categoryId || null;

  // Vérifier que la catégorie est configurée
  if (!categoryId) {
    return {
      success: false,
      message:
        "Aucune catégorie de tickets configurée. Utilisez `/ticket-config` pour configurer une catégorie.",
    };
  }

  // Vérifier que la catégorie existe
  const category = await guild.channels.fetch(categoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return {
      success: false,
      message: "La catégorie configurée n'est pas valide ou n'existe pas.",
    };
  }

  // Permissions du salon
  const permissions = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  // Ajouter les rôles support aux permissions
  const supportRoles = config?.supportRoles || [];
  supportRoles.forEach((roleId) => {
    permissions.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  });

  // Créer le salon
  const channel = await guild.channels.create({
    name: ticketId,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: permissions,
  });

  // Sauvegarder le ticket dans MongoDB
  const ticket = new Ticket({
    ticketId: ticketId,
    guildId: guild.id,
    channelId: channel.id,
    creatorId: member.id,
    reason: reason,
    category: "general",
    status: "open",
    members: [member.id],
  });
  await ticket.save();

  // Envoyer le message d'accueil dans le ticket
  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.avatarURL({ dynamic: true }),
    })
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setDescription(
      `Bienvenue <@${member.id}> !\n\n**Raison :** ${reason}\n\nUn membre du staff va vous répondre bientôt.`,
    )
    .addFields(
      { name: "Ticket", value: `\`${ticketId}\``, inline: true },
      { name: "Créateur", value: `<@${member.id}>`, inline: true },
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_add")
      .setLabel("Ajouter un membre")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_remove")
      .setLabel("Retirer un membre")
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `${member} | ${config.supportRoles.map((roleId) => `<@&${roleId}>`).join(", ")}`,
    embeds: [embed],
    components: [row],
  });

  // Logger la création du ticket
  const logTicketCreate = require("../events/logs/ticketCreate");
  await logTicketCreate(client, ticket);

  return {
    success: true,
    ticket: ticket,
    channel: channel,
  };
}

/**
 * Ferme un ticket
 * @param {Client} client - Le client Discord
 * @param {Interaction} interaction - L'interaction Discord
 * @param {string} channelId - L'ID du channel du ticket
 * @param {string} closedBy - L'ID de l'utilisateur qui ferme le ticket
 * @returns {Promise<Object>} - Le résultat de la fermeture
 */
async function closeTicket(client, interaction, channelId, closedBy) {
  const ticket = await Ticket.findOne({ channelId: channelId });

  if (!ticket) {
    return {
      success: false,
      message: "Ce ticket n'existe pas.",
    };
  }

  if (ticket.status === "closed") {
    return {
      success: false,
      message: "Ce ticket est déjà fermé.",
    };
  }

  const channel = await client.channels.fetch(channelId);

  // Mettre à jour le ticket
  ticket.status = "closed";
  ticket.closedAt = new Date();
  ticket.closedBy = closedBy;
  await ticket.save();

  // Envoyer le message de fermeture
  const closer = await client.users.fetch(closedBy).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor(
      closer
        ? { name: closer.tag, iconURL: closer.avatarURL({ dynamic: true }) }
        : { name: "Staff" },
    )
    .setDescription(`Ce ticket a été fermé par <@${closedBy}>`)
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  // Logger la fermeture du ticket
  const logTicketClose = require("../events/logs/ticketClose");
  await logTicketClose(client, ticket, closedBy);

  // Générer et envoyer la transcription
  await sendTranscript(client, channelId, ticket.guildId);

  // Supprimer le channel après 10 secondes
  setTimeout(async () => {
    try {
      await channel.delete();
      await Ticket.deleteOne({ channelId: channelId });
    } catch (err) {
      console.error("Erreur lors de la suppression du channel:", err);
    }
  }, 10 * 1000);

  return {
    success: true,
    ticket: ticket,
  };
}

/**
 * Ajoute un membre à un ticket
 * @param {Client} client - Le client Discord
 * @param {Interaction} interaction - L'interaction Discord
 * @param {string} channelId - L'ID du channel du ticket
 * @param {string} userId - L'ID de l'utilisateur à ajouter
 * @returns {Promise<Object>} - Le résultat de l'ajout
 */
async function addMemberToTicket(client, interaction, channelId, userId) {
  const ticket = await Ticket.findOne({ channelId: channelId });

  if (!ticket) {
    return {
      success: false,
      message: "Ce ticket n'existe pas.",
    };
  }

  if (ticket.status !== "open") {
    return {
      success: false,
      message: "Ce ticket est fermé.",
    };
  }

  const config = await TicketConfig.findOne({ guildId: interaction.guildId });
  const supportRoles = config?.supportRoles || [];
  const member = interaction.member;

  const hasPermission =
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.roles.cache.some((role) => supportRoles.includes(role.id));

  if (!hasPermission) {
    return {
      success: false,
      message: "Vous n'avez pas la permission d'ajouter des membres.",
    };
  }

  if (ticket.members.includes(userId)) {
    return {
      success: false,
      message: "Cet utilisateur est déjà dans le ticket.",
    };
  }

  const channel = await client.channels.fetch(channelId);
  const user = await client.users.fetch(userId);

  await channel.permissionOverwrites.create(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });

  ticket.members.push(userId);
  await ticket.save();

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.avatarURL({ dynamic: true }),
    })
    .setDescription(`<@${member.id}> a ajouté <@${userId}> au ticket`)
    .addFields({
      name: "ID",
      value: `\`\`\`ini\nAddedBy = ${member.id}\nAdded = ${userId}\`\`\``,
    })
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  return {
    success: true,
    ticket: ticket,
  };
}

/**
 * Retire un membre d'un ticket
 * @param {Client} client - Le client Discord
 * @param {Interaction} interaction - L'interaction Discord
 * @param {string} channelId - L'ID du channel du ticket
 * @param {string} userId - L'ID de l'utilisateur à retirer
 * @returns {Promise<Object>} - Le résultat du retrait
 */
async function removeMemberFromTicket(client, interaction, channelId, userId) {
  const ticket = await Ticket.findOne({ channelId: channelId, status: "open" });

  if (!ticket) {
    return {
      success: false,
      message: "Ce ticket n'existe pas ou est fermé.",
    };
  }

  if (!ticket.members.includes(userId)) {
    return {
      success: false,
      message: "Cet utilisateur n'est pas dans le ticket.",
    };
  }

  if (userId === ticket.creatorId) {
    return {
      success: false,
      message: "Vous ne pouvez pas retirer le créateur du ticket.",
    };
  }

  const channel = await client.channels.fetch(channelId);
  const member = await interaction.guild.members.fetch(userId);

  // Retirer les permissions
  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: false,
  });

  // Mettre à jour le ticket
  ticket.members = ticket.members.filter((id) => id !== userId);
  await ticket.save();

  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.avatarURL({ dynamic: true }),
    })
    .setDescription(`<@${interaction.user.id}> a retiré <@${userId}> du ticket`)
    .addFields({
      name: "ID",
      value: `\`\`\`ini\nRemovedBy = ${interaction.user.id}\nRemoved = ${userId}\`\`\``,
    })
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  return {
    success: true,
    ticket: ticket,
  };
}

/**
 * Génère une transcription du ticket
 * @param {Client} client - Le client Discord
 * @param {string} channelId - L'ID du channel du ticket
 * @returns {Promise<Object>} - La transcription générée
 */
async function generateTranscript(client, channelId) {
  const ticket = await Ticket.findOne({ channelId: channelId });

  if (!ticket) {
    return {
      success: false,
      message: "Ce ticket n'existe pas.",
    };
  }

  const channel = await client.channels.fetch(channelId);

  try {
    const attachment = await createTranscript(channel, {
      limit: -1,
      returnType: "attachment",
      filename: `transcript-${ticket.ticketId}.html`,
      saveImages: true,
      footerText: `Transcript du ticket ${ticket.ticketId} - ${new Date().toLocaleString()}`,
    });

    return {
      success: true,
      attachment: attachment,
      ticket: ticket,
    };
  } catch (err) {
    console.error("Erreur lors de la génération de la transcription:", err);
    return {
      success: false,
      message: "Erreur lors de la génération de la transcription.",
    };
  }
}

/**
 * Envoie la transcription dans le channel de logs
 * @param {Client} client - Le client Discord
 * @param {string} channelId - L'ID du channel du ticket
 * @returns {Promise<Object>} - Le résultat de l'envoi
 */
async function sendTranscript(client, channelId, guildId) {
  const config = await TicketConfig.findOne({ guildId: guildId });
  const logChannelId = config?.logChannelId;

  if (!logChannelId) {
    return {
      success: false,
      message: "Aucun channel de logs configuré.",
    };
  }

  const result = await generateTranscript(client, channelId);

  if (!result.success) {
    return result;
  }

  try {
    const logChannel = await client.channels.fetch(logChannelId);

    const transcriptCreator = await client.users
      .fetch(result.ticket.creatorId)
      .catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor(
        transcriptCreator
          ? {
              name: transcriptCreator.tag,
              iconURL: transcriptCreator.avatarURL({ dynamic: true }),
            }
          : { name: result.ticket.ticketId },
      )
      .setThumbnail(
        transcriptCreator?.displayAvatarURL({ dynamic: true }) || null,
      )
      .setDescription(`Transcript du ticket \`${result.ticket.ticketId}\``)
      .addFields(
        {
          name: "Créateur",
          value: `<@${result.ticket.creatorId}>`,
          inline: true,
        },
        { name: "Raison", value: result.ticket.reason, inline: true },
        {
          name: "ID",
          value: `\`\`\`ini\nTicket = ${result.ticket.ticketId}\nCreator = ${result.ticket.creatorId}\nChannel = ${result.ticket.channelId}\`\`\``,
        },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await logChannel.send({
      embeds: [embed],
      files: [result.attachment],
    });

    // Mettre à jour l'URL de la transcription
    result.ticket.transcriptUrl = logChannelId;
    await result.ticket.save();

    return {
      success: true,
      message: "Transcription envoyée avec succès.",
    };
  } catch (err) {
    console.error("Erreur lors de l'envoi de la transcription:", err);
    return {
      success: false,
      message: "Erreur lors de l'envoi de la transcription.",
    };
  }
}

module.exports = {
  createTicket,
  closeTicket,
  addMemberToTicket,
  removeMemberFromTicket,
  generateTranscript,
  sendTranscript,
};
