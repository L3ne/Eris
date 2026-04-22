const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createTicket, closeTicket, addMemberToTicket, removeMemberFromTicket } = require("../../utils/ticketUtils");
const TicketConfig = require('../../schemas/ticketConfigSchema');

module.exports = {
    name: Events.InteractionCreate,
    execute: async (client, interaction) => {
        // Gérer les boutons de tickets
        if (interaction.isButton()) {
            await handleButtonInteraction(client, interaction);
        }
        
        // Gérer les modals de tickets
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(client, interaction);
        }
        
        // Gérer les select menus de tickets
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(client, interaction);
        }
    }
};

/**
 * Gère les interactions de boutons liés aux tickets
 */
async function handleButtonInteraction(client, interaction) {
    const customId = interaction.customId;

    switch (customId) {
        case 'ticket_open':
            await handleOpenTicket(client, interaction);
            break;
        
        case 'ticket_close':
            await handleCloseTicket(client, interaction);
            break;
        
        case 'ticket_add':
            await handleAddMember(client, interaction);
            break;
        
        case 'ticket_remove':
            await handleRemoveMember(client, interaction);
            break;
        
        
        case 'confirm_close':
            await handleConfirmClose(client, interaction);
            break;
        
        case 'cancel_close':
            await handleCancelClose(client, interaction);
            break;
    }
}

/**
 * Gère l'ouverture d'un ticket (affiche le modal)
 */
async function handleOpenTicket(client, interaction) {
    const modal = new ModalBuilder()
        .setCustomId('ticket_open_modal')
        .setTitle('Créer un ticket')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('Raison du ticket')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Décrivez votre problème ou votre demande...')
                    .setRequired(true)
                    .setMaxLength(500)
            )
        );

    await interaction.showModal(modal);
}

/**
 * Gère la fermeture d'un ticket (affiche la confirmation)
 */
async function handleCloseTicket(client, interaction) {
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('⚠️ Confirmation de fermeture')
        .setDescription('Êtes-vous sûr de vouloir fermer ce ticket ?')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('✅ Confirmer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Gère l'ajout d'un membre (affiche le select menu)
 */
async function handleAddMember(client, interaction) {
    // Vérifier les permissions
    const config = await TicketConfig.findOne({ guildId: interaction.guildId });
    const member = interaction.member;

    const supportRoles = config?.supportRoles || [];
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         member.roles.cache.some(role => supportRoles.includes(role.id));

    if (!hasPermission) {
        return interaction.reply({
            content: '❌ Vous n\'avez pas la permission d\'ajouter des membres.',
            ephemeral: true
        });
    }

    // Récupérer les membres du serveur
    const members = await interaction.guild.members.fetch();
    const ticket = require('../../schemas/ticketSchema');
    const ticketData = await ticket.findOne({ channelId: interaction.channelId, status: 'open' });

    if (!ticketData) {
        return interaction.reply({
            content: '❌ Ce ticket n\'existe pas ou est fermé.',
            ephemeral: true
        });
    }

    // Filtrer les membres qui ne sont pas déjà dans le ticket
    const availableMembers = members.filter(m => 
        !ticketData.members.includes(m.id) && 
        !m.user.bot && 
        m.id !== ticketData.creatorId
    ).first(25);

    if (availableMembers.size === 0) {
        return interaction.reply({
            content: '❌ Aucun membre disponible à ajouter.',
            ephemeral: true
        });
    }

    const options = availableMembers.map(member => 
        new StringSelectMenuOptionBuilder()
            .setLabel(member.user.tag)
            .setValue(member.id)
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_add_select')
        .setPlaceholder('Sélectionnez un membre à ajouter')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: 'Sélectionnez un membre à ajouter au ticket:',
        components: [row],
        ephemeral: true
    });
}

/**
 * Gère le retrait d'un membre (affiche le select menu)
 */
async function handleRemoveMember(client, interaction) {
    // Vérifier les permissions
    const config = await TicketConfig.findOne({ guildId: interaction.guildId });
    const member = interaction.member;

    const supportRoles = config?.supportRoles || [];
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         member.roles.cache.some(role => supportRoles.includes(role.id));

    if (!hasPermission) {
        return interaction.reply({
            content: '❌ Vous n\'avez pas la permission de retirer des membres.',
            ephemeral: true
        });
    }

    const ticket = require('../../schemas/ticketSchema');
    const ticketData = await ticket.findOne({ channelId: interaction.channelId, status: 'open' });

    if (!ticketData) {
        return interaction.reply({
            content: '❌ Ce ticket n\'existe pas ou est fermé.',
            ephemeral: true
        });
    }

    // Récupérer les membres du ticket
    const members = await Promise.all(
        ticketData.members
            .filter(id => id !== ticketData.creatorId)
            .map(id => interaction.guild.members.fetch(id).catch(() => null))
    );
    
    const validMembers = members.filter(m => m !== null);

    if (validMembers.length === 0) {
        return interaction.reply({
            content: '❌ Aucun membre à retirer.',
            ephemeral: true
        });
    }

    const options = validMembers.map(member => 
        new StringSelectMenuOptionBuilder()
            .setLabel(member.user.tag)
            .setValue(member.id)
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_remove_select')
        .setPlaceholder('Sélectionnez un membre à retirer')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: 'Sélectionnez un membre à retirer du ticket:',
        components: [row],
        ephemeral: true
    });
}

/**
 * Gère la confirmation de fermeture
 */
async function handleConfirmClose(client, interaction) {
    await interaction.deferReply();

    const result = await closeTicket(client, interaction, interaction.channelId, interaction.user.id);

    if (result.success) {
        await interaction.editReply({
            content: '✅ Ticket fermé avec succès. Le channel sera supprimé dans 10 secondes.'
        });
    } else {
        await interaction.editReply({
            content: `❌ ${result.message}`
        });
    }
}

/**
 * Gère l'annulation de fermeture
 */
async function handleCancelClose(client, interaction) {
    await interaction.update({
        content: '❌ Fermeture annulée.',
        embeds: [],
        components: []
    });
}

/**
 * Gère la soumission du modal d'ouverture de ticket
 */
async function handleModalSubmit(client, interaction) {
    if (interaction.customId === 'ticket_open_modal') {
        await interaction.deferReply({ ephemeral: true });

        const reason = interaction.fields.getTextInputValue('ticket_reason');

        const result = await createTicket(client, interaction, reason);

        if (result.success) {
            await interaction.editReply({
                content: `✅ Ticket créé avec succès ! ${result.channel}`
            });
        } else {
            await interaction.editReply({
                content: `❌ ${result.message}`
            });
        }
    }
}

/**
 * Gère les select menus de tickets
 */
async function handleSelectMenu(client, interaction) {
    const customId = interaction.customId;

    switch (customId) {
        case 'ticket_add_select':
            await handleAddMemberSelect(client, interaction);
            break;

        case 'ticket_remove_select':
            await handleRemoveMemberSelect(client, interaction);
            break;
    }
}

/**
 * Gère la sélection d'un membre à ajouter
 */
async function handleAddMemberSelect(client, interaction) {
    const userId = interaction.values[0];

    await interaction.deferReply({ ephemeral: true });

    const result = await addMemberToTicket(client, interaction, interaction.channelId, userId);

    if (result.success) {
        await interaction.editReply({
            content: '✅ Membre ajouté avec succès.'
        });
    } else {
        await interaction.editReply({
            content: `❌ ${result.message}`
        });
    }
}

/**
 * Gère la sélection d'un membre à retirer
 */
async function handleRemoveMemberSelect(client, interaction) {
    const userId = interaction.values[0];

    await interaction.deferReply({ ephemeral: true });

    const result = await removeMemberFromTicket(client, interaction, interaction.channelId, userId);

    if (result.success) {
        await interaction.editReply({
            content: '✅ Membre retiré avec succès.'
        });
    } else {
        await interaction.editReply({
            content: `❌ ${result.message}`
        });
    }
}
