import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUndxRuqQDYuI--WcSo39UFoaueLPLBPI",
  authDomain: "blackjack-f0fe7.firebaseapp.com",
  projectId: "blackjack-f0fe7",
  storageBucket: "blackjack-f0fe7.firebasestorage.app",
  messagingSenderId: "497426065715",
  appId: "1:497426065715:web:e43c29904f7d2b047fb646",
  measurementId: "G-GTEJ7RE78C",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export default app;
