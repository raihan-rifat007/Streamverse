import React, { useRef, useState, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { usePlayerStore } from '../../store/playerStore';
import { Channel } from '../../types';

const MARGIN = 12;
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 160;
const MAX_WIDTH = 420;

interface Props {
  channel: Channel;
  onNext: () => void;
}

export default function MiniPlayer({ channel, onNext }: Props) {
  const { setMiniPlayer, clearChannel } = usePlayerStore();
  const boxRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (pos) return;
    const height = width * 9 / 16;
    setPos({
      x: window.innerWidth - width - MARGIN,
      y: window.innerHeight - height - MARGIN - 64,
    });
  }, [width, pos]);

  const clampPos = useCallback((x: number, y: number, w: number) => {
    const h = w * 9 / 16;
    const maxX = window.innerWidth - w - MARGIN;
    const maxY = window.innerHeight - h - MARGIN;
    return {
      x: Math.min(Math.max(x, MARGIN), Math.max(MARGIN, maxX)),
      y: Math.min(Math.max(y, MARGIN), Math.max(MARGIN, maxY)),
    };
  }, []);

  const onDragStart = (clientX: number, clientY: number) => {
    if (!pos) return;
    dragState.current = { startX: clientX, startY: clientY, origX: pos.x, origY: pos.y };
  };
  const onDragMove = (clientX: number, clientY: number) => {
    if (!dragState.current) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    const next = clampPos(dragState.current.origX + dx, dragState.current.origY + dy, width);
    setPos(next);
  };
  const onDragEnd = () => { dragState.current = null; };

  const onResizeStart = (clientX: number) => {
    resizeState.current = { startX: clientX, startWidth: width };
  };
  const onResizeMove = (clientX: number) => {
    if (!resizeState.current || !pos) return;
    const dx = resizeState.current.startX - clientX;
    const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeState.current.startWidth + dx));
    setWidth(nextWidth);
    setPos(p => p ? clampPos(p.x, p.y, nextWidth) : p);
  };
  const onResizeEnd = () => { resizeState.current = null; };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const point = 'touches' in e ? e.touches[0] : e;
      if (!point) return;
      if (dragState.current) onDragMove(point.clientX, point.clientY);
      if (resizeState.current) onResizeMove(point.clientX);
    };
    const handleUp = () => { onDragEnd(); onResizeEnd(); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

  }, [width, pos]);

  useEffect(() => {
    const handleResize = () => {
      setPos(p => p ? clampPos(p.x, p.y, width) : p);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, clampPos]);

  if (!pos) return null;
  const height = width * 9 / 16;

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width,
        height,
        zIndex: 200,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
        cursor: 'grab',
        touchAction: 'none',
      }}
      onMouseDown={e => { if ((e.target as HTMLElement).dataset.resizeHandle) return; onDragStart(e.clientX, e.clientY); }}
      onTouchStart={e => { if ((e.target as HTMLElement).dataset.resizeHandle) return; const t = e.touches[0]; if (t) onDragStart(t.clientX, t.clientY); }}
    >
      <VideoPlayer channel={channel} fill isMini onNext={onNext} onCloseMini={() => { setMiniPlayer(false); clearChannel(); }} />

      {}
      <button
        onClick={() => setMiniPlayer(false)}
        title="Expand"
        style={{
          position: 'absolute', bottom: 6, right: 6, zIndex: 20,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>

      {}
      <div
        data-resize-handle="true"
        onMouseDown={e => { e.stopPropagation(); onResizeStart(e.clientX); }}
        onTouchStart={e => { e.stopPropagation(); const t = e.touches[0]; if (t) onResizeStart(t.clientX); }}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, zIndex: 20,
          cursor: 'ew-resize', touchAction: 'none',
        }}
      />
    </div>
  );
}
