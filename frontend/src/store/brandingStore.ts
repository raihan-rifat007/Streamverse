import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BrandingState {
  logoDataUrl: string | null;
  siteName: string;
  setLogo: (dataUrl: string) => void;
  clearLogo: () => void;
  setSiteName: (name: string) => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      siteName: 'StreamVerse',
      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl }),
      clearLogo: () => set({ logoDataUrl: null }),
      setSiteName: (name) => set({ siteName: name || 'StreamVerse' }),
    }),
    { name: 'ptv-branding' }
  )
);
