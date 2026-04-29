const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Bump = require("../../schemas/bumpSchema");
const BumpConfig = require("../../schemas/bumpConfigSchema");
const XPUtils = require("../../utils/xpUtils");
const levelSettingsSchema = require("../../schemas/levelSettingsSchema");

const DISBOARD_ID = "302050872383242240";
const BUMP_COOLDOWN = 2 * 60 * 60 * 1000;

module.exports = {
  name: Events.MessageCreate,

  async execute(client, message) {
    if (!message.guild) return;
    if (message.author.id !== DISBOARD_ID) return;
    if (!message.interaction) return;

    const embed = message.embeds[0];
    if (!embed) return;
    if (!embed.description?.toLowerCase().includes("bump")) return;

    const bumper = message.interaction.user;
    const guildId = message.guild.id;

    // ─── Récupérer ou créer la config du serveur ──────────────────────────────
    let config = await BumpConfig.findOne({ guildId });
    if (!config) config = await BumpConfig.create({ guildId });

    // ─── Mettre à jour les stats du bumper ────────────────────────────────────
    const data = await Bump.findOneAndUpdate(
      { guildId, userId: bumper.id },
      { $inc: { count: 1 }, $set: { lastBump: new Date() } },
      { upsert: true, new: true },
    );

    // ─── Récompense XP ────────────────────────────────────────────────────────
    let rewardMessage = config.xpEnabled
      ? `+${config.xpAmount} XP`
      : "Aucune récompense XP";

    if (config.xpEnabled) {
      try {
        const result = await XPUtils.addXP(guildId, bumper.id, config.xpAmount);

        if (result?.levelUp) {
          const levelSettings = await levelSettingsSchema.findOne({ guildId });
          const levelUpChannel = message.guild.channels.cache.get(
            levelSettings?.levelUpChannel,
          );

          if (levelUpChannel) {
            const lvlEmbed = new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                `Félicitations <@${bumper.id}> !\nVous avez atteint le niveau **${result.newLevel}** !`,
              )
              .setThumbnail(bumper.displayAvatarURL({ dynamic: true }))
              .setFooter({
                text: client.user.username,
                iconURL: client.user.avatarURL({ dynamic: true }),
              })
              .setTimestamp();

            await levelUpChannel.send({ embeds: [lvlEmbed] }).catch(() => null);
          }
        }
      } catch (err) {
        console.error("[Bump] Erreur XP bump:", err);
      }
    }

    // ─── Embed de confirmation ────────────────────────────────────────────────
    const nextBump = Math.floor((Date.now() + BUMP_COOLDOWN) / 1000);

    const bumpEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: bumper.tag,
        iconURL: bumper.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(bumper.displayAvatarURL({ dynamic: true }))
      .setDescription(`Merci pour le bump <@${bumper.id}> !`)
      .addFields(
        { name: "Bumps totaux", value: String(data.count), inline: true },
        { name: "Récompense", value: rewardMessage, inline: true },
        { name: "Prochain bump", value: `<t:${nextBump}:R>`, inline: true },
      )
      .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bump_leaderboard")
        .setLabel("Leaderboard")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bump_notify")
        .setLabel("Notify Me")
        .setStyle(ButtonStyle.Primary),
    );

    const bumpMessage = await message.channel.send({
      embeds: [bumpEmbed],
      components: [row],
    });

    // ─── Rappel après le cooldown ─────────────────────────────────────────────
    setTimeout(async () => {
      try {
        // Recharger la config pour avoir la liste à jour des notifyUsers
        const freshConfig = await BumpConfig.findOne({ guildId });
        const notifyUsers = freshConfig?.notifyUsers ?? [];

        const mentionStr =
          notifyUsers.length > 0
            ? notifyUsers.map((id) => `<@${id}>`).join(" ") + " "
            : "";

        // Déterminer le salon de rappel
        const reminderChannel = freshConfig?.reminderChannelId
          ? (message.guild.channels.cache.get(freshConfig.reminderChannelId) ??
            message.channel)
          : message.channel;

        await reminderChannel
          .send({
            content: `${mentionStr}Le bump est de nouveau disponible ! \`/bump\``,
          })
          .catch(() => null);

        // Retirer les boutons du message de bump
        await bumpMessage.edit({ components: [] }).catch(() => null);

        // Vider la liste des notifications
        if (freshConfig) {
          freshConfig.notifyUsers = [];
          await freshConfig.save();
        }
      } catch (err) {
        console.error("[Bump] Erreur rappel:", err);
      }
    }, BUMP_COOLDOWN);
  },
};
