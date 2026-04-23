const { Events, EmbedBuilder } = require("discord.js");
const Bump = require("../../schemas/bumpSchema");

module.exports = {
  name: Events.InteractionCreate,

  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    if (customId === 'bump_leaderboard') {
      await handleLeaderboard(client, interaction);
    } else if (customId === 'bump_notify') {
      await handleNotify(client, interaction);
    }
  }
};

async function handleLeaderboard(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const bumps = await Bump.find({ guildId: interaction.guildId })
      .sort({ count: -1, lastBump: -1 })
      .limit(10);

    if (bumps.length === 0) {
      return await interaction.editReply({
        content: '❌ Aucun bump enregistré pour ce serveur.'
      });
    }

    const leaderboard = bumps.map((bump, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      return `${medal} <@${bump.userId}> - ${bump.count} bumps`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard des Bumps')
      .setColor(client.color || '#00ff00')
      .setDescription(leaderboard)
      .setTimestamp()
      .setFooter({ text: `Serveur: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

    await interaction.editReply({
      embeds: [embed]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du leaderboard:', error);
    await interaction.editReply({
      content: '❌ Une erreur est survenue lors de la récupération du leaderboard.'
    });
  }
}

async function handleNotify(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Vérifier si l'utilisateur a déjà un enregistrement bump
    const existing = await Bump.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id
    });

    if (existing) {
      // Toggle le champ notify
      existing.notify = !existing.notify;
      await existing.save();

      if (existing.notify) {
        await interaction.editReply({
          content: '✅ Vous serez notifié quand le bump sera disponible !'
        });
      } else {
        await interaction.editReply({
          content: '✅ Vous ne serez plus notifié pour le prochain bump.'
        });
      }
    } else {
      // Créer un nouvel enregistrement avec notify = true
      await Bump.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        count: 0,
        notify: true
      });

      await interaction.editReply({
        content: '✅ Vous serez notifié quand le bump sera disponible !'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la gestion de la notification:', error);
    await interaction.editReply({
      content: '❌ Une erreur est survenue lors de la gestion de la notification.'
    });
  }
}
