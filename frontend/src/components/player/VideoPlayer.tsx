import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings, SkipBack, SkipForward, PictureInPicture2, Film, ChevronDown, X } from 'lucide-react';
import { Channel, QualityLevel } from '../../types';

interface Props { channel: Channel | null; fill?: boolean; onNext?: () => void; onMinimize?: () => void; isMini?: boolean; onCloseMini?: () => void; }

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) return '0:00';
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
};

export default function VideoPlayer({ channel, fill, onNext, onMinimize, isMini, onCloseMini }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef       = useRef<Hls | null>(null);
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef       = useRef<number | null>(null);
  const seekTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount   = useRef(0);
  const isLiveRef    = useRef(true);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [volume,       setVolumeState]  = useState(0.85);
  const [currentTime,  setCurrent]      = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);
  const [buffering,    setBuffering]    = useState(true);
  const [error,        setError]        = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP,        setIsPiP]        = useState(false);
  const [qualities,    setQualities]    = useState<QualityLevel[]>([]);
  const [curQuality,   setCurQuality]   = useState(-1);
  const [showQuality,  setShowQuality]  = useState(false);
  const [seekAnim,     setSeekAnim]     = useState<{ dir: 'left' | 'right'; key: number } | null>(null);
  const [hoverPct,     setHoverPct]     = useState<number | null>(null);
  const [isLive,       setIsLive]       = useState(true);

  const setLive = (val: boolean) => {
    isLiveRef.current = val;
    setIsLive(val);
  };

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowQuality(q => { if (!q) setShowControls(false); return q; });
    }, 15000);
  }, []);

  const updateProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (v.buffered.length > 0 && v.duration > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const loadStream = useCallback((url: string, proxy: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    let src = url;
    if (proxy) {
      src = `/api/proxy/stream?url=${encodeURIComponent(url)}`;
      if (channel?.referrer) src += `&referer=${encodeURIComponent(channel.referrer)}`;
      if (channel?.origin) src += `&origin=${encodeURIComponent(channel.origin)}`;
    }

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    setError(false);
    setBuffering(true);
    setQualities([]);
    setCurQuality(-1);
    setLive(true);
    setCurrent(0);
    setDuration(0);

    if (loadTimeout.current) clearTimeout(loadTimeout.current);
    loadTimeout.current = setTimeout(() => {
      const vid = videoRef.current;

      if (vid && vid.readyState < 3) {
        setError(true);
        setBuffering(false);
      }
    }, 15000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        backBufferLength: 30,
        startLevel: -1,
        abrEwmaFastLive: 3.0,
        abrEwmaSlowLive: 9.0,
        capLevelToPlayerSize: true,
        maxFragLookUpTolerance: 0.15,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => {
        if (d.levels.length > 1) {
          setQualities(d.levels.map((l, i) => ({
            index: i,
            label: l.height ? `${l.height}p` : `Level ${i + 1}`,
            bitrate: l.bitrate,
          })));
        }
        v.play().catch(() => {});
        rafRef.current = requestAnimationFrame(updateProgress);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, d) => {
        const live = d.details.live !== false;
        setLive(live);
        if (!live) setDuration(v.duration);
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) {
          if (!proxy) loadStream(url, true);
          else { setError(true); setBuffering(false); }
        }
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      v.play().catch(() => {});
      rafRef.current = requestAnimationFrame(updateProgress);
    } else {
      setError(true);
      setBuffering(false);
    }
  }, [updateProgress, channel?.referrer, channel?.origin]);

  useEffect(() => {
    if (channel?.url) {
      const needsProxy = Boolean(channel.referrer || channel.origin);
      loadStream(channel.url, needsProxy);
    }
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
    };
  }, [channel?.url]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const enter = () => setIsPiP(true);
    const leave = () => setIsPiP(false);
    v.addEventListener('enterpictureinpicture', enter);
    v.addEventListener('leavepictureinpicture', leave);
    return () => {
      v.removeEventListener('enterpictureinpicture', enter);
      v.removeEventListener('leavepictureinpicture', leave);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); seek(-10); }
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(10); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); handleVolume(Math.min(1, volume + 0.1)); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); handleVolume(Math.max(0, volume - 0.1)); }
      if (e.key === 'm') toggleMute();
      if (e.key === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [volume]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
    resetHideTimer();
  };

  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (v) { v.volume = val; v.muted = val === 0; }
    setVolumeState(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock('landscape');
      } catch {  }
    } else {
      try {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        orientation?.unlock?.();
      } catch {  }
      await document.exitFullscreen();
    }
    resetHideTimer();
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await v.requestPictureInPicture();
    } catch { }
    resetHideTimer();
  };

  const seek = (secs: number) => {
    const v = videoRef.current;
    if (v && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || isLiveRef.current || !isFinite(v.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
    resetHideTimer();
  };

  const setQuality = (idx: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = idx;
    setCurQuality(idx);
    setShowQuality(false);
    resetHideTimer();
  };

  const handleRetry = () => {
    setError(false);
    if (channel) loadStream(channel.url, Boolean(channel.referrer || channel.origin));
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const xPct = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width;
    clickCount.current++;
    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      const n = clickCount.current;
      clickCount.current = 0;
      if (n === 1) {
        setShowControls(prev => {
          const next = !prev;
          if (next) resetHideTimer();
          else if (hideTimer.current) clearTimeout(hideTimer.current);
          return next;
        });
      } else if (n >= 2) {
        if (xPct < 0.33) { seek(-10); setSeekAnim({ dir: 'left', key: Date.now() }); setTimeout(() => setSeekAnim(null), 650); }
        else if (xPct > 0.67) { seek(10); setSeekAnim({ dir: 'right', key: Date.now() }); setTimeout(() => setSeekAnim(null), 650); }
        else togglePlay();
        resetHideTimer();
      }
    }, 210);
  };

  if (!channel) {
    return (
      <div className="ptv-frame" style={{ width: '100%', height: fill ? '100%' : undefined, aspectRatio: fill ? undefined : '16/9', background: 'linear-gradient(160deg,#0c0c0f,#000)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={26} color="rgba(255,255,255,0.22)" />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600 }}>Select a channel to start watching</p>
      </div>
    );
  }

  const pct = duration > 0 && !isLive ? (currentTime / duration) * 100 : 0;
  const qLabel = curQuality === -1 ? 'Auto' : (qualities.find(q => q.index === curQuality)?.label ?? 'Auto');

  return (
    <div
      ref={containerRef}
      className="ptv-frame"
      style={{
        width: '100%', aspectRatio: (isFullscreen || fill) ? undefined : '16/9', height: (isFullscreen || fill) ? '100%' : undefined,
        background: '#000', overflow: 'hidden', position: 'relative', userSelect: 'none',
        borderRadius: isFullscreen ? 0 : 16,
        boxShadow: isFullscreen ? 'none' : '0 20px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => {
        if ('ontouchstart' in window) return;
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setHoverPct(null);
      }}
      onTouchStart={resetHideTimer}
    >
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transform: 'translateZ(0)', backfaceVisibility: 'hidden', willChange: 'transform' }}
        playsInline
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setIsPlaying(true); if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; } }}
        onPause={() => setIsPlaying(false)}
        onCanPlay={() => { setBuffering(false); if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; } }}
        onClick={e => e.stopPropagation()}
      />

      <div
        style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: showQuality ? 'none' : 'auto' }}
        onClick={handleVideoClick}
      />

      {}
      {!isPlaying && !buffering && !error && showControls && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); togglePlay(); }}
        >
          <div className="ptv-center-play" style={{
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1.5px rgba(255,255,255,0.2)',
          }}>
            <Play size={17} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        </div>
      )}

      {seekAnim && (
        <>
          {seekAnim.dir === 'left' && (
            <div key={`L${seekAnim.key}`} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', zIndex: 20, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'seekFade 0.65s ease forwards' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '0 60% 60% 0', padding: '26px 34px 26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, backdropFilter: 'blur(6px)' }}>
                <SkipBack size={28} color="white" fill="white" />
                <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>-10s</span>
              </div>
            </div>
          )}
          {seekAnim.dir === 'right' && (
            <div key={`R${seekAnim.key}`} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', zIndex: 20, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'seekFade 0.65s ease forwards' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '60% 0 0 60%', padding: '26px 18px 26px 34px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, backdropFilter: 'blur(6px)' }}>
                <SkipForward size={28} color="white" fill="white" />
                <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>+10s</span>
              </div>
            </div>
          )}
        </>
      )}

      {buffering && !error && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div className="ptv-spinner" />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500 }}>{channel.name}</p>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 15, background: 'rgba(6,6,8,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6">
              <path d="M1 6s4-6 11-6 11 6 11 6-4 6-11 6-11-6-11-6z" /><line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <div style={{ textAlign: 'center', maxWidth: 230 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 5 }}>Stream Unavailable</p>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12, lineHeight: 1.6 }}>This channel's stream is offline or restricted. Try another channel from the list, or retry.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleRetry} style={{ padding: '6px 15px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
              Try Again
            </button>
            {onNext && (
              <button onClick={onNext} style={{ padding: '6px 15px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fff', color: '#000', border: 'none', cursor: 'pointer' }}>
                Next Channel →
              </button>
            )}
          </div>
        </div>
      )}

      {}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 12,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        padding: '10px 12px 18px',
        opacity: showControls ? 1 : 0,
        transition: 'opacity 0.25s ease',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(20,20,24,0.55)', backdropFilter: 'blur(10px)', padding: '5px 11px 5px 5px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 'calc(100% - 24px)' }}>
          {channel.logo && (
            <img src={channel.logo} alt="" style={{ width: 19, height: 19, objectFit: 'contain', borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 11.5, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
        </div>
        {isMini && onCloseMini && (
          <button
            onClick={e => { e.stopPropagation(); onCloseMini(); }}
            style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto' }}
          >
            <X size={12} color="#fff" />
          </button>
        )}
      </div>

      {}
      {!isMini && (
      <div
        className="ptv-controlbar"
        style={{
          position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 15,
          background: 'rgba(16,16,20,0.5)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 12px 10px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
        onMouseLeave={resetHideTimer}
      >
        <div
          style={{ marginBottom: 10, cursor: isLive ? 'default' : 'pointer', position: 'relative', padding: '6px 0' }}
          onClick={handleProgressClick}
          onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHoverPct(((e.clientX - r.left) / r.width) * 100); }}
          onMouseLeave={() => setHoverPct(null)}
        >
          <div className="ptv-progress-track">
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${buffered}%`, background: 'rgba(255,255,255,0.22)', borderRadius: 4 }} />
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: isLive ? '100%' : `${pct}%`,
                background: isLive ? 'linear-gradient(90deg, #ff3b30, #ff6b5a)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                borderRadius: 4,
                boxShadow: isLive ? '0 0 10px rgba(255,59,48,0.6)' : '0 0 10px rgba(59,130,246,0.6)',
              }}
            />
            {!isLive && (
              <div style={{
                position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)',
                width: 13, height: 13, borderRadius: '50%', background: '#fff',
                boxShadow: '0 0 0 3px rgba(59,130,246,0.35), 0 2px 6px rgba(0,0,0,0.5)',
              }} />
            )}
            {hoverPct != null && !isLive && duration > 0 && (
              <div style={{ position: 'absolute', bottom: 16, left: `${hoverPct}%`, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.9)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 6, pointerEvents: 'none', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)' }}>
                {fmt((hoverPct / 100) * duration)}
              </div>
            )}
          </div>
          {!isLive && (
            <input type="range" min="0" max={duration || 100} value={currentTime} step="0.5"
              onChange={e => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value); }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0, padding: 0 }}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Btn title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} big>
            {isPlaying ? <Pause size={16} fill="white" color="white" /> : <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />}
          </Btn>

          {!isLive && <Btn title="Back 10s" onClick={() => seek(-10)}><SkipBack size={13} color="rgba(255,255,255,0.75)" /></Btn>}
          {!isLive && <Btn title="Forward 10s" onClick={() => seek(10)}><SkipForward size={13} color="rgba(255,255,255,0.75)" /></Btn>}

          <Btn title="Reload" onClick={handleRetry}><RotateCcw size={12} color="rgba(255,255,255,0.55)" /></Btn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}>
            <Btn title={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={13} color="rgba(255,255,255,0.75)" /> : <Volume2 size={13} color="rgba(255,255,255,0.75)" />}
            </Btn>
            <div className="ptv-vol-slider" style={{ position: 'relative', width: 56, height: 18, display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', width: `${isMuted ? 0 : volume * 100}%`, borderRadius: 4 }} />
              </div>
              <input type="range" min="0" max="1" step="0.02" value={isMuted ? 0 : volume} onChange={e => handleVolume(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0, padding: 0, zIndex: 2 }} />
            </div>
          </div>

          {isLive && (
            <span style={{ marginLeft: 6, background: 'linear-gradient(135deg, #ff3b30, #ff2d55)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 0 12px rgba(255,59,48,0.45)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'liveDot 1.2s infinite' }} />
              LIVE
            </span>
          )}
          {!isLive && (
            <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmt(currentTime)} / {fmt(duration)}</span>
          )}

          <div style={{ flex: 1 }} />

          {qualities.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowQuality(p => !p); resetHideTimer(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7, background: showQuality ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>
                <Settings size={10} /><span style={{ fontWeight: 700 }}>{qLabel}</span>
              </button>
              {showQuality && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={e => { e.stopPropagation(); setShowQuality(false); resetHideTimer(); }}
                  />
                  <div className="ptv-q-menu" onClick={e => e.stopPropagation()}>
                    <div className="ptv-q-title">Quality</div>
                    <button className={curQuality === -1 ? 'a' : ''} onClick={() => setQuality(-1)}>
                      <span>Auto</span>
                      {curQuality === -1 && <span className="dot" />}
                    </button>
                    {[...qualities].reverse().map(q => (
                      <button key={q.index} className={curQuality === q.index ? 'a' : ''} onClick={() => setQuality(q.index)}>
                        <span>{q.label}{q.bitrate && <em>{(q.bitrate / 1000).toFixed(0)}k</em>}</span>
                        {curQuality === q.index && <span className="dot" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {(document.pictureInPictureEnabled ?? false) && (
            <Btn title="PiP" onClick={togglePiP}>
              <PictureInPicture2 size={13} color={isPiP ? '#fff' : 'rgba(255,255,255,0.6)'} />
            </Btn>
          )}

          {onMinimize && !isMini && (
            <Btn title="Mini player" onClick={onMinimize}>
              <ChevronDown size={13} color="rgba(255,255,255,0.8)" />
            </Btn>
          )}

          <Btn title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={13} color="rgba(255,255,255,0.8)" /> : <Maximize size={13} color="rgba(255,255,255,0.8)" />}
          </Btn>
        </div>
      </div>
      )}

      {isMini && (
        <div
          onClick={e => { e.stopPropagation(); togglePlay(); }}
          style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {!buffering && (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: showControls ? 1 : 0, transition: 'opacity 0.2s' }}>
              {isPlaying ? <Pause size={15} fill="white" color="white" /> : <Play size={15} fill="white" color="white" style={{ marginLeft: 2 }} />}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes seekFade{ 0%{opacity:0;transform:scale(0.88);} 15%{opacity:1;transform:scale(1);} 80%{opacity:1;} 100%{opacity:0;} }
        @keyframes liveDot { 0%,100%{opacity:1;} 50%{opacity:0.15;} }
        .ptv-center-play { width: 46px; height: 46px; }
        @media (max-height: 320px), (max-width: 420px) {
          .ptv-center-play { width: 36px; height: 36px; }
        }
        .ptv-spinner {
          width: 42px; height: 42px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #3b82f6;
          border-right-color: #3b82f6;
          animation: spin 0.75s cubic-bezier(0.5,0,0.5,1) infinite;
        }
        .ptv-progress-track {
          height: 3px; border-radius: 3px; background: rgba(255,255,255,0.15);
          position: relative;
        }
        .ptv-q-menu {
          position:absolute; bottom:calc(100% + 8px); right:0;
          background:rgba(20,20,24,0.55); border:1px solid rgba(255,255,255,0.12);
          border-radius:11px; min-width:108px; max-width:130px; overflow:hidden;
          box-shadow:0 12px 32px rgba(0,0,0,0.5); backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
          animation: qmenuIn 0.16s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes qmenuIn { from { opacity:0; transform:translateY(6px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .ptv-q-title { padding:7px 10px 4px; font-size:8.5px; font-weight:700; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.08em; }
        .ptv-q-menu button {
          display:flex; align-items:center; justify-content:space-between; width:100%; padding:7px 10px;
          background:transparent; border:none; cursor:pointer;
          color:rgba(255,255,255,0.7); font-size:10.5px; font-weight:500;
          transition:background 0.12s; text-align:left;
        }
        .ptv-q-menu button em { font-style:normal; color:rgba(255,255,255,0.32); font-size:8.5px; margin-left:5px; }
        .ptv-q-menu button:hover { background:rgba(255,255,255,0.08); }
        .ptv-q-menu button.a { color:#fff; font-weight:700; }
        .ptv-q-menu .dot { width:5px; height:5px; border-radius:50%; background:#3b82f6; box-shadow:0 0 5px #3b82f6; }
        .ptv-frame:fullscreen { border-radius: 0 !important; }
      `}</style>
    </div>
  );
}

function Btn({ children, onClick, title, big }: { children: React.ReactNode; onClick: () => void; title?: string; big?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: big ? 38 : 30, height: big ? 38 : 30,
      borderRadius: big ? '50%' : 9,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: big ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.04)',
      border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.12s, transform 0.1s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = big ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = big ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.04)'; }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >{children}</button>
  );
}
