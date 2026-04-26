const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { Giveaway, GiveawayConfig } = require("../../schemas/giveawaySchema");
const {
  buildGiveawayEmbed,
  buildGiveawayComponents,
} = require("../../utils/giveawayUtils");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENTRIES_PER_PAGE = 10;

/**
 * Construit la liste des entrées triées par count décroissant.
 */
function buildEntriesList(giveaway, guild) {
  return giveaway.participants
    .map((userId) => {
      const member = guild.members.cache.get(userId);
      let entries = 1;
      if (
        giveaway.bonusEntriesRoleId &&
        member?.roles.cache.has(giveaway.bonusEntriesRoleId)
      ) {
        entries += giveaway.bonusEntriesCount ?? 3;
      }
      return { userId, entries };
    })
    .sort((a, b) => b.entries - a.entries);
}

/**
 * Construit l'embed de participants paginé (style Giveaway Boat).
 */
function buildEntriesEmbed(giveaway, entriesList, page, totalPages, client) {
  const total = entriesList.length;
  const start = (page - 1) * ENTRIES_PER_PAGE;
  const items = entriesList.slice(start, start + ENTRIES_PER_PAGE);

  const listText =
    items.length > 0
      ? items
          .map((e, i) => {
            const n = start + i + 1;
            const label = e.entries === 1 ? "entry" : "entries";
            return `${n}. <@${e.userId}> (${e.entries} ${label})`;
          })
          .join("\n")
      : "*No participants yet.*";

  const description = [
    `These are the members that have participated in the giveaway of **${giveaway.prize}**:`,
    "",
    listText,
    "",
    `Total Participants: **${total}**`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor("#dac7bb")
    .setTitle(`🎉 Giveaway Participants (Page ${page}/${totalPages})`)
    .setDescription(description)
    .setFooter({ text: `${client.user?.username ?? "Giveaway"} • Today at` })
    .setTimestamp();
}

/**
 * Construit les boutons de navigation ◄ Go To Page ►.
 */
function buildEntriesPagination(messageId, page, totalPages) {
  const prevBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_prev_${messageId}_${page}`)
    .setLabel("◄")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const gotoBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_goto_${messageId}`)
    .setLabel("Go To Page")
    .setStyle(ButtonStyle.Primary);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`giveaway_entries_next_${messageId}_${page}`)
    .setLabel("►")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  return [new ActionRowBuilder().addComponents(prevBtn, gotoBtn, nextBtn)];
}

/**
 * Envoie (ou met à jour) la vue paginée des participants.
 * @param {'reply'|'update'|'followUp'} mode
 */
async function sendEntriesPage(interaction, giveaway, page, mode = "reply") {
  const guild = interaction.guild;
  const entriesList = buildEntriesList(giveaway, guild);
  const total = entriesList.length;
  const totalPages = Math.max(1, Math.ceil(total / ENTRIES_PER_PAGE));

  page = Math.max(1, Math.min(page, totalPages));

  const embed = buildEntriesEmbed(
    giveaway,
    entriesList,
    page,
    totalPages,
    interaction.client,
  );
  const components = buildEntriesPagination(
    giveaway.messageId,
    page,
    totalPages,
  );

  const payload = { embeds: [embed], components, ephemeral: true };

  if (mode === "update") return interaction.update(payload);
  if (mode === "followUp") return interaction.followUp(payload);

  // mode === 'reply'
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  await interaction.deferReply({ ephemeral: true });
  return interaction.editReply(payload);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

module.exports = {
  name: Events.InteractionCreate,
  execute: async (client, interaction) => {
    try {
      // ── Boutons ───────────────────────────────────────────────────────
      if (interaction.isButton()) {
        const id = interaction.customId;

        // 🎉 Participer / retirer sa participation
        if (id === "giveaway_participate") {
          return handleParticipate(client, interaction);
        }

        // 👤 Voir les participants (page 1)
        if (id === "giveaway_participants_view") {
          return handleParticipantsView(client, interaction);
        }

        // ◄ Page précédente  —  format: giveaway_entries_prev_{msgId}_{page}
        if (id.startsWith("giveaway_entries_prev_")) {
          return handleEntriesNav(client, interaction, "prev");
        }

        // ► Page suivante  —  format: giveaway_entries_next_{msgId}_{page}
        if (id.startsWith("giveaway_entries_next_")) {
          return handleEntriesNav(client, interaction, "next");
        }

        // Aller à une page  —  format: giveaway_entries_goto_{msgId}
        if (id.startsWith("giveaway_entries_goto_")) {
          return handleEntriesGoto(client, interaction);
        }
      }

      // ── Modal submit ─────────────────────────────────────────────────
      if (interaction.isModalSubmit()) {
        // format: giveaway_entries_page_{msgId}
        if (interaction.customId.startsWith("giveaway_entries_page_")) {
          return handleEntriesPageModal(client, interaction);
        }
      }
    } catch (err) {
      console.error("[Giveaway] interactionCreate error:", err);
    }
  },
};

// ─── Participate ──────────────────────────────────────────────────────────────

async function handleParticipate(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.message.id;
  const giveaway = await Giveaway.findOne({
    messageId,
    guildId: interaction.guild.id,
  });

  if (!giveaway || giveaway.status !== "active") {
    return interaction.editReply({
      content: "❌ Ce giveaway n'est plus actif.",
    });
  }

  const userId = interaction.user.id;

  // Vérification du rôle requis
  if (giveaway.requiredRoleId) {
    const hasRole = interaction.member.roles.cache.has(giveaway.requiredRoleId);
    if (!hasRole) {
      return interaction.editReply({
        content: `❌ Vous devez avoir le rôle <@&${giveaway.requiredRoleId}> pour participer.`,
      });
    }
  }

  const config = await GiveawayConfig.findOne({
    guildId: interaction.guild.id,
  });
  const alreadyIn = giveaway.participants.includes(userId);

  if (alreadyIn) {
    // Retirer la participation
    giveaway.participants = giveaway.participants.filter((id) => id !== userId);
    await giveaway.save();

    await interaction.message
      .edit({
        embeds: [
          buildGiveawayEmbed(giveaway, interaction.guild, client, config),
        ],
        components: buildGiveawayComponents(giveaway),
      })
      .catch(() => null);

    return interaction.editReply({
      content: "✅ Vous avez retiré votre participation.",
    });
  } else {
    // Ajouter la participation
    giveaway.participants.push(userId);
    await giveaway.save();

    await interaction.message
      .edit({
        embeds: [
          buildGiveawayEmbed(giveaway, interaction.guild, client, config),
        ],
        components: buildGiveawayComponents(giveaway),
      })
      .catch(() => null);

    return interaction.editReply({
      content: "🎉 Vous participez maintenant au giveaway ! Bonne chance !",
    });
  }
}

// ─── Participants View ────────────────────────────────────────────────────────

async function handleParticipantsView(client, interaction) {
  const messageId = interaction.message.id;
  const giveaway = await Giveaway.findOne({
    messageId,
    guildId: interaction.guild.id,
  });

  if (!giveaway) {
    return interaction.reply({
      content: "❌ Giveaway introuvable.",
      ephemeral: true,
    });
  }

  if (giveaway.participants.length === 0) {
    return interaction.reply({
      content: "📭 Aucun participant pour l'instant.",
      ephemeral: true,
    });
  }

  // Fetch members pour checker les bonus roles
  await interaction.guild.members.fetch().catch(() => null);

  await sendEntriesPage(interaction, giveaway, 1, "reply");
}

// ─── Navigation prev / next ───────────────────────────────────────────────────

async function handleEntriesNav(client, interaction, direction) {
  // customId: giveaway_entries_prev_{msgId}_{page}  ou  _next_{msgId}_{page}
  const parts = interaction.customId.split("_");
  // format: ['giveaway', 'entries', 'prev'|'next', ...msgIdParts, page]
  // msgId peut contenir des underscores → on récupère depuis la fin
  const currentPage = parseInt(parts[parts.length - 1], 10);
  // messageId = tout ce qui est entre 'prev'|'next' et le dernier segment
  const afterDir = parts.slice(3, parts.length - 1).join("_");
  const messageId = afterDir;

  const giveaway = await Giveaway.findOne({
    messageId,
    guildId: interaction.guild.id,
  });
  if (!giveaway) {
    return interaction.update({
      content: "❌ Giveaway introuvable.",
      embeds: [],
      components: [],
    });
  }

  await interaction.guild.members.fetch().catch(() => null);

  const newPage = direction === "prev" ? currentPage - 1 : currentPage + 1;
  await sendEntriesPage(interaction, giveaway, newPage, "update");
}

// ─── Go To Page (affiche le modal) ───────────────────────────────────────────

async function handleEntriesGoto(client, interaction) {
  // customId: giveaway_entries_goto_{msgId}
  const messageId = interaction.customId.replace("giveaway_entries_goto_", "");

  const modal = new ModalBuilder()
    .setCustomId(`giveaway_entries_page_${messageId}`)
    .setTitle("Aller à une page")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("page_number")
          .setLabel("Numéro de page")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: 3")
          .setRequired(true)
          .setMaxLength(4),
      ),
    );

  await interaction.showModal(modal);
}

// ─── Modal Submit : Go To Page ────────────────────────────────────────────────

async function handleEntriesPageModal(client, interaction) {
  // customId: giveaway_entries_page_{msgId}
  const messageId = interaction.customId.replace("giveaway_entries_page_", "");
  const rawPage = interaction.fields.getTextInputValue("page_number");
  const targetPage = parseInt(rawPage, 10);

  if (isNaN(targetPage) || targetPage < 1) {
    return interaction.reply({
      content: "❌ Numéro de page invalide.",
      ephemeral: true,
    });
  }

  const giveaway = await Giveaway.findOne({
    messageId,
    guildId: interaction.guild.id,
  });
  if (!giveaway) {
    return interaction.reply({
      content: "❌ Giveaway introuvable.",
      ephemeral: true,
    });
  }

  await interaction.guild.members.fetch().catch(() => null);

  // Le modal submit ne peut pas update un ancien message → on reply ephemeral
  await sendEntriesPage(interaction, giveaway, targetPage, "reply");
}
