const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "emojis",
    aliases: ["create", "emo"],
    description: "Displays all the commands that are available to the user",
    default_member_permissions: ['EmojiCreate'],
    user_perms: ['EmojiCreate'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    execute: async (client, message, args) => {

        // Expression régulière pour identifier les emojis dans les arguments
        const emojiRegex = /<a?:[a-zA-Z0-9_]+:(\d+)>/;
        const totalEmojis = args.length;
        let createdEmojis = 0;

        // Vérification s'il y a des emojis à créer
        if (totalEmojis === 0) {
            return message.channel.send("Aucun emoji fourni. Veuillez fournir des emojis à ajouter.");
        }

        // Création d'un message initial pour le statut
        let statusMessage = await message.channel.send(`Début de la création des emojis...`);

        // Boucle sur chaque argument pour traiter les emojis
        for (const [index, rawEmoji] of args.entries()) {
            const matchedEmoji = rawEmoji.match(emojiRegex);

            if (matchedEmoji) {
                const emojiId = matchedEmoji[1];
                const extension = rawEmoji.startsWith("<a:") ? ".gif" : ".png";
                const url = `https://cdn.discordapp.com/emojis/${emojiId + extension}`;
                const emojiName = `emoji_${index + 1}`;

                try {
                    console.log(`Tentative de création de l'emoji : ${emojiName} avec l'URL : ${url}`);
                    
                    // Tentative de création de l'emoji
                    await message.guild.emojis.create({ attachment: url, name: emojiName });
                    
                    console.log(`Emoji créé avec succès : ${emojiName}`);
                    createdEmojis++;
                    
                    // Mise à jour du message de statut après chaque création d'emoji
                    await statusMessage.edit(`Création des emojis en cours... (${createdEmojis}/${totalEmojis})`);
                } catch (error) {
                    console.error("Erreur lors de la création de l'emoji :", error);
                    await message.channel.send(`Erreur lors de la création de l'emoji : ${emojiName}. Raison : ${error.message}`);
                }
            } else {
                await message.channel.send(`Le format de l'emoji ${index + 1} n'est pas valide.`);
            }
        }

        // Mise à jour finale du feur de statut
        await statusMessage.edit(`${createdEmojis} émoji${createdEmojis !== 1 ? "s" : ""} ont été créés avec succès.`);
    },
};