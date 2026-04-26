const {
  Events,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const {
  createTicket,
  closeTicket,
  addMemberToTicket,
  removeMemberFromTicket,
} = require("../../utils/ticketUtils");
const TicketConfig = require("../../schemas/ticketConfigSchema");
const Ticket = require("../../schemas/ticketSchema");

module.exports = {
  name: Events.InteractionCreate,
  execute: async (client, interaction) => {
    if (interaction.isButton()) {
      await handleButtonInteraction(client, interaction);
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(client, interaction);
    }

    if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenu(client, interaction);
    }

    if (interaction.isUserSelectMenu()) {
      await handleUserSelectMenu(client, interaction);
    }
  },
};

// ─── Boutons ──────────────────────────────────────────────────────────────────

async function handleButtonInteraction(client, interaction) {
  switch (interaction.customId) {
    case "ticket_open":
      return handleOpenTicket(client, interaction);
    case "ticket_close":
      return handleCloseTicket(client, interaction);
    case "ticket_add":
      return handleAddMember(client, interaction);
    case "ticket_remove":
      return handleRemoveMember(client, interaction);
    case "confirm_close":
      return handleConfirmClose(client, interaction);
    case "cancel_close":
      return handleCancelClose(client, interaction);
  }
}

// Ouvrir un ticket (modal)
async function handleOpenTicket(client, interaction) {
  const modal = new ModalBuilder()
    .setCustomId("ticket_open_modal")
    .setTitle("Créer un ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticket_reason")
          .setLabel("Raison du ticket")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Décrivez votre problème ou votre demande...")
          .setRequired(true)
          .setMaxLength(500),
      ),
    );

  await interaction.showModal(modal);
}

// Confirmation de fermeture
async function handleCloseTicket(client, interaction) {
  const embed = new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.avatarURL({ dynamic: true }),
    })
    .setDescription("Êtes-vous sûr de vouloir fermer ce ticket ?")
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_close")
      .setLabel("Confirmer")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_close")
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

// Ajouter un membre → UserSelectMenuBuilder
async function handleAddMember(client, interaction) {
  const config = await TicketConfig.findOne({ guildId: interaction.guildId });
  const supportRoles = config?.supportRoles || [];
  const hasPermission =
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    interaction.member.roles.cache.some((r) => supportRoles.includes(r.id));

  if (!hasPermission) {
    return interaction.reply({
      content: "Vous n'avez pas la permission d'ajouter des membres.",
      ephemeral: true,
    });
  }

  const ticketData = await Ticket.findOne({
    channelId: interaction.channelId,
    status: "open",
  });

  if (!ticketData) {
    return interaction.reply({
      content: "Ce ticket n'existe pas ou est fermé.",
      ephemeral: true,
    });
  }

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId("ticket_add_select")
    .setPlaceholder("Sélectionnez un membre à ajouter")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: "Sélectionnez un membre à ajouter au ticket :",
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
}

// Retirer un membre → StringSelectMenu avec les membres du ticket
async function handleRemoveMember(client, interaction) {
  const config = await TicketConfig.findOne({ guildId: interaction.guildId });
  const supportRoles = config?.supportRoles || [];
  const hasPermission =
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    interaction.member.roles.cache.some((r) => supportRoles.includes(r.id));

  if (!hasPermission) {
    return interaction.reply({
      content: "Vous n'avez pas la permission de retirer des membres.",
      ephemeral: true,
    });
  }

  const ticketData = await Ticket.findOne({
    channelId: interaction.channelId,
    status: "open",
  });

  if (!ticketData) {
    return interaction.reply({
      content: "Ce ticket n'existe pas ou est fermé.",
      ephemeral: true,
    });
  }

  const removable = ticketData.members.filter(
    (id) => id !== ticketData.creatorId,
  );

  if (removable.length === 0) {
    return interaction.reply({
      content: "Aucun membre à retirer.",
      ephemeral: true,
    });
  }

  const members = await Promise.all(
    removable.map((id) =>
      interaction.guild.members.fetch(id).catch(() => null),
    ),
  );
  const valid = members.filter(Boolean);

  if (valid.length === 0) {
    return interaction.reply({
      content: "Aucun membre valide à retirer.",
      ephemeral: true,
    });
  }

  const options = valid.map((m) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(m.user.tag)
      .setDescription(m.id)
      .setValue(m.id),
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("ticket_remove_select")
    .setPlaceholder("Sélectionnez un membre à retirer")
    .setMinValues(1)
    .setMaxValues(1)
    .setOptions(options);

  await interaction.reply({
    content: "Sélectionnez un membre à retirer du ticket :",
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
}

// Confirmation : fermer
async function handleConfirmClose(client, interaction) {
  await interaction.deferReply();

  const result = await closeTicket(
    client,
    interaction,
    interaction.channelId,
    interaction.user.id,
  );

  if (result.success) {
    await interaction.editReply({
      content: "Ticket fermé. Le salon sera supprimé dans 10 secondes.",
    });
  } else {
    await interaction.editReply({ content: result.message });
  }
}

// Annuler fermeture
async function handleCancelClose(client, interaction) {
  await interaction.update({
    content: "Fermeture annulée.",
    embeds: [],
    components: [],
  });
}

// ─── String Select Menus ──────────────────────────────────────────────────────

async function handleStringSelectMenu(client, interaction) {
  switch (interaction.customId) {
    case "ticket_remove_select":
      return handleRemoveMemberSelect(client, interaction);
  }
}

async function handleRemoveMemberSelect(client, interaction) {
  const userId = interaction.values[0];

  await interaction.deferReply({ ephemeral: true });

  const result = await removeMemberFromTicket(
    client,
    interaction,
    interaction.channelId,
    userId,
  );

  await interaction.editReply({
    content: result.success ? "Membre retiré avec succès." : result.message,
  });
}

// ─── User Select Menus ────────────────────────────────────────────────────────

async function handleUserSelectMenu(client, interaction) {
  switch (interaction.customId) {
    case "ticket_add_select":
      return handleAddMemberSelect(client, interaction);
  }
}

async function handleAddMemberSelect(client, interaction) {
  const userId = interaction.values[0];

  await interaction.deferReply({ ephemeral: true });

  // Empêcher d'ajouter un bot
  const targetUser = await client.users.fetch(userId).catch(() => null);
  if (targetUser?.bot) {
    return interaction.editReply({ content: "Impossible d'ajouter un bot." });
  }

  const result = await addMemberToTicket(
    client,
    interaction,
    interaction.channelId,
    userId,
  );

  await interaction.editReply({
    content: result.success ? "Membre ajouté avec succès." : result.message,
  });
}

// ─── Modal Submit ─────────────────────────────────────────────────────────────

async function handleModalSubmit(client, interaction) {
  if (interaction.customId === "ticket_open_modal") {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.fields.getTextInputValue("ticket_reason");
    const result = await createTicket(client, interaction, reason);

    if (result.success) {
      await interaction.editReply({
        content: `Ticket créé : <#${result.channel.id}>`,
      });
    } else {
      await interaction.editReply({ content: result.message });
    }
  }
}
