import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import LoginScreen from "./screens/LoginScreen";
import WelcomeScreen from "./screens/welcomeScreen";
import GameScreen from "./screens/GameScreen";
import StatsScreen from "./screens/statScreen";
import HistoryScreen from "./screens/historyScreen";
import GameSelectScreen from "./screens/GameSelectScreen";
import PokerScreen from "./screens/PokerScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // "welcome" | "gameSelect" | "game" | "poker" | "stats" | "history"
  const [screen, setScreen] = useState("welcome");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (currentUser) setScreen("welcome");
    });

    return unsub;
  }, []);

  function renderContent() {
    if (checking) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1f0f" }}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      );
    }

    if (!user) return <LoginScreen />;

    if (screen === "stats")   return <StatsScreen onBack={() => setScreen("welcome")} />;
    if (screen === "history") return <HistoryScreen onBack={() => setScreen("welcome")} />;
    if (screen === "game")    return <GameScreen onExitToWelcome={() => setScreen("welcome")} />;
    if (screen === "poker")   return <PokerScreen onExitToWelcome={() => setScreen("welcome")} />;

    if (screen === "gameSelect") {
      return (
        <GameSelectScreen
          onBlackjack={() => setScreen("game")}
          onPoker={() => setScreen("poker")}
          onBack={() => setScreen("welcome")}
        />
      );
    }

    return (
      <WelcomeScreen
        user={user}
        onPlayGames={() => setScreen("gameSelect")}
        onStats={() => setScreen("stats")}
        onHistory={() => setScreen("history")}
        onSignOut={() => signOut(auth)}
      />
    );
  }

  const content = renderContent();

  if (Platform.OS === "web") {
    return (
      <View style={webStyles.outer}>
        <View style={webStyles.inner}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#050e06",
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    // Subtle side shadow to lift the column off the dark outer background
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
});
