const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "clear",
    aliases: ["purge", "clean"],
    description: "Supprime un certain nombre de messages",
    default_member_permissions: ['ManageMessages'],
    user_perms: ['ManageMessages'],
    bot_perms: ['ManageMessages'],
    cooldown: 3000,
    execute: async (client, message, args) => {
        if (!args[0]) {
            return message.reply({
                content: "❌ Veuillez spécifier un nombre de messages à supprimer (1-100).",
                ephemeral: true
            });
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({
                content: "❌ Le nombre doit être compris entre 1 et 100.",
                ephemeral: true
            });
        }

        try {
            await message.delete();
            
            const messages = await message.channel.messages.fetch({ limit: amount });
            await message.channel.bulkDelete(messages, true);

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(`✅ ${amount} message(s) supprimé(s) par **${message.author.tag}**`)
                .setTimestamp();

            const confirmMsg = await message.channel.send({ embeds: [embed] });
            setTimeout(() => confirmMsg.delete(), 5000);

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            return message.reply({
                content: "❌ Je ne peux pas supprimer les messages de plus de 14 jours.",
                ephemeral: true
            });
        }
    }
}
