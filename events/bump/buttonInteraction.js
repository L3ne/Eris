const { Events, EmbedBuilder } = require("discord.js");
const Bump = require("../../schemas/bumpSchema");
const BumpConfig = require("../../schemas/bumpConfigSchema");

module.exports = {
  name: Events.InteractionCreate,

  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    if (customId === "bump_leaderboard") {
      await handleLeaderboard(client, interaction);
    } else if (customId === "bump_notify") {
      await handleNotify(client, interaction);
    }
  },
};

async function handleLeaderboard(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const bumps = await Bump.find({ guildId: interaction.guildId })
      .sort({ count: -1, lastBump: -1 })
      .limit(10);

    if (bumps.length === 0) {
      return await interaction.editReply({
        content: "Aucun bump enregistré pour ce serveur.",
      });
    }

    const leaderboard = bumps
      .map((bump, index) => {
        const rank = index + 1;
        const medal =
          rank === 1
            ? "🥇"
            : rank === 2
              ? "🥈"
              : rank === 3
                ? "🥉"
                : `#${rank}`;
        return `${medal} <@${bump.userId}> — ${bump.count} bump(s)`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setDescription(leaderboard)
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[Bump] Erreur leaderboard:", err);
    return await interaction.editReply({
      content:
        "Une erreur est survenue lors de la récupération du leaderboard.",
    });
  }
}

async function handleNotify(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // Utiliser BumpConfig pour les notifications — plus de hack userId = guildId
    const config = await BumpConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true },
    );

    const isRegistered = config.notifyUsers.includes(userId);

    if (isRegistered) {
      // Retirer de la liste
      await BumpConfig.updateOne(
        { guildId },
        { $pull: { notifyUsers: userId } },
      );
      return await interaction.editReply({
        content: "Vous ne serez plus notifié pour le prochain bump.",
      });
    } else {
      // Ajouter à la liste
      await BumpConfig.updateOne(
        { guildId },
        { $addToSet: { notifyUsers: userId } },
      );
      return await interaction.editReply({
        content:
          "Vous serez notifié quand le bump sera de nouveau disponible !",
      });
    }
  } catch (err) {
    console.error("[Bump] Erreur notify:", err);
    return await interaction.editReply({
      content: "Une erreur est survenue lors de la gestion de la notification.",
    });
  }
}
