import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Colors } from "../styles/theme";

async function fetchHistory() {
  const q = query(
    collection(db, "games"),
    where("userId", "==", auth.currentUser.uid),
    orderBy("playedAt", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Format Firestore timestamp → "Jan 5, 3:42 PM"
function formatTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const RESULT_COLOR = {
  win:  "#4cff80",
  loss: "#ff5555",
  push: "#FFD700",
  bust: "#ff5555",
};

const RESULT_LABEL = {
  win:  "WIN",
  loss: "LOSS",
  push: "PUSH",
  bust: "BUST",
};

export default function HistoryScreen({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory()
      .then(setGames)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {/* Index + result badge */}
      <View style={styles.leftCol}>
        <Text style={styles.rowIndex}>#{index + 1}</Text>
        <View style={[styles.badge, { borderColor: RESULT_COLOR[item.result] }]}>
          <Text style={[styles.badgeText, { color: RESULT_COLOR[item.result] }]}>
            {RESULT_LABEL[item.result] ?? item.result.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Scores */}
      <View style={styles.midCol}>
        <Text style={styles.scoreLine}>
          You <Text style={styles.scoreNum}>{item.playerScore}</Text>
          {"  vs  "}
          Dealer <Text style={styles.scoreNum}>{item.dealerScore}</Text>
        </Text>
        <Text style={styles.handText}>
          You: {item.playerHand?.join(" ") ?? "—"}
        </Text>
        <Text style={styles.handText}>
          Dealer: {item.dealerHand?.join(" ") ?? "—"}
        </Text>
      </View>

      {/* Time */}
      <Text style={styles.timeText}>{formatTime(item.playedAt)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Last 100 games</Text>
      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load history</Text>
          <Text style={styles.errorMsg}>
            Make sure your Firestore rules allow authenticated reads on the
            'games' collection.{"\n\n"}{error}
          </Text>
        </View>
      ) : games.length === 0 ? (
        <Text style={styles.emptyText}>No games played yet. Go play!</Text>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 3,
    textAlign: "center",
    textShadowColor: "rgba(255,215,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 1,
  },

  divider: {
    width: "60%",
    alignSelf: "center",
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },

  list: {
    paddingBottom: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  leftCol: {
    alignItems: "center",
    marginRight: 14,
    width: 52,
  },

  rowIndex: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },

  badge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  midCol: {
    flex: 1,
  },

  scoreLine: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: "600",
    marginBottom: 4,
  },

  scoreNum: {
    fontWeight: "900",
    color: Colors.gold,
  },

  handText: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right",
    marginLeft: 8,
    maxWidth: 70,
  },

  separator: {
    height: 8,
  },

  emptyText: {
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },

  errorBox: {
    backgroundColor: "#2a0e0e",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#5a1c1c",
    marginTop: 20,
  },

  errorTitle: {
    color: "#ff5555",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
  },

  errorMsg: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  backBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },

  backBtnText: {
    color: Colors.goldDim,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
