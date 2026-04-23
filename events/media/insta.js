const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { igdl } = require('ab-downloader');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const INSTAGRAM_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?/;

module.exports = {
  name: Events.MessageCreate,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.content) return;

    const match = message.content.match(INSTAGRAM_REGEX);
    if (!match) return;

    const url = match[0];

    try {
      await message.channel.sendTyping();

      const data = await igdl(url);
      console.log(data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        return await message.reply({
          content: '❌ Impossible de récupérer le contenu Instagram. Le lien est peut-être privé ou invalide.'
        });
      }

      const mediaData = data[0];
      const mediaUrl = mediaData.url;

      // Télécharger le fichier MP4
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPath = path.join(tempDir, `instagram_${Date.now()}_${message.author.id}.mp4`);
      
      const response = await axios({
        method: 'GET',
        url: mediaUrl,
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const attachment = new AttachmentBuilder(outputPath, {
        name: `instagram_${Date.now()}.mp4`
      });

      await message.reply({
        files: [attachment]
      });

      // Nettoyer le fichier temporaire
      setTimeout(async () => {
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log(`Fichier temporaire supprimé: ${outputPath}`);
          }
        } catch (error) {
          console.error('Erreur lors du nettoyage du fichier temporaire:', error);
        }
      }, 60000);

    } catch (error) {
      console.error('Erreur lors de la récupération Instagram:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de la récupération du contenu Instagram. Veuillez réessayer.'
      });
    }
  }
};
