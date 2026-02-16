const LogSettings = require('../../schemas/logsSchema'); // Import du modèle des paramètres de logs
const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
    name: Events.MessageUpdate,
    async execute(client, oldMessage, newMessage) {
        // Vérification si c'est un message d'un bot ou s'il n'y a pas de changement de contenu
        if (!oldMessage.guild || oldMessage.content === newMessage.content || newMessage.author.bot) return;

        // Récupération des paramètres de log pour le serveur
        const logSettings = await LogSettings.findOne({ guildId: oldMessage.guild.id });
        if (!logSettings || !logSettings.logChannels.message || !logSettings.logChannels.message.enabled) return;

        const logChannel = client.channels.cache.get(logSettings.logChannels.message.channelId);
        if (!logChannel) return;

        const messageLink = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;

        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle('Message Edited')
            .setURL(messageLink)
            .addFields(
                { name: 'Author', value: `@${newMessage.author.tag} - ${newMessage.author}`, inline: false },
                { name: 'Date', value: `<t:${parseInt(newMessage.createdAt / 1000)}:f>`, inline: false },
                { name: 'Channel', value: `${newMessage.channel}`, inline: false },
                { name: 'Original Message', value: oldMessage.content || 'No original text', inline: false },
                { name: 'Edited Message', value: newMessage.content || 'No edited text', inline: false }
            )
            .addFields({ name: 'Jump to Message', value: `[Click here to jump to the message](${messageLink})`, inline: false })
            .setThumbnail(oldMessage.author.displayAvatarURL())
            .setFooter({ text: `${client.user.username}`, iconURL: client.user.avatarURL({ dynamic: true }) })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};
