import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const TILE_COLORS = [
  'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
  'linear-gradient(135deg,#10b981,#047857)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#ef4444,#b91c1c)',
  'linear-gradient(135deg,#06b6d4,#0e7490)',
  'linear-gradient(135deg,#f97316,#c2410c)',
];

const TILES = [
  { x: 4,  y: 30, r: -14, s: 96 },
  { x: 12, y: 12, r: -8,  s: 108 },
  { x: 24, y: 3,  r: -4,  s: 118 },
  { x: 38, y: -2, r: 2,   s: 126 },
  { x: 53, y: -2, r: 4,   s: 126 },
  { x: 67, y: 3,  r: 6,   s: 118 },
  { x: 80, y: 12, r: 10,  s: 108 },
  { x: 90, y: 30, r: 14,  s: 96 },
];

export default function handler() {

  const channelCount = '15,000+';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: '#050506',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {TILES.map((t, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.s,
              height: t.s,
              borderRadius: 26,
              background: TILE_COLORS[i % TILE_COLORS.length],
              transform: `rotate(${t.r}deg)`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
              display: 'flex',
              opacity: 0.9,
            }}
          />
        ))}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(5,5,6,0.15) 0%, rgba(5,5,6,0.75) 46%, #050506 62%)',
          display: 'flex',
        }} />

        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 78,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 98,
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            <span style={{ color: '#ffffff' }}>Stream</span>
            <span style={{ color: '#8a8a8a' }}>Verse</span>
          </div>

          <div style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 28,
            color: '#a8a8a8',
            fontWeight: 500,
          }}>
            {channelCount} Live Channels &nbsp;&#8226;&nbsp; Free Streaming
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 34,
            padding: '12px 28px',
            borderRadius: 999,
            background: '#ffffff',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3b30', display: 'flex' }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: '#000000', letterSpacing: '0.08em' }}>
              LIVE
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
