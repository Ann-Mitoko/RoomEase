import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // In development the site calls /api/... and Vite forwards it to the Daraja server (npm run server)
    proxy: { '/api': 'http://localhost:5000' },
  },
});
