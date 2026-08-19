import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update Service Worker instantly on deployment detection
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force immediate activation of the new build
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready for offline use.');
  },
});

// Periodic and on-focus update checks
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('focus', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update();
    });
  });

  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update();
    });
  }, 2 * 60 * 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);