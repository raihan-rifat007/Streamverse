import { create } from 'zustand';
import { Channel } from '../types';

interface PlayerState {
  currentChannel: Channel | null;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  isMiniPlayer: boolean;
  setChannel: (channel: Channel) => void;
  clearChannel: () => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setPlaying: (p: boolean) => void;
  setMiniPlayer: (v: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentChannel: null,
  volume: 0.8,
  isMuted: false,
  isPlaying: false,
  isMiniPlayer: false,

  setChannel: (channel) => set({ currentChannel: channel, isPlaying: true }),
  clearChannel: () => set({ currentChannel: null, isPlaying: false, isMiniPlayer: false }),
  setVolume: (v) => set({ volume: v, isMuted: v === 0 }),
  setMuted: (m) => set({ isMuted: m }),
  setPlaying: (p) => set({ isPlaying: p }),
  setMiniPlayer: (v) => set({ isMiniPlayer: v }),
}));
