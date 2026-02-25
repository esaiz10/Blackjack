import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { gameStyles } from "../styles/GameStyles";
import { makeNewDeck, shuffleDeck, deal } from "../components/deck";
import { cardImages } from "../components/cardImages";
import { getDealerDecision } from "../components/aiPlayer";
import { auth, db } from "../firebaseConfig";

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
  try {
    await addDoc(collection(db, "games"), {
      userId: user.uid,
      result,                          // 'win' | 'loss' | 'push' | 'bust'
      playerScore: getScore(playerHand),
      dealerScore: getScore(dealerHand),
      playerHand,
      dealerHand,
      playedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("saveGame failed:", e.message);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

// phase: 'player' → 'dealer' → 'done'

export default function GameScreen({ onExitToWelcome }) {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [phase, setPhase] = useState("player");
  const [result, setResult] = useState(null); // 'win' | 'loss' | 'push' | 'bust'

  // ── Scoring ───────────────────────────────────────────────────────────────

  const scoreHand = (hand) => {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      const v = card.slice(0, -1);
      if (v === "A") { total += 11; aces++; }
      else if (["K", "Q", "J"].includes(v)) total += 10;
      else total += Number(v);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    const soft = aces > 0 && total <= 21;
    return { total, soft };
  };

  const getScore = (hand) => scoreHand(hand).total;

  const scoreLabel = (hand, hideSecond = false) => {
    if (!hand.length) return "—";
    const visibleHand = hideSecond ? [hand[0]] : hand;
    const { total, soft } = scoreHand(visibleHand);
    return soft ? `${total} (soft)` : `${total}`;
  };

  // ── Deck helper ───────────────────────────────────────────────────────────

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

    setPlayerHand(p);
    setDealerHand(dlr);
    setDeck(d);
    setPhase("player");
    setResult(null);
  };

  useEffect(() => { startGame(); }, []);

  // ── AI Dealer auto-play ───────────────────────────────────────────────────
  // The dealer uses basic strategy, looking at the player's face-up card.
  // Re-runs every time dealerHand changes while phase is 'dealer'.

  useEffect(() => {
    if (phase !== "dealer" || dealerHand.length === 0 || playerHand.length === 0) return;

    // Dealer busted — resolve immediately
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
        // Dealer stands — resolve
        const dealerScore = getScore(dealerHand);
        const playerScore = getScore(playerHand);
        let res;
        if (dealerScore > playerScore) res = "loss";
        else if (playerScore > dealerScore) res = "win";
        else res = "push";
        setResult(res);
        if (res === "win") recordResult("win");
        else if (res === "loss") recordResult("loss");
        saveGame(res, playerHand, dealerHand, getScore);
        setPhase("done");
      } else {
        // hit or double — dealer draws one card
        const { card, deck: newDeck } = drawCard(deck);
        const next = [...dealerHand, card];
        setDealerHand(next);
        setDeck(newDeck);
        // effect re-runs with new dealerHand
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [dealerHand, phase, deck, playerHand]);

  // ── Player actions ────────────────────────────────────────────────────────

  const handleHit = () => {
    if (phase !== "player") return;
    const { card, deck: newDeck } = drawCard(deck);
    const next = [...playerHand, card];
    setPlayerHand(next);
    setDeck(newDeck);
    if (getScore(next) > 21) {
      setResult("bust");
      recordResult("loss");
      saveGame("bust", next, dealerHand, getScore);
      setPhase("done");
    }
  };

  const handleStand = () => {
    if (phase !== "player") return;
    setPhase("dealer");
  };

  const handleDoubleDown = () => {
    if (phase !== "player" || playerHand.length !== 2) return;
    const { card, deck: newDeck } = drawCard(deck);
    const next = [...playerHand, card];
    setPlayerHand(next);
    setDeck(newDeck);
    if (getScore(next) > 21) {
      setResult("bust");
      recordResult("loss");
      saveGame("bust", next, dealerHand, getScore);
      setPhase("done");
      return;
    }
    setPhase("dealer");
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const safeImage = (code) => cardImages[code];
  const hideHole = phase === "player";

  const RESULT_COLOR = { win: "#4cff80", loss: "#ff5555", push: "#FFD700", bust: "#ff5555" };
  const RESULT_MSG = {
    win: "You win!",
    loss: "Dealer wins.",
    push: "Push — Tie!",
    bust: "Busted!",
  };

  const canAct = phase === "player";

  return (
    <SafeAreaView style={gameStyles.container}>
      <ScrollView
        contentContainerStyle={gameStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={gameStyles.title}>Blackjack</Text>

        {/* Phase indicator */}
        {phase !== "done" && (
          <Text style={gameStyles.phaseText}>
            {phase === "player" ? "Your turn" : "Dealer is playing…"}
          </Text>
        )}

        {/* ── DEALER ──────────────────────────────────────────────────── */}
        <View style={gameStyles.divider} />
        <Text style={gameStyles.sectionLabel}>Dealer (AI)</Text>
        <Text style={gameStyles.scoreText}>
          Score: {scoreLabel(dealerHand, hideHole)}
        </Text>
        <View style={gameStyles.handRow}>
          {dealerHand.map((c, idx) =>
            hideHole && idx === 1 ? (
              <View key={`d-back-${idx}`} style={gameStyles.cardBack}>
                <View style={gameStyles.cardBackInner} />
              </View>
            ) : (
              <Image
                key={`d-${c}-${idx}`}
                source={safeImage(c)}
                style={gameStyles.cardImage}
              />
            )
          )}
        </View>

        {/* ── PLAYER ──────────────────────────────────────────────────── */}
        <View style={gameStyles.divider} />
        <Text style={gameStyles.sectionLabel}>You</Text>
        <Text style={gameStyles.scoreText}>Score: {scoreLabel(playerHand)}</Text>
        <View style={gameStyles.handRow}>
          {playerHand.map((c, idx) => (
            <Image
              key={`p-${c}-${idx}`}
              source={safeImage(c)}
              style={gameStyles.cardImage}
            />
          ))}
        </View>

        {/* Result */}
        {result ? (
          <Text style={[gameStyles.message, { color: RESULT_COLOR[result] }]}>
            {RESULT_MSG[result]}
          </Text>
        ) : null}

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <View style={gameStyles.buttonRow}>
          <Pressable
            style={[gameStyles.button, !canAct && gameStyles.buttonDisabled]}
            onPress={handleHit}
            disabled={!canAct}
          >
            <Text style={gameStyles.buttonText}>Hit</Text>
          </Pressable>

          <Pressable
            style={[gameStyles.button, !canAct && gameStyles.buttonDisabled]}
            onPress={handleStand}
            disabled={!canAct}
          >
            <Text style={gameStyles.buttonText}>Stand</Text>
          </Pressable>

          <Pressable
            style={[
              gameStyles.button,
              gameStyles.buttonGold,
              (!canAct || playerHand.length !== 2) && gameStyles.buttonDisabled,
            ]}
            onPress={handleDoubleDown}
            disabled={!canAct || playerHand.length !== 2}
          >
            <Text style={gameStyles.buttonText}>Double</Text>
          </Pressable>
        </View>

        <View style={gameStyles.divider} />

        <Pressable style={gameStyles.button} onPress={startGame}>
          <Text style={gameStyles.buttonText}>New Game</Text>
        </Pressable>

        <Pressable
          style={[gameStyles.button, { marginTop: 6 }]}
          onPress={() => onExitToWelcome && onExitToWelcome()}
        >
          <Text style={gameStyles.buttonText}>← Menu</Text>
        </Pressable>

        <Pressable
          style={[gameStyles.button, gameStyles.buttonDanger, { marginTop: 6 }]}
          onPress={() => signOut(auth)}
        >
          <Text style={gameStyles.buttonText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
