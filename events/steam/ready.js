const { Events } = require("discord.js");
const mongoose = require("mongoose");
const { checkVNDeals, cleanExpiredDeals } = require("../../utils/checkVNDeals");

// Scheduler deals     : toutes les 30 minutes (vérifie l'intervalle par guild)
// Scheduler nettoyage : toutes les 10 minutes (supprime les messages expirés)
const DEALS_TICK_MS = 30 * 60 * 1_000;
const CLEAN_TICK_MS = 10 * 60 * 1_000;

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute: async (client) => {
    // 1. Attendre la connexion MongoDB
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("connected", resolve);
        setTimeout(resolve, 15_000); // timeout sécurité 15s
      });
    }

    // 2. Délai d'initialisation
    await new Promise((r) => setTimeout(r, 3_000));

    console.log("[Steam] Scheduler démarré — deals:30min / nettoyage:10min");

    // 3. Premier passage immédiat au boot
    await checkVNDeals(client).catch((err) =>
      console.error("[Steam] Erreur check initial:", err.message),
    );
    await cleanExpiredDeals(client).catch((err) =>
      console.error("[Steam] Erreur clean initial:", err.message),
    );

    // 4. Scheduler deals : toutes les 30 minutes
    setInterval(async () => {
      await checkVNDeals(client).catch((err) =>
        console.error("[Steam] Erreur tick deals:", err.message),
      );
    }, DEALS_TICK_MS);

    // 5. Scheduler nettoyage : toutes les 10 minutes
    setInterval(async () => {
      await cleanExpiredDeals(client).catch((err) =>
        console.error("[Steam] Erreur tick nettoyage:", err.message),
      );
    }, CLEAN_TICK_MS);
  },
};
