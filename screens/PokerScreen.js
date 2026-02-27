// screens/PokerScreen.js
// Texas Hold'em Poker — 1 human + 4 AI

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, SafeAreaView,
  StyleSheet, PanResponder, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { gameStyles } from '../styles/GameStyles';
import { makeNewDeck, shuffleDeck, deal } from '../components/deck';
import { cardImages } from '../components/cardImages';
import { evaluateHand, compareHands } from '../components/pokerHandEvaluator';
import { getPokerAiDecision } from '../components/pokerAI';
import { auth, db } from '../firebaseConfig';
import { Colors } from '../styles/theme';

// ── Constants ──────────────────────────────────────────────────────────────────

const STARTING_STACK = 1000;
const SMALL_BLIND    = 10;
const BIG_BLIND      = 20;
const POKER_STATS_KEY = 'poker_stats_v1';
const AI_NAMES        = ['Alex', 'Blake', 'Casey', 'Dana'];

const STREET_LABEL = {
  preflop:  'Pre-Flop',
  flop:     'Flop',
  turn:     'Turn',
  river:    'River',
  showdown: 'Showdown',
  done:     'Hand Over',
};

// ── Pure helpers ───────────────────────────────────────────────────────────────

function updatePlayer(players, id, updates) {
  return players.map(p => p.id === id ? { ...p, ...updates } : p);
}

function makePlayers() {
  return [
    { id: 0, name: 'You',       isHuman: true,  hand: [], stack: STARTING_STACK, streetBet: 0, folded: false, revealed: false, handName: '' },
    { id: 1, name: AI_NAMES[0], isHuman: false, hand: [], stack: STARTING_STACK, streetBet: 0, folded: false, revealed: false, handName: '' },
    { id: 2, name: AI_NAMES[1], isHuman: false, hand: [], stack: STARTING_STACK, streetBet: 0, folded: false, revealed: false, handName: '' },
    { id: 3, name: AI_NAMES[2], isHuman: false, hand: [], stack: STARTING_STACK, streetBet: 0, folded: false, revealed: false, handName: '' },
    { id: 4, name: AI_NAMES[3], isHuman: false, hand: [], stack: STARTING_STACK, streetBet: 0, folded: false, revealed: false, handName: '' },
  ];
}

function snap5(n) { return Math.round(n / 5) * 5; }

function activeBettors(players) {
  return [0, 1, 2, 3, 4].filter(id => {
    const p = players.find(x => x.id === id);
    return p && !p.folded && p.stack > 0;
  });
}

function preflopOrder(players) {
  // Standard order: UTG (2) → HJ (3) → CO (4) → SB (0) → BB (1)
  return [2, 3, 4, 0, 1].filter(id => {
    const p = players.find(x => x.id === id);
    return p && !p.folded && p.stack > 0;
  });
}

function postFlopOrder(players) { return activeBettors(players); }

function toActAfterRaise(raiserId, players) {
  const active = activeBettors(players);
  const idx    = active.indexOf(raiserId);
  if (idx === -1) return active;
  return [...active.slice(idx + 1), ...active.slice(0, idx)];
}

// ── Persistence ────────────────────────────────────────────────────────────────

async function recordPokerResult(result) {
  try {
    const raw   = await AsyncStorage.getItem(POKER_STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { wins: 0, losses: 0, ties: 0 };
    if (result === 'win')       stats.wins   += 1;
    else if (result === 'loss') stats.losses += 1;
    else if (result === 'tie')  stats.ties   += 1;
    await AsyncStorage.setItem(POKER_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('recordPokerResult failed:', e);
  }
}

const VALID_RESULTS = new Set(['win', 'loss', 'tie']);

async function savePokerGame(result, humanStack) {
  const user = auth.currentUser;
  if (!user) return;
  if (!VALID_RESULTS.has(result) || typeof humanStack !== 'number' || humanStack < 0) {
    console.warn('savePokerGame: skipping save — invalid data', { result, humanStack });
    return;
  }
  try {
    await addDoc(collection(db, 'games'), {
      userId:      user.uid,
      gameType:    'poker',
      result,
      playerScore: humanStack,
      dealerScore: null,
      playerHand:  null,
      dealerHand:  null,
      playedAt:    serverTimestamp(),
    });
  } catch (e) {
    console.error('savePokerGame failed:', e);
  }
}

// ── BetSlider ──────────────────────────────────────────────────────────────────

function BetSlider({ min, max, value, onValueChange }) {
  const trackRef  = useRef(null);
  const trackInfo = useRef({ x: 0, width: 300 });
  const handleRef = useRef(null);
  handleRef.current = (pageX) => {
    const { x, width } = trackInfo.current;
    if (width <= 0) return;
    const pct     = Math.max(0, Math.min(1, (pageX - x) / width));
    const raw     = min + pct * (max - min);
    const snapped = snap5(Math.max(min, Math.min(max, raw)));
    onValueChange(snapped);
  };

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: e => handleRef.current(e.nativeEvent.pageX),
      onPanResponderMove:  e => handleRef.current(e.nativeEvent.pageX),
    })
  ).current;

  const safeMax = Math.max(max, min + 1);
  const pct     = ((value - min) / (safeMax - min)) * 100;

  return (
    <View style={sl.wrap}>
      <View
        ref={trackRef}
        style={sl.track}
        onLayout={() => {
          trackRef.current?.measure((_fx, _fy, w, _h, px) => {
            trackInfo.current = { x: px, width: w };
          });
        }}
        {...pr.panHandlers}
      >
        <View style={[sl.fill, { width: `${pct}%` }]} />
        <View style={[sl.knob, { left: `${pct}%` }]} />
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  wrap:  { width: '100%', paddingVertical: 18 },
  track: {
    width: '100%', height: 6,
    backgroundColor: Colors.bgInput,
    borderRadius: 3, borderWidth: 1, borderColor: Colors.border,
  },
  fill: {
    position: 'absolute', left: 0, top: 0,
    height: '100%', backgroundColor: Colors.gold, borderRadius: 3,
  },
  knob: {
    position: 'absolute', top: -12,
    width: 28, height: 28, marginLeft: -14,
    borderRadius: 14, backgroundColor: Colors.gold,
    borderWidth: 2.5, borderColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55, shadowRadius: 5, elevation: 5,
  },
});

// ── AiSeat ─────────────────────────────────────────────────────────────────────

function AiSeat({ player, isActive, lastAction, compact }) {
  const { name, stack, streetBet, folded, revealed, hand, handName } = player;
  const cardSize = compact ? { width: 22, height: 32 } : { width: 28, height: 42 };
  const cardInner = compact ? { width: 16, height: 26 } : { width: 20, height: 34 };

  return (
    <View style={[
      as.box,
      isActive && as.glow,
      folded && as.faded,
      compact && as.compact,
    ]}>
      {/* Name row */}
      <View style={as.nameRow}>
        <Text style={[as.name, compact && as.nameCompact]} numberOfLines={1}>{name}</Text>
        {folded && <Text style={as.foldTag}>FOLD</Text>}
      </View>

      {/* Cards */}
      <View style={as.cardRow}>
        {hand.map((card, i) =>
          revealed && !folded && cardImages[card]
            ? (
              <Image
                key={i}
                source={cardImages[card]}
                style={[as.card, cardSize]}
              />
            ) : (
              <View key={i} style={[as.cardBack, cardSize, folded && as.cardFolded]}>
                {!folded && <View style={[as.cardBackInner, cardInner]} />}
              </View>
            )
        )}
      </View>

      {/* Hand name (showdown) */}
      {revealed && handName && !folded
        ? <Text style={as.handName} numberOfLines={1}>{handName}</Text>
        : null}

      {/* Stack + bet */}
      <View style={as.footRow}>
        <Text style={[as.stack, compact && as.stackCompact]}>{stack}</Text>
        {streetBet > 0 && <Text style={as.bet}>{streetBet}</Text>}
      </View>

      {/* Status */}
      {isActive
        ? <Text style={as.thinking}>thinking…</Text>
        : lastAction && !folded
          ? <Text style={as.lastAction} numberOfLines={1}>{lastAction}</Text>
          : null}
    </View>
  );
}

const as = StyleSheet.create({
  box: {
    width: '48%',
    backgroundColor: Colors.bgCard,
    borderRadius: 12, padding: 10, margin: '1%',
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  compact: { padding: 7, borderRadius: 10 },
  glow: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
  },
  faded: { opacity: 0.35 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name:       { color: Colors.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  nameCompact: { fontSize: 11 },
  foldTag: {
    fontSize: 9, fontWeight: '800', color: Colors.redLight,
    letterSpacing: 1, borderWidth: 1, borderColor: Colors.red,
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },

  cardRow: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  card: { resizeMode: 'contain', backgroundColor: Colors.white, borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
  cardBack: {
    backgroundColor: Colors.cardBlue, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBackInner: { borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Colors.cardBlueIn },
  cardFolded: { backgroundColor: Colors.redDark, borderColor: Colors.red, opacity: 0.6 },

  handName: { color: Colors.goldDim, fontSize: 9, fontWeight: '700', textAlign: 'center', marginBottom: 4, letterSpacing: 0.3 },

  footRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stack:       { color: Colors.textMuted, fontSize: 12, fontWeight: '800' },
  stackCompact: { fontSize: 11 },
  bet: {
    color: Colors.gold, fontSize: 10, fontWeight: '700',
    backgroundColor: Colors.goldDeep, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },

  thinking:   { color: Colors.goldDim, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 },
  lastAction: { color: Colors.textFaint, fontSize: 9, fontWeight: '600', marginTop: 3, letterSpacing: 0.3 },
});

// ── PokerScreen ────────────────────────────────────────────────────────────────

export default function PokerScreen({ onExitToWelcome }) {
  const [players,      setPlayers]      = useState(makePlayers);
  const [community,    setCommunity]    = useState([]);
  const [deck,         setDeck]         = useState([]);
  const [phase,        setPhase]        = useState('preflop');
  const [pot,          setPot]          = useState(0);
  const [streetMaxBet, setStreetMaxBet] = useState(0);
  const [toAct,        setToAct]        = useState([]);
  const [aiThinking,   setAiThinking]   = useState(false);
  const [aiThinkingId, setAiThinkingId] = useState(null);
  const [betValue,     setBetValue]     = useState(BIG_BLIND * 3);
  const [result,       setResult]       = useState(null);
  const [statusMsg,    setStatusMsg]    = useState('');
  const [sessionNet,   setSessionNet]   = useState(0);
  const [lastAction,   setLastAction]   = useState({}); // { [playerId]: string }

  const handStartStackRef  = useRef(STARTING_STACK);
  const processNextTurnRef  = useRef(null);
  const scheduleAiActionRef = useRef(null);
  const advanceStreetRef    = useRef(null);
  const startHandRef        = useRef(null);
  const aiTimerRef          = useRef(null);   // tracks the pending AI setTimeout
  const handIdRef           = useRef(0);      // incremented each new hand; guards stale callbacks

  const RESULT_CFG = {
    win:  { label: 'You Win!',    color: '#4cff80', bg: 'rgba(20,120,50,0.2)',  border: '#4cff80' },
    loss: { label: 'You Lose',    color: '#ff5555', bg: 'rgba(120,20,20,0.2)',  border: '#ff5555' },
    tie:  { label: 'Split Pot',   color: Colors.gold, bg: 'rgba(120,100,0,0.2)', border: Colors.gold },
  };

  // ── Showdown ─────────────────────────────────────────────────────────────────

  function resolveShowdown(ps, comm, currentPot) {
    const active = ps.filter(p => !p.folded);
    if (active.length === 0) return;

    let updated = ps.map(p => {
      if (p.folded) return p;
      const ev = evaluateHand([...p.hand, ...comm]);
      return { ...p, revealed: true, handName: ev.label };
    });

    let best = null;
    for (const p of updated.filter(x => !x.folded)) {
      if (!best || compareHands([...p.hand, ...comm], [...best.hand, ...comm]) > 0) best = p;
    }

    const winners = updated.filter(p =>
      !p.folded && best && compareHands([...p.hand, ...comm], [...best.hand, ...comm]) === 0
    );
    const share = Math.floor(currentPot / winners.length);
    updated = updated.map(p =>
      winners.some(w => w.id === p.id) ? { ...p, stack: p.stack + share } : p
    );

    const humanNewStack = updated.find(p => p.id === 0)?.stack ?? 0;
    setSessionNet(prev => prev + (humanNewStack - handStartStackRef.current));

    setPlayers(updated);
    setPot(0);
    setPhase('showdown');
    setToAct([]);
    setAiThinking(false);
    setAiThinkingId(null);

    const humanWins  = winners.some(w => w.id === 0);
    const humanPlayer = updated.find(p => p.id === 0);
    let res, msg;
    if (humanWins && winners.length === 1) {
      res = 'win';  msg = `You win with ${humanPlayer?.handName}!`;
    } else if (humanWins) {
      res = 'tie';  msg = `Split pot — ${humanPlayer?.handName}`;
    } else {
      const winner = updated.find(p => p.id === best?.id);
      res = 'loss'; msg = `${winner?.name} wins — ${winner?.handName}`;
    }
    setResult(res);
    setStatusMsg(msg);
    recordPokerResult(res);
    savePokerGame(res, humanNewStack);
  }

  function endHandLastManStanding(winnerId, ps, currentPot) {
    const winner  = ps.find(p => p.id === winnerId);
    const updated = updatePlayer(ps, winnerId, { stack: (winner?.stack ?? 0) + currentPot });
    const humanNewStack = updated.find(p => p.id === 0)?.stack ?? 0;
    setSessionNet(prev => prev + (humanNewStack - handStartStackRef.current));
    setPlayers(updated);
    setPot(0);
    setPhase('done');
    setToAct([]);
    setAiThinking(false);
    setAiThinkingId(null);
    const res = winnerId === 0 ? 'win' : 'loss';
    setResult(res);
    setStatusMsg(
      winnerId === 0
        ? 'Everyone folded — you win!'
        : `${winner?.name} wins — everyone folded`
    );
    recordPokerResult(res);
    savePokerGame(res, humanNewStack);
  }

  // ── processNextTurn ───────────────────────────────────────────────────────────

  processNextTurnRef.current = (
    currentToAct, currentPlayers, currentStreetMaxBet,
    currentPot, currentPhase, currentDeck, currentCommunity,
  ) => {
    const active = currentPlayers.filter(p => !p.folded);
    if (active.length === 1) {
      endHandLastManStanding(active[0].id, currentPlayers, currentPot);
      return;
    }
    if (currentToAct.length === 0) {
      advanceStreetRef.current(currentPhase, currentDeck, currentCommunity, currentPlayers, currentPot);
      return;
    }
    const actorId = currentToAct[0];
    setToAct(currentToAct);

    if (actorId === 0) {
      const human     = currentPlayers.find(p => p.id === 0);
      const sliderMin = currentStreetMaxBet > 0 ? currentStreetMaxBet + BIG_BLIND : BIG_BLIND;
      const sliderMax = (human?.stack ?? 0) + (human?.streetBet ?? 0);
      setBetValue(Math.max(Math.min(sliderMin, sliderMax), BIG_BLIND));
      const toCall = Math.max(0, currentStreetMaxBet - (human?.streetBet ?? 0));
      setStatusMsg(toCall > 0 ? `Your turn — call ${toCall} or raise` : 'Your turn — check or bet');
      setAiThinking(false);
      setAiThinkingId(null);
    } else {
      scheduleAiActionRef.current(
        actorId, currentToAct, currentPlayers, currentStreetMaxBet,
        currentPot, currentPhase, currentDeck, currentCommunity,
      );
    }
  };

  // ── scheduleAiAction ──────────────────────────────────────────────────────────

  scheduleAiActionRef.current = (
    actorId, currentToAct, currentPlayers, currentStreetMaxBet,
    currentPot, currentPhase, currentDeck, currentCommunity,
  ) => {
    setAiThinking(true);
    setAiThinkingId(actorId);

    const capturedHandId = handIdRef.current;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      if (handIdRef.current !== capturedHandId) return; // stale — new hand started
      const actor    = currentPlayers.find(p => p.id === actorId);
      if (!actor) return;
      const aiToCall = Math.max(0, currentStreetMaxBet - actor.streetBet);
      const decision = getPokerAiDecision(actor.hand, currentCommunity, currentPot, aiToCall, actor.stack);
      const nextToAct = currentToAct.slice(1);

      if (decision === 'fold') {
        setLastAction(prev => ({ ...prev, [actorId]: 'Folded' }));
        const newPs = updatePlayer(currentPlayers, actorId, { folded: true });
        setPlayers(newPs);
        setAiThinking(false); setAiThinkingId(null);
        processNextTurnRef.current(nextToAct, newPs, currentStreetMaxBet, currentPot, currentPhase, currentDeck, currentCommunity);

      } else if (decision === 'check' || (decision === 'call' && aiToCall === 0)) {
        setLastAction(prev => ({ ...prev, [actorId]: 'Checked' }));
        setAiThinking(false); setAiThinkingId(null);
        processNextTurnRef.current(nextToAct, currentPlayers, currentStreetMaxBet, currentPot, currentPhase, currentDeck, currentCommunity);

      } else if (decision === 'call') {
        const callAmt = Math.min(aiToCall, actor.stack);
        setLastAction(prev => ({ ...prev, [actorId]: `Called ${callAmt}` }));
        const newPot = currentPot + callAmt;
        const newPs  = updatePlayer(currentPlayers, actorId, {
          stack: actor.stack - callAmt, streetBet: actor.streetBet + callAmt,
        });
        setPot(newPot); setPlayers(newPs);
        setAiThinking(false); setAiThinkingId(null);
        processNextTurnRef.current(nextToAct, newPs, currentStreetMaxBet, newPot, currentPhase, currentDeck, currentCommunity);

      } else {
        // Raise
        const raiseTarget  = Math.max(currentStreetMaxBet + BIG_BLIND, currentStreetMaxBet * 2, BIG_BLIND * 3);
        const raisePays    = Math.min(raiseTarget - actor.streetBet, actor.stack);
        const newStreetBet = actor.streetBet + raisePays;
        const newStreetMax = Math.max(currentStreetMaxBet, newStreetBet);
        const newPot       = currentPot + raisePays;
        const newPs        = updatePlayer(currentPlayers, actorId, {
          stack: actor.stack - raisePays, streetBet: newStreetBet,
        });
        setLastAction(prev => ({ ...prev, [actorId]: `Raised → ${newStreetBet}` }));
        const newToAct = toActAfterRaise(actorId, newPs);
        setPot(newPot); setStreetMaxBet(newStreetMax); setPlayers(newPs);
        setAiThinking(false); setAiThinkingId(null);
        processNextTurnRef.current(newToAct, newPs, newStreetMax, newPot, currentPhase, currentDeck, currentCommunity);
      }
    }, 380);
  };

  // ── advanceStreet ─────────────────────────────────────────────────────────────

  advanceStreetRef.current = (currentPhase, currentDeck, currentCommunity, currentPlayers, currentPot) => {
    let newDeck = [...currentDeck], newCommunity = [...currentCommunity], nextPhase;

    if (currentPhase === 'preflop') {
      const { hand, deck: d } = deal(newDeck, 3);
      newCommunity = hand; newDeck = d; nextPhase = 'flop';
    } else if (currentPhase === 'flop') {
      const { hand, deck: d } = deal(newDeck, 1);
      newCommunity = [...newCommunity, hand[0]]; newDeck = d; nextPhase = 'turn';
    } else if (currentPhase === 'turn') {
      const { hand, deck: d } = deal(newDeck, 1);
      newCommunity = [...newCommunity, hand[0]]; newDeck = d; nextPhase = 'river';
    } else {
      resolveShowdown(currentPlayers, newCommunity, currentPot);
      return;
    }

    const resetPlayers = currentPlayers.map(p => ({ ...p, streetBet: 0 }));
    const newToAct     = postFlopOrder(resetPlayers);

    setLastAction({});
    setCommunity(newCommunity);
    setDeck(newDeck);
    setPhase(nextPhase);
    setStreetMaxBet(0);
    setToAct(newToAct);
    setPlayers(resetPlayers);
    setStatusMsg(STREET_LABEL[nextPhase]);
    setAiThinking(false);
    setAiThinkingId(null);
    setBetValue(BIG_BLIND);

    processNextTurnRef.current(newToAct, resetPlayers, 0, currentPot, nextPhase, newDeck, newCommunity);
  };

  // ── startHand ─────────────────────────────────────────────────────────────────

  const startHand = () => {
    // Cancel any pending AI timer and mark all its callbacks as stale
    handIdRef.current += 1;
    if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }

    let d = shuffleDeck(makeNewDeck());
    let ps = players.map(p => ({
      ...p,
      hand: [], streetBet: 0, folded: false, revealed: false, handName: '',
      stack: p.stack > 0 ? p.stack : STARTING_STACK,
    }));

    handStartStackRef.current = ps.find(p => p.id === 0)?.stack ?? STARTING_STACK;

    ps = ps.map(p => {
      const { hand, deck: d2 } = deal(d, 2);
      d = d2;
      return { ...p, hand };
    });

    // Clamp blinds so stacks never go negative (all-in if short-stacked)
    const sbStack  = ps.find(p => p.id === 0)?.stack ?? STARTING_STACK;
    const bbStack  = ps.find(p => p.id === 1)?.stack ?? STARTING_STACK;
    const sbActual = Math.min(SMALL_BLIND, sbStack);
    const bbActual = Math.min(BIG_BLIND,   bbStack);
    ps = updatePlayer(ps, 0, { stack: sbStack - sbActual, streetBet: sbActual });
    ps = updatePlayer(ps, 1, { stack: bbStack - bbActual, streetBet: bbActual });

    const initialPot          = sbActual + bbActual;
    const initialStreetMaxBet = bbActual;
    const initialToAct        = preflopOrder(ps);

    setPlayers(ps);
    setDeck(d);
    setCommunity([]);
    setPhase('preflop');
    setPot(initialPot);
    setStreetMaxBet(initialStreetMaxBet);
    setToAct(initialToAct);
    setAiThinking(false);
    setAiThinkingId(null);
    setResult(null);
    setStatusMsg('Pre-Flop');
    setBetValue(BIG_BLIND * 3);
    setLastAction({});

    processNextTurnRef.current(initialToAct, ps, initialStreetMaxBet, initialPot, 'preflop', d, []);
  };

  startHandRef.current = startHand;
  useEffect(() => { startHand(); }, []);

  useEffect(() => {
    const human = players.find(p => p.id === 0);
    if ((phase === 'done' || phase === 'showdown') && human?.stack === 0) {
      const t = setTimeout(() => startHandRef.current(), 2500);
      return () => clearTimeout(t);
    }
  }, [phase, players]);

  // Cancel any pending AI timer when the screen unmounts
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ── humanAct ─────────────────────────────────────────────────────────────────

  const humanAct = (decision, amount) => {
    const human = players.find(p => p.id === 0);
    if (!human) return;

    if (decision === 'fold') {
      setLastAction(prev => ({ ...prev, [0]: 'Folded' }));
      const newPs = updatePlayer(players, 0, { folded: true });
      setPlayers(newPs);
      processNextTurnRef.current(toAct.slice(1), newPs, streetMaxBet, pot, phase, deck, community);
      return;
    }
    if (decision === 'check') {
      setLastAction(prev => ({ ...prev, [0]: 'Checked' }));
      processNextTurnRef.current(toAct.slice(1), players, streetMaxBet, pot, phase, deck, community);
      return;
    }
    if (decision === 'call') {
      const callAmt = Math.min(streetMaxBet - human.streetBet, human.stack);
      setLastAction(prev => ({ ...prev, [0]: `Called ${callAmt}` }));
      const newPot = pot + callAmt;
      const newPs  = updatePlayer(players, 0, {
        stack: human.stack - callAmt, streetBet: human.streetBet + callAmt,
      });
      setPot(newPot); setPlayers(newPs);
      processNextTurnRef.current(toAct.slice(1), newPs, streetMaxBet, newPot, phase, deck, community);
      return;
    }
    if (decision === 'raise') {
      const raiseTo      = Math.max(amount, streetMaxBet + BIG_BLIND);
      const raiseAmt     = Math.min(raiseTo - human.streetBet, human.stack);
      const newStreetBet = human.streetBet + raiseAmt;
      const newStreetMax = Math.max(streetMaxBet, newStreetBet);
      const newPot       = pot + raiseAmt;
      const newPs        = updatePlayer(players, 0, {
        stack: human.stack - raiseAmt, streetBet: newStreetBet,
      });
      setLastAction(prev => ({ ...prev, [0]: `Raised → ${newStreetBet}` }));
      const newToAct = toActAfterRaise(0, newPs);
      setPot(newPot); setStreetMaxBet(newStreetMax); setPlayers(newPs);
      processNextTurnRef.current(newToAct, newPs, newStreetMax, newPot, phase, deck, community);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────────

  const human       = players.find(p => p.id === 0);
  const aiPlayers   = players.filter(p => !p.isHuman);
  const isHumanTurn = toAct.length > 0 && toAct[0] === 0 && !aiThinking;
  const isDone      = phase === 'done' || phase === 'showdown';
  const toCall      = human ? Math.max(0, streetMaxBet - human.streetBet) : 0;
  const sliderMin   = streetMaxBet > 0 ? streetMaxBet + BIG_BLIND : BIG_BLIND;
  const sliderMax   = human ? Math.max(sliderMin + 1, human.stack + human.streetBet) : sliderMin + 1;
  const clampedBet  = Math.max(sliderMin, Math.min(sliderMax, betValue));
  const cfg         = result ? RESULT_CFG[result] : null;

  // ── Web layout ────────────────────────────────────────────────────────────────

  if (Platform.OS === 'web') {
    return (
      <View style={w.root}>

        {/* Header */}
        <View style={w.header}>
          <Text style={w.title}>♣ Texas Hold'em ♠</Text>
          <View style={w.streetPill}>
            <Text style={w.streetText}>{STREET_LABEL[phase] ?? phase}</Text>
          </View>
          <Text style={w.pot}>Pot: {pot}</Text>
        </View>

        {/* AI grid */}
        <View style={w.aiSection}>
          <View style={w.aiGrid}>
            {aiPlayers.map(p => (
              <AiSeat key={p.id} player={p} isActive={aiThinkingId === p.id} lastAction={lastAction[p.id]} compact />
            ))}
          </View>
        </View>

        <View style={w.divider} />

        {/* Community */}
        <View style={w.feltRow}>
          <Text style={w.feltLabel}>Community</Text>
          <View style={w.cardRow}>
            {community.length === 0
              ? <Text style={w.empty}>—</Text>
              : community.map((c, i) => (
                  <Image key={`com-${i}`} source={cardImages[c]} style={w.cardImg} />
                ))}
          </View>
        </View>

        <View style={w.divider} />

        {/* Player */}
        <View style={w.feltRow}>
          <Text style={w.feltLabel}>
            Your Hand{human?.handName ? ` — ${human.handName}` : ''}
          </Text>
          <View style={w.cardRow}>
            {human?.hand.map((c, i) => (
              <Image key={`p-${i}`} source={cardImages[c]} style={w.cardImg} />
            ))}
          </View>
          <Text style={w.stackRow}>
            Stack: <Text style={w.stackNum}>{human?.stack ?? 0}</Text>
            {'   '}
            Session: <Text style={{ color: sessionNet >= 0 ? '#4cff80' : '#ff5555' }}>
              {sessionNet >= 0 ? '+' : ''}{sessionNet}
            </Text>
          </Text>
        </View>

        {/* Result */}
        {cfg && (
          <View style={[w.resultBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[w.resultText, { color: cfg.color }]}>{statusMsg}</Text>
          </View>
        )}

        {/* Betting panel */}
        {isHumanTurn && !isDone && (
          <View style={w.betPanel}>
            {toCall > 0
              ? <Text style={w.callInfo}>To call: <Text style={w.callNum}>{toCall}</Text></Text>
              : null}
            <Text style={w.sliderLabel}>{streetMaxBet > 0 ? 'Raise to:' : 'Bet:'} {clampedBet}</Text>
            <BetSlider min={sliderMin} max={sliderMax} value={clampedBet} onValueChange={v => setBetValue(v)} />
            <View style={w.bounds}>
              <Text style={w.boundText}>Min {sliderMin}</Text>
              <Text style={w.boundText}>Max {sliderMax}</Text>
            </View>
            <View style={w.btnRow}>
              <Pressable style={[w.btn, w.btnRed]}   onPress={() => humanAct('fold')}>
                <Text style={w.btnText}>Fold</Text>
              </Pressable>
              {toCall === 0
                ? <Pressable style={w.btn} onPress={() => humanAct('check')}>
                    <Text style={w.btnText}>Check</Text>
                  </Pressable>
                : <Pressable style={w.btn} onPress={() => humanAct('call')}>
                    <Text style={w.btnText}>Call {toCall}</Text>
                  </Pressable>}
              <Pressable style={[w.btn, w.btnGold]} onPress={() => humanAct('raise', clampedBet)}>
                <Text style={w.btnText}>{streetMaxBet > 0 ? `Raise → ${clampedBet}` : `Bet → ${clampedBet}`}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Nav */}
        <View style={w.navRow}>
          <Pressable style={w.navBtn} onPress={startHand}>
            <Text style={w.navText}>New Hand</Text>
          </Pressable>
          <Pressable style={w.navBtn} onPress={() => onExitToWelcome?.()}>
            <Text style={w.navText}>← Menu</Text>
          </Pressable>
        </View>

      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={gameStyles.container}>
      <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={m.header}>
          <Text style={m.title}>Texas Hold'em</Text>
          <View style={m.headerRight}>
            <View style={m.streetPill}>
              <Text style={m.streetText}>{STREET_LABEL[phase] ?? phase}</Text>
            </View>
            <Text style={m.pot}>Pot: {pot}</Text>
          </View>
        </View>

        {/* AI grid */}
        <View style={m.aiGrid}>
          {aiPlayers.map(p => (
            <AiSeat key={p.id} player={p} isActive={aiThinkingId === p.id} lastAction={lastAction[p.id]} />
          ))}
        </View>

        {/* Community cards */}
        <View style={m.feltPanel}>
          <Text style={m.feltLabel}>Community</Text>
          <View style={m.cardRow}>
            {community.length === 0
              ? <Text style={m.empty}>— Waiting for cards —</Text>
              : community.map((c, i) => (
                  <Image key={`com-${i}`} source={cardImages[c]} style={m.communityCard} />
                ))}
          </View>
        </View>

        {/* Result banner */}
        {cfg && (
          <View style={[m.resultBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[m.resultText, { color: cfg.color }]}>{statusMsg}</Text>
          </View>
        )}

        {/* Player panel */}
        <View style={[m.feltPanel, isHumanTurn && m.feltPanelActive]}>
          <View style={m.playerHeader}>
            <View>
              <Text style={m.feltLabel}>Your Hand{human?.handName ? ` — ${human.handName}` : ''}</Text>
              <Text style={m.stackInfo}>
                Stack: <Text style={m.stackNum}>{human?.stack ?? 0}</Text>
                {'   '}
                <Text style={{ color: sessionNet >= 0 ? '#4cff80' : '#ff5555' }}>
                  {sessionNet >= 0 ? '+' : ''}{sessionNet}
                </Text>
              </Text>
            </View>
            {human?.streetBet > 0 && (
              <Text style={m.playerBetBadge}>Bet: {human.streetBet}</Text>
            )}
          </View>
          <View style={m.cardRow}>
            {human?.hand.map((c, i) => (
              <Image key={`p-${i}`} source={cardImages[c]} style={m.playerCard} />
            ))}
          </View>
        </View>

        {/* Betting panel */}
        {isHumanTurn && !isDone && (
          <View style={m.betPanel}>
            {toCall > 0
              ? <Text style={m.callInfo}>To call: <Text style={m.callNum}>{toCall}</Text></Text>
              : <Text style={m.callInfo}>No bet to call — check or bet</Text>}

            <Text style={m.sliderLabel}>{streetMaxBet > 0 ? 'Raise to:' : 'Bet:'} {clampedBet}</Text>
            <BetSlider min={sliderMin} max={sliderMax} value={clampedBet} onValueChange={v => setBetValue(v)} />
            <View style={m.bounds}>
              <Text style={m.boundText}>Min {sliderMin}</Text>
              <Text style={m.boundText}>Max {sliderMax}</Text>
            </View>

            <View style={m.actionRow}>
              <Pressable style={[m.actionBtn, m.btnRed]} onPress={() => humanAct('fold')}>
                <Text style={m.actionBtnText}>Fold</Text>
              </Pressable>
              {toCall === 0
                ? <Pressable style={m.actionBtn} onPress={() => humanAct('check')}>
                    <Text style={m.actionBtnText}>Check</Text>
                  </Pressable>
                : <Pressable style={m.actionBtn} onPress={() => humanAct('call')}>
                    <Text style={m.actionBtnText}>Call {toCall}</Text>
                  </Pressable>}
              <Pressable style={[m.actionBtn, m.btnGold]} onPress={() => humanAct('raise', clampedBet)}>
                <Text style={m.actionBtnText}>{streetMaxBet > 0 ? `Raise` : `Bet`}{'\n'}{clampedBet}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Nav */}
        <View style={m.navRow}>
          <Pressable style={m.navBtn} onPress={startHand}>
            <Text style={m.navText}>New Hand</Text>
          </Pressable>
          <Pressable style={m.navBtn} onPress={() => onExitToWelcome?.()}>
            <Text style={m.navText}>← Menu</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────

const w = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: Colors.bg,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 7, marginBottom: 5,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:  { color: Colors.gold, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  streetPill: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  streetText: { color: Colors.goldDim, fontSize: 9, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  pot:    { color: Colors.gold, fontSize: 14, fontWeight: '900' },

  aiSection: { flex: 1, justifyContent: 'center' },
  aiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },

  divider: { height: 1, backgroundColor: Colors.border, opacity: 0.6, marginVertical: 5 },
  feltRow: { alignItems: 'center', paddingVertical: 4 },
  feltLabel: { color: Colors.goldDim, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
  cardImg: {
    width: 46, height: 68, resizeMode: 'contain',
    backgroundColor: Colors.white, borderRadius: 5, borderWidth: 1, borderColor: '#ccc',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
  },
  empty: { color: Colors.textFaint, fontSize: 18 },

  stackRow: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  stackNum: { color: Colors.white, fontWeight: '900' },

  resultBanner: {
    paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    marginVertical: 4, borderWidth: 1.5,
  },
  resultText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  betPanel: {
    backgroundColor: Colors.bgCard, borderRadius: 10,
    padding: 10, marginVertical: 5, borderWidth: 1, borderColor: Colors.border,
  },
  callInfo:    { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  callNum:     { color: Colors.gold, fontWeight: '900' },
  sliderLabel: { color: Colors.gold, fontSize: 12, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  bounds:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1, marginBottom: 3 },
  boundText:   { color: Colors.textFaint, fontSize: 10 },

  btnRow: { flexDirection: 'row', gap: 6 },
  btn: {
    flex: 1, backgroundColor: Colors.green, paddingVertical: 9,
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.greenLight,
  },
  btnRed:  { backgroundColor: Colors.red,      borderColor: Colors.redLight },
  btnGold: { backgroundColor: Colors.goldDeep, borderColor: Colors.goldDim },
  btnText: { color: Colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  navRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  navBtn: {
    flex: 1, backgroundColor: Colors.bgCard, paddingVertical: 9,
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  navText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
});

// ── Mobile styles ──────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  scroll: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, width: '100%',
  },

  header: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  title:       { color: Colors.gold, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  streetPill: {
    backgroundColor: Colors.bgCard, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  streetText: { color: Colors.goldDim, fontSize: 9, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  pot: { color: Colors.gold, fontSize: 18, fontWeight: '900' },

  aiGrid: {
    width: '100%', flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: 8,
  },

  feltPanel: {
    width: '100%', backgroundColor: Colors.felt,
    borderRadius: 16, padding: 14, marginVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  feltPanelActive: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
  },

  feltLabel: {
    color: Colors.goldDim, fontSize: 10, fontWeight: '800',
    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
  },

  cardRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  communityCard: {
    width: 52, height: 76, resizeMode: 'contain',
    backgroundColor: Colors.white, borderRadius: 7, borderWidth: 1, borderColor: '#ccc',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
  },
  playerCard: {
    width: 62, height: 92, resizeMode: 'contain',
    backgroundColor: Colors.white, borderRadius: 9, borderWidth: 1, borderColor: '#ccc',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 10,
  },
  empty: { color: Colors.textFaint, fontSize: 14, paddingVertical: 6, textAlign: 'center' },

  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  stackInfo:    { color: Colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  stackNum:     { color: Colors.white, fontWeight: '900' },
  playerBetBadge: {
    color: Colors.gold, fontSize: 13, fontWeight: '800',
    backgroundColor: Colors.goldDeep, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },

  resultBanner: {
    width: '100%', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginVertical: 6, borderWidth: 1.5,
  },
  resultText: { fontSize: 24, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase' },

  betPanel: {
    width: '100%', backgroundColor: Colors.bgCard,
    borderRadius: 16, padding: 16, marginVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  callInfo:    { color: Colors.textMuted, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  callNum:     { color: Colors.gold, fontWeight: '900', fontSize: 16 },
  sliderLabel: { color: Colors.gold, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  bounds:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginBottom: 6 },
  boundText:   { color: Colors.textFaint, fontSize: 11 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1, backgroundColor: Colors.green,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.greenLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5,
  },
  btnRed:       { backgroundColor: Colors.red,      borderColor: Colors.redLight },
  btnGold:      { backgroundColor: Colors.goldDeep, borderColor: Colors.goldDim },
  actionBtnText: { color: Colors.white, fontSize: 14, fontWeight: '900', textAlign: 'center', letterSpacing: 0.3 },

  navRow: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 10 },
  navBtn: {
    flex: 1, backgroundColor: Colors.bgCard, paddingVertical: 13,
    borderRadius: 11, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  navText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
});
