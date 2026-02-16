const { 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    ComponentType,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');
const { formatLength, formatRating, searchVisualNovels, getLanguageFlag } = require('../../../utils/vndbApi.js');

/**
 * Crée l'affichage d'un VN avec composants v2
 */
function createVNDisplay(vn, currentIndex, totalCount) {
    const container = new ContainerBuilder();
    
    // Ajouter l'icône du VN en MediaGallery si disponible
    if (vn.image?.url) {
        const iconItem = new MediaGalleryItemBuilder().setURL(vn.image.url);
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(iconItem)
        );
    }
    
    // En-tête avec titre
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${vn.title}`)
    );

    // Informations principales
    let infoText = '';
    
    if (vn.alttitle) {
        infoText += `**Titre alternatif:** ${vn.alttitle}\n`;
    }
    
    if (vn.rating) {
        infoText += `**Note moyenne:** ${formatRating(vn.rating)}\n`;
    }
    
    if (vn.votecount) {
        infoText += `**Nombre de votes:** ${vn.votecount.toLocaleString()}\n`;
    }
    
    if (vn.popularity) {
        infoText += `**Popularité:** ${(vn.popularity * 100).toFixed(2)}%\n`;
    }
    
    if (vn.released) {
        infoText += `**Date de sortie:** ${vn.released}\n`;
    }
    
    if (vn.length) {
        infoText += `**Durée:** ${formatLength(vn.length)}\n`;
    }
    
    if (vn.developers && vn.developers.length > 0) {
        const devs = vn.developers.map(d => d.name).join(', ');
        infoText += `**Développeur(s):** ${devs.length > 100 ? devs.substring(0, 97) + '...' : devs}\n`;
    }
    
    if (vn.languages && vn.languages.length > 0) {
        const langs = vn.languages.map(lang => getLanguageFlag(lang)).join(' ');
        infoText += `**Langues:** ${langs}\n`;
    }
    
    if (vn.tags && vn.tags.length > 0) {
        const topTags = vn.tags
            .filter(tag => tag.spoiler === 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5)
            .map(tag => tag.name)
            .join(', ');
        if (topTags) {
            infoText += `**Tags principaux:** ${topTags}\n`;
        }
    }
    
    if (vn.description) {
        const desc = vn.description.length > 300 ? vn.description.substring(0, 297) + '...' : vn.description;
        infoText += `\n${desc}`;
    }
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(infoText)
    );
    
    // Footer info
    let footerText = `**ID:** ${vn.id}`;
    if (currentIndex !== null && totalCount !== null) {
        footerText = `Résultat **${currentIndex + 1}/${totalCount}** • **ID:** ${vn.id}`;
    }
    if (vn.screenshots && vn.screenshots.length > 0) {
        footerText += ` • **${vn.screenshots.length}** screenshot(s)`;
    }
    footerText += `\n[Voir sur VNDB](https://vndb.org/${vn.id})`;
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(footerText)
    );
    
    return container;
}

/**
 * Ouvre une galerie de screenshots en réponse séparée pour l'utilisateur
 */
async function openScreenshotGallery(interaction, vn) {
    if (!vn.screenshots || vn.screenshots.length === 0) {
        await interaction.followUp({ 
            content: '❌ Aucun screenshot disponible pour ce visual novel.', 
            ephemeral: true 
        });
        return;
    }

    let currentScreenshotIndex = 0;

    // Fonction pour créer les boutons de la galerie
    const createGalleryButtons = (index, total) => {
        const previousButton = new ButtonBuilder()
            .setCustomId('gallery_previous')
            .setLabel('◀ Précédent')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId('gallery_next')
            .setLabel('Suivant ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === total - 1);

        const closeButton = new ButtonBuilder()
            .setCustomId('gallery_close')
            .setLabel('✖ Fermer')
            .setStyle(ButtonStyle.Danger);

        const positionButton = new ButtonBuilder()
            .setCustomId('gallery_position')
            .setLabel(`${index + 1}/${total}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        return new ActionRowBuilder().addComponents(previousButton, positionButton, nextButton, closeButton);
    };

    // Créer l'affichage avec MediaGallery
    const createGalleryDisplay = (index) => {
        const container = new ContainerBuilder();
        
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### 📸 Screenshots - ${vn.title}`)
        );
        
        const screenshot = vn.screenshots[index];
        const mediaItem = new MediaGalleryItemBuilder().setURL(screenshot.url);
        
        // Si l'image est NSFW (sexual >= 1), la flouter
        if (screenshot.sexual && screenshot.sexual >= 1) {
            mediaItem.setSpoiler(true);
        }
        
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(mediaItem)
        );
        
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Screenshot **${index + 1}/${vn.screenshots.length}** • [Voir sur VNDB](https://vndb.org/${vn.id})`)
        );
        
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        
        container.addActionRowComponents(
            createGalleryButtons(index, vn.screenshots.length)
        );
        
        return container;
    };

    // Afficher la galerie
    const galleryMessage = await interaction.followUp({
        components: [createGalleryDisplay(currentScreenshotIndex)],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });

    // Collecteur pour la galerie (3 minutes)
    const galleryCollector = galleryMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180_000
    });

    galleryCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({ 
                content: '❌ Cette galerie ne vous appartient pas!', 
                ephemeral: true 
            });
            return;
        }

        // Fermer la galerie
        if (i.customId === 'gallery_close') {
            const closedContainer = new ContainerBuilder();
            closedContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('🗑️ Galerie fermée.')
            );
            
            await i.update({ 
                components: [closedContainer],
                flags: MessageFlags.IsComponentsV2
            });
            galleryCollector.stop();
            return;
        }

        // Navigation
        if (i.customId === 'gallery_previous' && currentScreenshotIndex > 0) {
            currentScreenshotIndex--;
        } else if (i.customId === 'gallery_next' && currentScreenshotIndex < vn.screenshots.length - 1) {
            currentScreenshotIndex++;
        }

        // Mettre à jour l'affichage
        await i.update({ 
            components: [createGalleryDisplay(currentScreenshotIndex)],
            flags: MessageFlags.IsComponentsV2
        });
    });

    galleryCollector.on('end', async () => {
        try {
            const finalContainer = createGalleryDisplay(currentScreenshotIndex);
            const disabledRow = createGalleryButtons(currentScreenshotIndex, vn.screenshots.length);
            disabledRow.components.forEach(button => button.setDisabled(true));
            
            // Pas besoin de filtrer, on recrée un container propre
            const cleanContainer = new ContainerBuilder();
            
            cleanContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 📸 Screenshots - ${vn.title}`)
            );
            
            const screenshot = vn.screenshots[currentScreenshotIndex];
            const mediaItem = new MediaGalleryItemBuilder().setURL(screenshot.url);
            
            // Si l'image est NSFW, la flouter
            if (screenshot.sexual && screenshot.sexual >= 1) {
                mediaItem.setSpoiler(true);
            }
            
            cleanContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(mediaItem)
            );
            
            cleanContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Screenshot **${currentScreenshotIndex + 1}/${vn.screenshots.length}** • [Voir sur VNDB](https://vndb.org/${vn.id})`)
            );
            
            cleanContainer.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );
            
            cleanContainer.addActionRowComponents(disabledRow);
            
            await galleryMessage.edit({ 
                components: [cleanContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            // Message peut être supprimé
        }
    });
}

module.exports = {
    name: "vn",
    description: "Recherche un visual novel sur VNDB",
    type: 1, // ChatInput
    cooldown: 5000,
    options: [
        {
            name: "titre",
            description: "Le titre du visual novel à rechercher",
            type: 3, // String
            required: true,
            autocomplete: true
        },
        {
            name: "limite",
            description: "Nombre de résultats à afficher (1-10)",
            type: 4, // Integer
            required: false,
            min_value: 1,
            max_value: 10
        }
    ],
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    autocomplete: async (interaction) => {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = focusedOption.value;
        
        // Ne suggérer que si l'utilisateur a tapé au moins 2 caractères
        if (focusedValue.length < 2) {
            await interaction.respond([]);
            return;
        }

        try {
            const results = await searchVisualNovels(focusedValue, 10);
            
            const choices = results.map(vn => {
                // Limiter le nom à 100 caractères (limite Discord)
                let name = vn.title;
                if (name.length > 90) {
                    name = name.substring(0, 87) + '...';
                }
                
                // Ajouter l'année si disponible
                if (vn.released) {
                    const year = vn.released.split('-')[0];
                    name += ` (${year})`;
                }

                if (vn.id) {
                    name += ` (ID: ${vn.id})`;
                }
                
                return {
                    name: name,
                    value: vn.title
                };
            });
            
            await interaction.respond(choices.slice(0, 25)); // Max 25 suggestions
        } catch (error) {
            console.error('Erreur autocomplete:', error);
            await interaction.respond([]);
        }
    },
    execute: async (client, interaction) => {
        await interaction.deferReply();

        const titre = interaction.options.getString('titre');
        const limite = interaction.options.getInteger('limite') || 5;

        try {
            const results = await searchVisualNovels(titre, limite);

            if (!results || results.length === 0) {
                await interaction.editReply(`❌ Aucun visual novel trouvé pour "${titre}".`);
                return;
            }

            // Si un seul résultat, afficher avec bouton screenshots si disponible
            if (results.length === 1) {
                const container = createVNDisplay(results[0], 0, 1);
                
                // Ajouter le bouton screenshots s'il y en a
                if (results[0].screenshots && results[0].screenshots.length > 0) {
                    const screenshotsButton = new ButtonBuilder()
                        .setCustomId('screenshots_single')
                        .setLabel('📸 Screenshots')
                        .setStyle(ButtonStyle.Success);
                    
                    const separatorRow = new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true);
                    
                    const buttonRow = new ActionRowBuilder().addComponents(screenshotsButton);
                    
                    container.addSeparatorComponents(separatorRow);
                    container.addActionRowComponents(buttonRow);
                    
                    const response = await interaction.editReply({ 
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                    
                    // Collecteur pour le bouton screenshots
                    const collector = response.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 300_000
                    });
                    
                    collector.on('collect', async i => {
                        if (i.user.id !== interaction.user.id) {
                            await i.reply({ 
                                content: '❌ Ce bouton n\'est pas pour vous!', 
                                ephemeral: true 
                            });
                            return;
                        }
                        
                        if (i.customId === 'screenshots_single') {
                            await i.deferUpdate();
                            await openScreenshotGallery(i, results[0]);
                        }
                    });
                    
                    collector.on('end', async () => {
                        try {
                            const disabledButton = new ButtonBuilder()
                                .setCustomId('screenshots_single')
                                .setLabel('📸 Screenshots')
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true);
                            
                            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
                            
                            const finalContainer = createVNDisplay(results[0], 0, 1);
                            finalContainer.addSeparatorComponents(separatorRow);
                            finalContainer.addActionRowComponents(disabledRow);
                            
                            await response.edit({ 
                                components: [finalContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        } catch (error) {
                            // Message peut être supprimé
                        }
                    });
                } else {
                    await interaction.editReply({ 
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                return;
            }

            let currentIndex = 0;

            // Fonction pour créer les boutons
            const createButtons = (index, total, hasScreenshots = false) => {
                const previousButton = new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('◀ Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Suivant ▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === total - 1);

                const positionButton = new ButtonBuilder()
                    .setCustomId('position')
                    .setLabel(`${index + 1}/${total}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const screenshotsButton = new ButtonBuilder()
                    .setCustomId('screenshots')
                    .setLabel('📸 Screenshots')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!hasScreenshots);

                return new ActionRowBuilder().addComponents(previousButton, positionButton, nextButton, screenshotsButton);
            };

            // Afficher le premier résultat avec les boutons
            const displayContainer = createVNDisplay(results[currentIndex], currentIndex, results.length);
            const hasScreenshots = results[currentIndex].screenshots && results[currentIndex].screenshots.length > 0;
            const buttonsRow = createButtons(currentIndex, results.length, hasScreenshots);
            
            // Ajouter séparateur et boutons au container
            displayContainer.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );
            displayContainer.addActionRowComponents(buttonsRow);

            const response = await interaction.editReply({
                components: [displayContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Collecteur pour les boutons (5 minutes de timeout)
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300_000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ 
                        content: '❌ Ces boutons ne sont pas pour vous!', 
                        ephemeral: true 
                    });
                    return;
                }

                // Si c'est le bouton screenshots
                if (i.customId === 'screenshots') {
                    const currentVN = results[currentIndex];
                    
                    // Déférer la réponse pour éviter le timeout
                    await i.deferUpdate();
                    
                    if (!currentVN.screenshots || currentVN.screenshots.length === 0) {
                        await i.followUp({ 
                            content: '❌ Aucun screenshot disponible pour ce visual novel.', 
                            ephemeral: true 
                        });
                        return;
                    }

                    // Ouvrir la galerie de screenshots
                    await openScreenshotGallery(i, currentVN);
                    return;
                }

                // Mettre à jour l'index
                if (i.customId === 'previous' && currentIndex > 0) {
                    currentIndex--;
                } else if (i.customId === 'next' && currentIndex < results.length - 1) {
                    currentIndex++;
                }

                // Créer le nouvel affichage et les nouveaux boutons
                const newContainer = createVNDisplay(results[currentIndex], currentIndex, results.length);
                const hasScreenshots = results[currentIndex].screenshots && results[currentIndex].screenshots.length > 0;
                const newButtonsRow = createButtons(currentIndex, results.length, hasScreenshots);
                
                // Ajouter séparateur et boutons
                newContainer.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );
                newContainer.addActionRowComponents(newButtonsRow);

                await i.update({ 
                    components: [newContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            });

            collector.on('end', async () => {
                try {
                    // Créer l'affichage final avec boutons désactivés
                    const finalContainer = createVNDisplay(results[currentIndex], currentIndex, results.length);
                    const hasScreenshots = results[currentIndex].screenshots && results[currentIndex].screenshots.length > 0;
                    const disabledRow = createButtons(currentIndex, results.length, hasScreenshots);
                    disabledRow.components.forEach(button => button.setDisabled(true));
                    
                    // Ajouter séparateur et boutons désactivés
                    finalContainer.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );
                    finalContainer.addActionRowComponents(disabledRow);
                    
                    await response.edit({ 
                        components: [finalContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    // Message peut-être déjà supprimé
                }
            });

        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            await interaction.editReply('❌ Une erreur est survenue lors de la recherche sur VNDB. Veuillez réessayer plus tard.');
        }
    }
};
