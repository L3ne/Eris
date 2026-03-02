const { useMainPlayer, useQueue, QueryType } = require('discord-player')
const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'play',
    description: 'Joue une musique.',
    type: ApplicationCommandType.ChatInput,
    options: [
            {
                name: "song",
                description: "Nom ou URL de la musique à jouer",
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            },
        ],

  autocomplete: async (interaction) => {
		try {
			const player = useMainPlayer();
			const query = interaction.options.getString('song');
			if (!query || query.length < 2) return interaction.respond([]);
			
			const results = await player.search(query, {
				fallbackSearchEngine: "youtubeSearch",
				limit: 10
			});
		
			if (!results.hasTracks()) return interaction.respond([]);
			
			return interaction.respond(
				results.tracks.slice(0, 10).map((t) => ({
					name: `${t.title} - ${t.author}`,
					value: t.url
				}))
			);
		} catch (error) {
			console.error('Autocomplete error:', error);
			return interaction.respond([]);
		}
	},

	
    execute: async (client, interaction) => {
		try {
			await interaction.deferReply();
			
			const player = useMainPlayer();
			const queue = useQueue(interaction.guildId);
			const query = interaction.options.getString('song');
			const channel = interaction.member.voice.channel;
			
			// Validation checks
			if (!channel) {
				return await interaction.editReply(
					'❌ Vous devez être dans un salon vocal pour utiliser cette commande.'
				);
			}
			
			if (!query) {
				return await interaction.editReply(
					'❌ Veuillez spécifier une chanson à jouer.'
				);
			}
			
			// Search for the track
			const searchResult = await player.search(query, { 
				requestedBy: interaction.user, 
				searchEngine: QueryType.AUTO 
			});
			
			if (!searchResult.hasTracks()) {
				return await interaction.editReply(
					'❌ Aucun résultat trouvé pour cette recherche.'
				);
			}
			
			// Play the track
			const { track } = await player.play(channel, searchResult.tracks[0], {
				requestedBy: interaction.user,
				nodeOptions: {
					skipOnNoStream: true,
					selfDeaf: true,
					volume: 40,
					leaveOnEmpty: true,
					leaveOnEmptyCooldown: 15000,
					leaveOnEnd: true,
					leaveOnEndCooldown: 165000,
					metadata: {
						channel: interaction.channel,
						client: interaction.guild.members.me,
					},
				},
			});
			
			// Create embed
			const embed = new EmbedBuilder()
				.setURL(track.url)
				.setThumbnail(track.thumbnail)
				.setTitle(track.title)
				.setDescription(`**${track.author}** • \`${track.duration}\``)
				.addFields({
					name: queue ? ' Ajoutée à la file' : ' Lecture en cours',
					value: `Dans **${channel.name}**\nDemandée par <@${interaction.user.id}>`
				})
				.setColor(client.color || '#00ff00')
				.setTimestamp();
			
			return await interaction.editReply({ embeds: [embed] });
			
		} catch (error) {
			console.error('Play command error:', error);
			return await interaction.editReply(
				`❌ Une erreur est survenue: ${error.message}`
			);
		}
    }
}