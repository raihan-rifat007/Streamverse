import csv
import io
import json
import os
import re
import ssl
import urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUSTOM_PATH = os.path.join(ROOT, 'backend', 'data', 'custom.json')
STATIC_PATH = os.path.join(ROOT, 'frontend', 'public', 'channels.json')
PLAYLISTS_PATH = os.path.join(ROOT, 'backend', 'data', 'playlists.json')
SSL_CONTEXT = ssl._create_unverified_context()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
TIMEOUT = 25
def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CONTEXT) as resp:
        return resp.read().decode('utf-8', errors='ignore')
def parse_m3u(text):
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    entries = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('#EXTINF'):
            m_logo = re.search(r'tvg-logo="([^"]*)"', line)
            m_group = re.search(r'group-title="([^"]*)"', line)
            name = line.split(',')[-1].strip()
            referrer = None
            origin = None
            j = i + 1
            url = None
            while j < len(lines):
                nxt = lines[j].strip()
                if nxt.startswith('#EXTVLCOPT:http-referrer='):
                    referrer = nxt.split('=', 1)[1]
                elif nxt.startswith('#EXTVLCOPT:http-origin='):
                    origin = nxt.split('=', 1)[1]
                elif nxt and not nxt.startswith('#'):
                    url = nxt
                    break
                j += 1
            if url and name:
                entries.append({
                    'name': name, 'url': url,
                    'logo': m_logo.group(1) if m_logo else '',
                    'group': m_group.group(1) if m_group else '',
                    'referrer': referrer, 'origin': origin,
                })
            i = j + 1
        else:
            i += 1
    return entries
def parse_json_playlist(text):
    data = json.loads(text)
    items = data if isinstance(data, list) else data.get('channels', [])
    out = []
    for c in items:
        name = c.get('name') or c.get('title', '')
        url = c.get('url') or c.get('link') or c.get('m3u8', '')
        if name and url:
            h = c.get('headers', {}) if isinstance(c.get('headers'), dict) else {}
            out.append({
                'name': name.strip(), 'url': url.strip(),
                'logo': c.get('logo', ''), 'group': c.get('category_name', ''),
                'referrer': h.get('Referer'), 'origin': h.get('Origin'),
            })
    return out
def clean_name(name):
    n = re.sub(r'\s*\(\d+p\)\s*', '', name).strip()
    n = re.sub(r'\s*\(New\)\s*', '', n).strip()
    return re.sub(r'\s+', ' ', n)
def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
def detect_category(name, group=''):
    n = (name + ' ' + group).lower()
    if any(k in n for k in ['sport', 'cricket', 'willow', 'espn', 'star sports', 'ten sports',
                             'sky sports', 'bein', 't sports', 'crichd', 'tsports', 'fox sports', 'nba', 'nfl']):
        return 'sports'
    if any(k in n for k in ['news', 'cnn', 'bbc', 'al jazeera', 'ndtv', 'euronews', 'sky news',
                             'fox news', 'somoy', 'jamuna', 'ekattor', 'independent tv', 'dbc']):
        return 'news'
    if any(k in n for k in ['cartoon', 'kids', 'nick', 'disney', 'junior', 'toon', 'baby',
                             'pogo', 'hungama', 'duronto']):
        return 'kids'
    if any(k in n for k in ['music', 'mtv', 'vh1', 'radio', 'fm ', '9xm']):
        return 'music'
    if any(k in n for k in ['islam', 'quran', 'church', 'god', 'faith', 'gospel', 'peace tv']):
        return 'religious'
    if any(k in n for k in ['movie', 'cinema', 'film', 'hbo', 'star gold', 'zee cinema', 'goldmines']):
        return 'movies'
    if any(k in n for k in ['discovery', 'nat geo', 'national geographic', 'history', 'animal planet']):
        return 'documentary'
    return 'entertainment'
def detect_country(name):
    n = name.lower()
    bd = ['deshi tv', 'channel s', 'atn', 'ananda tv', 'my tv', 'gazi tv', 'green tv', 'desh tv',
          'somoy', 'rtv', 'maasranga', 'ntv', 't sports', 'btv', 'jamuna', 'ekattor', 'ekushey',
          'independent tv', 'dbc', 'boishakhi', 'channel i', 'banglavision', 'bangla vision', 'gtv',
          'nagorik', 'mohona', 'duronto', 'bijoy', 'channel 24']
    if any(b in n for b in bd):
        return 'BD'
    ind = ['zee', 'ndtv', 'sony', 'star sports', 'star plus', 'star gold', 'colors', 'jalsha',
           'akash aath', 'aakash aath', 'b4u', 'goldmines', 'hindi', 'india tv', 'aaj tak', 'republic']
    if any(i in n for i in ind):
        return 'IN'
    return 'INTL'
def main():
    if not os.path.exists(PLAYLISTS_PATH):
        print("playlists.json not found — nothing to fetch from.")
        return
    with open(PLAYLISTS_PATH, encoding='utf-8') as f:
        sources = json.load(f)
    sources = [s for s in sources if s.get('enabled')]
    print(f"Fetching from {len(sources)} live sources...")
    old_status_by_url = {}
    if os.path.exists(CUSTOM_PATH):
        with open(CUSTOM_PATH, encoding='utf-8') as f:
            for c in json.load(f):
                if c.get('url'):
                    old_status_by_url[c['url']] = c.get('status', 'online')
    seen_urls = set()
    seen_names = set()
    rebuilt = []
    idx = 1
    for src in sources:
        url = src['url']
        kind = src.get('type', 'm3u')
        try:
            text = fetch_text(url)
            entries = parse_m3u(text) if kind == 'm3u' else parse_json_playlist(text)
            print(f"  OK   {src.get('label', url)}: {len(entries)} entries")
        except Exception as e:
            print(f"  FAIL {src.get('label', url)}: {e}")
            continue
        for e in entries:
            name = clean_name(e['name'])
            channel_url = e['url']
            if not name or not channel_url or channel_url in seen_urls:
                continue
            key = name.lower()
            if key in seen_names:
                continue
            seen_urls.add(channel_url)
            seen_names.add(key)
            country = detect_country(name)
            slug = slugify(name)
            ch = {
                "id": f"sv-{idx}-{slug}"[:60],
                "name": name,
                "logo": e.get('logo') or "",
                "url": channel_url,
                "category": detect_category(name, e.get('group', '')),
                "country": country,
                "language": "Bangla" if country == "BD" else ("Hindi" if country == "IN" else "English"),
                "tvgId": slug,
                "isHls": True,
                "status": old_status_by_url.get(channel_url, "online"),
            }
            if e.get('referrer'):
                ch['referrer'] = e['referrer']
            if e.get('origin'):
                ch['origin'] = e['origin']
            rebuilt.append(ch)
            idx += 1
    print(f"\nRebuilt catalog: {len(rebuilt)} unique channels from live sources")
    with open(CUSTOM_PATH, 'w', encoding='utf-8') as f:
        json.dump(rebuilt, f, indent=2, ensure_ascii=False)
    alive = [c for c in rebuilt if c.get('status') != 'offline']
    with open(STATIC_PATH, 'w', encoding='utf-8') as f:
        json.dump(alive, f, indent=2, ensure_ascii=False)
    print(f"Static catalog: {len(alive)} channels (dropped {len(rebuilt) - len(alive)} previously-offline)")
if __name__ == '__main__':
    main()
