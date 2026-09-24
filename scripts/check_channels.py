import json
import os
import ssl
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUSTOM_PATH = os.path.join(ROOT, 'backend', 'data', 'custom.json')
BLOCKED_PATH = os.path.join(ROOT, 'backend', 'data', 'blocked.json')
STATIC_PATH = os.path.join(ROOT, 'frontend', 'public', 'channels.json')
HEALTH_PATH = os.path.join(ROOT, 'backend', 'data', 'channel-health.json')
SSL_CONTEXT = ssl._create_unverified_context()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
TIMEOUT = 6
MAX_WORKERS = 80
OFFLINE_STREAK = 3
def check_url(channel_id, url, referrer=None, origin=None):
    if not url or not url.startswith(('http://', 'https://')):
        return channel_id, False
    headers = {"User-Agent": USER_AGENT}
    if referrer:
        headers["Referer"] = referrer
    if origin:
        headers["Origin"] = origin
    try:
        req = urllib.request.Request(url, headers=headers, method="HEAD")
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CONTEXT) as resp:
            if resp.getcode() in (200, 206, 301, 302):
                return channel_id, True
    except Exception:
        pass
    try:
        headers_range = dict(headers, Range="bytes=0-2048")
        req = urllib.request.Request(url, headers=headers_range, method="GET")
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CONTEXT) as resp:
            return channel_id, resp.getcode() in (200, 206, 301, 302)
    except Exception:
        return channel_id, False
def main():
    if not os.path.exists(CUSTOM_PATH):
        print(f"No custom.json found at {CUSTOM_PATH}")
        return
    with open(CUSTOM_PATH, encoding='utf-8') as f:
        channels = json.load(f)
    health = {}
    if os.path.exists(HEALTH_PATH):
        try:
            with open(HEALTH_PATH, encoding='utf-8') as f:
                health = json.load(f)
        except Exception:
            health = {}
    print(f"Checking {len(channels)} channel URLs...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(check_url, c['id'], c['url'], c.get('referrer'), c.get('origin')): c
            for c in channels
        }
        done = 0
        for future in as_completed(futures):
            done += 1
            try:
                cid, alive = future.result()
            except Exception:
                cid, alive = futures[future]['id'], False
            rec = health.get(cid, {"streak_ok": 0, "streak_fail": 0})
            if alive:
                rec["streak_ok"] = rec.get("streak_ok", 0) + 1
                rec["streak_fail"] = 0
            else:
                rec["streak_fail"] = rec.get("streak_fail", 0) + 1
                rec["streak_ok"] = 0
            health[cid] = rec
            if done % 500 == 0:
                print(f"  ...{done}/{len(channels)} checked")
    status_counts = {"online": 0, "unstable": 0, "offline": 0}
    blocked_ids = []
    for c in channels:
        rec = health.get(c['id'], {"streak_ok": 0, "streak_fail": 0})
        if rec.get("streak_fail", 0) >= OFFLINE_STREAK:
            c['status'] = 'offline'
            blocked_ids.append({"id": c['id'], "reason": "failed 3+ consecutive checks"})
        elif rec.get("streak_fail", 0) > 0:
            c['status'] = 'unstable'
        else:
            c['status'] = 'online'
        status_counts[c['status']] += 1
    print("\n" + "=" * 50)
    print(f"Online (green):    {status_counts['online']}")
    print(f"Unstable (yellow): {status_counts['unstable']}")
    print(f"Offline (red):     {status_counts['offline']}")
    print("=" * 50)
    with open(CUSTOM_PATH, 'w', encoding='utf-8') as f:
        json.dump(channels, f, indent=2, ensure_ascii=False)
    with open(HEALTH_PATH, 'w', encoding='utf-8') as f:
        json.dump(health, f, indent=2, ensure_ascii=False)
    with open(BLOCKED_PATH, 'w', encoding='utf-8') as f:
        json.dump(blocked_ids, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(blocked_ids)} fully-offline channel IDs to blocked.json")
    alive_channels = [c for c in channels if c['status'] != 'offline']
    with open(STATIC_PATH, 'w', encoding='utf-8') as f:
        json.dump(alive_channels, f, indent=2, ensure_ascii=False)
    print(f"Updated {STATIC_PATH} with {len(alive_channels)} channels (online + unstable)")
if __name__ == '__main__':
    main()
