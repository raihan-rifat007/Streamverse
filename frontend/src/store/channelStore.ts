import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Channel } from '../types';

interface ChannelState {
  favorites: Channel[];
  history: (Channel & { watchedAt: number })[];
  selectedCategory: string;
  searchQuery: string;
  toggleFavorite: (channel: Channel) => void;
  isFavorite: (id: string) => boolean;
  addToHistory: (channel: Channel) => void;
  setCategory: (cat: string) => void;
  setSearch: (q: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      selectedCategory: 'all',
      searchQuery: '',

      toggleFavorite: (channel) => {
        const { favorites } = get();
        const exists = favorites.find(f => f.id === channel.id);
        if (exists) {
          set({ favorites: favorites.filter(f => f.id !== channel.id) });
        } else {
          set({ favorites: [channel, ...favorites].slice(0, 200) });
        }
      },

      isFavorite: (id) => get().favorites.some(f => f.id === id),

      addToHistory: (channel) => {
        const { history } = get();
        const filtered = history.filter(h => h.id !== channel.id);
        set({
          history: [{ ...channel, watchedAt: Date.now() }, ...filtered].slice(0, 50)
        });
      },

      setCategory: (cat) => set({ selectedCategory: cat }),
      setSearch: (q) => set({ searchQuery: q }),
    }),
    {
      name: 'ptv-channel-store',
      partialize: (state) => ({
        favorites: state.favorites,
        history: state.history,
      })
    }
  )
);
