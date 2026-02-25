import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import { Colors } from "../styles/theme";

const STATS_KEY = "blackjack_stats_v1";

async function fetchStats() {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) return { wins: 0, losses: 0 };
  const data = JSON.parse(raw);
  return { wins: data.wins ?? 0, losses: data.losses ?? 0 };
}

async function clearStats() {
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify({ wins: 0, losses: 0 }));
}

export default function StatsScreen({ onBack }) {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [loading, setLoading] = useState(true);

  const total = wins + losses;
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
  const lossRate = total === 0 ? 0 : 100 - winRate;

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchStats();
      setWins(s.wins);
      setLosses(s.losses);
    } catch (e) {
      console.error("fetchStats failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReset = () => {
    Alert.alert(
      "Reset Stats",
      "Are you sure you want to reset all your stats?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearStats();
            await load();
          },
        },
      ]
    );
  };

  const displayName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Player";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <Text style={styles.subtitle}>{displayName}</Text>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Win / Loss tiles */}
          <View style={styles.tileRow}>
            <View style={[styles.tile, styles.tileWin]}>
              <Text style={styles.tileNumber}>{wins}</Text>
              <Text style={styles.tileLabel}>Wins</Text>
            </View>
            <View style={[styles.tile, styles.tileLoss]}>
              <Text style={styles.tileNumber}>{losses}</Text>
              <Text style={styles.tileLabel}>Losses</Text>
            </View>
          </View>

          {/* Summary card */}
          <View style={styles.card}>
            <StatRow label="Total Games" value={total} />
            <View style={styles.cardDivider} />
            <StatRow label="Win Rate" value={`${winRate}%`} highlight />
            <View style={styles.cardDivider} />
            <StatRow label="Loss Rate" value={`${lossRate}%`} />

            {total > 0 && (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { flex: winRate }]} />
                <View style={[styles.barLoss, { flex: lossRate }]} />
              </View>
            )}
          </View>

          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Reset Stats</Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
    </View>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  title: {
    fontSize: 38,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 3,
    textShadowColor: "rgba(255,215,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  divider: {
    width: "60%",
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },

  tileRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    width: "100%",
  },

  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  tileWin: {
    backgroundColor: "#0d2e14",
    borderColor: Colors.greenLight,
  },

  tileLoss: {
    backgroundColor: "#2a0e0e",
    borderColor: "#8b2020",
  },

  tileNumber: {
    fontSize: 40,
    fontWeight: "900",
    color: Colors.white,
  },

  tileLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },

  card: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
    opacity: 0.5,
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },

  statLabel: {
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  statValueHighlight: {
    color: Colors.gold,
    fontSize: 18,
  },

  barTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 16,
    backgroundColor: Colors.bgInput,
  },

  barFill: {
    backgroundColor: Colors.greenLight,
  },

  barLoss: {
    backgroundColor: Colors.red,
  },

  resetBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#2a0e0e",
    borderWidth: 1,
    borderColor: "#5a1c1c",
    marginBottom: 12,
  },

  resetBtnText: {
    color: "#e05555",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  backBtnText: {
    color: Colors.goldDim,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
