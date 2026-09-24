import React, { useState, useEffect, useRef, useCallback } from 'react';
import VideoPlayer from '../components/player/VideoPlayer';
import { useChannelStore } from '../store/channelStore';
import { usePlayerStore } from '../store/playerStore';
import { CATEGORY_LIST, FEATURED_CHANNELS } from '../data/channels';
import { loadStaticChannels, filterStaticChannels } from '../lib/staticChannels';
import { Channel } from '../types';
import { Heart, Search, X, Loader2, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

const CSS = `
  @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.65);} }
  @keyframes shimmer   { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
  @keyframes spin      { to { transform: rotate(360deg); } }

  ::-webkit-scrollbar        { width:4px; height:4px; }
  ::-webkit-scrollbar-track  { background:transparent; }
  ::-webkit-scrollbar-thumb  { background:var(--border-color); border-radius:10px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--text-muted); }

  .ptv-clist::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.22); }
  .ptv-clist::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.4); }
  .ptv-clist { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.22) transparent; contain: content; }

  .ptv-cat {
    flex-shrink:0; padding:6px 14px; border-radius:999px;
    border:1px solid rgba(255,255,255,0.14);
    font-size:10.5px; font-weight:600; color:var(--text-secondary);
    background:rgba(255,255,255,0.06);
    backdrop-filter:blur(28px) saturate(160%);
    -webkit-backdrop-filter:blur(28px) saturate(160%);
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.24);
    cursor:pointer; white-space:nowrap;
    transition:transform 160ms cubic-bezier(0.22,1,0.36,1), background 160ms ease, border-color 160ms ease, color 160ms ease;
    will-change: transform;
  }
  .ptv-cat:hover  { border-color:rgba(255,255,255,0.35); color:var(--text-primary); background:rgba(255,255,255,0.12); transform:translateY(-1px); }
  .ptv-cat.on     { background:#fff; border-color:#fff; color:#000; }

  .ptv-card {
    cursor:pointer;
    background:rgba(255,255,255,0.05) !important;
    backdrop-filter:blur(24px) saturate(150%);
    -webkit-backdrop-filter:blur(24px) saturate(150%);
    transition:transform 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, box-shadow 180ms ease;
    will-change: transform;
    contain: layout paint style;
  }
  .ptv-card:hover {
    transform:translate3d(0,-3px,0);
    border-color:rgba(255,255,255,0.35) !important;
    box-shadow:0 16px 32px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .ptv-card.playing {
    border-color:#fff !important;
    box-shadow:0 0 0 1px #fff, 0 12px 28px -10px rgba(255,255,255,0.18) !important;
  }

  .ptv-fav { transition:transform 140ms cubic-bezier(0.22,1,0.36,1), background 140ms ease; will-change: transform; }
  .ptv-fav.on, .ptv-fav:hover { color:#000 !important; background:rgba(255,255,255,0.92) !important; }

  @media (max-width:1023px) {
    .ptv-body   { flex-direction:column !important; overflow-y:auto !important; }
    .ptv-player { flex:0 0 auto !important; width:100% !important; height:auto !important; border-right:none !important; border-bottom:1px solid var(--border-color) !important; }
    .ptv-playerbox { aspect-ratio: 16/9; }
    .ptv-panel  { flex:1 !important; width:100% !important; min-height:0; }
    .ptv-clist  { overflow-y:visible; }
  }
  @media (max-width:540px) {
    .ptv-nowbar { padding:7px 10px !important; }
  }
`;

const PAGE_SIZE = 60;

export default function IPTVViewer() {
  const { toggleFavorite, isFavorite, addToHistory } = useChannelStore();
  const { currentChannel, setChannel, isMiniPlayer, setMiniPlayer } = usePlayerStore();

  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [channels, setChannels]   = useState<Channel[]>([]);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [usingStatic, setUsingStatic] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const didAutoPlay = useRef(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const myReq = ++reqId.current;
    setLoading(true);
    setLoadError(false);
    setPage(1);
    setUsingStatic(true);

    loadStaticChannels().then(all => {
      if (reqId.current !== myReq) return;
      const result = filterStaticChannels(all, { tab: activeTab, search: debounced, page: 1, pageSize: PAGE_SIZE });
      if (result.channels.length > 0) {
        setChannels(result.channels);
        setTotalPages(result.totalPages);
        setLoadError(false);
        if (!didAutoPlay.current && !currentChannel) {
          didAutoPlay.current = true;
          setChannel(result.channels[0]);
        }
      } else {

        let fb = FEATURED_CHANNELS as unknown as Channel[];
        if (activeTab === 'bangladesh') fb = fb.filter(c => c.country === 'BD');
        else if (activeTab === 'india') fb = fb.filter(c => c.country === 'IN');
        else if (activeTab !== 'all') fb = fb.filter(c => c.category === activeTab);
        if (debounced) {
          const q = debounced.toLowerCase();
          fb = fb.filter(c => c.name.toLowerCase().includes(q));
        }
        if (fb.length > 0) {
          setChannels(fb);
          setTotalPages(1);
          if (!didAutoPlay.current && !currentChannel) {
            didAutoPlay.current = true;
            setChannel(fb[0]);
          }
        } else {
          setLoadError(true);
        }
      }
      setLoading(false);
    });
  }, [activeTab, debounced]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    loadStaticChannels().then(all => {
      const result = filterStaticChannels(all, { tab: activeTab, search: debounced, page: nextPage, pageSize: PAGE_SIZE });
      setChannels(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const fresh = result.channels.filter(c => !existingIds.has(c.id));
        return [...prev, ...fresh];
      });
      setPage(nextPage);
      setLoadingMore(false);
    });
  }, [loading, loadingMore, page, totalPages, activeTab, debounced]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const handleSelect = useCallback((ch: Channel) => {
    setChannel(ch);
    addToHistory(ch);
  }, [setChannel, addToHistory]);

  const handleNextChannel = useCallback(() => {
    if (channels.length === 0) return;
    const playable = channels.filter(c => c.status !== 'offline');
    const pool = playable.length > 0 ? playable : channels;
    const idx = currentChannel ? pool.findIndex(c => c.id === currentChannel.id) : -1;
    const next = idx === -1 ? pool[0] : pool[(idx + 1) % pool.length];
    if (next) handleSelect(next);
  }, [channels, currentChannel, handleSelect]);

  return (
    <div className="liquid-bg" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{CSS}</style>

      <header style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 52,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
        zIndex: 100,
      }}>
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <BrandLogo />
        </Link>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
        <Link to="/favorites" style={{ textDecoration: 'none' }}>
          <NavBtn title="Favorites"><Heart size={13} color="var(--text-secondary)" /></NavBtn>
        </Link>
      </header>

      <div className="ptv-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        <div className="ptv-player" style={{ flex: '0 0 calc(100% - 340px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-color)' }}>
          <div className="ptv-playerbox" style={{ flex: 1, background: '#000', minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isMiniPlayer ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} />
                <span style={{ fontSize: 12 }}>Playing in mini player</span>
              </div>
            ) : (
              <VideoPlayer channel={currentChannel} onNext={handleNextChannel} onMinimize={() => setMiniPlayer(true)} />
            )}
          </div>

          {currentChannel && (
            <div className="ptv-nowbar" style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}>
              <ChannelLogo channel={currentChannel} size={32} radius={10} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'livePulse 1.8s ease-in-out infinite', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{currentChannel.name}</span>
                  <span style={{ background: '#fff', color: '#000', fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 20, letterSpacing: '0.1em', flexShrink: 0 }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{currentChannel.category}</span>
                  {currentChannel.country && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: currentChannel.country === 'BD' ? 'rgba(0,150,80,0.18)' : 'rgba(255,160,0,0.15)', color: currentChannel.country === 'BD' ? '#4ade80' : '#fbbf24', letterSpacing: '0.04em' }}>
                      {currentChannel.country}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => toggleFavorite(currentChannel)} style={{
                marginLeft: 'auto', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: isFavorite(currentChannel.id) ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px) saturate(160%)',
                WebkitBackdropFilter: 'blur(12px) saturate(160%)',
                color: isFavorite(currentChannel.id) ? '#fff' : 'var(--text-muted)',
                border: isFavorite(currentChannel.id) ? '1px solid rgba(255,255,255,0.5)' : '1px solid var(--border-color)',
                transition: 'all 0.18s',
              }}>
                <Heart size={10} fill={isFavorite(currentChannel.id) ? '#fff' : 'none'} />
                {isFavorite(currentChannel.id) ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="ptv-panel" style={{
          width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'rgba(12,12,20,0.42)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}>

          <div style={{ flexShrink: 0, padding: '10px 10px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(14px) saturate(160%)',
              WebkitBackdropFilter: 'blur(14px) saturate(160%)',
              border: '1px solid var(--border-color)', borderRadius: 22, padding: '6px 12px',
            }}>
              <Search size={11} color="var(--text-muted)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search channels..."
                style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={11} color="var(--text-muted)" />
                </button>
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0, padding: '8px 10px 7px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
              {CATEGORY_LIST.map(t => (
                <button key={t.id} className={`ptv-cat${activeTab === t.id ? ' on' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ptv-clist" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px 20px' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <div style={{ aspectRatio: '1/1', background: 'linear-gradient(90deg,var(--bg-card),var(--bg-card-hover),var(--bg-card))', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    <div style={{ padding: '3px 4px' }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-card-hover)', marginBottom: 3 }} />
                      <div style={{ height: 6, width: '60%', borderRadius: 4, background: 'var(--bg-card-hover)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                Couldn't load channels. Check your connection and try again.
              </div>
            ) : channels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No channels found</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                  {channels.map(ch => (
                    <ChannelCard
                      key={ch.id}
                      channel={ch}
                      active={currentChannel?.id === ch.id}
                      onSelect={handleSelect}
                      onFav={toggleFavorite}
                      isFav={isFavorite(ch.id)}
                    />
                  ))}
                </div>
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                    <Loader2 size={16} color="var(--text-muted)" style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type CardProps = { channel: Channel; active: boolean; onSelect: (ch: Channel) => void; onFav: (ch: Channel) => void; isFav: boolean };
type Stage = 'orig' | 'favicon' | 'fb' | 'txt';

function statusColor(status?: string): string {
  if (status === 'offline') return '#ef4444';
  if (status === 'unstable') return '#f59e0b';
  return '#22c55e';
}

function statusBorderColor(status?: string): string {
  if (status === 'offline') return 'rgba(239,68,68,0.35)';
  if (status === 'unstable') return 'rgba(245,158,11,0.35)';
  return 'rgba(34,197,94,0.28)';
}

function faviconFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function ChannelLogo({ channel, size = 32, radius = 8 }: { channel: Channel; size?: number; radius?: number }) {
  const [stage, setStage] = useState<Stage>(channel.logo ? 'orig' : (faviconFromUrl(channel.url) ? 'favicon' : 'fb'));
  const [loaded, setLoaded] = useState(false);

  const src =
    stage === 'orig' ? channel.logo :
    stage === 'favicon' ? faviconFromUrl(channel.url) :
    `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=111827&color=fff&size=128&bold=true`;

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if ((stage === 'orig' || stage === 'favicon') && img.naturalWidth <= 16) {
      setStage(stage === 'orig' ? (faviconFromUrl(channel.url) ? 'favicon' : 'fb') : 'fb');
      return;
    }
    setLoaded(true);
  };

  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
      {stage !== 'txt' && src && (
        <img
          src={src} alt="" loading="lazy" decoding="async"
          onError={() => { if (stage === 'orig') { setStage('fb'); setLoaded(false); } else setStage('txt'); }}
          onLoad={handleLoad}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3, opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        />
      )}
      {stage === 'txt' && (
        <span style={{ fontWeight: 700, color: '#333', fontSize: size * 0.32 }}>{channel.name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function ChannelCard({ channel, active, onSelect, onFav, isFav }: CardProps) {
  const [stage, setStage] = useState<Stage>(channel.logo ? 'orig' : (faviconFromUrl(channel.url) ? 'favicon' : 'fb'));
  const [loaded, setLoaded] = useState(false);

  const src =
    stage === 'orig' ? channel.logo :
    stage === 'favicon' ? faviconFromUrl(channel.url) :
    `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=111827&color=fff&size=128&bold=true`;

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;

    if ((stage === 'orig' || stage === 'favicon') && img.naturalWidth <= 16) {
      setStage(stage === 'orig' ? (faviconFromUrl(channel.url) ? 'favicon' : 'fb') : 'fb');
      return;
    }
    setLoaded(true);
  };

  return (
    <div
      className={`ptv-card${active ? ' playing' : ''}`}
      onClick={() => onSelect(channel)}
      style={{
        borderRadius: 11, overflow: 'hidden',
        background: 'linear-gradient(155deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border-color)',
        position: 'relative',
        boxShadow: active ? '0 0 0 1px var(--accent), 0 6px 16px -6px rgba(59,130,246,0.35)' : '0 1px 2px rgba(0,0,0,0.15)',
      }}
    >
      {}
      <div style={{ padding: '5px 5px 0' }}>
        <div style={{
          aspectRatio: '1/1', background: '#0a0a0c', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <div style={{ position: 'absolute', inset: 3 }}>
            {stage !== 'txt' && src && (
              <img
                src={src} alt={channel.name} loading="lazy" decoding="async"
                onError={() => { if (stage === 'orig') { setStage('fb'); setLoaded(false); } else setStage('txt'); }}
                onLoad={handleImgLoad}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: stage === 'orig' ? '9%' : '15%', opacity: loaded ? 1 : 0, transition: 'opacity 0.25s', borderRadius: 5, background: '#fff' }}
              />
            )}
            {stage !== 'txt' && !loaded && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: 'linear-gradient(90deg,var(--bg-card),var(--bg-card-hover),var(--bg-card))', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            )}
            {stage === 'txt' && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11 }}>{channel.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>

          {}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)', pointerEvents: 'none' }} />

          {channel.country && (
            <div style={{ position: 'absolute', bottom: 3, left: 4, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1.5px 4px', fontSize: 6.5, fontWeight: 800, letterSpacing: '0.03em', color: channel.country === 'BD' ? '#4ade80' : '#fbbf24', backdropFilter: 'blur(4px)' }}>
              {channel.country}
            </div>
          )}

          {active && (
            <div style={{ position: 'absolute', top: 4, right: 4, background: '#fff', borderRadius: 20, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 0 12px rgba(255,255,255,0.25)' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', animation: 'livePulse 1.2s ease-in-out infinite' }} />
              <span style={{ fontSize: 6.5, fontWeight: 800, color: '#000', letterSpacing: '0.04em' }}>ON AIR</span>
            </div>
          )}

          <button
            className={`ptv-fav${isFav ? ' on' : ''}`}
            onClick={e => { e.stopPropagation(); onFav(channel); }}
            style={{ position: 'absolute', top: 4, right: active ? undefined : 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', display: active ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isFav ? '#fff' : 'var(--text-muted)' }}
          >
            <Heart size={10} fill={isFav ? '#fff' : 'none'} color={isFav ? '#fff' : '#fff'} />
          </button>
        </div>
      </div>

      <div style={{ padding: '4px 6px 6px' }}>
        <p style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={channel.name}>{channel.name}</p>
        <p style={{ fontSize: 7, marginTop: 1, margin: 0, color: 'var(--text-muted)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.category}</p>
      </div>
    </div>
  );
}

function NavBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button title={title} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >{children}</button>
  );
}
