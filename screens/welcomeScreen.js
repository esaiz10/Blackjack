import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors } from "../styles/theme";

export default function WelcomeScreen({ user, onPlayGames, onStats, onHistory, onSignOut }) {
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Player";

  return (
    <View style={styles.container}>

      {/* ── Casino header ── */}
      <View style={styles.header}>
        <Text style={styles.suitRow}>♠   ♥   ♦   ♣</Text>
        <Text style={styles.titleMain}>ROYAL</Text>
        <Text style={styles.titleSub}>CASINO</Text>
        <View style={styles.rule} />
        <Text style={styles.welcomeText}>Welcome back, {displayName}</Text>
      </View>

      {/* ── Menu ── */}
      <View style={styles.menu}>

        <MenuItem
          suit="♠"
          suitColor={Colors.gold}
          bg={Colors.green}
          border={Colors.greenLight}
          title="Play Games"
          sub="Blackjack & Poker"
          onPress={onPlayGames}
        />

        <MenuItem
          suit="◈"
          suitColor={Colors.goldDim}
          bg={Colors.bgCard}
          border={Colors.border}
          title="Statistics"
          sub="Your win rates"
          onPress={onStats}
        />

        <MenuItem
          suit="◷"
          suitColor={Colors.goldDim}
          bg={Colors.bgCard}
          border={Colors.border}
          title="History"
          sub="Last 100 games"
          onPress={onHistory}
        />

        <MenuItem
          suit="⏻"
          suitColor={Colors.redLight}
          bg={Colors.redDark}
          border={Colors.red}
          title="Sign Out"
          titleColor="#e07070"
          onPress={onSignOut}
        />

      </View>
    </View>
  );
}

function MenuItem({ suit, suitColor, bg, border, title, titleColor, sub, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        pressed && styles.btnPressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.btnSuit, { color: suitColor }]}>{suit}</Text>
      <View style={styles.btnContent}>
        <Text style={[styles.btnTitle, titleColor && { color: titleColor }]}>{title}</Text>
        {sub ? <Text style={styles.btnSub}>{sub}</Text> : null}
      </View>
      {sub ? <Text style={styles.btnArrow}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 40,
  },

  suitRow: {
    fontSize: 18,
    color: Colors.goldDim,
    letterSpacing: 10,
    marginBottom: 16,
    opacity: 0.75,
  },

  titleMain: {
    fontSize: 58,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 12,
    textShadowColor: "rgba(255,215,0,0.3)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 18,
    lineHeight: 60,
  },

  titleSub: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.goldDim,
    letterSpacing: 9,
    marginTop: 4,
  },

  rule: {
    width: 70,
    height: 1.5,
    backgroundColor: Colors.goldDeep,
    marginTop: 16,
    marginBottom: 14,
    borderRadius: 1,
  },

  welcomeText: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },

  // ── Menu ──────────────────────────────────────────────────────────────────
  menu: {
    width: "100%",
    gap: 11,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 7,
  },

  btnPressed: {
    opacity: 0.82,
  },

  btnSuit: {
    fontSize: 21,
    width: 32,
    textAlign: "center",
  },

  btnContent: {
    flex: 1,
    marginLeft: 12,
  },

  btnTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  btnSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },

  btnArrow: {
    color: Colors.textFaint,
    fontSize: 24,
    fontWeight: "200",
    lineHeight: 26,
  },
});
