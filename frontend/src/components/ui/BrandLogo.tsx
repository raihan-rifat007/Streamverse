import React, { useRef, useState } from 'react';
import { useBrandingStore } from '../../store/brandingStore';

const MAX_SIZE = 1024 * 1024;

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
        style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          userSelect: 'none'
        }}
        title="Tap to change logo"
      >
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt={siteName}
            style={{ height: 30, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }}
          />
        ) : (
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {siteName.replace(/Verse$/i, '')}<span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Verse</span>
          </div>
        )}
      </div>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 12, padding: 8, minWidth: 180,
              boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
            }}
          >
            <button
              onClick={() => inputRef.current?.click()}
              style={menuBtnStyle}
            >
              🖼️ Upload custom logo
            </button>
            {logoDataUrl && (
              <button
                onClick={() => { clearLogo(); setMenuOpen(false); }}
                style={{ ...menuBtnStyle, color: '#ef4444' }}
              >
                ✕ Remove logo
              </button>
            )}
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', color: 'var(--text-primary)',
  padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
};
