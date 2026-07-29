import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'components'),
      '@pages': path.resolve(__dirname, 'pages'),
      '@services': path.resolve(__dirname, 'services'),
      '@hooks': path.resolve(__dirname, 'hooks'),
      '@context': path.resolve(__dirname, 'context'),
      '@assets': path.resolve(__dirname, 'assets'),
    },
  },
  server: {
    port: 8905,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
