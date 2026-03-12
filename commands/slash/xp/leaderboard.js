const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const Level = require('../../../schemas/levelSchema');
const XPUtils = require('../../../utils/xpUtils');

module.exports = {
    name: 'leaderboard',
    description: 'Affiche le classement des membres',
    type: 1,
    cooldown: 5000,
    options: [],

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const users = await Level.find({
                guildId: interaction.guild.id
            }).sort({ xp: -1 });

            if (!users.length) {
                return interaction.editReply({
                    content: "Aucun membre n'a encore gagné d'XP."
                });
            }

            const membersPerPage = 10;
            let currentPage = 0;
            const totalPages = Math.ceil(users.length / membersPerPage);

            const generateEmbed = async (page) => {
                const start = page * membersPerPage;
                const end = start + membersPerPage;
                const currentUsers = users.slice(start, end);

                let leaderboard = '';
                let rank = start + 1;

                for (const userData of currentUsers) {
                    const member = await interaction.guild.members
                        .fetch(userData.userId)
                        .catch(() => null);

                    if (!member) continue;

                    const xpInfo = XPUtils.formatXP(userData.xp, userData.level);

                    const medal =
                        rank === 1 ? '🥇' :
                        rank === 2 ? '🥈' :
                        rank === 3 ? '🥉' :
                        `\`${rank}.\``;

                    leaderboard += `${medal} <@${member.user.id}>\n`;
                    leaderboard += `> Niveau **${userData.level}** • ${userData.xp.toLocaleString()} XP\n`;
                    leaderboard += `> Progression: **${xpInfo.progress.toFixed(1)}%** vers niveau ${userData.level + 1}\n\n`;

                    rank++;
                }

                return new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🏆 Classement de ${interaction.guild.name}`)
                    .setDescription(leaderboard || 'Aucun membre valide trouvé.')
                	.setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
                    .setTimestamp();
            };

            const createButtons = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('⏮')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),

                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),

                    new ButtonBuilder()
                        .setCustomId('jump')
                        .setLabel('✱')
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1),

                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('⏭')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1)
                );
            };

            const message = await interaction.editReply({
                embeds: [await generateEmbed(currentPage)],
                components: [createButtons()]
            });

            const collector = message.createMessageComponentCollector({
                time: 120000
            });

            collector.on('collect', async i => {

                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: "❌ Tu ne peux pas utiliser ces boutons.",
                        ephemeral: true
                    });
                }

                if (i.customId === 'jump') {

                    const modal = new ModalBuilder()
                        .setCustomId('jumpModal')
                        .setTitle('Aller à une page');

                    const input = new TextInputBuilder()
                        .setCustomId('pageInput')
                        .setLabel(`Entre un numéro (1 - ${totalPages})`)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(input);
                    modal.addComponents(row);

                    return i.showModal(modal);
                }

                switch (i.customId) {
                    case 'first':
                        currentPage = 0;
                        break;
                    case 'prev':
                        currentPage--;
                        break;
                    case 'next':
                        currentPage++;
                        break;
                    case 'last':
                        currentPage = totalPages - 1;
                        break;
                }

                await i.update({
                    embeds: [await generateEmbed(currentPage)],
                    components: [createButtons()]
                });
            });

            collector.on('end', () => {

                const disabledRow = createButtons();

                disabledRow.components.forEach(button => {
                    button.setDisabled(true);
                });

                message.edit({
                    components: [disabledRow]
                }).catch(() => {});
        });

            // Gestion du modal
            interaction.client.on('interactionCreate', async modalInt => {
                if (!modalInt.isModalSubmit()) return;
                if (modalInt.customId !== 'jumpModal') return;
                if (modalInt.user.id !== interaction.user.id) return;

                const page = parseInt(modalInt.fields.getTextInputValue('pageInput'));

                if (isNaN(page) || page < 1 || page > totalPages) {
                    return modalInt.reply({
                        content: `❌ Page invalide. (1 - ${totalPages})`,
                        ephemeral: true
                    });
                }

                currentPage = page - 1;

                await modalInt.update({
                    embeds: [await generateEmbed(currentPage)],
                    components: [createButtons()]
                });
            });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: "❌ Une erreur est survenue."
            });
        }
    }
};