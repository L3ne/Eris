const { Events } = require('discord.js');
const mongoose   = require('mongoose');
const { checkVNDeals } = require('../../utils/checkVNDeals');

// Intervalle du scheduler global : toutes les 30 minutes.
// Chaque guild possède son propre `interval` (1–24h) vérifié dans checkVNDeals.
const SCHEDULER_TICK_MS = 30 * 60 * 1000;

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute: async (client) => {
    // 1. Attendre que MongoDB soit connecté avant de lancer le scheduler
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
        // Timeout de sécurité : résoudre après 15s même si la connexion tarde
        setTimeout(resolve, 15_000);
      });
    }

    // 2. Délai supplémentaire pour laisser le bot finir son initialisation
    await new Promise(r => setTimeout(r, 3_000));

    console.log('[Steam] Scheduler démarré — tick toutes les 30 minutes.');

    // 3. Premier check immédiat au démarrage
    await checkVNDeals(client).catch(err =>
      console.error('[Steam] Erreur au premier check:', err.message),
    );

    // 4. Scheduler récurrent
    setInterval(async () => {
      await checkVNDeals(client).catch(err =>
        console.error('[Steam] Erreur tick scheduler:', err.message),
      );
    }, SCHEDULER_TICK_MS);
  },
};
