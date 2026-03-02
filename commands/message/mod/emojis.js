const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "emojis",
    aliases: ["create", "emo"],
    description: "Crée des emojis à partir d'autres emojis",
    default_member_permissions: ['EmojiCreate'],
    user_perms: ['EmojiCreate'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    execute: async (client, message, args) => {

        const emojiRegex = /<a?:[a-zA-Z0-9_]+:(\d+)>/;
        const totalEmojis = args.length;
        let createdEmojis = 0;

        if (totalEmojis === 0) {
            return message.channel.send("Aucun emoji fourni. Veuillez fournir des emojis à ajouter.");
        }

        let statusMessage = await message.channel.send(`Début de la création des emojis...`);

        for (const [index, rawEmoji] of args.entries()) {
            const matchedEmoji = rawEmoji.match(emojiRegex);

            if (matchedEmoji) {
                const emojiId = matchedEmoji[1];
                const extension = rawEmoji.startsWith("<a:") ? ".gif" : ".png";
                const url = `https://cdn.discordapp.com/emojis/${emojiId + extension}`;
                const emojiName = `emoji_${index + 1}`;

                try {                    
                    await message.guild.emojis.create({ attachment: url, name: emojiName });
                    
                    createdEmojis++;
                    
                    await statusMessage.edit(`Création des emojis en cours... (${createdEmojis}/${totalEmojis})`);
                } catch (error) {
                    await message.channel.send(`Erreur lors de la création de l'emoji : ${emojiName}. Raison : ${error.message}`);
                }
            } else {
                await message.channel.send(`Le format de l'emoji ${index + 1} n'est pas valide.`);
            }
        }
        await statusMessage.edit(`${createdEmojis} émoji${createdEmojis !== 1 ? "s" : ""} ont été créés avec succès.`);
    },
};