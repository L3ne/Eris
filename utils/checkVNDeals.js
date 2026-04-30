const axios = require("axios");
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const SteamGuildConfig = require("../schemas/steamGuildConfigSchema");
const SteamSentDeal = require("../schemas/steamSentDealSchema");
const SteamTrackedApp = require("../schemas/steamTrackedAppSchema");

const APPDETAILS_URL = "https://store.steampowered.com/api/appdetails";
const STORE_URL = "https://store.steampowered.com/app";
const RATE_LIMIT_MS = 3_500; // 3.5 secondes entre chaque requête Steam
const AXIOS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9",
};

// ─── Mois français → numéro ──────────────────────────────────────────────────

const FR_MONTHS = {
  janvier: 1,
  "f\u00e9vrier": 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  "ao\u00fbt": 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  "d\u00e9cembre": 12,
};

/**
 * Parse "OFFRE SP\u00c9CIALE ! La promotion prend fin le 12 mai" → timestamp Unix.
 * Retourne null si le format est inconnu.
 * @param {string} text
 * @returns {number|null}
 */
function parseFrenchPromoDate(text) {
  // 1. Nettoyer : retirer "OFFRE SP\u00c9CIALE !" et la phrase d'intro
  const clean = text
    .replace(/offre\s+sp[e\u00e9]ciale\s*!\s*/gi, "")
    .replace(/la\s+promotion\s+prend\s+fin\s+le\s+/gi, "")
    .trim();

  // 2. Extraire "12 mai", "3 janvier", etc.
  const match = clean.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)/i);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthName = match[2].toLowerCase();
  const month = FR_MONTHS[monthName];
  if (!month) return null;

  // 3. Construire la date (fin de la journ\u00e9e = 23:59:59)
  const now = new Date();
  const date = new Date(now.getFullYear(), month - 1, day, 23, 59, 59);

  // Si la date est d\u00e9j\u00e0 pass\u00e9e, supposer l'ann\u00e9e suivante
  if (date.getTime() < now.getTime()) date.setFullYear(now.getFullYear() + 1);

  return Math.floor(date.getTime() / 1000);
}

/**
 * Scrape la page Steam d'un jeu pour extraire la date de fin de promotion.
 * Retourne un timestamp Unix ou null si aucune promo d\u00e9tect\u00e9e.
 * @param {string|number} appId
 * @returns {Promise<number|null>}
 */
async function fetchPromoEndDate(appId) {
  try {
    const url = `${STORE_URL}/${appId}/?l=french&cc=FR`;
    const { data: html } = await axios.get(url, {
      timeout: 10_000,
      headers: AXIOS_HEADERS,
    });

    // L'\u00e9l\u00e9ment HTML contient: "OFFRE SP\u00c9CIALE ! La promotion prend fin le 12 mai"
    const match = html.match(
      /game_purchase_discount_countdown[^>]*>\s*([^<]+)/,
    );
    if (!match) return null;

    const rawText = match[1].trim();
    const ts = parseFrenchPromoDate(rawText);

    if (ts)
      console.log(`[Steam] Promo fin app ${appId} : ${rawText} → <t:${ts}:f>`);
    return ts;
  } catch (err) {
    console.error(`[Steam] fetchPromoEndDate(${appId}):`, err.message);
    return null;
  }
}

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
        console.warn(
          `[Steam] 429 sur app ${appId} — retry ${attempt}/${retries} dans ${wait / 1000}s`,
        );
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      console.error(`[Steam] fetchAppDetails(${appId}):`, err.message);
      return null;
    }
  }

  console.error(
    `[Steam] fetchAppDetails(${appId}): échec après ${retries} tentatives`,
  );
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
  const results = {};

  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    const data = await fetchAppDetails(appId);
    if (data) results[appId] = data;

    // Rate limit : 3.5s entre chaque requ\u00eate sauf apr\u00e8s la derni\u00e8re
    if (i < appIds.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
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
/**
 * @param {import("discord.js").Client} client
 * @param {Object}      appData       — donn\u00e9es brutes appdetails
 * @param {number|null} promoEndTs    — timestamp Unix de fin de promo (ou null)
 */
function buildDealEmbed(client, appData, promoEndTs = null) {
  const appId = String(appData.steam_appid);
  const storeUrl = `https://store.steampowered.com/app/${appId}`;
  const price = appData.price_overview || {};
  const isFree = price.final === 0 || price.discount_percent === 100;

  const originalStr = price.initial_formatted || "N/A";
  const finalStr = price.final_formatted || "Gratuit";
  const discount = price.discount_percent || 0;

  const fields = [
    {
      name: "Prix original",
      value: isFree ? "Gratuit" : `~~${originalStr}~~`,
      inline: true,
    },
    { name: "R\u00e9duction", value: `-${discount}%`, inline: true },
    {
      name: "Prix final",
      value: isFree ? "Gratuit" : finalStr,
      inline: true,
    },
  ];

  // Ajouter la date de fin de promo si disponible
  if (promoEndTs) {
    fields.push({
      name: "Fin de la promo",
      value: `<t:${promoEndTs}:f>`,
      inline: true,
    });
  }

  return new EmbedBuilder()
    .setColor(client.color)
    .setAuthor({
      name: "Steam Deal",
      iconURL:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/960px-Steam_icon_logo.svg.png",
      url: "https://store.steampowered.com",
    })
    .setTitle(appData.name)
    .setURL(storeUrl)
    .setDescription(appData.short_description)
    .setImage(appData.header_image)
    .addFields(...fields)
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
      .setStyle(ButtonStyle.Link),
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

    // D\u00e9j\u00e0 envoy\u00e9 pour cette guild ?
    const alreadySent = await SteamSentDeal.exists({ guildId, appId });
    if (alreadySent) continue;

    // Scraper la date de fin de promo (rate limit inclus)
    const promoEndTs = await fetchPromoEndDate(appId);
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));

    // Envoyer l'embed
    const embed = buildDealEmbed(client, appData, promoEndTs);
    const button = createButton(client, appData);
    const content = config.roleId ? `<@&${config.roleId}>` : undefined;

    const sentMsg = await channel
      .send({ content, embeds: [embed], components: [button] })
      .catch((err) => {
        console.error(
          `[Steam] Envoi impossible dans #${channel.name}:`,
          err.message,
        );
        return null;
      });

    // Sauvegarder avec messageId, channelId et promoEndTs pour le nettoyage futur
    await new SteamSentDeal({
      guildId,
      appId,
      promoEndTs: promoEndTs ?? null,
      messageId: sentMsg?.id ?? null,
      channelId: sentMsg ? config.channelId : null,
    })
      .save()
      .catch(() => {});

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

// ─── Nettoyage des promos expirées ─────────────────────────────────────────────────────────────

/**
 * Parcourt les SentDeal dont la promo est expirée, supprime le message Discord
 * correspondant et efface le document pour permettre une re-détection future.
 * @param {import("discord.js").Client} client
 */
async function cleanExpiredDeals(client) {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Deals expirés avec un message à supprimer
    const expired = await SteamSentDeal.find({
      promoEndTs: { $ne: null, $lte: now },
      messageId: { $ne: null },
    });

    if (!expired.length) return;

    console.log(`[Steam] ${expired.length} deal(s) expiré(s) à nettoyer`);

    let deleted = 0;

    for (const deal of expired) {
      try {
        // Récupérer le salon
        const channel =
          client.channels.cache.get(deal.channelId) ||
          (await client.channels.fetch(deal.channelId).catch(() => null));

        if (channel) {
          // Supprimer le message de l'embed deal
          const msg = await channel.messages
            .fetch(deal.messageId)
            .catch(() => null);

          if (msg) {
            await msg.delete().catch(() => null);
            deleted++;
          }
        }
      } catch (err) {
        console.error(
          `[Steam] Erreur suppression message ${deal.messageId}:`,
          err.message,
        );
      }

      // Supprimer le doc MongoDB pour permettre une re-détection si re-promoé
      await SteamSentDeal.deleteOne({ _id: deal._id }).catch(() => {});
    }

    if (deleted > 0)
      console.log(`[Steam] ${deleted} message(s) supprimé(s) (promo terminée)`);
  } catch (err) {
    console.error("[Steam] Erreur cleanExpiredDeals:", err.message);
  }
}

module.exports = {
  checkVNDeals,
  checkGuildDeals,
  cleanExpiredDeals,
  fetchAppDetails,
};
