const axios = require("axios");
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const SteamGuildConfig = require("../schemas/steamGuildConfigSchema");
const SteamSentDeal = require("../schemas/steamSentDealSchema");
const SteamTrackedApp = require("../schemas/steamTrackedAppSchema");

const APPDETAILS_URL = "https://store.steampowered.com/api/appdetails";
const AXIOS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

// ─── API Steam ────────────────────────────────────────────────────────────────

/**
 * Récupère les détails d'un seul app Steam.
 * Utilisée lors de /steam add pour valider et nommer l'app.
 * @param {number|string} appId
 * @returns {Promise<Object|null>}  data Steam ou null si introuvable
 */
async function fetchAppDetails(appId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(APPDETAILS_URL, {
        params: { appids: appId },
        timeout: 8_000,
        headers: AXIOS_HEADERS,
      });
      const entry = response.data?.[String(appId)];
      if (!entry?.success || !entry?.data) return null;
      return entry.data;
    } catch (err) {
      const status = err.response?.status;

      if (status === 429) {
        const wait = attempt * 10_000; // 10s, 20s, 30s
        console.warn(`[Steam] 429 sur app ${appId} — retry ${attempt}/${retries} dans ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      console.error(`[Steam] fetchAppDetails(${appId}):`, err.message);
      return null;
    }
  }

  console.error(`[Steam] fetchAppDetails(${appId}): échec après ${retries} tentatives`);
  return null;
}
/**
 * Récupère les détails de plusieurs apps Steam via des appels individuels en parallèle.
 *
 * Steam bloque ou ignore les requêtes avec plusieurs appids séparés par virgule
 * (?appids=111,222,333) de façon non fiable. On fetch donc chaque app
 * séparément via fetchAppDetails(), avec une concurrence de 5 max
 * pour ne pas déclencher de rate-limit.
 *
 * @param {string[]} appIds
 * @returns {Promise<Record<string, Object>>}  { appId → data }
 */
async function fetchBatchAppDetails(appIds) {
  const CONCURRENCY = 5;
  const results = {};

  for (let i = 0; i < appIds.length; i += CONCURRENCY) {
    const chunk = appIds.slice(i, i + CONCURRENCY);

    const settled = await Promise.allSettled(
      chunk.map((appId) =>
        fetchAppDetails(appId).then((data) => ({ appId, data })),
      ),
    );

    for (const outcome of settled) {
      if (outcome.status === "fulfilled" && outcome.value.data) {
        results[outcome.value.appId] = outcome.value.data;
      } else if (outcome.status === "rejected") {
        console.error(
          "[Steam] fetchBatchAppDetails erreur :",
          outcome.reason?.message,
        );
      }
    }

    // Délai entre les chunks pour ne pas déclencher de rate-limit
    if (i + CONCURRENCY < appIds.length) {
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }

  return results;
}

// ─── Embed ────────────────────────────────────────────────────────────────────

/**
 * Construit l'embed Discord pour un deal Steam.
 * Utilise le format appdetails (price_overview).
 * @param {import("discord.js").Client} client
 * @param {Object} appData  — données brutes de l'API appdetails
 */
function buildDealEmbed(client, appData) {
  const appId = String(appData.steam_appid);
  const storeUrl = `https://store.steampowered.com/app/${appId}`;
  const price = appData.price_overview || {};
  const isFree = price.final === 0 || price.discount_percent === 100;

  const originalStr = price.initial_formatted || "N/A";
  const finalStr = price.final_formatted || "Gratuit";
  const discount = price.discount_percent || 0;

  return new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: "Steam Deal",
      iconURL: "https://store.steampowered.com/favicon.ico",
      url: "https://store.steampowered.com",
    })
    .setTitle(appData.name)
    .setURL(storeUrl)
    .setDescription(appData.short_description)
    .setImage(appData.header_image)
    .addFields(
      {
        name: "Prix original",
        value: isFree ? "Gratuit" : `~~${originalStr}~~`,
        inline: true,
      },
      { name: "Réduction", value: `-${discount}%`, inline: true },
      {
        name: "Prix final",
        value: isFree ? "Gratuit" : finalStr,
        inline: true,
      },
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.avatarURL({ dynamic: true }),
    })
    .setTimestamp();

}
function createButton(client, appData) {
  const appId = String(appData.steam_appid);
  const storeUrl = `https://store.steampowered.com/app/${appId}`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Voir sur Steam")
      .setURL(storeUrl)
      .setStyle(ButtonStyle.Link)
  );
}

// ─── Logique par guild ───────────────────────────────────────────────────────

/**
 * Vérifie et envoie les deals pour UNE guild spécifique.
 * Ne vérifie PAS l'intervalle — à utiliser aussi bien par le scheduler
 * que par la commande /steam check (déclenchement manuel).
 *
 * @param {import("discord.js").Client} client
 * @param {Object} config  — document SteamGuildConfig
 * @returns {Promise<{ checked: number, onSale: number, sent: number }>}
 */
async function checkGuildDeals(client, config) {
  const guildId = config.guildId;

  // 1. Apps trackées
  const tracked = await SteamTrackedApp.find({ guildId });
  if (!tracked.length) {
    config.lastChecked = new Date();
    await config.save();
    return { checked: 0, onSale: 0, sent: 0 };
  }

  // 2. Résoudre guild + salon
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { checked: tracked.length, onSale: 0, sent: 0 };

  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return { checked: tracked.length, onSale: 0, sent: 0 };

  // 3. Batch fetch appdetails
  const appIds = tracked.map((a) => a.appId);
  const details = await fetchBatchAppDetails(appIds);

  console.log(
    `[Steam] ${guild.name} — ${appIds.length} trackée(s), ${Object.keys(details).length} détails reçus`,
  );

  let onSale = 0;
  let sent = 0;

  for (const [appId, appData] of Object.entries(details)) {
    const price = appData.price_overview;
    if (!price || price.discount_percent === 0) continue;
    onSale++;

    // Déjà envoyé pour cette guild ?
    const alreadySent = await SteamSentDeal.exists({ guildId, appId });
    if (alreadySent) continue;

    // Envoyer l'embed
    const embed = buildDealEmbed(client, appData);
    const button = createButton(client, appData);
    const content = config.roleId ? `<@&${config.roleId}>` : undefined;

    await channel.send({ content, embeds: [embed], components: [button] }).catch((err) => {
      console.error(
        `[Steam] Envoi impossible dans #${channel.name}:`,
        err.message,
      );
    });

    await new SteamSentDeal({ guildId, appId }).save().catch(() => {});
    sent++;
  }

  // Mettre à jour lastChecked
  config.lastChecked = new Date();
  await config.save();

  if (sent > 0)
    console.log(`[Steam] ${sent} deal(s) envoyé(s) → ${guild.name}`);

  return { checked: appIds.length, onSale, sent };
}

// ─── Point d'entrée scheduler ─────────────────────────────────────────────────

/**
 * Vérifie les deals pour toutes les guilds actives.
 * Respecte l'intervalle de chaque guild.
 * Appelé par le scheduler (events/steam/ready.js).
 * @param {import("discord.js").Client} client
 */
async function checkVNDeals(client) {
  try {
    const configs = await SteamGuildConfig.find({
      enabled: true,
      channelId: { $ne: null },
    });
    if (!configs.length) return;

    const now = Date.now();

    for (const config of configs) {
      try {
        // Vérifier l'intervalle par guild
        const intervalMs = config.interval * 3_600_000;
        if (
          config.lastChecked &&
          now - config.lastChecked.getTime() < intervalMs
        )
          continue;

        await checkGuildDeals(client, config);
      } catch (err) {
        console.error(`[Steam] Erreur guild ${config.guildId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Steam] Erreur checkVNDeals:", err.message);
  }
}

module.exports = { checkVNDeals, checkGuildDeals, fetchAppDetails };
