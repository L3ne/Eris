const gradient = require('gradient-string');
const { DefaultExtractors } = require('@discord-player/extractor');
const { SpotifyExtractor } = require('discord-player-spotify');
const { YoutubeExtractor } = require('discord-player-youtube');

module.exports = {
  name: "ready",
  execute: async (client) => {
    try {

      await client.player.extractors.loadMulti(DefaultExtractors);
      await client.player.extractors.register(SpotifyExtractor);

      console.log(
        gradient('blue', 'cyan')(
          'Systeme de musique initialisé avec succès!'
        )
      );

    } catch (error) {
      console.error('FATAL: Failed to load extractors:', error);
      process.exit(1);
    }
  }
}