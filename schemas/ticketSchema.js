const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    creatorId: {
        type: String,
        required: true,
        index: true
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'archived'],
        default: 'open',
        index: true
    },
    category: {
        type: String,
        default: 'general'
    },
    members: [{
        type: String
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    closedAt: {
        type: Date,
        default: null
    },
    closedBy: {
        type: String,
        default: null
    },
    transcriptUrl: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index composé pour éviter les doublons de tickets ouverts par le même utilisateur
ticketSchema.index({ guildId: 1, creatorId: 1, status: 1 });

// Méthode statique pour obtenir le prochain ID de ticket
ticketSchema.statics.getNextTicketId = async function(guildId) {
    const tickets = await this.find({ guildId }).sort({ createdAt: -1 });
    if (!tickets || tickets.length === 0) return 'ticket-001';
    
    // Trouver le dernier ID numérique
    let maxId = 0;
    tickets.forEach(ticket => {
        const id = parseInt(ticket.ticketId.split('-')[1]);
        if (id > maxId) maxId = id;
    });
    
    const nextId = maxId + 1;
    return `ticket-${String(nextId).padStart(3, '0')}`;
};

// Méthode pour vérifier si un utilisateur a déjà un ticket ouvert
ticketSchema.statics.hasOpenTicket = async function(guildId, userId) {
    const ticket = await this.findOne({
        guildId,
        creatorId: userId,
        status: 'open'
    });
    return !!ticket;
};

module.exports = mongoose.model('Ticket', ticketSchema);
