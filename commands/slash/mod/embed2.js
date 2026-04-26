const {
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const EmbedModel = require('../../../schemas/embedSchema');

module.exports = {
    name: 'embedv2',
    description: 'Système avancé de création d\'UIs avec Components V2',
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: [PermissionFlagsBits.ManageMessages],
    user_perms: [],
    bot_perms: [],
    options: [
        {
            name: 'builder',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Ouvre le constructeur interactif V2',
        },
        {
            name: 'send',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Envoie une UI sauvegardée dans un salon',
            options: [
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom du template',
                    autocomplete: true,
                },
                {
                    name: 'salon',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    description: 'Salon de destination',
                },
            ],
        },
        {
            name: 'preview',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Prévisualise un template sauvegardé',
            options: [
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom du template',
                    autocomplete: true,
                },
            ],
        },
        {
            name: 'list',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Liste les templates sauvegardés',
        },
        {
            name: 'delete',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Supprime un template',
            options: [
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom du template à supprimer',
                    autocomplete: true,
                },
            ],
        },
        {
            name: 'edit',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Édite un template existant',
            options: [
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom du template à éditer',
                    autocomplete: true,
                },
            ],
        },
        {
            name: 'import',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Importe et sauvegarde un template depuis un fichier JSON',
            options: [
                {
                    name: 'fichier',
                    type: ApplicationCommandOptionType.Attachment,
                    required: true,
                    description: 'Fichier .json exporté depuis le builder',
                },
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom à donner au template importé',
                },
            ],
        },
        {
            name: 'export',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Exporte un template sauvegardé en fichier JSON',
            options: [
                {
                    name: 'nom',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Nom du template à exporter',
                    autocomplete: true,
                },
            ],
        },
    ],

    execute: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            switch (sub) {
                case 'builder':
                    return await handleBuilderV2(client, interaction);
                case 'edit':
                    return await handleEditV2(client, interaction);
                case 'send':
                    return await handleSendV2(client, interaction);
                case 'preview':
                    return await handlePreviewV2(client, interaction);
                case 'list':
                    return await handleListV2(client, interaction);
                case 'delete':
                    return await handleDeleteV2(client, interaction);
                case 'import':
                    return await handleImportV2(client, interaction);
                case 'export':
                    return await handleExportV2(client, interaction);
                default:
                    return interaction.editReply({ content: '❌ Sous-commande inconnue.' });
            }
        } catch (err) {
            console.error(`[Embed] Erreur commande /${sub}:`, err);
            return interaction.editReply({ content: `❌ Une erreur est survenue : ${err.message}` });
        }
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const docs = await EmbedModel.find({ guildId: interaction.guild.id }).limit(25);
        const filtered = docs
            .filter(d => d.name.toLowerCase().includes(focused))
            .map(d => ({ name: d.name, value: d.name }));
        await interaction.respond(filtered);
    },
};

// ════════════════════════════════════════════════════════════════════════════
//  HANDLERS
// ════════════════════════════════════════════════════════════════════════════

// ─── BUILDER ─────────────────────────────────────────────────────────────────
async function handleBuilderV2(client, interaction, existingData = null) {
    let uiData = existingData || {
        currentIndex: 0,
        containers: [
            { header: null, headerLevel: 3, accentColor: null, elements: [] },
        ],
    };

    const cancelLabel = existingData ? 'Fermer l\'éditeur' : 'Supprimer l\'Embed';

    const getComponentsV2 = () => {
        const rows = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v2_edit_header').setLabel('En-tête').setStyle(ButtonStyle.Primary).setEmoji('1496429547418288178'),
                new ButtonBuilder().setCustomId('v2_add_section').setLabel('Ajouter Texte').setStyle(ButtonStyle.Secondary).setEmoji('1496429542456168528'),
                new ButtonBuilder().setCustomId('v2_add_image').setLabel('Ajouter Image').setStyle(ButtonStyle.Secondary).setEmoji('1496429543823769690'),
                new ButtonBuilder().setCustomId('v2_add_separator').setLabel('Séparateur').setStyle(ButtonStyle.Secondary).setEmoji('1496432687903150140'),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v2_new_container').setLabel('Nouveau Bloc').setStyle(ButtonStyle.Success).setEmoji('1496429546235232336'),
                new ButtonBuilder().setCustomId('v2_edit_color').setLabel('Couleur').setStyle(ButtonStyle.Success).setEmoji('1496429544788332597'),
                new ButtonBuilder().setCustomId('v2_save').setLabel('Sauvegarder').setStyle(ButtonStyle.Success).setEmoji('1496429550870204447'),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v2_pop').setLabel('Supprimer Dernier').setStyle(ButtonStyle.Danger).setEmoji('1496429548592697445'),
                new ButtonBuilder().setCustomId('v2_del_container').setLabel('Supprimer Container').setStyle(ButtonStyle.Danger).setEmoji('1496429549897125979'),
                new ButtonBuilder().setCustomId('v2_cancel').setLabel(cancelLabel).setStyle(ButtonStyle.Danger).setEmoji('1496431403489824798'),
            ),
        ];

        if (uiData.containers.length > 1) {
            const select = new StringSelectMenuBuilder()
                .setCustomId('v2_select_container')
                .setPlaceholder('🎯 Sélectionner un container à éditer...')
                .addOptions(uiData.containers.map((_, i) => ({
                    label: `Container #${i + 1}`,
                    value: i.toString(),
                    description: i === uiData.currentIndex ? '(En cours d\'édition)' : 'Cliquez pour éditer ce container',
                    default: i === uiData.currentIndex,
                    emoji: '📦',
                })));
            rows.push(new ActionRowBuilder().addComponents(select));
        }

        return rows;
    };

    const generatePreviewV2 = () => uiData.containers.map((cont, idx) => mapContainerToV2(cont, idx));

    // Pour le builder, on répond directement sans deferReply (déjà defer en ephemeral)
    // On édite la réponse différée
    await interaction.editReply({
        content: undefined,
        components: [...getComponentsV2(), ...generatePreviewV2()],
        flags: [MessageFlags.IsComponentsV2],
    });

    const response = await interaction.fetchReply();
    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 1800000,
    });

    collector.on('collect', async i => {
        try {
            const current = uiData.containers[uiData.currentIndex];

            switch (i.customId) {
                case 'v2_select_container':
                    uiData.currentIndex = Number.parseInt(i.values[0]);
                    await i.update({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
                    break;
                case 'v2_new_container':
                    uiData.containers.push({ header: null, headerLevel: 3, accentColor: null, elements: [] });
                    uiData.currentIndex = uiData.containers.length - 1;
                    await i.update({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
                    break;
                case 'v2_del_container':
                    if (uiData.containers.length <= 1) {
                        return i.reply({ content: '❌ Vous ne pouvez pas supprimer le seul container.', ephemeral: true });
                    }
                    uiData.containers.splice(uiData.currentIndex, 1);
                    uiData.currentIndex = Math.max(0, uiData.currentIndex - 1);
                    await i.update({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
                    break;
                case 'v2_edit_header':
                    await handleV2EditHeader(i, current, interaction, getComponentsV2, generatePreviewV2);
                    break;
                case 'v2_edit_color':
                    await handleV2EditColor(i, current, interaction, getComponentsV2, generatePreviewV2);
                    break;
                case 'v2_add_section':
                    await handleV2AddText(i, current, interaction, getComponentsV2, generatePreviewV2);
                    break;
                case 'v2_add_separator':
                    current.elements.push({ type: 14 });
                    await i.update({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
                    break;
                case 'v2_add_image':
                    await handleV2AddImage(i, current, uiData, interaction, getComponentsV2, generatePreviewV2);
                    break;
                case 'v2_pop':
                    current.elements.pop();
                    await i.update({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
                    break;
                case 'v2_save':
                    await handleV2Save(i, uiData, interaction);
                    break;
                case 'v2_cancel':
                    await i.update({
                        content: undefined,
                        components: [{
                            type: 17,
                            components: [{ type: 10, content: `✅ ${cancelLabel} terminé.` }],
                        }],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                    collector.stop();
                    break;
            }
        } catch (err) {
            console.error('[Embed] Erreur lors du traitement de l\'action:', err);
            if (!i.replied && !i.deferred) {
                await i.reply({ content: '❌ Erreur lors du traitement de l\'action.', ephemeral: true }).catch(() => {});
            }
        }
    });
}

// ─── EDIT ─────────────────────────────────────────────────────────────────────
async function handleEditV2(client, interaction) {
    const name = interaction.options.getString('nom').toLowerCase();
    const doc = await EmbedModel.findOne({ guildId: interaction.guild.id, name });
    if (!doc) {
        return interaction.editReply({ content: '❌ Template introuvable.' });
    }
    return handleBuilderV2(client, interaction, doc.data);
}

// ─── SEND ─────────────────────────────────────────────────────────────────────
async function handleSendV2(client, interaction) {
    const name = interaction.options.getString('nom').toLowerCase();
    const channel = interaction.options.getChannel('salon');

    const doc = await EmbedModel.findOne({ guildId: interaction.guild.id, name });
    if (!doc) {
        return interaction.editReply({ content: '❌ Template introuvable.' });
    }

    const messageContainers = doc.data.containers.map((cont, idx) => mapContainerToV2(cont, idx));

    try {
        await channel.send({
            components: messageContainers,
            flags: [MessageFlags.IsComponentsV2],
        });
    } catch (err) {
        console.error('[Embed] Impossible d\'envoyer le message:', err);
        return interaction.editReply({
            content: `❌ Impossible d\'envoyer le message dans ${channel}. Vérifiez les permissions du bot.`,
        });
    }

    return interaction.editReply({
        content: `✅ Envoyé dans ${channel} avec **${messageContainers.length}** embed(s).`,
    });
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
async function handlePreviewV2(client, interaction) {
    const name = interaction.options.getString('nom').toLowerCase();
    const doc = await EmbedModel.findOne({ guildId: interaction.guild.id, name });
    if (!doc) {
        return interaction.editReply({ content: '❌ Template introuvable.' });
    }

    const messageContainers = doc.data.containers.map((cont, idx) => mapContainerToV2(cont, idx));

    const headerContainer = {
        type: 17,
        components: [{ type: 10, content: `🔎 Prévisualisation de \`${name}\` :` }],
    };

    return interaction.editReply({
        content: undefined,
        components: [headerContainer, ...messageContainers],
        flags: [MessageFlags.IsComponentsV2],
    });
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
async function handleListV2(client, interaction) {
    const docs = await EmbedModel.find({ guildId: interaction.guild.id });
    if (docs.length === 0) {
        return interaction.editReply({ content: '📭 Aucun template sauvegardé sur ce serveur.' });
    }
    const list = docs.map(d => `• \`${d.name}\``).join('\n');
    return interaction.editReply({ content: `### 📂 Templates V2 Sauvegardés :\n${list}` });
}

// ─── IMPORT ───────────────────────────────────────────────────────────────────
async function handleImportV2(client, interaction) {
    const attachment = interaction.options.getAttachment('fichier');
    const name = interaction.options.getString('nom').toLowerCase().trim();

    // Vérification extension
    if (!attachment.name.endsWith('.json')) {
        return interaction.editReply({ content: '❌ Le fichier doit être un `.json`.' });
    }

    // Vérification taille (max 512 Ko)
    if (attachment.size > 512 * 1024) {
        return interaction.editReply({ content: '❌ Le fichier est trop volumineux (max 512 Ko).' });
    }

    // Téléchargement du fichier
    let raw;
    try {
        const res = await fetch(attachment.url);
        raw = await res.text();
    } catch (err) {
        return interaction.editReply({ content: '❌ Impossible de télécharger le fichier.' });
    }

    // Parsing JSON
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return interaction.editReply({ content: '❌ Le fichier n\'est pas un JSON valide.' });
    }

    // Validation de la structure attendue
    if (
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.containers) ||
        parsed.containers.length === 0
    ) {
        return interaction.editReply({
            content: '❌ Structure JSON invalide. Le fichier doit contenir un champ `containers` (tableau non vide).\nUtilisez `/embed export` pour obtenir un fichier au bon format.',
        });
    }

    // Validation basique de chaque container
    for (const [i, cont] of parsed.containers.entries()) {
        if (typeof cont !== 'object' || !Array.isArray(cont.elements)) {
            return interaction.editReply({
                content: `❌ Container #${i + 1} invalide : champ \`elements\` manquant ou incorrect.`,
            });
        }
    }

    // Nettoyage : on force currentIndex à 0
    const uiData = {
        currentIndex: 0,
        containers: parsed.containers.map(cont => ({
            header: cont.header ?? null,
            headerLevel: [1, 2, 3].includes(cont.headerLevel) ? cont.headerLevel : 3,
            accentColor: typeof cont.accentColor === 'number' ? cont.accentColor : null,
            elements: cont.elements.filter(el => [9, 12, 14].includes(el.type)),
        })),
    };

    await EmbedModel.findOneAndUpdate(
        { guildId: interaction.guild.id, name },
        { guildId: interaction.guild.id, name, authorId: interaction.user.id, data: uiData },
        { upsert: true },
    );

    return interaction.editReply({
        content: `✅ Template \`${name}\` importé avec succès (**${uiData.containers.length}** container(s)).\nUtilisez \`/embed preview\` pour le visualiser ou \`/embed edit\` pour le modifier.`,
    });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
async function handleExportV2(client, interaction) {
    const name = interaction.options.getString('nom').toLowerCase();

    const doc = await EmbedModel.findOne({ guildId: interaction.guild.id, name });
    if (!doc) {
        return interaction.editReply({ content: '❌ Template introuvable.' });
    }

    // Sérialisation propre (on exclut les métadonnées Mongoose)
    const exportData = {
        containers: doc.data.containers.map(cont => ({
            header: cont.header ?? null,
            headerLevel: cont.headerLevel ?? 3,
            accentColor: cont.accentColor ?? null,
            elements: cont.elements ?? [],
        })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(json, 'utf-8');

    const { AttachmentBuilder } = require('discord.js');
    const file = new AttachmentBuilder(buffer, { name: `${name}.json` });

    return interaction.editReply({
        content: `📦 Export du template \`${name}\` (**${exportData.containers.length}** container(s)) :`,
        files: [file],
    });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
async function handleDeleteV2(client, interaction) {
    const name = interaction.options.getString('nom').toLowerCase();
    const doc = await EmbedModel.findOneAndDelete({ guildId: interaction.guild.id, name });
    if (!doc) {
        return interaction.editReply({ content: '❌ Template introuvable.' });
    }
    return interaction.editReply({ content: `✅ Template \`${name}\` supprimé avec succès.` });
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLERS AUXILIAIRES
// ════════════════════════════════════════════════════════════════════════════

async function handleV2EditHeader(i, current, interaction, getComponentsV2, generatePreviewV2) {
    await i.reply({ content: '👑 Titre de l\'en-tête (écrivez `supprimer` pour retirer) :', ephemeral: true });
    const msg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
    if (!msg.first()) return;
    const text = msg.first().content;
    msg.first().delete().catch(() => {});

    if (text.toLowerCase() === 'annuler') return i.deleteReply().catch(() => {});
    if (text.toLowerCase() === 'supprimer') {
        current.header = null;
    } else {
        current.header = text;
        await i.editReply({ content: '📏 Niveau de titre (1, 2 ou 3) :' });
        const lvlMsg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
        if (lvlMsg.first()) {
            const lvl = Number.parseInt(lvlMsg.first().content);
            current.headerLevel = [1, 2, 3].includes(lvl) ? lvl : 3;
            lvlMsg.first().delete().catch(() => {});
        } else {
            current.headerLevel = 3;
        }
    }

    await interaction.editReply({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
    await i.deleteReply().catch(() => {});
}

async function handleV2EditColor(i, current, interaction, getComponentsV2, generatePreviewV2) {
    await i.reply({ content: '🎨 Couleur HEX :', ephemeral: true });
    const msg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
    if (!msg.first()) return;
    let color = msg.first().content;
    msg.first().delete().catch(() => {});

    if (color.toLowerCase() === 'annuler') return i.deleteReply().catch(() => {});
    color = color.replace('#', '');
    current.accentColor = Number.parseInt(color, 16);

    await interaction.editReply({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
    await i.deleteReply().catch(() => {});
}

async function handleV2AddText(i, current, interaction, getComponentsV2, generatePreviewV2) {
    await i.reply({ content: '✍️ Titre (optionnel, écrivez `passer` pour ignorer) :', ephemeral: true });
    const tMsg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
    if (!tMsg.first()) return;
    let title = tMsg.first().content;
    tMsg.first().delete().catch(() => {});
    if (title.toLowerCase() === 'annuler') return i.deleteReply().catch(() => {});
    if (title.toLowerCase() === 'passer') title = null;

    await i.editReply({ content: '✍️ Contenu (optionnel, écrivez `passer` pour ignorer) :' });
    const cMsg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 });
    if (!cMsg.first()) return;
    let content = cMsg.first().content;
    cMsg.first().delete().catch(() => {});
    if (content.toLowerCase() === 'annuler') return i.deleteReply().catch(() => {});
    if (content.toLowerCase() === 'passer') content = null;

    current.elements.push({ type: 9, title, content, thumbnail: null });
    await interaction.editReply({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
    await i.deleteReply().catch(() => {});
}

async function handleV2AddImage(i, current, uiData, interaction, getComponentsV2, generatePreviewV2) {
    await i.reply({ content: '🖼️ URL de l\'image :', ephemeral: true });
    const msg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
    if (!msg.first()) return;
    const url = msg.first().content;
    msg.first().delete().catch(() => {});
    if (url.toLowerCase() === 'annuler') return i.deleteReply().catch(() => {});

    const blocks = current.elements.filter(el => el.type === 9);
    if (blocks.length > 0) {
        const list = blocks.map((el, idx) => `${idx + 1}: ${el.title || (el.content ? el.content.substring(0, 20) : 'Bloc')}`).join('\n');
        await i.editReply({ content: `📍 ID du bloc de texte ? (0 pour galerie) :\n${list}` });
        const cMsg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
        if (cMsg.first()) {
            const idx = Number.parseInt(cMsg.first().content);
            cMsg.first().delete().catch(() => {});
            if (idx > 0 && idx <= blocks.length) blocks[idx - 1].thumbnail = url;
            else current.elements.push({ type: 12, urls: [url] });
        } else {
            current.elements.push({ type: 12, urls: [url] });
        }
    } else {
        current.elements.push({ type: 12, urls: [url] });
    }

    await interaction.editReply({ content: undefined, components: [...getComponentsV2(), ...generatePreviewV2()] });
    await i.deleteReply().catch(() => {});
}

async function handleV2Save(i, uiData, interaction) {
    await i.reply({ content: '💾 Nom du template :', ephemeral: true });
    const msg = await i.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 30000 });
    if (!msg.first()) return;
    const name = msg.first().content.toLowerCase();
    msg.first().delete().catch(() => {});
    if (name === 'annuler') return i.deleteReply().catch(() => {});

    await EmbedModel.findOneAndUpdate(
        { guildId: interaction.guild.id, name },
        { guildId: interaction.guild.id, name, authorId: interaction.user.id, data: uiData },
        { upsert: true },
    );

    await i.editReply({ content: `✅ Template \`${name}\` sauvegardé avec **${uiData.containers.length}** embed(s) !` });
}

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS DE MAPPING
// ════════════════════════════════════════════════════════════════════════════

function mapContainerToV2(cont, idx) {
    const sections = [];

    if (cont.header) {
        let prefix = '### ';
        if (cont.headerLevel === 1) prefix = '# ';
        else if (cont.headerLevel === 2) prefix = '## ';
        sections.push({ type: 10, content: `${prefix}${cont.header}` });
    }

    for (const el of cont.elements) {
        sections.push(...mapElementToV2(el));
    }

    if (sections.length === 0) {
        sections.push({ type: 10, content: `*Container #${idx + 1} Vide — Cliquez sur Ajouter Texte*` });
    }

    return { type: 17, components: sections, accent_color: cont.accentColor };
}

function mapElementToV2(el) {
    if (el.type === 9) {
        const title = el.title ? `**${el.title}**\n` : '';
        const content = el.content || '';
        if (el.thumbnail) {
            return [{
                type: 9,
                components: [{ type: 10, content: `${title}${content}` }],
                accessory: { type: 11, media: { url: el.thumbnail } },
            }];
        }
        const elements = [];
        if (title) elements.push({ type: 10, content: title });
        if (content) elements.push({ type: 10, content: content });
        return elements;
    }
    if (el.type === 14) return [{ type: 14 }];
    if (el.type === 12) return [{ type: 12, items: el.urls.map(url => ({ media: { url } })) }];
    return [];
}