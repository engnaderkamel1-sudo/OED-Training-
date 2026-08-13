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
        includeAssets: ['orascom_logo.jpg'],
        manifest: {
          name: 'OED Training Management',
          short_name: 'OED Training',
          description: 'Orascom Construction Equipment Department Training System',
          theme_color: '#002D62',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'orascom_logo.jpg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'orascom_logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
