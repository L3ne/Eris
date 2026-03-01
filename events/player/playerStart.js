


module.exports = {
    name: "playerStart",
    execute: async (queue, track) => {
 await queue.metadata.channel.send(`Now playing: ${track.title}`)
}
}