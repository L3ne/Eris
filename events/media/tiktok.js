const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { ttdl } = require("ab-downloader");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TIKTOK_REGEX =
  /https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/[\d]+\/?|https?:\/\/(www\.)?vm\.tiktok\.com\/[\w-]+\/?/;

module.exports = {
  name: Events.MessageCreate,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.content) return;

    const match = message.content.match(TIKTOK_REGEX);
    if (!match) return;

    const url = match[0];

    try {
      await message.channel.sendTyping();

      const data = await ttdl(url);
      console.log(data);

      if (!data) {
        return await message.reply({
          content:
            "❌ Impossible de récupérer le contenu TikTok. Le lien est peut-être privé ou invalide.",
        });
      }

      // Gérer les deux formats de réponse (array ou objet)
      let mediaUrl;
      if (Array.isArray(data) && data.length > 0) {
        mediaUrl = data[0].url;
      } else if (data.video && Array.isArray(data.video) && data.video.length > 0) {
        mediaUrl = data.video[0];
      } else if (data.url) {
        mediaUrl = data.url;
      } else {
        return await message.reply({
          content:
            "❌ Impossible de récupérer le contenu TikTok. Le lien est peut-être privé ou invalide.",
        });
      }

      // Télécharger le fichier MP4
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPath = path.join(
        tempDir,
        `tiktok_${Date.now()}_${message.author.id}.mp4`,
      );

      const response = await axios({
        method: "GET",
        url: mediaUrl,
        responseType: "stream",
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const attachment = new AttachmentBuilder(outputPath, {
        name: `tiktok_${Date.now()}.mp4`,
      });
      await message.suppressEmbeds(true);
      await message.reply({
        files: [attachment],
        allowedMentions: {
          repliedUser: false
        }
      });

      // Nettoyer le fichier temporaire
      setTimeout(async () => {
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log(`Fichier temporaire supprimé: ${outputPath}`);
          }
        } catch (error) {
          console.error(
            "Erreur lors du nettoyage du fichier temporaire:",
            error,
          );
        }
      }, 60000);
    } catch (error) {
      console.error("Erreur lors de la récupération TikTok:", error);
      await message.reply({
        content:
          "❌ Une erreur est survenue lors de la récupération du contenu TikTok. Veuillez réessayer.",
      });
    }
  },
};
