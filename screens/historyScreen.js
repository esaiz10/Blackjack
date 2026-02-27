import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from "react-native";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Colors } from "../styles/theme";

async function fetchHistory() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const q = query(
    collection(db, "games"),
    where("userId", "==", user.uid),
    orderBy("playedAt", "desc"),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function friendlyError(msg) {
  if (!msg) return msg;
  if (msg.includes("permission") || msg.includes("Missing or insufficient"))
    return "Permission denied — check Firestore security rules for the 'games' collection.";
  if (msg.includes("index") || msg.includes("requires an index"))
    return "Firestore needs a composite index for this query (userId + playedAt). " +
      "Check the browser/device console for a direct link to create it.";
  return msg;
}

function formatTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const RESULT_COLOR = { win: "#4cff80", loss: "#ff5555", push: "#FFD700", bust: "#ff5555", tie: "#FFD700" };
const RESULT_LABEL = { win: "WIN", loss: "LOSS", push: "PUSH", bust: "BUST", tie: "TIE" };
const GAME_TYPE_COLOR = { blackjack: Colors.goldDim, poker: "#e07070" };
const GAME_TYPE_LABEL = { blackjack: "♠ BJ", poker: "♥ PKR" };

export default function HistoryScreen({ onBack }) {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetchHistory()
      .then(setGames)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = ({ item, index }) => {
    const resultColor = RESULT_COLOR[item.result] ?? Colors.textMuted;
    const resultLabel = RESULT_LABEL[item.result] ?? (item.result?.toUpperCase() ?? "?");
    const gameType    = item.gameType ?? "blackjack";
    const isPoker     = gameType === "poker";

    return (
      <View style={styles.row}>
        {/* Left: index + game type + result */}
        <View style={styles.leftCol}>
          <Text style={styles.rowIndex}>#{index + 1}</Text>
          <Text style={[styles.gameTypeTag, { color: GAME_TYPE_COLOR[gameType] ?? Colors.textMuted }]}>
            {GAME_TYPE_LABEL[gameType] ?? gameType.toUpperCase()}
          </Text>
          <View style={[styles.badge, { borderColor: resultColor }]}>
            <Text style={[styles.badgeText, { color: resultColor }]}>{resultLabel}</Text>
          </View>
        </View>

        {/* Mid: score / hands */}
        <View style={styles.midCol}>
          {isPoker ? (
            <Text style={styles.scoreLine}>
              Final stack: <Text style={styles.scoreNum}>{item.playerScore ?? "—"}</Text>
            </Text>
          ) : (
            <>
              <Text style={styles.scoreLine}>
                You <Text style={styles.scoreNum}>{item.playerScore}</Text>
                {"  vs  "}
                Dealer <Text style={styles.scoreNum}>{item.dealerScore}</Text>
              </Text>
              <Text style={styles.handText}>You: {item.playerHand?.join(" ") ?? "—"}</Text>
              <Text style={styles.handText}>Dealer: {item.dealerHand?.join(" ") ?? "—"}</Text>
            </>
          )}
        </View>

        {/* Right: time */}
        <Text style={styles.timeText}>{formatTime(item.playedAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Last 100 games • Blackjack & Poker</Text>
      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load history</Text>
          <Text style={styles.errorMsg}>
            {friendlyError(error)}
          </Text>
        </View>
      ) : games.length === 0 ? (
        <Text style={styles.emptyText}>No games yet — go play!</Text>
      ) : (
        <FlatList
          data={games}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bg,
    paddingTop: 20, paddingHorizontal: 18,
  },

  title: {
    fontSize: 32, fontWeight: "900", color: Colors.gold,
    letterSpacing: 3, textAlign: "center",
    textShadowColor: "rgba(255,215,0,0.2)",
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },

  subtitle: {
    fontSize: 12, color: Colors.textMuted, textAlign: "center",
    marginTop: 4, letterSpacing: 0.5,
  },

  divider: {
    width: "60%", alignSelf: "center", height: 1,
    backgroundColor: Colors.border, marginVertical: 16,
  },

  list: { paddingBottom: 12 },

  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 4,
  },

  leftCol: { alignItems: "center", marginRight: 12, width: 54 },

  rowIndex: { fontSize: 10, color: Colors.textFaint, marginBottom: 4 },

  gameTypeTag: {
    fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginBottom: 5,
  },

  badge: {
    borderWidth: 1.5, borderRadius: 6,
    paddingVertical: 3, paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  midCol: { flex: 1 },

  scoreLine: { fontSize: 14, color: Colors.white, fontWeight: "600", marginBottom: 4 },
  scoreNum:  { fontWeight: "900", color: Colors.gold },

  handText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.2, marginBottom: 1 },

  timeText: {
    fontSize: 10, color: Colors.textFaint, textAlign: "right",
    marginLeft: 8, maxWidth: 68,
  },

  emptyText: {
    color: Colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 16,
  },

  errorBox: {
    backgroundColor: Colors.redDark, borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: Colors.red, marginTop: 16,
  },
  errorTitle: { color: Colors.redLight, fontWeight: "800", fontSize: 15, marginBottom: 6 },
  errorMsg:   { color: Colors.textMuted, fontSize: 12, lineHeight: 19 },

  backBtn: {
    paddingVertical: 14, alignItems: "center",
    borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6,
  },
  backBtnText: { color: Colors.goldDim, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
