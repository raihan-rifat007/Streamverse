import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          player: ['hls.js'],
          motion: ['framer-motion'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
});
