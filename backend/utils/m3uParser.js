function parseM3U(text) {
  const channels = [];
  const lines = text.split('\n');
  let currentInfo = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.+)$/);
      const tvgId = extractAttr(line, 'tvg-id');
      const tvgName = extractAttr(line, 'tvg-name');
      const tvgLogo = extractAttr(line, 'tvg-logo');
      const groupTitle = extractAttr(line, 'group-title');
      const tvgCountry = extractAttr(line, 'tvg-country');
      const tvgLanguage = extractAttr(line, 'tvg-language');

      currentInfo = {
        name: tvgName || (nameMatch ? nameMatch[1].trim() : 'Unknown Channel'),
        logo: tvgLogo || '',
        category: (groupTitle || 'general').toLowerCase().trim(),
        country: tvgCountry || '',
        language: tvgLanguage || '',
        tvgId: tvgId || ''
      };
    } else if (currentInfo && !line.startsWith('#') && line.length > 0) {
      const url = line.trim();
      if (url && (url.startsWith('http') || url.startsWith('rtmp') || url.startsWith('rtsp'))) {
        const id = generateId(currentInfo.name + url);
        channels.push({
          id,
          name: currentInfo.name,
          logo: currentInfo.logo,
          url,
          category: normalizeCategory(currentInfo.category),
          country: currentInfo.country,
          language: currentInfo.language,
          tvgId: currentInfo.tvgId,
          isHls: url.includes('.m3u8') || url.includes('m3u8')
        });
      }
      currentInfo = null;
    }
  }

  return channels;
}

function extractAttr(line, attr) {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(regex);
  return match ? match[1].trim() : '';
}

function generateId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function normalizeCategory(cat) {
  if (!cat) return 'general';
  const c = cat.toLowerCase();
  if (c.includes('movie') || c.includes('film') || c.includes('cinema')) return 'movies';
  if (c.includes('music') || c.includes('radio') || c.includes('mtv')) return 'music';
  if (c.includes('news') || c.includes('info') || c.includes('business')) return 'news';
  if (c.includes('sport') || c.includes('football') || c.includes('soccer')) return 'sports';
  if (c.includes('kid') || c.includes('child') || c.includes('cartoon') || c.includes('family')) return 'kids';
  if (c.includes('document') || c.includes('docu')) return 'documentary';
  if (c.includes('entertain') || c.includes('variety')) return 'entertainment';
  if (c.includes('educ') || c.includes('learn') || c.includes('school')) return 'education';
  if (c.includes('series') || c.includes('serie') || c.includes('drama') || c.includes('show')) return 'series';
  if (c.includes('religi') || c.includes('faith') || c.includes('church') || c.includes('islam') || c.includes('christ')) return 'religious';
  if (c.includes('animat') || c.includes('anime') || c.includes('toon')) return 'animation';
  return 'general';
}

function parseJsonPlaylist(data) {

  const list = Array.isArray(data) ? data : (data && Array.isArray(data.channels) ? data.channels : []);
  const channels = [];
  for (const c of list) {
    const name = (c.name || c.title || '').trim();
    const url = (c.url || c.link || c.m3u8 || '').trim();
    if (!name || !url || !url.startsWith('http')) continue;
    channels.push({
      id: generateId(name + url),
      name,
      logo: c.logo || '',
      url,
      category: normalizeCategory(c.category || c.group || c.category_name || 'general'),
      country: c.country || '',
      language: c.language || '',
      tvgId: c.tvgId || '',
      isHls: url.includes('.m3u8') || url.includes('m3u8')
    });
  }
  return channels;
}

module.exports = { parseM3U, parseJsonPlaylist };
