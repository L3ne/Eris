const { Events } = require('discord.js');
const mongoose = require('mongoose');
const { Giveaway } = require('../../schemas/giveawaySchema');
const { scheduleGiveaway, endGiveaway } = require('../../utils/giveawayUtils');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        // Attendre que MongoDB soit connecté
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => {
                mongoose.connection.once('connected', resolve);
                setTimeout(resolve, 15000); // fallback timeout 15s
            });
        }

        // Petit délai supplémentaire pour s'assurer que la connexion est stable
        await new Promise(r => setTimeout(r, 2000));

        try {
            const now             = new Date();
            const activeGiveaways = await Giveaway.find({ status: 'active' });

            console.log(`[Giveaway] Restauration de ${activeGiveaways.length} giveaway(s) actif(s)...`);

            for (const giveaway of activeGiveaways) {
                if (giveaway.endsAt <= now) {
                    // Expiré pendant le downtime → terminer immédiatement
                    console.log(`[Giveaway] Giveaway expiré pendant le downtime: ${giveaway.messageId}`);
                    await endGiveaway(client, giveaway.messageId, giveaway.guildId).catch(err => {
                        console.error(`[Giveaway] Erreur lors de la fin du giveaway ${giveaway.messageId}:`, err);
                    });
                } else {
                    // Encore actif → planifier
                    scheduleGiveaway(client, giveaway);
                    console.log(`[Giveaway] Giveaway planifié: ${giveaway.messageId} (se termine <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>)`);
                }
            }

            console.log('[Giveaway] ✅ Restauration terminée.');
        } catch (err) {
            console.error('[Giveaway] Erreur lors de la restauration:', err);
        }
    }
};
