importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBDnuE-xR4kot3Jzj88T0OevDxWS26l-_c",
  authDomain: "oed-training.firebaseapp.com",
  projectId: "oed-training",
  storageBucket: "oed-training.firebasestorage.app",
  messagingSenderId: "210766524025",
  appId: "1:210766524025:web:26072c0a02dee8661c6ea8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/orascom_logo.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
