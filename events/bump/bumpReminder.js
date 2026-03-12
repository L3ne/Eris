const { Events, EmbedBuilder } = require("discord.js");
const Bump = require("../../schemas/bumpSchema");
const XPUtils = require("../../utils/xpUtils");

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
        rewardMessage = `+300 XP\n🎉 Level up ${result.oldLevel} → ${result.newLevel}`;
      }

    } catch (err) {
      console.error("Erreur XP bump:", err);
    }

    const nextBump = Math.floor((Date.now() + BUMP_COOLDOWN) / 1000);

    const bumpEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle("Bump réussi")
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
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });

    message.channel.send({
      embeds: [bumpEmbed]
    });

    setTimeout(() => {
      message.channel.send("🔔 Le bump est de nouveau disponible ! `/bump`");
    }, BUMP_COOLDOWN);

  }
};