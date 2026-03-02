const gradient = require('gradient-string');
const { DefaultExtractors } = require('@discord-player/extractor');

module.exports = {
    name: "ready",
    execute: async (client) => {

 try {
    const { YoutubeSabrExtractor } = await import('discord-player-googlevideo');
    const { SpotifyExtractor } = await import("discord-player-spotify");
    await client.player.extractors.register(YoutubeSabrExtractor, {});
    await client.player.extractors.register(SpotifyExtractor, {});
    await client.player.extractors.loadMulti(DefaultExtractors);
    console.log(gradient('blue', 'cyan')('Systeme de musique initialisé avec succès!'));
  } catch (error) {
    console.error('FATAL: Failed to load extractors:', error);
    process.exit(1);
        }
    }
}