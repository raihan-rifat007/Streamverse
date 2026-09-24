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
SSL_CONTEXT = ssl._create_unverified_context()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
CHANNELS_CSV_URL = "https://raw.githubusercontent.com/iptv-org/database/master/data/channels.csv"
LOGOS_CSV_URL = "https://raw.githubusercontent.com/iptv-org/database/master/data/logos.csv"
def normalize(name):
    n = name.lower()
    n = re.sub(r'\(.*?\)', '', n)
    n = re.sub(r'\b(hd|sd|fhd|uhd|4k|plus|\+)\b', '', n)
    n = re.sub(r'[^a-z0-9]+', '', n)
    return n.strip()
def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as resp:
        return resp.read().decode('utf-8')
def main():
    if not os.path.exists(CUSTOM_PATH):
        print("custom.json not found.")
        return
    try:
        channels_text = fetch_text(CHANNELS_CSV_URL)
        logos_text = fetch_text(LOGOS_CSV_URL)
    except Exception as e:
        print(f"Could not fetch iptv-org/database CSVs: {e}")
        return
    logo_by_id = {}
    reader = csv.DictReader(io.StringIO(logos_text))
    for row in reader:
        cid = row.get('channel')
        url = row.get('url')
        fmt = (row.get('format') or '').upper()
        if not cid or not url:
            continue
        if cid not in logo_by_id or fmt == 'PNG':
            logo_by_id[cid] = url
    print(f"Loaded {len(logo_by_id)} logos from iptv-org/database")
    name_to_logo = {}
    reader = csv.DictReader(io.StringIO(channels_text))
    for row in reader:
        cid = row.get('id')
        name = row.get('name', '')
        alt_names = row.get('alt_names', '')
        if not cid or cid not in logo_by_id:
            continue
        for candidate in [name] + [a for a in alt_names.split(';') if a]:
            key = normalize(candidate)
            if key and key not in name_to_logo:
                name_to_logo[key] = logo_by_id[cid]
    print(f"Built logo lookup table with {len(name_to_logo)} known channel names")
    with open(CUSTOM_PATH, encoding='utf-8') as f:
        custom = json.load(f)
    filled = 0
    for c in custom:
        if c.get('logo'):
            continue
        key = normalize(c.get('name', ''))
        if key in name_to_logo:
            c['logo'] = name_to_logo[key]
            filled += 1
    print(f"Filled in {filled} missing logos (now {sum(1 for c in custom if c.get('logo'))}/{len(custom)} have logos)")
    with open(CUSTOM_PATH, 'w', encoding='utf-8') as f:
        json.dump(custom, f, indent=2, ensure_ascii=False)
    if os.path.exists(STATIC_PATH):
        with open(STATIC_PATH, encoding='utf-8') as f:
            static = json.load(f)
        by_id = {c['id']: c for c in custom}
        for c in static:
            if not c.get('logo') and c['id'] in by_id and by_id[c['id']].get('logo'):
                c['logo'] = by_id[c['id']]['logo']
        with open(STATIC_PATH, 'w', encoding='utf-8') as f:
            json.dump(static, f, indent=2, ensure_ascii=False)
        print(f"Synced logos into {STATIC_PATH}")
if __name__ == '__main__':
    main()
