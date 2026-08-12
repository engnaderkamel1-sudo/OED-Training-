import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDnuE-xR4kot3Jzj88T0OevDxWS26l-_c",
  authDomain: "oed-training.firebaseapp.com",
  projectId: "oed-training",
  storageBucket: "oed-training.firebasestorage.app",
  messagingSenderId: "210766524025",
  appId: "1:210766524025:web:26072c0a02dee8661c6ea8",
  measurementId: "G-29T732WRHH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
