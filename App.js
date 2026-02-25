import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import LoginScreen from "./screens/LoginScreen";
import WelcomeScreen from "./screens/welcomeScreen";
import GameScreen from "./screens/GameScreen";
import StatsScreen from "./screens/statScreen";
import HistoryScreen from "./screens/historyScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // "welcome" | "game" | "stats"
  const [screen, setScreen] = useState("welcome");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (currentUser) setScreen("welcome");
    });

    return unsub;
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1f0f" }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (screen === "stats") {
    return <StatsScreen onBack={() => setScreen("welcome")} />;
  }

  if (screen === "history") {
    return <HistoryScreen onBack={() => setScreen("welcome")} />;
  }

  if (screen === "game") {
    return <GameScreen onExitToWelcome={() => setScreen("welcome")} />;
  }

  return (
    <WelcomeScreen
      user={user}
      onPlay={() => setScreen("game")}
      onStats={() => setScreen("stats")}
      onHistory={() => setScreen("history")}
      onSignOut={() => signOut(auth)}
    />
  );
}
