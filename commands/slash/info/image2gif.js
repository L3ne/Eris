const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "image2gif",
    description: "Convertit une image en GIF",
    type: 1, // ChatInput
    cooldown: 5000,
    options: [
        {
            name: "image",
            description: "L'image à convertir en GIF",
            type: 11, // Attachment
            required: true
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('image');

        try {
            // Vérifier si l'attachement est une image
            if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
                return await interaction.editReply({
                    content: '❌ Veuillez fournir une image valide (PNG, JPG, JPEG, WEBP, etc.)'
                });
            }

            // Créer le dossier temporaire s'il n'existe pas
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const outputPath = path.join(tempDir, `gif_${Date.now()}_${interaction.user.id}.gif`);

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

            await interaction.editReply({
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
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la conversion de l\'image. Veuillez réessayer.'
            });
        }
    }
};
