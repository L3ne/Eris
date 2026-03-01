const { useQueue } = require("discord-player");
const {
  ApplicationCommandType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
    name: "queue",
    description: "Affiche les chansons dans la file d'attente.",
    type: ApplicationCommandType.ChatInput,
    execute: async (client, interaction, args) => {

    const queue = useQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        content: `Aucune musique a afficher.`,
        ephemeral: true,
      });
    }
    
    const formatTracks = queue.tracks.toArray();

    if (formatTracks.length === 0) {
      return interaction.reply({
        content: `There is **no** queue to **display**`,
        ephemeral: true,
      });
    }

    const tracks = formatTracks.map(
      (track, idx) => `**${idx + 1})** [${track.title}](${track.url}) ${track.duration} - ${track.requestedBy}`
    );

    const chunkSize = 10;
    const pages = Math.ceil(tracks.length / chunkSize);

    const embeds = [];
    for (let i = 0; i < pages; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;

      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle("Tracks Queue")
        .setDescription(
          tracks.slice(start, end).join("\n") || "**No queued songs**"
        )
        .setFooter({
          text: `Page ${i + 1} | Total ${queue.tracks.size} tracks`,
        });

      embeds.push(embed);
    }

    if (embeds.length === 1) {
      return interaction.reply({
        embeds: [embeds[0]],
      });
    }

    const prevButton = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary);

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

    const message = await interaction.reply({
      embeds: [embeds[0]],
      components: [row],
      fetchReply: true,
    });

    let currentIndex = 0;
    const collector = message.createMessageComponentCollector({
      idle: 60000,
    });

    collector.on("collect", (i) => {
      i.deferUpdate();

      switch (i.customId) {
        case "prev":
          currentIndex =
            currentIndex === 0 ? embeds.length - 1 : currentIndex - 1;
          break;
        case "next":
          currentIndex =
            currentIndex === embeds.length - 1 ? 0 : currentIndex + 1;
          break;
        default:
          break;
      }

      message.edit({
        embeds: [embeds[currentIndex]],
        components: [row],
      });
    });

    collector.on("end", () => {
      message.edit({
        components: [],
      });
    });
  },
};