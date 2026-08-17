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
        includeAssets: ['app-icon.jpg'], // تم تغيير اسم الصورة هنا
        manifest: {
          name: 'OED TTMS (Technical Training Management System)',
          short_name: 'OED-TTMS',
          description: 'Orascom Equipment Department Technical Training Management System',
          theme_color: '#002D62',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'app-icon.jpg', // هنا خلينا السيستم يقرا صورتك الجديدة
              sizes: '192x192',
              type: 'image/jpeg', // اتغيرت لـ jpeg
              purpose: 'any maskable'
            },
            {
              src: 'app-icon.jpg', // نفس الصورة للمقاس الأكبر
              sizes: '512x512',
              type: 'image/jpeg', // اتغيرت لـ jpeg
              purpose: 'any maskable'
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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});