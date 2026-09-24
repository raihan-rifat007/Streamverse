import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Tv, ArrowLeft } from 'lucide-react';
import { useChannelStore } from '../store/channelStore';
import { usePlayerStore } from '../store/playerStore';
import { Channel } from '../types';

function FavCard({ ch, onPlay, onRemove }: { ch: Channel; onPlay: () => void; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);

  return (
    <div
      onClick={onPlay}
      style={{
        cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border-color)', background: 'var(--bg-card)',
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{
        aspectRatio: '1/1', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: 6,
      }}>
        {!broken ? (
          <img
            src={ch.logo} alt={ch.name} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12%', borderRadius: 9, background: '#fff' }}
            onError={() => setBroken(true)}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 6, borderRadius: 9, background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 13 }}>
              {ch.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.18s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
        >
          <Tv size={22} color="white" />
        </div>
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            position: 'absolute', top: 4, right: 4, zIndex: 10,
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(59,130,246,0.9)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Remove from favorites"
        >
          <Heart size={9} fill="white" color="white" />
        </button>
      </div>
      <div style={{ padding: '5px 7px 6px' }}>
        <p style={{
          fontSize: 10, fontWeight: 700, margin: 0,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{ch.name}</p>
        <p style={{
          fontSize: 9, fontWeight: 500, margin: '2px 0 0',
          color: 'var(--text-muted)', textTransform: 'capitalize',
        }}>{ch.category}</p>
      </div>
    </div>
  );
}

export default function Favorites() {
  const { favorites, toggleFavorite, addToHistory } = useChannelStore();
  const { setChannel } = usePlayerStore();
  const navigate = useNavigate();

  const handlePlay = (ch: Channel) => {
    setChannel(ch);
    addToHistory(ch);
    navigate('/');
  };

  return (
    <div className="liquid-bg" style={{ minHeight: '100dvh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', height: 52,
        background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
          color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
        }}>
          <ArrowLeft size={15} />
          Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={16} color="#3b82f6" fill="#3b82f6" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>My Favorites</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {favorites.length} saved
        </span>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {favorites.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ marginBottom: 16, opacity: 0.2 }}>
              <Heart size={56} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No favorites yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              Tap the ♥ on any channel card to save it here
            </p>
            <Link to="/" style={{
              display: 'inline-block', marginTop: 24, padding: '9px 24px', borderRadius: 22,
              background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}>Browse Channels</Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Click a channel to watch it
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
            }}>
              {favorites.map(ch => (
                <FavCard
                  key={ch.id}
                  ch={ch}
                  onPlay={() => handlePlay(ch)}
                  onRemove={() => toggleFavorite(ch)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
