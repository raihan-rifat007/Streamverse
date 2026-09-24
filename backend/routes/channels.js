const express = require('express');
const axios = require('axios');
const router = express.Router();
const { parseM3U, parseJsonPlaylist } = require('../utils/m3uParser');
const cache = require('../utils/cache');
const fs = require('fs');
const path = require('path');

const CATEGORY_URLS = {
  all:           'https://iptv-org.github.io/iptv/index.m3u',
  bangla:        'https://iptv-org.github.io/iptv/countries/bd.m3u',
  hindi:         'https://iptv-org.github.io/iptv/countries/in.m3u',
  sports:        'https://iptv-org.github.io/iptv/categories/sports.m3u',
  news:          'https://iptv-org.github.io/iptv/categories/news.m3u',
  movies:        'https://iptv-org.github.io/iptv/categories/movies.m3u',
  music:         'https://iptv-org.github.io/iptv/categories/music.m3u',
  entertainment: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  kids:          'https://iptv-org.github.io/iptv/categories/kids.m3u',
  series:        'https://iptv-org.github.io/iptv/categories/series.m3u',
  documentary:   'https://iptv-org.github.io/iptv/categories/documentary.m3u',
  animation:     'https://iptv-org.github.io/iptv/categories/animation.m3u',
  religious:     'https://iptv-org.github.io/iptv/categories/religious.m3u',
  education:     'https://iptv-org.github.io/iptv/categories/education.m3u',
  general:       'https://iptv-org.github.io/iptv/categories/general.m3u',
  arabic:        'https://iptv-org.github.io/iptv/languages/ara.m3u',
  turkish:       'https://iptv-org.github.io/iptv/countries/tr.m3u',
  pakistan:      'https://iptv-org.github.io/iptv/countries/pk.m3u',
};

const COUNTRY_URLS = {
  bd: { name: 'Bangladesh', flag: '🇧🇩' },
  in: { name: 'India', flag: '🇮🇳' },
  us: { name: 'United States', flag: '🇺🇸' },
  gb: { name: 'United Kingdom', flag: '🇬🇧' },
  pk: { name: 'Pakistan', flag: '🇵🇰' },
  tr: { name: 'Turkey', flag: '🇹🇷' },
  sa: { name: 'Saudi Arabia', flag: '🇸🇦' },
  ae: { name: 'UAE', flag: '🇦🇪' },
  eg: { name: 'Egypt', flag: '🇪🇬' },
  fr: { name: 'France', flag: '🇫🇷' },
  de: { name: 'Germany', flag: '🇩🇪' },
  ru: { name: 'Russia', flag: '🇷🇺' },
  br: { name: 'Brazil', flag: '🇧🇷' },
  mx: { name: 'Mexico', flag: '🇲🇽' },
  it: { name: 'Italy', flag: '🇮🇹' },
  es: { name: 'Spain', flag: '🇪🇸' },
  cn: { name: 'China', flag: '🇨🇳' },
  jp: { name: 'Japan', flag: '🇯🇵' },
  kr: { name: 'South Korea', flag: '🇰🇷' },
  af: { name: 'Afghanistan', flag: '🇦🇫' },
  ca: { name: 'Canada', flag: '🇨🇦' },
  au: { name: 'Australia', flag: '🇦🇺' },
  nl: { name: 'Netherlands', flag: '🇳🇱' },
  pl: { name: 'Poland', flag: '🇵🇱' },
  id: { name: 'Indonesia', flag: '🇮🇩' },
  ng: { name: 'Nigeria', flag: '🇳🇬' },
  ma: { name: 'Morocco', flag: '🇲🇦' },
  iq: { name: 'Iraq', flag: '🇮🇶' },
  ir: { name: 'Iran', flag: '🇮🇷' },
  ph: { name: 'Philippines', flag: '🇵🇭' }
};

const DATA_DIR = path.join(__dirname, '../data');

function readJson(file, def = []) {
  try {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return def; }
}

const CATEGORY_KEYWORDS = {
  sports:        ['sport', 'espn', 'cricket', 'football', 'soccer', 'nba', 'nfl', 'golf', 'tennis', 'motor', 'wwe', 'boxing', 'rugby', 'willow', 'star sports', 'sky sports', 'bein', 'ten sports', 'fox sports'],
  news:          ['news', 'ndtv', 'cnn', 'bbc', 'al jazeera', 'trt', 'dw ', 'rt ', 'fox news', 'sky news', 'euronews'],
  movies:        ['movie', 'cinema', 'film', 'hbo', 'star gold', 'zee cinema', 'goldmines', 'max'],
  music:         ['music', 'mtv', 'vh1', 'fm', 'radio', 'hits'],
  entertainment: ['entertainment', 'tv', 'general'],
  kids:          ['kids', 'cartoon', 'junior', 'jr', 'nick', 'disney', 'baby', 'toon'],
  documentary:   ['discovery', 'national geographic', 'nat geo', 'history', 'animal planet', 'documentary'],
  religious:     ['islam', 'quran', 'church', 'god', 'faith', 'religious', 'gospel'],
};

function matchesCategory(name, category) {
  const words = CATEGORY_KEYWORDS[category];
  if (!words) return true;
  const n = name.toLowerCase();
  return words.some(w => n.includes(w));
}

async function fetchChannels(category = 'all') {
  const cacheKey = `channels_${category}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const blocked = readJson('blocked.json', []);
  const blockedIds = new Set(blocked.map(b => b.id));

  let channels = [];

  const url = CATEGORY_URLS[category] || CATEGORY_URLS.all;
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Streamverse/1.0' }
    });
    channels = parseM3U(response.data).filter(ch => !blockedIds.has(ch.id));
  } catch (e) {
    console.warn(`[Channels] Primary source failed for '${category}':`, e.message);
  }

  const custom = readJson('custom.json', []);
  const customMatch = category === 'all'
    ? custom
    : custom.filter(ch => ch.category === category || matchesCategory(ch.name, category));
  channels = [...customMatch, ...channels];

  const playlists = readJson('playlists.json', []);
  const enabledPlaylists = playlists.filter(pl => pl.enabled);
  const results = await Promise.allSettled(
    enabledPlaylists.map(pl =>
      axios.get(pl.url, { timeout: 20000, headers: { 'User-Agent': 'Streamverse/1.0' } })
    )
  );
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const pl = enabledPlaylists[i];
      let extra = pl.type === 'json'
        ? parseJsonPlaylist(r.value.data)
        : parseM3U(r.value.data);
      extra = extra.filter(ch => !blockedIds.has(ch.id));

      if (category !== 'all') {
        extra = extra.filter(ch => matchesCategory(ch.name, category));
      }
      channels = [...channels, ...extra];
    } else {
      console.warn(`[Playlist] Failed: ${enabledPlaylists[i].label || enabledPlaylists[i].url}`);
    }
  });

  const seen = new Set();
  channels = channels.filter(ch => {
    const key = ch.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const GEO_LOCKED = ['pluto.tv', 'plex.tv', 'wurl.com', 'tubi', 'xumo', 'roku.com', 'stirr'];
  const STATUS_RANK = { online: 0, unstable: 1, offline: 2 };
  channels.sort((a, b) => {
    const aStatus = STATUS_RANK[a.status] ?? 0;
    const bStatus = STATUS_RANK[b.status] ?? 0;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const aLocked = GEO_LOCKED.some(d => (a.url || '').includes(d)) ? 1 : 0;
    const bLocked = GEO_LOCKED.some(d => (b.url || '').includes(d)) ? 1 : 0;
    return aLocked - bLocked;
  });

  cache.set(cacheKey, channels);
  return channels;
}

async function fetchCountryChannels(countryCode) {
  const code = countryCode.toLowerCase();
  const cacheKey = `country_${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const blocked = readJson('blocked.json', []);
  const blockedIds = new Set(blocked.map(b => b.id));

  const custom = readJson('custom.json', []);
  const customForCountry = custom.filter(ch => (ch.country || '').toLowerCase() === code);

  let channels = [...customForCountry];

  const url = `https://iptv-org.github.io/iptv/countries/${code}.m3u`;
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Streamverse/1.0' }
    });
    const remote = parseM3U(response.data).filter(ch => !blockedIds.has(ch.id));
    channels = [...channels, ...remote];
  } catch {

  }

  const seen = new Set();
  channels = channels.filter(ch => {
    if (seen.has(ch.url)) return false;
    seen.add(ch.url);
    return true;
  });

  cache.set(cacheKey, channels, 3600);
  return channels;
}

router.get('/', async (req, res) => {
  try {
    const { category = 'all', page = 1, limit = 50, lang = 'all', search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    let channels = await fetchChannels(category);

    if (lang && lang !== 'all') {
      channels = channels.filter(ch => ch.language && ch.language.toLowerCase().includes(lang.toLowerCase()));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      channels = channels.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        ch.category.toLowerCase().includes(q) ||
        ch.country.toLowerCase().includes(q)
      );
    }

    const total = channels.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = channels.slice(start, start + limitNum);

    res.json({ channels: paginated, total, page: pageNum, totalPages, category });
  } catch (err) {
    console.error('[Channels]', err.message);
    res.status(500).json({ error: 'Failed to fetch channels', channels: [], total: 0, page: 1, totalPages: 0 });
  }
});

router.get('/countries', (req, res) => {
  const list = Object.entries(COUNTRY_URLS).map(([code, info]) => ({
    code,
    name: info.name,
    flag: info.flag
  }));
  res.json({ countries: list });
});

router.get('/countries/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    const countryInfo = COUNTRY_URLS[code.toLowerCase()];
    if (!countryInfo) return res.status(404).json({ error: 'Country not found' });

    const channels = await fetchCountryChannels(code);
    const total = channels.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = channels.slice(start, start + limitNum);

    res.json({
      channels: paginated,
      total,
      page: pageNum,
      totalPages,
      country: { code, ...countryInfo }
    });
  } catch (err) {
    console.error('[Country]', err.message);
    res.status(500).json({ error: 'Failed to fetch country channels', channels: [], total: 0 });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const cats = Object.keys(CATEGORY_URLS);
    const result = [];
    const allCached = cache.get('channels_all');
    for (const cat of cats) {
      const cached = cache.get(`channels_${cat}`);
      result.push({
        name: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: cached ? cached.length : (cat === 'all' && allCached ? allCached.length : 0)
      });
    }
    res.json({ categories: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const featured = readJson('featured.json', []);
    res.json({ featured });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get featured channels' });
  }
});

module.exports = router;
module.exports.fetchChannels = fetchChannels;
