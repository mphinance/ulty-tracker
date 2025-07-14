import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/polygon': {
        target: 'https://api.polygon.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polygon/, ''),
        secure: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ULTY-Tracker/1.0)'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Ensure environment variables are available
    'process.env': {}
  },
});
