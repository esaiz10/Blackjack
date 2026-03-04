import React, { useEffect, useState } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Colors } from "../styles/theme";

async function loadAll() {
  const user = auth.currentUser;
  if (!user) return { bj: { wins: 0, losses: 0 }, pk: { wins: 0, losses: 0, ties: 0 } };
  const snap = await getDoc(doc(db, "stats", user.uid));
  const data = snap.exists() ? snap.data() : {};
  const bj = data.blackjack || {};
  const pk = data.poker || {};
  return {
    bj: { wins: bj.wins ?? 0, losses: bj.losses ?? 0 },
    pk: { wins: pk.wins ?? 0, losses: pk.losses ?? 0, ties: pk.ties ?? 0 },
  };
}

async function clearAll() {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "stats", user.uid), {
    blackjack: { wins: 0, losses: 0 },
    poker:     { wins: 0, losses: 0, ties: 0 },
  });
}

export default function StatsScreen({ onBack }) {
  const [bj,      setBj]      = useState({ wins: 0, losses: 0 });
  const [pk,      setPk]      = useState({ wins: 0, losses: 0, ties: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { bj: b, pk: p } = await loadAll();
      setBj(b);
      setPk(p);
    } catch (e) {
      console.error("loadAll failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReset = () => {
    Alert.alert(
      "Reset Stats",
      "Reset all Blackjack and Poker stats?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset", style: "destructive",
          onPress: async () => { await clearAll(); await load(); },
        },
      ]
    );
  };

  const displayName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Player";

  const bjTotal   = bj.wins + bj.losses;
  const bjWinRate = bjTotal === 0 ? 0 : Math.round((bj.wins / bjTotal) * 100);

  const pkTotal   = pk.wins + pk.losses + pk.ties;
  const pkWinRate = pkTotal === 0 ? 0 : Math.round((pk.wins / pkTotal) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.subtitle}>{displayName}</Text>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Blackjack ─────────────────────────────────────────────── */}
            <Text style={styles.gameLabel}>♠  Blackjack</Text>
            <StatsBlock
              wins={bj.wins}
              losses={bj.losses}
              total={bjTotal}
              winRate={bjWinRate}
            />

            <View style={styles.sectionGap} />

            {/* ── Poker ─────────────────────────────────────────────────── */}
            <Text style={[styles.gameLabel, { color: '#e07070' }]}>♥  Poker</Text>
            <StatsBlock
              wins={pk.wins}
              losses={pk.losses}
              ties={pk.ties}
              total={pkTotal}
              winRate={pkWinRate}
            />

            <View style={styles.divider} />

            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset All Stats</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StatsBlock — reusable card for one game's stats ───────────────────────────

function StatsBlock({ wins, losses, ties, total, winRate }) {
  const lossRate = total === 0 ? 0 : 100 - winRate;
  const hasTies  = ties != null;

  return (
    <View style={styles.card}>
      {/* Tiles */}
      <View style={styles.tileRow}>
        <View style={[styles.tile, styles.tileWin]}>
          <Text style={styles.tileNumber}>{wins}</Text>
          <Text style={styles.tileLabel}>Wins</Text>
        </View>
        {hasTies && (
          <View style={[styles.tile, styles.tileTie]}>
            <Text style={styles.tileNumber}>{ties}</Text>
            <Text style={styles.tileLabel}>Ties</Text>
          </View>
        )}
        <View style={[styles.tile, styles.tileLoss]}>
          <Text style={styles.tileNumber}>{losses}</Text>
          <Text style={styles.tileLabel}>Losses</Text>
        </View>
      </View>

      {/* Summary rows */}
      <StatRow label="Hands Played" value={total} />
      <View style={styles.cardDivider} />
      <StatRow label="Win Rate"  value={`${winRate}%`}  highlight />
      <View style={styles.cardDivider} />
      <StatRow label="Loss Rate" value={`${lossRate}%`} />

      {/* Win / loss bar */}
      {total > 0 && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: Math.max(winRate,  1) }]} />
          <View style={[styles.barLoss, { flex: Math.max(lossRate, 1) }]} />
        </View>
      )}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  scroll: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    width: "100%",
  },

  title: {
    fontSize: 38, fontWeight: "900", color: Colors.gold, letterSpacing: 3,
    textShadowColor: "rgba(255,215,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  subtitle: { fontSize: 15, color: Colors.textMuted, marginTop: 4, letterSpacing: 0.5 },

  divider: {
    width: "60%", height: 1, backgroundColor: Colors.border, marginVertical: 24,
  },

  gameLabel: {
    fontSize: 13, fontWeight: "800", color: Colors.goldDim,
    letterSpacing: 2, textTransform: "uppercase",
    alignSelf: "flex-start", marginBottom: 10,
  },

  sectionGap: { height: 24 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: "100%", backgroundColor: Colors.bgCard,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },

  tileRow: { flexDirection: "row", gap: 10, marginBottom: 16 },

  tile: {
    flex: 1, alignItems: "center", paddingVertical: 16,
    borderRadius: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
  },
  tileWin:  { backgroundColor: "#0d2e14", borderColor: Colors.greenLight },
  tileTie:  { backgroundColor: "#1a2700", borderColor: Colors.goldDim },
  tileLoss: { backgroundColor: "#2a0e0e", borderColor: "#8b2020" },

  tileNumber: { fontSize: 34, fontWeight: "900", color: Colors.white },
  tileLabel: {
    fontSize: 11, fontWeight: "700", color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2,
  },

  cardDivider: {
    height: 1, backgroundColor: Colors.border, marginVertical: 10, opacity: 0.5,
  },

  statRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 4,
  },
  statLabel:            { fontSize: 15, color: Colors.textMuted, letterSpacing: 0.3 },
  statValue:            { fontSize: 16, fontWeight: "700", color: Colors.white },
  statValueHighlight:   { color: Colors.gold, fontSize: 18 },

  barTrack: {
    flexDirection: "row", height: 8, borderRadius: 4,
    overflow: "hidden", marginTop: 14, backgroundColor: Colors.bgInput,
  },
  barFill: { backgroundColor: Colors.greenLight },
  barLoss: { backgroundColor: Colors.red },

  // ── Buttons ───────────────────────────────────────────────────────────────
  resetBtn: {
    width: "100%", paddingVertical: 14, borderRadius: 12,
    alignItems: "center", backgroundColor: "#2a0e0e",
    borderWidth: 1, borderColor: "#5a1c1c", marginBottom: 12,
  },
  resetBtnText: { color: "#e05555", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },

  backBtn:     { paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: {
    color: Colors.goldDim, fontSize: 15, fontWeight: "600",
    textDecorationLine: "underline",
  },
});
