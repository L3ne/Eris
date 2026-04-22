const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: "video2gif",
    description: "Convertit une vidéo en GIF",
    type: 1,
    cooldown: 10000,
    options: [
        {
            name: "video",
            description: "La vidéo à convertir en GIF",
            type: 11,
            required: true
        },
        {
            name: "duration",
            description: "Durée du GIF en secondes (max 10 secondes)",
            type: 10,
            required: false,
            min_value: 1,
            max_value: 10
        },
        {
            name: "fps",
            description: "Images par seconde (max 30)",
            type: 4,
            required: false,
            min_value: 1,
            max_value: 30
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('video');
        const duration = interaction.options.getNumber('duration') || 5;
        const fps = interaction.options.getInteger('fps') || 10;

        try {
            if (!attachment.contentType || !attachment.contentType.startsWith('video/')) {
                return await interaction.editReply({
                    content: '❌ Veuillez fournir une vidéo valide (MP4, WEBM, MOV, etc.)'
                });
            }

            const tempDir = path.join(__dirname, '../../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const videoPath = path.join(tempDir, `video_${Date.now()}_${interaction.user.id}.mp4`);
            const outputPath = path.join(tempDir, `gif_${Date.now()}_${interaction.user.id}.gif`);

            const response = await fetch(attachment.url);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(videoPath, Buffer.from(buffer));

            // Convertir en GIF
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .setStartTime('0')
                    .setDuration(duration)
                    .fps(fps)
                    .size('320x?')
                    .output(outputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            const gifAttachment = new AttachmentBuilder(outputPath, {
                name: `converted_${Date.now()}.gif`
            });

            await interaction.editReply({
                files: [gifAttachment]
            });

            setTimeout(() => {
                try {
                    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (error) {
                    console.error('Erreur lors du nettoyage des fichiers temporaires:', error);
                }
            }, 60000);

        } catch (error) {
            console.error('Erreur lors de la conversion video2gif:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la conversion de la vidéo. Veuillez réessayer.'
            });
        }
    }
};