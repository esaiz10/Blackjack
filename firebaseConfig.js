import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
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

// ✅ THIS is the correct line (NOT "const app = initial")
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: Platform.OS === "web"
    ? browserLocalPersistence
    : getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export default app;

