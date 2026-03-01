const gradient = require('gradient-string');

module.exports = {
    name: "ready",
    execute: async (client) => {
        client.player = player;

 try {
    const { YoutubeSabrExtractor } = await import('discord-player-googlevideo');
    const { SpotifyExtractor } = await import("discord-player-spotify");
    await player.extractors.register(YoutubeSabrExtractor, {});
    await player.extractors.register(SpotifyExtractor, {});
    await player.extractors.loadMulti(DefaultExtractors);
    console.log(gradient('blue', 'cyan')('Extractors loaded. Bot is ready.'));
  } catch (error) {
    console.error('FATAL: Failed to load extractors:', error);
    process.exit(1);
        }
    }
}