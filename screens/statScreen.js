import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "blackjack_stats_v1";

async function getStats() {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) return { wins: 0, losses: 0 };
  try {
    const parsed = JSON.parse(raw);
    return { wins: parsed.wins ?? 0, losses: parsed.losses ?? 0 };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

async function resetStats() {
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify({ wins: 0, losses: 0 }));
}

export default function StatsScreen({ onBack }) {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  const total = wins + losses;
  const winRate = useMemo(() => (total === 0 ? 0 : Math.round((wins / total) * 100)), [wins, total]);

  async function refresh() {
    const s = await getStats();
    setWins(s.wins);
    setLosses(s.losses);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Stats</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Wins: {wins}</Text>
        <Text style={styles.row}>Losses: {losses}</Text>
        <Text style={styles.row}>Total Games: {total}</Text>
        <Text style={styles.row}>Win Rate: {winRate}%</Text>
      </View>

      <Pressable
        style={styles.btn}
        onPress={async () => {
          await resetStats();
          await refresh();
        }}
      >
        <Text style={styles.btnText}>Reset Stats</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.back]} onPress={onBack}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  card: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  row: { fontSize: 16, marginBottom: 6 },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  btnText: { fontSize: 16, fontWeight: "600" },
  back: { opacity: 0.9 },
});
