const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "image2gif",
    description: "Convertit une image en GIF",
    aliases: ["img2gif", "i2g"],
    cooldown: 5000,
    user_perms: [],
    bot_perms: ["AttachFiles"],
    execute: async (client, message, args) => {
        // Vérifier si une image est attachée au message
        if (message.attachments.size === 0) {
            return message.reply({
                content: 'Veuillez fournir une image en pièce jointe.\n\n**Utilisation:** `!image2gif` (avec une image en pièce jointe)'
            });
        }

        // Récupérer la première pièce jointe
        const attachment = message.attachments.first();

        // Vérifier si c'est une image
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            return message.reply({
                content: 'Veuillez fournir une image valide (PNG, JPG, JPEG, WEBP, etc.)'
            });
        }

        try {

            const tempDir = path.join(__dirname, '../../../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const outputPath = path.join(tempDir, `gif_${Date.now()}_${message.author.id}.gif`);

            // Télécharger et convertir l'image en GIF
            const response = await fetch(attachment.url);
            const buffer = await response.arrayBuffer();
            
            // Convertir directement en GIF avec Sharp
            await sharp(Buffer.from(buffer))
                .gif()
                .toFile(outputPath);

            // Envoyer le GIF
            const gifAttachment = new AttachmentBuilder(outputPath, {
                name: `converted_${Date.now()}.gif`
            });

            await message.reply({
                files: [gifAttachment]
            });

            // Nettoyer le fichier temporaire après 1 minute
            setTimeout(() => {
                try {
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (error) {
                    console.error('Erreur lors du nettoyage du fichier temporaire:', error);
                }
            }, 60000);

        } catch (error) {
            console.error('Erreur lors de la conversion image2gif:', error);
            await message.reply({
                content: '❌ Une erreur est survenue lors de la conversion de l\'image. Veuillez réessayer.'
            });
        }
    }
};
