import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { usePlayerStore } from './store/playerStore';
import { useChannelStore } from './store/channelStore';
import { FEATURED_CHANNELS } from './data/channels';
import MiniPlayer from './components/player/MiniPlayer';

const IPTVViewer = lazy(() => import('./pages/IPTVViewer'));
const Favorites  = lazy(() => import('./pages/Favorites'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTop: '2.5px solid #fff', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { theme } = useThemeStore();
  const { currentChannel, isMiniPlayer, setChannel } = usePlayerStore();
  const { addToHistory } = useChannelStore();

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const handleMiniNext = () => {

    const pool = FEATURED_CHANNELS;
    const list = pool.filter(c => c.status !== 'offline');
    const source = list.length > 0 ? list : pool;
    const idx = currentChannel ? source.findIndex(c => c.id === currentChannel.id) : -1;
    const next = idx === -1 ? source[0] : source[(idx + 1) % source.length];
    if (next) {
      setChannel(next);
      addToHistory(next);
    }
  };

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/"          element={<IPTVViewer />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {isMiniPlayer && currentChannel && (
        <MiniPlayer channel={currentChannel} onNext={handleMiniNext} />
      )}
    </>
  );
}
