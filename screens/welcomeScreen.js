import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function WelcomeScreen({ onPlay, onStats, onSignOut }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Blackjack</Text>
      <Text style={styles.sub}>Choose what you want to do:</Text>

      <Pressable style={styles.btn} onPress={onPlay}>
        <Text style={styles.btnText}>Play Blackjack</Text>
      </Pressable>

      <Pressable style={styles.btn} onPress={onStats}>
        <Text style={styles.btnText}>View Stats</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.signOut]} onPress={onSignOut}>
        <Text style={styles.btnText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  sub: { fontSize: 14, opacity: 0.8, marginBottom: 24, textAlign: "center" },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  btnText: { fontSize: 16, fontWeight: "600" },
  signOut: { marginTop: 10, opacity: 0.85 },
});
