import { Channel } from '../types';

let cache: Channel[] | null = null;
let inflight: Promise<Channel[]> | null = null;

export function loadStaticChannels(): Promise<Channel[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch('/channels.json')
    .then(res => {
      if (!res.ok) throw new Error(`static channels.json returned ${res.status}`);
      return res.json();
    })
    .then((data: Channel[]) => {
      cache = Array.isArray(data) ? data : [];
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function filterStaticChannels(
  all: Channel[],
  opts: { tab?: string; search?: string; page?: number; pageSize?: number }
): { channels: Channel[]; total: number; totalPages: number } {
  let list = all;
  const tab = opts.tab || 'all';

  if (tab === 'bangladesh') list = list.filter(c => c.country === 'BD');
  else if (tab === 'india') list = list.filter(c => c.country === 'IN');
  else if (tab !== 'all') list = list.filter(c => c.category === tab);

  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(q));
  }

  const pageSize = opts.pageSize || 60;
  const page = opts.page || 1;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  return { channels: pageItems, total, totalPages };
}
