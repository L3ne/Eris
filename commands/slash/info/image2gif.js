const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "image2gif",
    description: "Convertit une image en GIF",
    type: 1,
    cooldown: 5000,
    options: [
        {
            name: "image",
            description: "L'image à convertir en GIF",
            type: 11,
            required: true
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('image');

        try {
            if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
                return await interaction.editReply({
                    content: '❌ Veuillez fournir une image valide (PNG, JPG, JPEG, WEBP, etc.)'
                });
            }

            const tempDir = path.join(__dirname, '../../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const outputPath = path.join(tempDir, `gif_${Date.now()}_${interaction.user.id}.gif`);

            const response = await fetch(attachment.url);
            const buffer = await response.arrayBuffer();
            
            await sharp(Buffer.from(buffer))
                .gif()
                .toFile(outputPath);

            const gifAttachment = new AttachmentBuilder(outputPath, {
                name: `converted_${Date.now()}.gif`
            });

            await interaction.editReply({
                files: [gifAttachment]
            });

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