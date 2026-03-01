const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    name: "nowplaying",
    description: "Remove a specified amount of messages in a given channel",

     execute: async (client, interaction, args) => {

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({
                content: 'Rejoins un salon pour utilisé cette commande.',
                ephemeral: true,
            });
        }
        if (!channel.joinable) {
            return interaction.reply({
                content: 'Je ne peux pas rejoindre votre salon.',
                ephemeral: true,
            });
        }
        const queuee = useQueue(interaction.guild.id);
	if (queuee && queuee.channel !== channel) {
		return interaction.reply({
			content: 'Désolé je suis déjà dans un autre salon..',
			ephemeral: true,
		});
	}

        const config = client.config
        const queue = useQueue(interaction.guild.id);
        const sourceStringsFormatted = new Map([
            ['youtube', 'YouTube'],
            ['soundcloud', 'SoundCloud'],
            ['spotify', 'Spotify'],
            ['apple_music', 'Apple Music'],
            ['arbitrary', 'Direct source']
        ]);

        const sourceIcons = new Map([
            ['youtube', "<:emoji_2:1476399781181128744>"],
            ['soundcloud', "<:sound:1476406238957801555>"],
            ['spotify', "<:emoji_1:1476399778081542144> "],
            ['apple_music', "<:SpotifySource:1135284472300982280>"],
            ['arbitrary', "<:SpotifySource:1135284472300982280>"]
        ]);

        const currentTrack = queue.currentTrack;

        let author = currentTrack.author ? currentTrack.author : 'Unavailable';
        if (author === 'cdn.discordapp.com') {
            author = 'Unavailable';
        }
        let plays = currentTrack.views !== 0 ? currentTrack.views : 0;

        if (
            plays === 0 &&
            currentTrack.metadata.bridge &&
            currentTrack.metadata.bridge.views !== 0 &&
            currentTrack.metadata.bridge.views !== undefined
        ) {
            plays = currentTrack.metadata.bridge.views;
        } else if (plays === 0) {
            plays = 'Unavailable';
        }

        const source = sourceStringsFormatted.get(currentTrack.raw.source) ?? 'Unavailable';
        const queueLength = queue.tracks.data.length;
        const timestamp = queue.node.getTimestamp();
        let bar = `**\`${timestamp.current.label}\`** ${queue.node.createProgressBar({
            queue: false,
            length: 12,
            timecodes: false,
            indicator: '<:emoji_5:1476399791394259109>',
            leftChar: '<:emoji_3:1476399784796623139>',
            rightChar: '<:emoji_4:1476399788416303114>'
        })} **\`${timestamp.total.label}\`**`;

        if (currentTrack.raw.duration === 0 || currentTrack.duration === '0:00') {
            bar = 'No duration available.';
        }

        const nowPlayingActionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nowplaying-skip')
                .setLabel('Skip track')
                .setStyle('Secondary')
               // .setEmoji(embedOptions.icons.nextTrack)
        );

        const loopModesFormatted = new Map([
            [0, 'disabled'],
            [1, 'track'],
            [2, 'queue'],
            [3, 'autoplay']
        ]);

        const loopModeUserString = loopModesFormatted.get(queue.repeatMode);



        const response = await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: `Channel: ${queue.channel.name} (${queue.channel.bitrate / 1000}kbps)`,
                        iconURL: interaction.guild.iconURL()
                    })
                    .setDescription(
                        (queue.node.isPaused()
                            ? '**Currently Paused**\n'
                            : `**🎶 Now Playing**\n`) +
                            `**[${currentTrack.title}](${currentTrack.url})**` +
                            `\nRequested by: <@${currentTrack.requestedBy.id}>` +
                            `\n ${bar}\n\n` +
                            `${
                                queue.repeatMode === 0
                                    ? ''
                                    : `**${
                                        queue.repeatMode === 3 ? "♾️" : "🔁"
                                    } Looping**\nLoop mode is set to ${loopModeUserString}. You can change it with **\`/loop\`**.`
                            }`
                    )
                    .addFields(
                        {
                            name: '**Author**',
                            value: author,
                            inline: true
                        },
                        {
                            name: '**Plays**',
                            value: plays.toLocaleString('en-US'),
                            inline: true
                        },
                        {
                            name: '**Track source**',
                            value: `**${sourceIcons.get(currentTrack.raw.source)} [${source}](${currentTrack.url})**`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: queueLength ? `${queueLength} other tracks in the queue...` : ' '
                    })
                    .setThumbnail(queue.currentTrack.thumbnail)
                    .setColor(client.color)
            ],
            components: [nowPlayingActionRow]
        });
        console.log(currentTrack)
      

        const collectorFilter = (i) => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({
                filter: collectorFilter,
                time: 300_000
            });

            confirmation.deferUpdate();

            if (confirmation.customId === 'nowplaying-skip') {
               
                if (!queue || (queue.tracks.data.length === 0 && !queue.currentTrack)) {
                   
                    return await interaction.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(
                                    `**Oops!**\nThere is nothing currently playing. First add some tracks with **\`/play\`**!`
                                )
                                .setColor(client.color)
                        ],
                        components: []
                    });
                }

                if (queue.currentTrack !== currentTrack) {
                  
                    return await interaction.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(
                                    `**Oops!**\nThis track has already been skipped or is no longer playing.`
                                )
                                .setColor(client.color)
                        ],
                        components: []
                    });
                }

                const skippedTrack = queue.currentTrack;
                let durationFormat =
                    skippedTrack.raw.duration === 0 || skippedTrack.duration === '0:00'
                        ? ''
                        : `\`${skippedTrack.duration}\``;
                queue.node.skip();

                const repeatModeUserString = loopModesFormatted.get(queue.repeatMode);

           
                return await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: interaction.member.nickname || interaction.user.username,
                                iconURL: interaction.user.avatarURL()
                            })
                            .setDescription(
                                `**⏭️Skipped track**\n**${durationFormat} [${skippedTrack.title}](${skippedTrack.url})**` +
                                    `${
                                        queue.repeatMode === 0
                                            ? ''
                                            : `\n\n**${
                                                queue.repeatMode === 3
                                                    ? "♾️"
                                                    : "🔁"
                                            } Looping**\nLoop mode is set to ${repeatModeUserString}. You can change it with **\`/loop\`**.`
                                    }`
                            )
                            .setThumbnail(skippedTrack.thumbnail)
                            .setColor(client.color)
                    ],
                    components: []
                });
            }
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return;
            }

            throw error;
        }
    }
};