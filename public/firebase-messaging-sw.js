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

const CACHE_NAME = 'oed-ttms-v12.0';

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
  const notificationTitle = payload.notification?.title || payload.data?.title || 'OED-TTMS';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192.png?v=12.0',
    badge: '/icon-192.png?v=12.0',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.data?.tag || `oed-msg-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Native push event listener fallback (for raw WebPush messages)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || 'OED-TTMS';
    const body = data.notification?.body || data.data?.body || '';
    const options = {
      body: body,
      icon: '/icon-192.png?v=12.0',
      badge: '/icon-192.png?v=12.0',
      vibrate: [200, 100, 200],
      tag: `oed-push-${Date.now()}`,
      renotify: true,
      data: { url: data.data?.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.warn('Push payload parse error:', e);
  }
});

// Click notification to open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
