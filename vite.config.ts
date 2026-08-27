import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['app-icon.png', 'app-icon-2026.png', 'icon-192.png', 'icon-192-2026.png', 'icon-512.png', 'icon-512-2026.png', 'apple-touch-icon.png', 'favicon.ico', 'orascom-logo.png'],
        manifest: {
          id: '/?app_id=oed_ttms_2026_v12',
          name: 'OED Training Management System • TTMS',
          short_name: 'OED-TTMS • Training',
          description: 'Orascom Equipment Department Technical Training Management System',
          theme_color: '#002D62',
          background_color: '#001D42',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192-2026.png?v=12.0',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512-2026.png?v=12.0',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/app-icon-2026.png?v=12.0',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});