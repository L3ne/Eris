const { 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const { getRandomVisualNovel, formatRating, formatLength, getLanguageFlag, getLanguageName } = require('../../../utils/vndbApi.js');

function createVNDisplay(vn) {
    const container = new ContainerBuilder();
    
    if (vn.image?.url) {
        const iconItem = new MediaGalleryItemBuilder().setURL(vn.image.url);
        
        if (vn.image?.sexual && vn.image.sexual >= 1) {
            iconItem.setSpoiler(true);
        }
        
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(iconItem)
        );
    }
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${vn.title}`)
    );

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
    
    const footerText = `**ID:** ${vn.id}\n[Voir sur VNDB](https://vndb.org/${vn.id})`;
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(footerText)
    );
    
    return container;
}

module.exports = {
    name: 'vnrandom',
    aliases: ['vnrand', 'randomvn', 'randvn'],
    description: "Affiche un visual novel aléatoire",
    cooldown: 5000,
    execute: async (client, message, args) => {

        const language = args[0] ? getLanguageName(args[0].toLowerCase()) : null;

        try {
            const loadingMsg = await message.reply({ content: 'Recherche d\'un visual novel aléatoire...', allowedMentions: { repliedUser: false } });
            const vn = await getRandomVisualNovel(language);

            if (!vn) {
                return loadingMsg.edit({ content: '❌ Impossible de trouver un visual novel aléatoire. Réessayez!' });
            }

            const container = createVNDisplay(vn);
            
            await loadingMsg.edit({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    repliedUser: false
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération d\'un VN aléatoire:', error);
            await message.reply({ content: '❌ Une erreur est survenue. Veuillez réessayer plus tard.' });
        }
    },
};
