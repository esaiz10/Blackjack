import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { gameStyles } from "../styles/GameStyles";
import { makeNewDeck, shuffleDeck, deal } from "../components/deck";
import { cardImages } from "../components/cardImages";
import { getDealerDecision } from "../components/aiPlayer";
import { auth, db } from "../firebaseConfig";
import { Colors } from "../styles/theme";

// ── Stats (AsyncStorage) ──────────────────────────────────────────────────────

const STATS_KEY = "blackjack_stats_v1";

async function recordResult(result) {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { wins: 0, losses: 0 };
    if (result === "win") stats.wins += 1;
    if (result === "loss") stats.losses += 1;
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("recordResult failed:", e);
  }
}

// ── Game history (Firestore) ──────────────────────────────────────────────────

async function saveGame(result, playerHand, dealerHand, getScore) {
  const user = auth.currentUser;
  if (!user) return;
  if (!result || !Array.isArray(playerHand) || playerHand.length === 0
               || !Array.isArray(dealerHand) || dealerHand.length === 0) {
    console.warn("saveGame: skipping save — incomplete hand data", { result, playerHand, dealerHand });
    return;
  }
  try {
    await addDoc(collection(db, "games"), {
      userId:      user.uid,
      gameType:    "blackjack",
      result,
      playerScore: getScore(playerHand),
      dealerScore: getScore(dealerHand),
      playerHand,
      dealerHand,
      playedAt:    serverTimestamp(),
    });
  } catch (e) {
    console.error("saveGame failed:", e.message);
  }
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreHand(hand) {
  let total = 0, aces = 0;
  for (const card of hand) {
    const v = card.slice(0, -1);
    if (v === "A") { total += 11; aces++; }
    else if (["K", "Q", "J"].includes(v)) total += 10;
    else total += Number(v);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 && total <= 21 };
}

function getScore(hand) { return scoreHand(hand).total; }

function scoreLabel(hand, hideSecond = false) {
  if (!hand.length) return "—";
  const visible = hideSecond ? [hand[0]] : hand;
  const { total, soft } = scoreHand(visible);
  return soft ? `${total}` : `${total}`;
}

function isSoftHand(hand, hideSecond = false) {
  const visible = hideSecond ? [hand[0]] : hand;
  return scoreHand(visible).soft;
}

// ── Result config ─────────────────────────────────────────────────────────────

const RESULT_CFG = {
  win:  { label: "You Win!",       color: "#4cff80", bg: "rgba(20,120,50,0.25)", border: "#4cff80" },
  loss: { label: "Dealer Wins",    color: "#ff5555", bg: "rgba(120,20,20,0.25)", border: "#ff5555" },
  push: { label: "Push — Tie",     color: "#FFD700", bg: "rgba(120,100,0,0.25)",  border: "#FFD700" },
  bust: { label: "Bust!",          color: "#ff5555", bg: "rgba(120,20,20,0.25)", border: "#ff5555" },
};

// ── ScoreChip ─────────────────────────────────────────────────────────────────

function ScoreChip({ score, soft, hidden }) {
  if (hidden) {
    return (
      <View style={[chip.wrap, { borderColor: Colors.border }]}>
        <Text style={chip.val}>?</Text>
      </View>
    );
  }
  const bust = score > 21;
  const bj   = score === 21;
  const color = bust ? Colors.redLight : bj ? Colors.gold : Colors.white;
  return (
    <View style={[chip.wrap, { borderColor: bust ? Colors.redLight : bj ? Colors.gold : Colors.border }]}>
      <Text style={[chip.val, { color }]}>{score}</Text>
      {soft && !bust && <Text style={chip.soft}>soft</Text>}
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.bgCard,
    alignItems: "center",
  },
  val:  { fontSize: 22, fontWeight: "900", color: Colors.white, lineHeight: 26 },
  soft: { fontSize: 9,  fontWeight: "700", color: Colors.goldDim, letterSpacing: 1, textTransform: "uppercase", marginTop: -2 },
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameScreen({ onExitToWelcome }) {
  const [deck,       setDeck]       = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [phase,      setPhase]      = useState("player"); // 'player' | 'dealer' | 'done'
  const [result,     setResult]     = useState(null);

  const drawCard = (currentDeck) => {
    const r = deal(currentDeck, 1);
    return { card: r.hand[0], deck: r.deck };
  };

  // ── Start / reset ─────────────────────────────────────────────────────────

  const startGame = () => {
    let d = shuffleDeck(makeNewDeck());
    const p = [], dlr = [];
    for (let i = 0; i < 2; i++) {
      let r;
      r = drawCard(d); d = r.deck; p.push(r.card);
      r = drawCard(d); d = r.deck; dlr.push(r.card);
    }

    const pScore = getScore(p);
    const dScore = getScore(dlr);
    const pBJ = pScore === 21 && p.length === 2;
    const dBJ = dScore === 21 && dlr.length === 2;

    setPlayerHand(p);
    setDealerHand(dlr);
    setDeck(d);
    setResult(null);

    if (pBJ && dBJ) {
      setPhase("done"); setResult("push");
      saveGame("push", p, dlr, getScore);
    } else if (pBJ) {
      setPhase("done"); setResult("win");
      recordResult("win"); saveGame("win", p, dlr, getScore);
    } else if (dBJ) {
      setPhase("done"); setResult("loss");
      recordResult("loss"); saveGame("loss", p, dlr, getScore);
    } else {
      setPhase("player");
    }
  };

  useEffect(() => { startGame(); }, []);

  // ── AI Dealer auto-play ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "dealer" || !dealerHand.length || !playerHand.length) return;

    if (getScore(dealerHand) > 21) {
      setResult("win");
      recordResult("win");
      saveGame("win", playerHand, dealerHand, getScore);
      setPhase("done");
      return;
    }

    const decision = getDealerDecision(dealerHand, playerHand);
    const timer = setTimeout(() => {
      if (decision === "stand") {
        const ds = getScore(dealerHand), ps = getScore(playerHand);
        const res = ds > ps ? "loss" : ps > ds ? "win" : "push";
        setResult(res);
        if (res === "win")  recordResult("win");
        if (res === "loss") recordResult("loss");
        saveGame(res, playerHand, dealerHand, getScore);
        setPhase("done");
      } else {
        const { card, deck: nd } = drawCard(deck);
        setDealerHand(prev => [...prev, card]);
        setDeck(nd);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [dealerHand, phase, deck, playerHand]);

  // ── Player actions ────────────────────────────────────────────────────────

  const handleHit = () => {
    if (phase !== "player") return;
    const { card, deck: nd } = drawCard(deck);
    const next = [...playerHand, card];
    setPlayerHand(next);
    setDeck(nd);
    if (getScore(next) > 21) {
      setResult("bust"); recordResult("loss");
      saveGame("bust", next, dealerHand, getScore);
      setPhase("done");
    }
  };

  const handleStand = () => {
    if (phase !== "player") return;
    setPhase("dealer");
  };

  const handleDouble = () => {
    if (phase !== "player" || playerHand.length !== 2) return;
    const { card, deck: nd } = drawCard(deck);
    const next = [...playerHand, card];
    setPlayerHand(next);
    setDeck(nd);
    if (getScore(next) > 21) {
      setResult("bust"); recordResult("loss");
      saveGame("bust", next, dealerHand, getScore);
      setPhase("done");
    } else {
      setPhase("dealer");
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const hideHole  = phase === "player";
  const canAct    = phase === "player";
  const isDone    = phase === "done";
  const cfg       = result ? RESULT_CFG[result] : null;

  const pScore = playerHand.length ? getScore(playerHand) : 0;
  const pSoft  = playerHand.length ? isSoftHand(playerHand) : false;
  const dScore = dealerHand.length ? (hideHole ? getScore([dealerHand[0]]) : getScore(dealerHand)) : 0;
  const dSoft  = dealerHand.length ? isSoftHand(dealerHand, hideHole) : false;

  return (
    <SafeAreaView style={gameStyles.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>Blackjack</Text>
          {!isDone && (
            <View style={s.phasePill}>
              <Text style={s.phaseText}>
                {phase === "player" ? "Your Turn" : "Dealer Playing…"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Dealer panel ── */}
        <View style={[s.panel, phase === "dealer" && s.panelActive]}>
          <View style={s.panelHeader}>
            <Text style={s.panelLabel}>Dealer</Text>
            <ScoreChip score={dScore} soft={dSoft} hidden={hideHole && dealerHand.length > 1} />
          </View>
          <View style={gameStyles.handRow}>
            {dealerHand.map((c, idx) =>
              hideHole && idx === 1 ? (
                <View key={`d-back-${idx}`} style={gameStyles.cardBack}>
                  <View style={gameStyles.cardBackInner} />
                </View>
              ) : (
                <Image key={`d-${c}-${idx}`} source={cardImages[c]} style={gameStyles.cardImage} />
              )
            )}
          </View>
        </View>

        {/* ── Result banner ── */}
        {cfg && (
          <View style={[s.resultBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[s.resultText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        )}

        {/* ── Player panel ── */}
        <View style={[s.panel, phase === "player" && s.panelActive]}>
          <View style={s.panelHeader}>
            <Text style={s.panelLabel}>You</Text>
            <ScoreChip score={pScore} soft={pSoft} />
          </View>
          <View style={gameStyles.handRow}>
            {playerHand.map((c, idx) => (
              <Image key={`p-${c}-${idx}`} source={cardImages[c]} style={gameStyles.cardImage} />
            ))}
          </View>
        </View>

        {/* ── Action buttons ── */}
        {canAct && (
          <View style={s.actionRow}>
            <ActionBtn label="Hit"    onPress={handleHit} />
            <ActionBtn label="Stand"  onPress={handleStand} />
            <ActionBtn
              label="2×"
              sub="Double"
              onPress={handleDouble}
              disabled={playerHand.length !== 2}
              gold
            />
          </View>
        )}

        {/* ── Nav row ── */}
        <View style={s.navRow}>
          <Pressable style={s.navBtn} onPress={startGame}>
            <Text style={s.navBtnText}>New Game</Text>
          </Pressable>
          <Pressable style={s.navBtn} onPress={() => onExitToWelcome?.()}>
            <Text style={s.navBtnText}>← Menu</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

function ActionBtn({ label, sub, onPress, disabled, gold }) {
  return (
    <Pressable
      style={({ pressed }) => [
        ab.btn,
        gold && ab.gold,
        disabled && ab.disabled,
        pressed && !disabled && ab.pressed,
      ]}
      onPress={onPress}
      disabled={!!disabled}
    >
      <Text style={ab.label}>{label}</Text>
      {sub ? <Text style={ab.sub}>{sub}</Text> : null}
    </Pressable>
  );
}

const ab = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: Colors.green,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  gold:     { backgroundColor: Colors.goldDeep, borderColor: Colors.goldDim },
  disabled: { opacity: 0.25 },
  pressed:  { opacity: 0.8 },
  label:    { color: Colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  sub:      { color: Colors.goldDim, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
});

// ── Local styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
  },

  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 4,
    textShadowColor: "rgba(255,215,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 8,
  },

  phasePill: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  phaseText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.goldDim,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Panels ────────────────────────────────────────────────────────────────
  panel: {
    width: "100%",
    backgroundColor: Colors.felt,
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  panelActive: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },

  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  panelLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.goldDim,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },

  // ── Result ────────────────────────────────────────────────────────────────
  resultBanner: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginVertical: 6,
    borderWidth: 1.5,
  },

  resultText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
    marginTop: 8,
  },

  navRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 14,
  },

  navBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  navBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
