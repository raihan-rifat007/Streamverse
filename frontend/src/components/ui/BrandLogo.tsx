import React, { useRef, useState } from 'react';
import { useBrandingStore } from '../../store/brandingStore';

const MAX_SIZE = 1024 * 1024;
const DEFAULT_LOGO = '/logo.svg';

export default function BrandLogo() {
  const { logoDataUrl, siteName, setLogo, clearLogo } = useBrandingStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const src = logoDataUrl || DEFAULT_LOGO;

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
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        title="Change logo"
      >
        <img
          src={src}
          alt={siteName || 'Streamverse'}
          width={30}
          height={30}
          draggable={false}
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
            willChange: 'transform',
          }}
        />
        <span
          style={{
            fontSize: 16,
            fontWeight: 750,
            letterSpacing: '-0.04em',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          Streamverse
        </span>
      </div>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="glass-strong" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 10,
            zIndex: 50,
            borderRadius: 16,
            padding: 8,
            minWidth: 200,
          }}>
            <button onClick={() => inputRef.current?.click()} style={menuBtnStyle}>
              Upload custom logo
            </button>
            {logoDataUrl && (
              <button
                onClick={() => { clearLogo(); setMenuOpen(false); }}
                style={{ ...menuBtnStyle, color: '#ff5a5a' }}
              >
                Reset to default logo
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
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  padding: '11px 12px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 560,
  cursor: 'pointer',
};
