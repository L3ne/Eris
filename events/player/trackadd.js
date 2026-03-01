const { EmbedBuilder } = require('discord.js');


module.exports = {
    name: "trackAdd",
    execute: async (queue, track) => {
        const embed = new EmbedBuilder()
            .setTitle("Track added")
            .setDescription(`Track added: ${track.title}`)
            .setTimestamp()
        await queue.metadata.channel.send({ embeds: [embed] })
    }
}