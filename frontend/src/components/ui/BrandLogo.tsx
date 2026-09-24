import React, { useRef, useState } from 'react';
import { useBrandingStore } from '../../store/brandingStore';

const MAX_SIZE = 1024 * 1024;

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="svg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8EB6FF" />
          <stop offset="0.5" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="18" fill="url(#svg)" opacity="0.95" />
      <rect x="3" y="3" width="58" height="58" rx="18" fill="white" opacity="0.12" />
      <path d="M24 20.5L44 32L24 43.5V20.5Z" fill="white" />
    </svg>
  );
}

export default function BrandLogo() {
  const { logoDataUrl, siteName, setLogo, clearLogo } = useBrandingStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > MAX_SIZE) {
      alert('Image too large. Please use an image under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
    setMenuOpen(false);
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        onClick={() => setMenuOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
        title="Tap to change logo"
      >
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt={siteName}
            style={{ height: 30, maxWidth: 140, objectFit: 'contain', borderRadius: 8 }}
          />
        ) : (
          <>
            <Mark />
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Stream<span style={{ fontWeight: 650, opacity: 0.72 }}>verse</span>
            </div>
          </>
        )}
      </div>
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50,
              background: 'rgba(20,20,28,0.72)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 14, padding: 8, minWidth: 188,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 16px 40px rgba(0,0,0,0.35)',
            }}
          >
            <button onClick={() => inputRef.current?.click()} style={menuBtnStyle}>
              Upload custom logo
            </button>
            {logoDataUrl && (
              <button
                onClick={() => { clearLogo(); setMenuOpen(false); }}
                style={{ ...menuBtnStyle, color: '#ef4444' }}
              >
                Remove logo
              </button>
            )}
          </div>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', color: 'var(--text-primary)',
  padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
};
