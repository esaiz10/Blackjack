import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig.js";

import LoginScreen from "./screens/LoginScreen.jsx";
import GameScreen from "./screens/GameScreen.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });

    return unsub;
  }, []);

  if (checking) {
    return (
      <div style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center", backgroundColor: "#0b6623" }}>
        <span style={{ color: "white", fontSize: 18 }}>Loading...</span>
      </div>
    );
  }

  return user ? <GameScreen /> : <LoginScreen />;
}
