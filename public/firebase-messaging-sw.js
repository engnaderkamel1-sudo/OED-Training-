importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBDnuE-xR4kot3Jzj88T0OevDxWS261-_c",
  authDomain: "oed-training.firebaseapp.com",
  projectId: "oed-training",
  storageBucket: "oed-training.firebasestorage.app",
  messagingSenderId: "210766524025",
  appId: "1:210766524025:web:26072c0a02dee8661c6ea8"
};

const CACHE_NAME = 'oed-ttms-v11.0';

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Force immediate update & claim all clients
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// PWA Fetch handler required for Chrome Standalone App Installation
self.addEventListener('fetch', (event) => {
  // Let network handle request, fallback to cache if offline
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension') || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((res) => res || Promise.reject('offline'));
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'OED-TTMS';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png?v=11.0',
    badge: '/icon-192.png?v=11.0'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
