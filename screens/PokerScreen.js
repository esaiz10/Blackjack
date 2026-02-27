// screens/PokerScreen.js
// Texas Hold'em Poker — 5-player (1 human + 4 AI), v2
// Custom PanResponder bet slider; ref-based mutual recursion avoids stale closures.

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, SafeAreaView,
  StyleSheet, PanResponder, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { gameStyles } from '../styles/GameStyles';
import { makeNewDeck, shuffleDeck, deal } from '../components/deck';
import { cardImages } from '../components/cardImages';
import { evaluateHand, compareHands } from '../components/pokerHandEvaluator';
import { getPokerAiDecision } from '../components/pokerAI';
import { Colors } from '../styles/theme';

// ── Constants ──────────────────────────────────────────────────────────────────

const STARTING_STACK = 1000;
const SMALL_BLIND     = 10;
const BIG_BLIND       = 20;
const POKER_STATS_KEY = 'poker_stats_v1';
const AI_NAMES        = ['Alex', 'Blake', 'Casey', 'Dana'];

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

// Active players who can still bet (not folded, have chips)
function activeBettors(players) {
  return [0, 1, 2, 3, 4].filter(id => {
    const p = players.find(x => x.id === id);
    return p && !p.folded && p.stack > 0;
  });
}

// Preflop: SB (player 0) first, BB (AI id=1) last option — order [0,2,3,4,1]
function preflopOrder(players) {
  return [0, 2, 3, 4, 1].filter(id => {
    const p = players.find(x => x.id === id);
    return p && !p.folded && p.stack > 0;
  });
}

// Post-flop: player first, then AIs [0,1,2,3,4]
function postFlopOrder(players) {
  return activeBettors(players);
}

// After a raise: everyone AFTER the raiser must respond (wrap around, exclude raiser)
function toActAfterRaise(raiserId, players) {
  const active = activeBettors(players);
  const idx    = active.indexOf(raiserId);
  if (idx === -1) return active;
  return [
    ...active.slice(idx + 1),
    ...active.slice(0, idx),
  ];
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

// ── BetSlider ──────────────────────────────────────────────────────────────────
// PanResponder-based drag slider. No external libraries needed.

function BetSlider({ min, max, value, onValueChange }) {
  const trackRef   = useRef(null);
  const trackInfo  = useRef({ x: 0, width: 300 });
  // handleRef is updated every render so the PanResponder (created once) always
  // calls the latest onValueChange with the latest min/max.
  const handleRef  = useRef(null);
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
    <View style={slStyles.wrap}>
      <View
        ref={trackRef}
        style={slStyles.track}
        onLayout={() => {
          trackRef.current?.measure((_fx, _fy, w, _h, px) => {
            trackInfo.current = { x: px, width: w };
          });
        }}
        {...pr.panHandlers}
      >
        <View style={[slStyles.fill, { width: `${pct}%` }]} />
        <View style={[slStyles.knob, { left: `${pct}%` }]} />
      </View>
    </View>
  );
}

const slStyles = StyleSheet.create({
  wrap:  { width: '100%', paddingVertical: 16 },
  track: {
    width: '100%', height: 8,
    backgroundColor: '#0d1a0d',
    borderRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  fill: {
    position: 'absolute', left: 0, top: 0,
    height: '100%', backgroundColor: Colors.gold, borderRadius: 4,
  },
  knob: {
    position: 'absolute', top: -11,
    width: 30, height: 30, marginLeft: -15,
    borderRadius: 15,
    backgroundColor: Colors.gold,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
});

// ── AiSeat ─────────────────────────────────────────────────────────────────────

function AiSeat({ player, isActive, compact }) {
  const { name, stack, streetBet, folded, revealed, hand, handName } = player;
  return (
    <View style={[aStyles.box, isActive && aStyles.glow, folded && aStyles.faded, compact && aStyles.boxCompact]}>
      <Text style={[aStyles.name, compact && aStyles.nameCompact]} numberOfLines={1}>{name}</Text>
      <View style={aStyles.cardRow}>
        {hand.map((card, i) =>
          revealed && !folded && cardImages[card]
            ? <Image key={i} source={cardImages[card]} style={compact ? aStyles.cardCompact : aStyles.card} />
            : (
              <View key={i} style={compact ? aStyles.cardBackCompact : aStyles.cardBack}>
                <View style={compact ? aStyles.cardBackInnerCompact : aStyles.cardBackInner} />
              </View>
            )
        )}
      </View>
      {revealed && handName
        ? <Text style={aStyles.handName} numberOfLines={1}>{handName}</Text>
        : null}
      <Text style={[aStyles.stack, compact && aStyles.stackCompact]}>{stack}</Text>
      {streetBet > 0 ? <Text style={aStyles.bet}>Bet: {streetBet}</Text> : null}
      {isActive      ? <Text style={aStyles.thinking}>thinking…</Text>    : null}
    </View>
  );
}

const aStyles = StyleSheet.create({
  box: {
    width: '48%', minHeight: 118,
    backgroundColor: Colors.bgCard,
    borderRadius: 10, padding: 8, margin: '1%',
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  glow: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 10, elevation: 10,
  },
  faded:       { opacity: 0.38 },
  name:        { color: Colors.gold,    fontSize: 13, fontWeight: '700', marginBottom: 4 },
  cardRow:     { flexDirection: 'row',  gap: 4,       marginBottom: 4 },
  card:        { width: 30, height: 44, resizeMode: 'contain', backgroundColor: Colors.white, borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
  cardBack:    { width: 30, height: 44, backgroundColor: '#1a3a8f', borderRadius: 4, borderWidth: 1, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  cardBackInner: { width: 22, height: 36, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: '#1530a0' },
  handName:    { color: Colors.goldDim, fontSize: 9,  fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  stack:       { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  bet:         { color: Colors.gold,    fontSize: 11, fontWeight: '600', marginTop: 2 },
  thinking:    { color: Colors.goldDim, fontSize: 9,  fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  // ── compact variants for web ──
  boxCompact:           { minHeight: 76, padding: 5, margin: '1%' },
  nameCompact:          { fontSize: 11, marginBottom: 2 },
  cardCompact:          { width: 22, height: 32, resizeMode: 'contain', backgroundColor: Colors.white, borderRadius: 3, borderWidth: 1, borderColor: '#ccc' },
  cardBackCompact:      { width: 22, height: 32, backgroundColor: '#1a3a8f', borderRadius: 3, borderWidth: 1, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  cardBackInnerCompact: { width: 16, height: 26, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: '#1530a0' },
  stackCompact:         { fontSize: 11 },
});

// ── PokerScreen ────────────────────────────────────────────────────────────────

export default function PokerScreen({ onExitToWelcome }) {
  const [players,       setPlayers]       = useState(makePlayers);
  const [community,     setCommunity]     = useState([]);
  const [deck,          setDeck]          = useState([]);
  const [phase,         setPhase]         = useState('preflop');
  const [pot,           setPot]           = useState(0);
  const [streetMaxBet,  setStreetMaxBet]  = useState(0);
  const [toAct,         setToAct]         = useState([]);
  const [aiThinking,    setAiThinking]    = useState(false);
  const [aiThinkingId,  setAiThinkingId]  = useState(null);
  const [betValue,      setBetValue]      = useState(BIG_BLIND * 3);
  const [result,        setResult]        = useState(null);
  const [statusMsg,     setStatusMsg]     = useState('');
  const [sessionNet,    setSessionNet]    = useState(0);

  // Tracks the human's stack at the start of each hand for session-net calc.
  const handStartStackRef = useRef(STARTING_STACK);

  // Three refs for mutual recursion.
  // Each render re-assigns .current so that setTimeout callbacks always call
  // the freshest version (avoiding stale closures).
  const processNextTurnRef  = useRef(null);
  const scheduleAiActionRef = useRef(null);
  const advanceStreetRef    = useRef(null);
  // Always points to the latest startHand (used in the bust-detection effect).
  const startHandRef        = useRef(null);

  const RESULT_COLOR = { win: '#4cff80', loss: '#ff5555', tie: '#FFD700' };

  // ── Showdown ────────────────────────────────────────────────────────────────

  function resolveShowdown(ps, comm, currentPot) {
    const active = ps.filter(p => !p.folded);
    if (active.length === 0) return;

    // Evaluate & reveal all non-folded hands
    let updated = ps.map(p => {
      if (p.folded) return p;
      const ev = evaluateHand([...p.hand, ...comm]);
      return { ...p, revealed: true, handName: ev.label };
    });

    // Find best hand
    let best = null;
    for (const p of updated.filter(x => !x.folded)) {
      if (!best || compareHands([...p.hand, ...comm], [...best.hand, ...comm]) > 0) {
        best = p;
      }
    }

    // All who tie with best share the pot
    const winners = updated.filter(p =>
      !p.folded && best &&
      compareHands([...p.hand, ...comm], [...best.hand, ...comm]) === 0
    );
    const share = Math.floor(currentPot / winners.length);
    updated = updated.map(p =>
      winners.some(w => w.id === p.id) ? { ...p, stack: p.stack + share } : p
    );

    // Update session net before touching state
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
      res = 'tie';  msg = `Split pot! ${humanPlayer?.handName}`;
    } else {
      const winner = updated.find(p => p.id === best?.id);
      res = 'loss'; msg = `${winner?.name} wins with ${winner?.handName}!`;
    }
    setResult(res);
    setStatusMsg(msg);
    recordPokerResult(res);
  }

  function endHandLastManStanding(winnerId, ps, currentPot) {
    const winner  = ps.find(p => p.id === winnerId);
    const updated = updatePlayer(ps, winnerId, { stack: (winner?.stack ?? 0) + currentPot });
    // Update session net
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
        ? 'Everyone else folded! You win!'
        : `${winner?.name} wins — everyone folded.`
    );
    recordPokerResult(res);
  }

  // ── processNextTurn ─────────────────────────────────────────────────────────
  // Signature: (toAct[], players[], streetMaxBet, pot, phase, deck, community)
  processNextTurnRef.current = (
    currentToAct, currentPlayers, currentStreetMaxBet,
    currentPot, currentPhase, currentDeck, currentCommunity,
  ) => {
    // If only one player remains, they win
    const active = currentPlayers.filter(p => !p.folded);
    if (active.length === 1) {
      endHandLastManStanding(active[0].id, currentPlayers, currentPot);
      return;
    }

    // No one left to act → move to next street
    if (currentToAct.length === 0) {
      advanceStreetRef.current(
        currentPhase, currentDeck, currentCommunity, currentPlayers, currentPot,
      );
      return;
    }

    const actorId = currentToAct[0];
    setToAct(currentToAct);

    if (actorId === 0) {
      // Human's turn — update UI hints and let the player press buttons
      const human     = currentPlayers.find(p => p.id === 0);
      const sliderMin = currentStreetMaxBet > 0
        ? currentStreetMaxBet + BIG_BLIND
        : BIG_BLIND;
      const sliderMax = (human?.stack ?? 0) + (human?.streetBet ?? 0);
      setBetValue(Math.max(Math.min(sliderMin, sliderMax), BIG_BLIND));
      const toCall = Math.max(0, currentStreetMaxBet - (human?.streetBet ?? 0));
      setStatusMsg(toCall > 0 ? `Your turn — To call: ${toCall}` : 'Your turn');
      setAiThinking(false);
      setAiThinkingId(null);
    } else {
      scheduleAiActionRef.current(
        actorId, currentToAct, currentPlayers, currentStreetMaxBet,
        currentPot, currentPhase, currentDeck, currentCommunity,
      );
    }
  };

  // ── scheduleAiAction ────────────────────────────────────────────────────────
  scheduleAiActionRef.current = (
    actorId, currentToAct, currentPlayers, currentStreetMaxBet,
    currentPot, currentPhase, currentDeck, currentCommunity,
  ) => {
    setAiThinking(true);
    setAiThinkingId(actorId);

    setTimeout(() => {
      const actor    = currentPlayers.find(p => p.id === actorId);
      if (!actor) return;
      const aiToCall = Math.max(0, currentStreetMaxBet - actor.streetBet);
      const decision = getPokerAiDecision(
        actor.hand, currentCommunity, currentPot, aiToCall, actor.stack,
      );

      const nextToAct = currentToAct.slice(1); // remove current actor

      if (decision === 'fold') {
        const newPs = updatePlayer(currentPlayers, actorId, { folded: true });
        setPlayers(newPs);
        setAiThinking(false);
        setAiThinkingId(null);
        processNextTurnRef.current(
          nextToAct, newPs, currentStreetMaxBet,
          currentPot, currentPhase, currentDeck, currentCommunity,
        );

      } else if (decision === 'check' || (decision === 'call' && aiToCall === 0)) {
        setAiThinking(false);
        setAiThinkingId(null);
        processNextTurnRef.current(
          nextToAct, currentPlayers, currentStreetMaxBet,
          currentPot, currentPhase, currentDeck, currentCommunity,
        );

      } else if (decision === 'call') {
        const callAmt = Math.min(aiToCall, actor.stack);
        const newPot  = currentPot + callAmt;
        const newPs   = updatePlayer(currentPlayers, actorId, {
          stack:     actor.stack    - callAmt,
          streetBet: actor.streetBet + callAmt,
        });
        setPot(newPot);
        setPlayers(newPs);
        setAiThinking(false);
        setAiThinkingId(null);
        processNextTurnRef.current(
          nextToAct, newPs, currentStreetMaxBet,
          newPot, currentPhase, currentDeck, currentCommunity,
        );

      } else {
        // Raise: bring total commitment to max(streetMaxBet + BB, streetMaxBet * 2, 3×BB)
        const raiseTarget   = Math.max(currentStreetMaxBet + BIG_BLIND, currentStreetMaxBet * 2, BIG_BLIND * 3);
        const raisePays     = Math.min(raiseTarget - actor.streetBet, actor.stack);
        const newStreetBet  = actor.streetBet + raisePays;
        const newStreetMax  = Math.max(currentStreetMaxBet, newStreetBet);
        const newPot        = currentPot + raisePays;
        const newPs         = updatePlayer(currentPlayers, actorId, {
          stack:     actor.stack     - raisePays,
          streetBet: newStreetBet,
        });
        // Rebuild toAct: everyone after raiser must respond
        const newToAct = toActAfterRaise(actorId, newPs);
        setPot(newPot);
        setStreetMaxBet(newStreetMax);
        setPlayers(newPs);
        setAiThinking(false);
        setAiThinkingId(null);
        processNextTurnRef.current(
          newToAct, newPs, newStreetMax,
          newPot, currentPhase, currentDeck, currentCommunity,
        );
      }
    }, 350);
  };

  // ── advanceStreet ───────────────────────────────────────────────────────────
  advanceStreetRef.current = (
    currentPhase, currentDeck, currentCommunity, currentPlayers, currentPot,
  ) => {
    let newDeck      = [...currentDeck];
    let newCommunity = [...currentCommunity];
    let nextPhase;

    if (currentPhase === 'preflop') {
      const { hand, deck: d } = deal(newDeck, 3);
      newCommunity = hand;                           newDeck = d; nextPhase = 'flop';
    } else if (currentPhase === 'flop') {
      const { hand, deck: d } = deal(newDeck, 1);
      newCommunity = [...newCommunity, hand[0]];     newDeck = d; nextPhase = 'turn';
    } else if (currentPhase === 'turn') {
      const { hand, deck: d } = deal(newDeck, 1);
      newCommunity = [...newCommunity, hand[0]];     newDeck = d; nextPhase = 'river';
    } else {
      // After river → showdown
      resolveShowdown(currentPlayers, newCommunity, currentPot);
      return;
    }

    // Reset each player's streetBet for the new street
    const resetPlayers = currentPlayers.map(p => ({ ...p, streetBet: 0 }));
    const newToAct     = postFlopOrder(resetPlayers);

    setCommunity(newCommunity);
    setDeck(newDeck);
    setPhase(nextPhase);
    setStreetMaxBet(0);
    setToAct(newToAct);
    setPlayers(resetPlayers);
    setStatusMsg(nextPhase.charAt(0).toUpperCase() + nextPhase.slice(1));
    setAiThinking(false);
    setAiThinkingId(null);
    setBetValue(BIG_BLIND);

    processNextTurnRef.current(
      newToAct, resetPlayers, 0, currentPot, nextPhase, newDeck, newCommunity,
    );
  };

  // ── startHand ───────────────────────────────────────────────────────────────

  const startHand = () => {
    let d  = shuffleDeck(makeNewDeck());

    // Preserve stacks from previous hand; auto-rebuy any player at 0 chips.
    let ps = players.map(p => ({
      ...p,
      hand: [], streetBet: 0, folded: false, revealed: false, handName: '',
      stack: p.stack > 0 ? p.stack : STARTING_STACK,
    }));

    // Record human's stack at hand start (used for session-net delta at end).
    handStartStackRef.current = ps.find(p => p.id === 0)?.stack ?? STARTING_STACK;

    // Deal 2 hole cards to each player in seat order
    ps = ps.map(p => {
      const { hand, deck: d2 } = deal(d, 2);
      d = d2;
      return { ...p, hand };
    });

    // Post blinds: player (id=0) = SB, AI id=1 = BB (from their current stacks)
    const sbStack = ps.find(p => p.id === 0)?.stack ?? STARTING_STACK;
    const bbStack = ps.find(p => p.id === 1)?.stack ?? STARTING_STACK;
    ps = updatePlayer(ps, 0, { stack: sbStack - SMALL_BLIND, streetBet: SMALL_BLIND });
    ps = updatePlayer(ps, 1, { stack: bbStack - BIG_BLIND,   streetBet: BIG_BLIND   });

    const initialPot          = SMALL_BLIND + BIG_BLIND;
    const initialStreetMaxBet = BIG_BLIND;
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
    setStatusMsg('Pre-flop');
    setBetValue(BIG_BLIND * 3);

    // All values passed explicitly — state updates are batched but the ref
    // function uses the parameters, not state reads.
    processNextTurnRef.current(
      initialToAct, ps, initialStreetMaxBet, initialPot, 'preflop', d, [],
    );
  };

  // Keep ref current so the bust-detection effect always calls the latest version.
  startHandRef.current = startHand;

  useEffect(() => { startHand(); }, []);

  // Auto-start a new hand when the human player busts (stack hits 0).
  useEffect(() => {
    const human = players.find(p => p.id === 0);
    if ((phase === 'done' || phase === 'showdown') && human?.stack === 0) {
      const t = setTimeout(() => startHandRef.current(), 2500);
      return () => clearTimeout(t);
    }
  }, [phase, players]);

  // ── humanAct ────────────────────────────────────────────────────────────────
  // Reads state from the current render's closure (safe: only called on user press
  // which always happens after the latest render).

  const humanAct = (decision, amount) => {
    const human = players.find(p => p.id === 0);
    if (!human) return;

    if (decision === 'fold') {
      const newPs    = updatePlayer(players, 0, { folded: true });
      const newToAct = toAct.slice(1);
      setPlayers(newPs);
      processNextTurnRef.current(newToAct, newPs, streetMaxBet, pot, phase, deck, community);
      return;
    }

    if (decision === 'check') {
      const newToAct = toAct.slice(1);
      processNextTurnRef.current(newToAct, players, streetMaxBet, pot, phase, deck, community);
      return;
    }

    if (decision === 'call') {
      const callAmt  = Math.min(streetMaxBet - human.streetBet, human.stack);
      const newPot   = pot + callAmt;
      const newPs    = updatePlayer(players, 0, {
        stack:     human.stack     - callAmt,
        streetBet: human.streetBet + callAmt,
      });
      const newToAct = toAct.slice(1);
      setPot(newPot);
      setPlayers(newPs);
      processNextTurnRef.current(newToAct, newPs, streetMaxBet, newPot, phase, deck, community);
      return;
    }

    if (decision === 'raise') {
      const raiseTo      = Math.max(amount, streetMaxBet + BIG_BLIND);
      const raiseAmt     = Math.min(raiseTo - human.streetBet, human.stack);
      const newStreetBet = human.streetBet + raiseAmt;
      const newStreetMax = Math.max(streetMaxBet, newStreetBet);
      const newPot       = pot + raiseAmt;
      const newPs        = updatePlayer(players, 0, {
        stack:     human.stack     - raiseAmt,
        streetBet: newStreetBet,
      });
      // Rebuild toAct: all active players after human must respond
      const newToAct = toActAfterRaise(0, newPs);
      setPot(newPot);
      setStreetMaxBet(newStreetMax);
      setPlayers(newPs);
      processNextTurnRef.current(newToAct, newPs, newStreetMax, newPot, phase, deck, community);
    }
  };

  // ── Derived render values ───────────────────────────────────────────────────

  const human       = players.find(p => p.id === 0);
  const aiPlayers   = players.filter(p => !p.isHuman);
  const isHumanTurn = toAct.length > 0 && toAct[0] === 0 && !aiThinking;
  const isDone      = phase === 'done' || phase === 'showdown';

  const toCall     = human ? Math.max(0, streetMaxBet - human.streetBet) : 0;
  const sliderMin  = streetMaxBet > 0 ? streetMaxBet + BIG_BLIND : BIG_BLIND;
  const sliderMax  = human ? Math.max(sliderMin + 1, human.stack + human.streetBet) : sliderMin + 1;
  const clampedBet = Math.max(sliderMin, Math.min(sliderMax, betValue));

  // ── Shared betting panel content ─────────────────────────────────────────────

  const bettingButtons = (btnStyle, textStyle) => (
    <>
      <Pressable style={[btnStyle, wStyles.btnDanger]} onPress={() => humanAct('fold')}>
        <Text style={textStyle}>Fold</Text>
      </Pressable>
      {toCall === 0
        ? <Pressable style={btnStyle} onPress={() => humanAct('check')}><Text style={textStyle}>Check</Text></Pressable>
        : <Pressable style={btnStyle} onPress={() => humanAct('call')}><Text style={textStyle}>Call {toCall}</Text></Pressable>}
      <Pressable style={[btnStyle, wStyles.btnGold]} onPress={() => humanAct('raise', clampedBet)}>
        <Text style={textStyle}>{streetMaxBet > 0 ? `Raise → ${clampedBet}` : `Bet → ${clampedBet}`}</Text>
      </Pressable>
    </>
  );

  // ── Web layout — fixed height, no scroll ─────────────────────────────────────

  if (Platform.OS === 'web') {
    return (
      <View style={wStyles.root}>

        {/* Compact header row: title | status | pot */}
        <View style={wStyles.header}>
          <Text style={wStyles.title}>Texas Hold'em</Text>
          <Text style={wStyles.phase} numberOfLines={1}>{statusMsg}</Text>
          <Text style={wStyles.pot}>Pot: {pot}</Text>
        </View>

        {/* AI grid — expands to fill leftover vertical space */}
        <View style={wStyles.aiSection}>
          <View style={pStyles.aiGrid}>
            {aiPlayers.map(p => (
              <AiSeat key={p.id} player={p} isActive={aiThinkingId === p.id} compact />
            ))}
          </View>
        </View>

        <View style={wStyles.divider} />

        {/* Community cards */}
        <View style={wStyles.cardSection}>
          <Text style={wStyles.label}>Community</Text>
          <View style={wStyles.cardRow}>
            {community.length === 0
              ? <Text style={pStyles.empty}>—</Text>
              : community.map((c, i) => (
                  <Image key={`com-${i}`} source={cardImages[c]} style={wStyles.cardImg} />
                ))}
          </View>
        </View>

        <View style={wStyles.divider} />

        {/* Player hand */}
        <View style={wStyles.cardSection}>
          <Text style={wStyles.label}>
            Your Hand{human?.handName ? ` — ${human.handName}` : ''}
          </Text>
          <View style={wStyles.cardRow}>
            {human?.hand.map((c, i) => (
              <Image key={`p-${i}`} source={cardImages[c]} style={wStyles.cardImg} />
            ))}
          </View>
          <Text style={wStyles.stackInfo}>
            Stack: {human?.stack ?? 0}{'  |  '}
            <Text style={{ color: sessionNet >= 0 ? '#4cff80' : '#ff5555' }}>
              Session: {sessionNet >= 0 ? '+' : ''}{sessionNet}
            </Text>
          </Text>
        </View>

        {/* Result */}
        {result
          ? <Text style={[wStyles.result, { color: RESULT_COLOR[result] }]}>{statusMsg}</Text>
          : null}

        {/* Betting panel */}
        {isHumanTurn && !isDone && (
          <View style={wStyles.bettingPanel}>
            {toCall > 0 ? <Text style={wStyles.callInfo}>To call: {toCall}</Text> : null}
            <Text style={wStyles.sliderLabel}>
              {streetMaxBet > 0 ? 'Raise to:' : 'Bet:'} {clampedBet}
            </Text>
            <BetSlider min={sliderMin} max={sliderMax} value={clampedBet} onValueChange={v => setBetValue(v)} />
            <View style={wStyles.bounds}>
              <Text style={wStyles.boundText}>Min: {sliderMin}</Text>
              <Text style={wStyles.boundText}>Max: {sliderMax}</Text>
            </View>
            <View style={wStyles.btnRow}>
              {bettingButtons(wStyles.btn, wStyles.btnText)}
            </View>
          </View>
        )}

        {/* Nav buttons */}
        <View style={wStyles.navRow}>
          <Pressable style={wStyles.btn} onPress={startHand}>
            <Text style={wStyles.btnText}>New Hand</Text>
          </Pressable>
          <Pressable style={wStyles.btn} onPress={() => onExitToWelcome?.()}>
            <Text style={wStyles.btnText}>← Menu</Text>
          </Pressable>
        </View>

      </View>
    );
  }

  // ── Mobile layout — scrollable ────────────────────────────────────────────────

  return (
    <SafeAreaView style={gameStyles.container}>
      <ScrollView
        contentContainerStyle={gameStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={gameStyles.title}>Texas Hold'em</Text>
        <Text style={gameStyles.phaseText}>{statusMsg}</Text>

        <Text style={pStyles.potText}>Pot: {pot}</Text>

        <View style={pStyles.aiGrid}>
          {aiPlayers.map(p => (
            <AiSeat key={p.id} player={p} isActive={aiThinkingId === p.id} />
          ))}
        </View>

        <View style={gameStyles.divider} />

        <Text style={gameStyles.sectionLabel}>Community</Text>
        <View style={gameStyles.handRow}>
          {community.length === 0
            ? <Text style={pStyles.empty}>—</Text>
            : community.map((c, i) => (
                <Image key={`com-${i}`} source={cardImages[c]} style={gameStyles.cardImage} />
              ))}
        </View>

        <View style={gameStyles.divider} />

        <Text style={gameStyles.sectionLabel}>
          Your Hand{human?.handName ? ` — ${human.handName}` : ''}
        </Text>
        <View style={gameStyles.handRow}>
          {human?.hand.map((c, i) => (
            <Image key={`p-${i}`} source={cardImages[c]} style={gameStyles.cardImage} />
          ))}
        </View>
        <Text style={pStyles.stackInfo}>
          Stack: {human?.stack ?? 0}{'  |  '}
          <Text style={{ color: sessionNet >= 0 ? '#4cff80' : '#ff5555' }}>
            Session: {sessionNet >= 0 ? '+' : ''}{sessionNet}
          </Text>
        </Text>

        {result
          ? <Text style={[gameStyles.message, { color: RESULT_COLOR[result] }]}>{statusMsg}</Text>
          : null}

        {isHumanTurn && !isDone && (
          <View style={pStyles.bettingPanel}>
            {toCall > 0 ? <Text style={pStyles.callInfo}>To call: {toCall}</Text> : null}
            <Text style={pStyles.sliderLabel}>
              {streetMaxBet > 0 ? 'Raise to:' : 'Bet:'} {clampedBet}
            </Text>
            <BetSlider min={sliderMin} max={sliderMax} value={clampedBet} onValueChange={v => setBetValue(v)} />
            <View style={pStyles.bounds}>
              <Text style={pStyles.boundText}>Min: {sliderMin}</Text>
              <Text style={pStyles.boundText}>Max: {sliderMax}</Text>
            </View>
            <View style={gameStyles.buttonRow}>
              {bettingButtons(gameStyles.button, gameStyles.buttonText)}
            </View>
          </View>
        )}

        <View style={gameStyles.divider} />

        <Pressable style={gameStyles.button} onPress={startHand}>
          <Text style={gameStyles.buttonText}>New Hand</Text>
        </Pressable>
        <Pressable style={[gameStyles.button, { marginTop: 6 }]} onPress={() => onExitToWelcome?.()}>
          <Text style={gameStyles.buttonText}>← Menu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Web-specific styles (no-scroll fixed layout) ──────────────────────────────

const wStyles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: Colors.bg,
    paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 6, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:  { color: Colors.gold,    fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  phase:  { color: Colors.goldDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: 1, flex: 1, textAlign: 'center', paddingHorizontal: 4 },
  pot:    { color: Colors.gold,    fontSize: 15, fontWeight: '800' },
  aiSection:   { flex: 1, justifyContent: 'center' },
  divider:     { height: 1, backgroundColor: Colors.border, opacity: 0.6, marginVertical: 4 },
  cardSection: { alignItems: 'center', paddingVertical: 3 },
  label:       { color: Colors.goldDim, fontSize: 10, fontWeight: '700',
                 textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  cardRow:     { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  cardImg: {
    width: 48, height: 70, resizeMode: 'contain', margin: 3,
    backgroundColor: Colors.white, borderRadius: 5, borderWidth: 1, borderColor: '#ccc',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
  },
  stackInfo: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  result:    { fontSize: 15, fontWeight: '800', textAlign: 'center', marginVertical: 3, letterSpacing: 0.5 },
  bettingPanel: {
    backgroundColor: Colors.bgCard, borderRadius: 10,
    padding: 8, marginVertical: 4, borderWidth: 1, borderColor: Colors.border,
  },
  callInfo:    { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  sliderLabel: { color: Colors.gold,      fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  bounds:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1, marginBottom: 2 },
  boundText:   { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  btnRow:  { flexDirection: 'row', gap: 6, marginTop: 4 },
  navRow:  { flexDirection: 'row', gap: 8, marginTop: 5 },
  btn: {
    flex: 1, backgroundColor: Colors.green, paddingVertical: 9,
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.greenLight,
  },
  btnDanger: { backgroundColor: Colors.red,    borderColor: Colors.redLight },
  btnGold:   { backgroundColor: '#7a5c00',     borderColor: Colors.goldDim  },
  btnText:   { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Mobile supplemental styles ────────────────────────────────────────────────

const pStyles = StyleSheet.create({
  potText: {
    color: Colors.gold, fontSize: 22, fontWeight: '800',
    letterSpacing: 0.5, marginBottom: 10,
  },
  aiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%', marginBottom: 6,
  },
  empty: { color: Colors.textMuted, fontSize: 24, marginVertical: 20 },
  stackInfo: {
    color: Colors.textMuted, fontSize: 13, fontWeight: '700',
    marginTop: 4, marginBottom: 4,
  },
  bettingPanel: {
    width: '100%', backgroundColor: Colors.bgCard,
    borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  callInfo: {
    color: Colors.textMuted, fontSize: 13, fontWeight: '700',
    marginBottom: 4, textAlign: 'center',
  },
  sliderLabel: {
    color: Colors.gold, fontSize: 16, fontWeight: '800',
    textAlign: 'center', marginBottom: 4,
  },
  bounds: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 2, marginBottom: 4,
  },
  boundText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
});
