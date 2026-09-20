import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyBDnuE-xR4kot3Jzj88T0OevDxWS261-_c",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "oed-training.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "oed-training",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "oed-training.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "210766524025",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:210766524025:web:26072c0a02dee8661c6ea8",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-29T732WRHH"
};

const app = initializeApp(firebaseConfig);

// Enable robust multi-tab persistent local cache in IndexedDB
// This prevents pulling thousands of documents from Google servers on every page refresh!
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true,
  useFetchStreams: false
} as any);

// Modern direct local persistence without unnecessary external OAuth iframe calls
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

// Secondary Auth Instance: Provisions new accounts without logging out the active admin session
export const createSecondaryAuthUser = async (email: string, pass: string) => {
  const SECONDARY_NAME = "OED_Admin_User_Creator";
  let secApp = getApps().find(a => a.name === SECONDARY_NAME);
  if (!secApp) {
    secApp = initializeApp(firebaseConfig, SECONDARY_NAME);
  }
  const secAuth = getAuth(secApp);
  const cred = await createUserWithEmailAndPassword(secAuth, email, pass);
  await signOut(secAuth);
  return cred.user;
};


