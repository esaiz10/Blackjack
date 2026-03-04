// components/pokerAI.js
// AI decision making for Texas Hold'em poker

import { evaluateHand } from './pokerHandEvaluator';

const BIG_BLIND = 20;

// ── Card helpers ───────────────────────────────────────────────────────────────

function rankValue(card) {
  const v = card.slice(0, -1);
  if (v === 'A') return 14;
  if (v === 'K') return 13;
  if (v === 'Q') return 12;
  if (v === 'J') return 11;
  return parseInt(v, 10);
}

function getSuit(card) {
  return card[card.length - 1];
}

// ── Tuned params (pokerSim.js — 2026-03-04) ─────
// bluffChance=0.05  medStrongCall=0.4  medCall=0.25  balance_sd=13.081%

// ── Draw detectors ─────────────────────────────────────────────────────────────

function hasFlushDraw(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  const counts = {};
  for (const c of all) counts[getSuit(c)] = (counts[getSuit(c)] ?? 0) + 1;
  return Object.values(counts).some(n => n === 4);
}

function hasStraightDraw(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  const ranks = [...new Set(all.map(rankValue))].sort((a, b) => a - b);
  // Also treat Ace as low (1)
  if (ranks.includes(14)) ranks.unshift(1);
  for (let i = 0; i <= ranks.length - 4; i++) {
    if (ranks[i + 3] - ranks[i] <= 4) return true;
  }
  return false;
}

// ── Strength tier helpers ──────────────────────────────────────────────────────

const STRENGTH_ORDER = ['weak', 'weak_medium', 'medium', 'medium_strong', 'strong', 'very_strong'];

function loosenStrength(s) {
  const i = STRENGTH_ORDER.indexOf(s);
  return STRENGTH_ORDER[Math.min(i + 1, STRENGTH_ORDER.length - 1)];
}

// ── Hand strength (6 levels) ───────────────────────────────────────────────────
// Returns: 'very_strong' | 'strong' | 'medium_strong' | 'medium' | 'weak_medium' | 'weak'

function preflopStrength(holeCards) {
  const r1  = rankValue(holeCards[0]);
  const r2  = rankValue(holeCards[1]);
  const low  = Math.min(r1, r2);
  const high = Math.max(r1, r2);
  const suited    = getSuit(holeCards[0]) === getSuit(holeCards[1]);
  const connector = high - low === 1;

  // Pocket pairs
  if (low === high) {
    if (low >= 12) return 'very_strong';   // QQ, KK, AA
    if (low >= 10) return 'strong';        // TT, JJ
    if (low >= 7)  return 'medium_strong'; // 77–99
    return 'medium';                        // 22–66
  }

  // Ace hands
  if (high === 14) {
    if (suited)          return 'very_strong'; // AXs
    if (low >= 10)       return 'strong';      // ATo, AJo, AQo, AKo
    return 'medium';                            // A2o–A9o
  }

  // Broadway / high cards
  if (high === 13 && low >= 12) return suited ? 'strong' : 'medium_strong'; // KQ
  if (high === 13 && low >= 11) return suited ? 'medium_strong' : 'medium';  // KJ
  if (high === 12 && low >= 11) return suited ? 'medium_strong' : 'medium';  // QJ
  if (high >= 11 && suited && connector) return 'medium_strong';              // JTs, QJs

  // Suited connectors / suited gappers
  if (suited && connector && high >= 8) return 'medium'; // 78s–9Ts
  if (suited && low >= 7 && high >= 9)  return 'medium'; // suited 7-9 range

  return 'weak';
}

function postflopStrength(holeCards, communityCards) {
  const result = evaluateHand([...holeCards, ...communityCards]);
  // Scores: 9=SF/Royal, 8=Quads, 7=Full House, 6=Flush, 5=Straight,
  //         4=Trips, 3=Two Pair, 2=Pair, 1=High Card
  if (result.score >= 8) return 'very_strong';   // Quads, Straight Flush, Royal Flush
  if (result.score >= 7) return 'very_strong';   // Full House (trapping candidate)
  if (result.score >= 6) return 'strong';        // Flush
  if (result.score >= 5) return 'medium_strong'; // Straight
  if (result.score >= 4) return 'medium_strong'; // Three of a Kind
  if (result.score >= 3) return 'medium';        // Two Pair
  if (result.score >= 2) return 'weak_medium';   // One Pair

  // High card — check for draws before giving up
  if (communityCards.length < 5) {
    if (hasFlushDraw(holeCards, communityCards))    return 'medium_strong'; // strong draw
    if (hasStraightDraw(holeCards, communityCards)) return 'medium';        // weaker draw
  }
  return 'weak';
}

function evaluateStrength(holeCards, communityCards) {
  return communityCards.length === 0
    ? preflopStrength(holeCards)
    : postflopStrength(holeCards, communityCards);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get AI poker decision.
 * @param {string[]} aiHoleCards
 * @param {string[]} communityCards  — 0, 3, 4, or 5 cards
 * @param {number}   pot
 * @param {number}   aiToCall        — chips AI owes to match current bet (0 = can check)
 * @param {number}   aiStack
 * @param {number}   seatId          — 0=SB, 1=BB, 2=UTG, 3=HJ, 4=CO/BTN
 * @returns {'fold' | 'check' | 'call' | 'raise'}
 */
export function getPokerAiDecision(aiHoleCards, communityCards, pot, aiToCall, aiStack, seatId = 2) {
  let strength = evaluateStrength(aiHoleCards, communityCards);

  // Position adjustment: late position (seat 3–4) plays one tier looser preflop
  const isLatePosition = seatId >= 3;
  if (communityCards.length === 0 && isLatePosition) {
    strength = loosenStrength(strength);
  }

  const facingBet = aiToCall > 0;

  if (!facingBet) {
    // Slow-play: 20% of the time check with very strong hands to trap
    if (strength === 'very_strong' && Math.random() < 0.2) return 'check';

    // Bet/raise with strong hands
    if (strength === 'very_strong' || strength === 'strong' || strength === 'medium_strong') {
      return aiStack > 0 ? 'raise' : 'check';
    }

    // Bluff: 5% chance to raise with weaker holdings (sim-tuned)
    if (aiStack > 0 && Math.random() < 0.05) return 'raise';

    return 'check';
  }

  // Facing a bet — real pot odds: how much of the final pot is the call?
  const callRatio = aiToCall / (pot + aiToCall);

  switch (strength) {
    case 'very_strong':
      // Re-raise to build the pot; call if can't raise
      return aiStack >= aiToCall + BIG_BLIND ? 'raise' : 'call';

    case 'strong':
      // Re-raise if pot odds are reasonable, otherwise call
      return (callRatio <= 0.6 && aiStack >= aiToCall + BIG_BLIND) ? 'raise' : 'call';

    case 'medium_strong':
      // Call with good pot odds; fold to oversized bets
      return callRatio <= 0.4 ? 'call' : 'fold';

    case 'medium':
      return callRatio <= 0.25 ? 'call' : 'fold';

    case 'weak_medium':
      return callRatio <= 0.15 ? 'call' : 'fold';

    default: // 'weak'
      return 'fold';
  }
}
