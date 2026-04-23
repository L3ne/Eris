const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Bump = require("../../schemas/bumpSchema");
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

    const levelSettings = await levelSettingsSchema.findOne({ guildId: message.guild.id });

    const data = await Bump.findOneAndUpdate(
      {
        guildId: message.guild.id,
        userId: bumper.id
      },
      {
        $inc: { count: 1 },
        $set: { lastBump: new Date() }
      },
      {
        upsert: true,
        new: true
      }
    );

    let rewardMessage = "+300 XP";

    try {

      const result = await XPUtils.addXP(
        message.guild.id,
        bumper.id,
        300
      );

      if (result?.levelUp) {
        const embed = new EmbedBuilder()
          .setDescription(`🎉 Félicitations <@${bumper.id}> !\nVous avez atteint le niveau ${result.newLevel} !`)
          .setThumbnail(bumper.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
          .setTimestamp();
        const channel = message.guild.channels.cache.get(levelSettings.levelUpChannel);
        await channel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error("Erreur XP bump:", err);
    }

    const nextBump = Math.floor((Date.now() + BUMP_COOLDOWN) / 1000);

    const bumpEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle("Bump réussi")
      .setThumbnail(bumper.displayAvatarURL())
      .setDescription(`${bumper} merci pour le bump !`)
      .addFields(
        {
          name: "Tes bumps",
          value: `${data.count}`,
          inline: true
        },
        {
          name: "Récompense",
          value: rewardMessage,
          inline: true
        },
        {
          name: "Prochain bump",
          value: `<t:${nextBump}:R>`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('bump_leaderboard')
          .setLabel('Leaderboard')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('bump_notify')
          .setLabel('Notify Me')
          .setStyle(ButtonStyle.Primary)
      );

    const bumpMessage = await message.channel.send({
      embeds: [bumpEmbed],
      components: [row]
    });

    setTimeout(async () => {
      // Récupérer les utilisateurs qui veulent être notifiés
      const notifications = await Bump.find({ guildId: message.guild.id, notify: true });
      const notifyUsers = notifications.map(n => `<@${n.userId}>`).join(' ');
      
      const reminderMessage = notifyUsers 
        ? `🔔 Le bump est de nouveau disponible ! ${notifyUsers} \`/bump\``
        : `🔔 Le bump est de nouveau disponible ! \`/bump\``;
      
      message.channel.send(reminderMessage);

      // Retirer les boutons du message de bump
      await bumpMessage.edit({
        components: []
      });

      // Nettoyer les notifications
      await Bump.updateMany({ guildId: message.guild.id }, { notify: false });
    }, BUMP_COOLDOWN);

  }
};