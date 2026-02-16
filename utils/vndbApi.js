const VNDB_API_URL = 'https://api.vndb.org/kana';

const BLACKLISTED_TAG_KEYWORDS = ['loli', 'lolicon', 'shota', 'shotacon', 'underage'];

async function searchVisualNovels(query, limit = 5) {
    try {
        const response = await fetch(`${VNDB_API_URL}/vn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filters: ['search', '=', query],
                fields: 'title, alttitle, image.url, rating, votecount, popularity, released, length, description, developers.name, languages, tags.name, tags.rating, tags.spoiler, screenshots.url, screenshots.sexual',
                results: Math.min(limit, 10)
            })
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Erreur lors de la recherche VNDB:', error);
        throw error;
    }
}

async function getVisualNovelById(vnId) {
    try {
        const response = await fetch(`${VNDB_API_URL}/vn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filters: ['id', '=', vnId],
                fields: 'title, alttitle, image.url, rating, votecount, popularity, released, length, description, developers.name, languages, tags.name, tags.rating, tags.spoiler, screenshots.url, screenshots.sexual'
            })
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.results?.[0] || null;
    } catch (error) {
        console.error('Erreur lors de la récupération des détails VNDB:', error);
        throw error;
    }
}

function formatLength(length) {
    const lengths = {
        1: 'Très court (< 2h)',
        2: 'Court (2-10h)',
        3: 'Moyen (10-30h)',
        4: 'Long (30-50h)',
        5: 'Très long (> 50h)'
    };
    return lengths[length] || 'Inconnu';
}

function formatRating(rating) {
    if (!rating) return 'Non noté';
    return `${(rating / 10).toFixed(1)}/10`;
}

function hasBlacklistedTags(vn) {
    if (!vn.tags || vn.tags.length === 0) return false;
    return vn.tags.some(tag => {
        const tagNameLower = tag.name.toLowerCase();
        return BLACKLISTED_TAG_KEYWORDS.some(keyword => tagNameLower.includes(keyword));
    });
}

async function getRandomVisualNovel(language = null) {
    try {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const randomId = `v${Math.floor(Math.random() * 40000) + 1}`;
            let filters = ['id', '>=', randomId];
            if (language) filters = ['and', filters, ['olang', '=', language]];
            
            const response = await fetch(`${VNDB_API_URL}/vn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters,
                    fields: 'title, alttitle, image.url, image.sexual, rating, votecount, popularity, released, length, description, developers.name, languages, tags.name, tags.rating, tags.spoiler, screenshots.url, screenshots.sexual',
                    results: 1,
                    sort: 'id'
                })
            });

            if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
            const data = await response.json();
            const vn = data.results?.[0];
            
            if (vn && !hasBlacklistedTags(vn)) return vn;
            attempts++;
        }
        
        console.warn('Impossible de trouver un VN sans tags interdits après', maxAttempts, 'tentatives');
        return null;
    } catch (error) {
        console.error('Erreur lors de la récupération d\'un VN aléatoire:', error);
        throw error;
    }
}

async function getTopRatedVisualNovels(limit = 10) {
    try {
        const response = await fetch(`${VNDB_API_URL}/vn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filters: ['votecount', '>=', 100],
                fields: 'id, title, alttitle, image.url, rating, votecount, released, developers.name',
                results: Math.min(limit, 10),
                sort: 'rating',
                reverse: true
            })
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Erreur lors de la récupération du top VN:', error);
        throw error;
    }
}

async function getVisualNovelStats(vnId) {
    try {
        const response = await fetch(`${VNDB_API_URL}/vn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filters: ['id', '=', vnId],
                fields: 'title, rating, votecount, popularity, released, length, developers.name, tags.name, tags.rating, tags.spoiler, languages, screenshots.url, screenshots.sexual'
            })
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.results?.[0] || null;
    } catch (error) {
        console.error('Erreur lors de la récupération des stats VNDB:', error);
        throw error;
    }
}

async function getUserInfo(username) {
    try {
        const url = new URL(`${VNDB_API_URL}/user`);
        url.searchParams.append('q', username);
        url.searchParams.append('fields', 'lengthvotes,lengthvotes_sum');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        const userKey = Object.keys(data).find(key => key.toLowerCase() === username.toLowerCase()) || username;
        return data[userKey] || null;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur VNDB:', error);
        throw error;
    }
}

function getLanguageFlag(langCode) {
    const flags = {
        'en': '🇬🇧', 'ja': '🇯🇵', 'zh': '🇨🇳', 'zh-hans': '🇨🇳', 'zh-hant': '🇨🇳',
        'pt-br': '🇧🇷 🇵🇹', 'ko': '🇰🇷', 'fr': '🇫🇷', 'de': '🇩🇪', 'es': '🇪🇸',
        'ru': '🇷🇺', 'pt': '🇵🇹', 'it': '🇮🇹', 'nl': '🇳🇱', 'pl': '🇵🇱',
        'tr': '🇹🇷', 'vi': '🇻🇳', 'th': '🇹🇭', 'id': '🇮🇩', 'sv': '🇸🇪',
        'cs': '🇨🇿', 'hu': '🇭🇺', 'ro': '🇷🇴', 'ar': '🇸🇦', 'uk': '🇺🇦'
    };
    return flags[langCode.toLowerCase()] || langCode.toUpperCase();
}

async function searchCharacters(query, limit = 5) {
    try {
        const response = await fetch(`${VNDB_API_URL}/character`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filters: ['search', '=', query],
                fields: 'id, name, original, aliases, description, image.url, blood_type, height, weight, bust, waist, hips, cup, age, birthday, sex, gender, vns.id, vns.title, vns.image.url, vns.role, vns.spoiler, traits.id, traits.name, traits.spoiler, traits.lie',
                results: Math.min(limit, 10),
                sort: 'searchrank',
                reverse: true
            })
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Erreur lors de la recherche de personnages VNDB:', error);
        throw error;
    }
}

function formatRole(role) {
    const roles = {
        'main': 'Protagoniste',
        'primary': 'Principal',
        'side': 'Secondaire',
        'appears': 'Apparition'
    };
    return roles[role] || role;
}

async function getTotalVNCount() {
    try {
        const response = await fetch(`${VNDB_API_URL}/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`VNDB API error: ${response.status}`);
        const data = await response.json();
        return data.vn || 0;
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre total de VNs:', error);
        return 0;
    }
}

module.exports = {
    searchVisualNovels,
    getVisualNovelById,
    formatLength,
    formatRating,
    getRandomVisualNovel,
    getTopRatedVisualNovels,
    getVisualNovelStats,
    getUserInfo,
    getLanguageFlag,
    searchCharacters,
    formatRole,
    getTotalVNCount
};
