const { useQueue } = require('discord-player');
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'skip',
    description: 'Skip the current song',
    type: ApplicationCommandType.ChatInput,
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    execute: async (client, interaction, args) => {

        await interaction.deferReply();
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.editReply({ content: 'You need to be in a voice channel.', flags: 64 });
    }

    if (!channel.joinable) {
      return interaction.editReply({ content: "I don't have permission to join that voice channel.", flags: 64 });
    }


     const queue = useQueue(interaction.guildId);

    if (!queue || !queue.isPlaying()) {
      return interaction.editReply({ content: 'Nothing is playing right now.', flags: 64 });
    }

    const currentTitle = queue.currentTrack?.title ?? 'current track';
    queue.node.skip();
    await interaction.editReply(`Skipped **${currentTitle}**.`);
    }
}