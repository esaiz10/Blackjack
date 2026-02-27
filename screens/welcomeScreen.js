import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors } from "../styles/theme";

export default function WelcomeScreen({ user, onPlayGames, onStats, onHistory, onSignOut }) {
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Player";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.suits}>♠ ♥ ♦ ♣</Text>
        <Text style={styles.title}>Blackjack</Text>
        <Text style={styles.welcome}>Welcome back, {displayName}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu */}
      <View style={styles.menu}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPlayGames}>
          <Text style={styles.btnIcon}>🃏</Text>
          <Text style={styles.btnText}>Play Games</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onStats}>
          <Text style={styles.btnIcon}>📊</Text>
          <Text style={styles.btnText}>My Stats</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onHistory}>
          <Text style={styles.btnIcon}>🕘</Text>
          <Text style={styles.btnText}>Game History</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnDanger]} onPress={onSignOut}>
          <Text style={styles.btnIcon}>🚪</Text>
          <Text style={styles.btnText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  suits: {
    fontSize: 24,
    color: Colors.goldDim,
    letterSpacing: 10,
    marginBottom: 8,
  },

  title: {
    fontSize: 46,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 5,
    textShadowColor: "rgba(255,215,0,0.2)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },

  welcome: {
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  divider: {
    width: "60%",
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 36,
  },

  menu: {
    width: "100%",
    gap: 14,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  btnPrimary: {
    backgroundColor: Colors.green,
    borderColor: Colors.greenLight,
  },

  btnSecondary: {
    backgroundColor: "#1a3d28",
    borderColor: Colors.border,
  },

  btnDanger: {
    backgroundColor: "#2a1010",
    borderColor: "#5a1c1c",
  },

  btnIcon: {
    fontSize: 20,
    marginRight: 14,
  },

  btnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
