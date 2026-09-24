import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34, height: 34, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        cursor: 'pointer', transition: 'transform 0.15s ease',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {theme === 'dark'
        ? <Sun size={15} color="var(--text-secondary)" />
        : <Moon size={15} color="var(--text-secondary)" />}
    </button>
  );
}
