import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";

import { gameStyles } from "../styles/GameStyles";
import { makeNewDeck, shuffleDeck, deal } from "../components/deck";
import { cardImages } from "../components/cardImages";
import { getDealerDecision } from "../components/aiPlayer";
import { auth, db } from "../firebaseConfig";
import { Colors } from "../styles/theme";
import BackgroundLayers from "../components/BackgroundLayers";
import FadeInView from "../components/FadeInView";

// ── Stats (Firestore) ─────────────────────────────────────────────────────────

async function recordResult(result) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const ref = doc(db, "stats", user.uid);
    const update = {};
    if (result === "win")  update["blackjack.wins"]   = increment(1);
    if (result === "loss") update["blackjack.losses"]  = increment(1);
    await setDoc(ref, update, { merge: true });
  } catch (e) {
    console.error("recordResult failed:", e);
  }
}

// ── Game history (Firestore) ──────────────────────────────────────────────────

async function saveGame(result, playerHand, dealerHand, getScore, meta = {}) {
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
      bet:         meta.bet ?? null,
      handIndex:   meta.handIndex ?? null,
      isSplit:     meta.isSplit ?? false,
      payout:      meta.payout ?? null,
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
  const [dealerHand, setDealerHand] = useState([]);
  const [phase,      setPhase]      = useState("betting"); // 'betting' | 'insurance' | 'player' | 'dealer' | 'done'
  const [results,    setResults]    = useState([]); // per-hand results
  const [hands,      setHands]      = useState([]); // [{ cards, bet, doubled, isSplit, stood }]
  const [activeHand, setActiveHand] = useState(0);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [dealerDelay, setDealerDelay] = useState(700);
  const [bankroll, setBankroll] = useState(1000);
  const [bet, setBet] = useState(25);

  const drawCard = (currentDeck) => {
    const r = deal(currentDeck, 1);
    return { card: r.hand[0], deck: r.deck };
  };

  // ── Start / reset ─────────────────────────────────────────────────────────

  const resetToBetting = () => {
    setPhase("betting");
    setDealerHand([]);
    setHands([]);
    setResults([]);
    setActiveHand(0);
    setInsuranceBet(0);
  };

  const startRound = () => {
    if (bet < 10) {
      Alert.alert("Bet too low", "Minimum bet is $10.");
      return;
    }
    if (bet > bankroll) {
      Alert.alert("Not enough chips", "Reduce your bet or add chips.");
      return;
    }

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

    setBankroll(b => b - bet);
    setHands([{ cards: p, bet, doubled: false, isSplit: false, stood: false }]);
    setDealerHand(dlr);
    setDeck(d);
    setResults([]);
    setActiveHand(0);
    setInsuranceBet(0);

    if (dlr[0]?.startsWith("A")) {
      // Offer insurance before checking dealer blackjack
      setPhase("insurance");
      return;
    }

    if (pBJ && dBJ) {
      setResults(["push"]);
      setPhase("done");
      setBankroll(b => b + bet); // return bet
      saveGame("push", p, dlr, getScore, { bet, payout: 0 });
    } else if (pBJ) {
      setResults(["win"]);
      setPhase("done");
      setBankroll(b => b + bet * 2.5); // 3:2 payout + return
      recordResult("win");
      saveGame("win", p, dlr, getScore, { bet, payout: bet * 1.5 });
    } else if (dBJ) {
      setResults(["loss"]);
      setPhase("done");
      recordResult("loss");
      saveGame("loss", p, dlr, getScore, { bet, payout: -bet });
    } else {
      setPhase("player");
    }
  };

  useEffect(() => { resetToBetting(); }, []);

  const markHandResult = (idx, res) => {
    setResults(prev => {
      const next = [...prev];
      next[idx] = res;
      return next;
    });
  };

  const canSplit = () => {
    if (phase !== "player") return false;
    if (hands.length !== 1) return false;
    const h = hands[0];
    if (!h || h.cards.length !== 2) return false;
    if (!sameRank(h.cards[0], h.cards[1])) return false;
    return bankroll >= h.bet;
  };

  const handleSplit = () => {
    if (!canSplit()) return;
    let d = deck;
    const base = hands[0];
    const left = base.cards[0];
    const right = base.cards[1];
    const r1 = drawCard(d); d = r1.deck;
    const r2 = drawCard(d); d = r2.deck;

    setBankroll(b => b - base.bet);
    setDeck(d);
    setHands([
      { cards: [left, r1.card], bet: base.bet, doubled: false, isSplit: true, stood: false },
      { cards: [right, r2.card], bet: base.bet, doubled: false, isSplit: true, stood: false },
    ]);
    setResults([]);
    setActiveHand(0);
  };

  const advanceAfterHand = () => {
    const nextIndex = hands.findIndex((h, i) => i > activeHand && !h.stood && results[i] !== "bust");
    if (nextIndex !== -1) {
      setActiveHand(nextIndex);
      return;
    }
    const anyPlayable = hands.some((h, i) => results[i] !== "bust");
    setPhase(anyPlayable ? "dealer" : "done");
  };

  const settlePayout = (hand, res, dealerCards) => {
    const betAmt = hand.bet;
    let payout = 0;

    if (res === "push") {
      payout = 0;
      setBankroll(b => b + betAmt);
    } else if (res === "win") {
      payout = betAmt;
      setBankroll(b => b + betAmt * 2);
      recordResult("win");
    } else if (res === "loss" || res === "bust") {
      payout = -betAmt;
      recordResult("loss");
    }

    saveGame(res, hand.cards, dealerCards, getScore, {
      bet: betAmt,
      handIndex: hands.indexOf(hand),
      isSplit: hand.isSplit,
      payout,
    });
  };

  const resolveFinalResults = () => {
    const ds = getScore(dealerHand);
    const nextResults = [...results];

    hands.forEach((hand, i) => {
      if (nextResults[i]) return;
      const ps = getScore(hand.cards);
      let res = "push";
      if (ps > 21) res = "bust";
      else if (ds > 21) res = "win";
      else if (ps > ds) res = "win";
      else if (ps < ds) res = "loss";
      nextResults[i] = res;
      settlePayout(hand, res, dealerHand);
    });

    setResults(nextResults);
    setPhase("done");
  };

  const resolveInsurance = (take) => {
    const insuranceAmt = Math.min(bet / 2, bankroll);
    if (take && insuranceAmt > 0) {
      setInsuranceBet(insuranceAmt);
      setBankroll(b => b - insuranceAmt);
    } else {
      setInsuranceBet(0);
    }

    const pCards = hands[0]?.cards || [];
    const pBJ = getScore(pCards) === 21 && pCards.length === 2;
    const dBJ = getScore(dealerHand) === 21 && dealerHand.length === 2;

    if (dBJ) {
      if (take && insuranceAmt > 0) {
        setBankroll(b => b + insuranceAmt * 3);
      }
      if (pBJ) {
        setResults(["push"]);
        setBankroll(b => b + bet);
        saveGame("push", pCards, dealerHand, getScore, { bet, payout: 0 });
      } else {
        setResults(["loss"]);
        recordResult("loss");
        saveGame("loss", pCards, dealerHand, getScore, { bet, payout: -bet });
      }
      setPhase("done");
      return;
    }

    if (pBJ) {
      setResults(["win"]);
      setBankroll(b => b + bet * 2.5);
      recordResult("win");
      saveGame("win", pCards, dealerHand, getScore, { bet, payout: bet * 1.5 });
      setPhase("done");
      return;
    }

    setPhase("player");
  };

  // ── AI Dealer auto-play ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "dealer" || !dealerHand.length || hands.length === 0) return;

    if (getScore(dealerHand) > 21) {
      resolveFinalResults();
      return;
    }

    const bestHand = hands.reduce((best, h) => {
      const s = getScore(h.cards);
      if (s <= 21 && s > getScore(best.cards)) return h;
      return best;
    }, hands[0]);

    const decision = getDealerDecision(dealerHand, bestHand.cards);
    const timer = setTimeout(() => {
      if (decision === "stand") {
        resolveFinalResults();
      } else {
        const { card, deck: nd } = drawCard(deck);
        setDealerHand(prev => [...prev, card]);
        setDeck(nd);
      }
    }, dealerDelay);

    return () => clearTimeout(timer);
  }, [dealerHand, phase, deck, hands, dealerDelay]);

  // ── Player actions ────────────────────────────────────────────────────────

  const handleHit = () => {
    if (phase !== "player") return;
    const { card, deck: nd } = drawCard(deck);
    setDeck(nd);
    setHands(prev => {
      const next = [...prev];
      const hand = next[activeHand];
      const updated = { ...hand, cards: [...hand.cards, card] };
      next[activeHand] = updated;
      return next;
    });

    const nextCards = [...hands[activeHand].cards, card];
    if (getScore(nextCards) > 21) {
      setHands(prev => {
        const next = [...prev];
        next[activeHand] = { ...next[activeHand], stood: true };
        return next;
      });
      markHandResult(activeHand, "bust");
      recordResult("loss");
      saveGame("bust", nextCards, dealerHand, getScore, { bet: hands[activeHand].bet, handIndex: activeHand, isSplit: hands[activeHand].isSplit, payout: -hands[activeHand].bet });
      advanceAfterHand();
    }
  };

  const handleStand = () => {
    if (phase !== "player") return;
    setHands(prev => {
      const next = [...prev];
      next[activeHand] = { ...next[activeHand], stood: true };
      return next;
    });
    advanceAfterHand();
  };

  const handleDouble = () => {
    if (phase !== "player" || hands[activeHand]?.cards.length !== 2) return;
    if (bankroll < hands[activeHand].bet) return;
    const { card, deck: nd } = drawCard(deck);
    setDeck(nd);
    setBankroll(b => b - hands[activeHand].bet);
    const nextCards = [...hands[activeHand].cards, card];
    setHands(prev => {
      const next = [...prev];
      const hand = next[activeHand];
      next[activeHand] = { ...hand, cards: nextCards, bet: hand.bet * 2, doubled: true };
      return next;
    });

    if (getScore(nextCards) > 21) {
      setHands(prev => {
        const next = [...prev];
        next[activeHand] = { ...next[activeHand], stood: true };
        return next;
      });
      markHandResult(activeHand, "bust");
      recordResult("loss");
      saveGame("bust", nextCards, dealerHand, getScore, { bet: hands[activeHand].bet * 2, handIndex: activeHand, isSplit: hands[activeHand].isSplit, payout: -hands[activeHand].bet * 2 });
    }

    advanceAfterHand();
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const hideHole  = phase === "player" || phase === "insurance";
  const canAct    = phase === "player";
  const isDone    = phase === "done";
  const cfg       = results.length === 1 ? RESULT_CFG[results[0]] : null;

  const activeCards = hands[activeHand]?.cards || [];
  const pScore = activeCards.length ? getScore(activeCards) : 0;
  const pSoft  = activeCards.length ? isSoftHand(activeCards) : false;
  const dScore = dealerHand.length ? (hideHole ? getScore([dealerHand[0]]) : getScore(dealerHand)) : 0;
  const dSoft  = dealerHand.length ? isSoftHand(dealerHand, hideHole) : false;

  return (
    <SafeAreaView style={[gameStyles.container, { position: "relative" }]}>
      <BackgroundLayers />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <FadeInView style={s.header} delay={0}>
          <Text style={s.title}>Blackjack</Text>
          {!isDone && phase !== "betting" && (
            <View style={s.phasePill}>
              <Text style={s.phaseText}>
                {phase === "player" ? `Your Turn${hands.length > 1 ? ` • Hand ${activeHand + 1}` : ""}` : "Dealer Playing…"}
              </Text>
            </View>
          )}
        </FadeInView>

        {/* ── Bankroll / Bet / Speed ── */}
        <View style={s.bankRow}>
          <View style={s.bankCard}>
            <Text style={s.bankLabel}>Bankroll</Text>
            <Text style={s.bankValue}>${bankroll}</Text>
          </View>
          <View style={s.bankCard}>
            <Text style={s.bankLabel}>Bet</Text>
            <Text style={s.bankValue}>${bet}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.speedBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setDealerDelay(d => (d === 700 ? 250 : 700))}
          >
            <Text style={s.speedText}>{dealerDelay === 700 ? "Normal" : "Fast"}</Text>
          </Pressable>
        </View>

        {(phase === "betting" || phase === "done") && (
          <View style={s.betPanel}>
            <Text style={s.betTitle}>Place Your Bet</Text>
            <View style={s.betRow}>
              <BetBtn label="-10" onPress={() => setBet(b => Math.max(10, b - 10))} />
              <BetBtn label="+10" onPress={() => setBet(b => Math.min(500, Math.min(bankroll, b + 10)))} />
              <BetBtn label="Min" onPress={() => setBet(10)} />
              <BetBtn label="Max" onPress={() => setBet(Math.min(500, bankroll))} />
            </View>
            <View style={s.chipRow}>
              {[10, 25, 50, 100].map(v => (
                <BetBtn
                  key={v}
                  label={`$${v}`}
                  gold
                  onPress={() => setBet(Math.min(500, Math.min(bankroll, v)))}
                />
              ))}
            </View>
            <Pressable style={s.dealBtn} onPress={startRound}>
              <Text style={s.dealText}>Deal</Text>
            </Pressable>
          </View>
        )}

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
        {cfg && results.length === 1 && (
          <View style={[s.resultBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[s.resultText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        )}
        {results.length > 1 && (
          <View style={[s.resultBanner, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: Colors.border }]}>
            <Text style={[s.resultText, { color: Colors.goldDim, fontSize: 18 }]}>
              {results.map((r, i) => `Hand ${i + 1}: ${RESULT_CFG[r]?.label ?? r}`).join(" • ")}
            </Text>
          </View>
        )}

        {/* ── Player panel ── */}
        <View style={[s.panel, phase === "player" && s.panelActive]}>
          <View style={s.panelHeader}>
            <Text style={s.panelLabel}>
              {hands.length > 1 ? `You • Hand ${activeHand + 1}` : "You"}
            </Text>
            <ScoreChip score={pScore} soft={pSoft} />
          </View>
          <View style={gameStyles.handRow}>
            {activeCards.map((c, idx) => (
              <Image key={`p-${c}-${idx}`} source={cardImages[c]} style={gameStyles.cardImage} />
            ))}
          </View>
        </View>

        {/* ── Split hand preview ── */}
        {hands.length > 1 && (
          <View style={s.splitPreview}>
            {hands.map((h, idx) => (
              <View key={`hand-${idx}`} style={[s.splitCard, idx === activeHand && s.splitCardActive]}>
                <Text style={s.splitLabel}>Hand {idx + 1}</Text>
                <Text style={s.splitBet}>Bet ${h.bet}</Text>
                <Text style={s.splitScore}>{getScore(h.cards)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action buttons ── */}
        {canAct && (
          <View style={s.actionRow}>
            <ActionBtn label="Hit"    onPress={handleHit} />
            <ActionBtn label="Stand"  onPress={handleStand} />
            <ActionBtn
              label="2×"
              sub="Double"
              onPress={handleDouble}
              disabled={hands[activeHand]?.cards.length !== 2 || bankroll < hands[activeHand]?.bet}
              gold
            />
            <ActionBtn
              label="Split"
              onPress={handleSplit}
              disabled={!canSplit()}
            />
          </View>
        )}

        {/* ── Insurance ── */}
        {phase === "insurance" && (
          <View style={s.insuranceRow}>
            <Text style={s.insuranceText}>Dealer shows Ace — take insurance?</Text>
            <View style={s.insuranceBtns}>
              <ActionBtn
                label="Insurance"
                sub={`$${Math.min(bet / 2, bankroll)}`}
                onPress={() => resolveInsurance(true)}
                disabled={bankroll < bet / 2}
                gold
              />
              <ActionBtn label="No Thanks" onPress={() => resolveInsurance(false)} />
            </View>
          </View>
        )}

        {/* ── Nav row ── */}
        <View style={s.navRow}>
          <Pressable style={s.navBtn} onPress={resetToBetting}>
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

function BetBtn({ label, onPress, gold }) {
  return (
    <Pressable
      style={({ pressed }) => [bb.btn, gold && bb.gold, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Text style={bb.text}>{label}</Text>
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

  bankRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bankCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bankLabel: { fontSize: 10, color: Colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },
  bankValue: { fontSize: 18, fontWeight: "900", color: Colors.white, marginTop: 2 },
  speedBtn: {
    width: 90,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: { color: Colors.goldDim, fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  betPanel: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  betTitle: { color: Colors.goldDim, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  betRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dealBtn: {
    backgroundColor: Colors.green,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dealText: { color: Colors.white, fontSize: 15, fontWeight: "900", letterSpacing: 1 },

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

  insuranceRow: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  insuranceText: { color: Colors.goldDim, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
  insuranceBtns: { flexDirection: "row", gap: 8 },

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

  splitPreview: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  splitCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  splitCardActive: {
    borderColor: Colors.gold,
  },
  splitLabel: { fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  splitBet: { fontSize: 12, color: Colors.white, fontWeight: "800", marginTop: 2 },
  splitScore: { fontSize: 12, color: Colors.goldDim, marginTop: 2 },
});

const bb = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  gold: { backgroundColor: Colors.goldDeep, borderColor: Colors.goldDim },
  text: { color: Colors.white, fontSize: 12, fontWeight: "800" },
});

// ── Helpers for multi-hand flow ───────────────────────────────────────────────

function sameRank(a, b) {
  if (!a || !b) return false;
  const ra = a.slice(0, -1);
  const rb = b.slice(0, -1);
  return ra === rb;
}
