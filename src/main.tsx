import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

let isRefreshing = false;

// Auto-update Service Worker safely and smoothly (strictly once per update)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (!isRefreshing) {
      isRefreshing = true;
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use.');
  },
});

// Periodic check (every 5 mins) & on-focus check with 60s throttling
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let lastChecked = Date.now();
  
  const checkForUpdate = () => {
    if (Date.now() - lastChecked < 60 * 1000) return;
    lastChecked = Date.now();
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update().catch(() => {});
    }).catch(() => {});
  };

  window.addEventListener('focus', checkForUpdate);
  setInterval(checkForUpdate, 5 * 60 * 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);