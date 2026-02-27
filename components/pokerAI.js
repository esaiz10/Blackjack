// components/pokerAI.js
// AI decision making for Texas Hold'em poker
// Logic ported from poker_ai.py

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
    if (low >= 12) return 'very_strong';  // QQ, KK, AA
    if (low >= 8)  return 'medium';       // 88–JJ
    return 'weak';                         // 22–77
  }

  // At least one high card (J or better)
  if (high >= 11) {
    if (high === 14) {
      // Ace in hand — any suited Ace is very strong; any offsuit Ace is medium
      return suited ? 'very_strong' : 'medium';
    }
    // J–K without Ace
    if (suited && connector && high >= 12) return 'medium'; // QJs, KQs
    if (suited && low >= 10 && high >= 13) return 'medium'; // KTs
  }

  // Suited connectors / suited gappers in mid-range
  if (suited && connector && high >= 8)   return 'medium'; // 78s–9Ts
  if (suited && low >= 7  && high >= 9)   return 'medium'; // suited 7-9 range

  return 'weak';
}

function postflopStrength(holeCards, communityCards) {
  const result = evaluateHand([...holeCards, ...communityCards]);
  // JS evaluator scores: 9=SF/Royal, 8=Quads, 7=Full House, 6=Flush,
  //   5=Straight, 4=Trips, 3=Two Pair, 2=Pair, 1=High Card
  // Mapped to match Python hand_type_id thresholds (>= 7, >= 5, >= 4, >= 2, >= 1)
  if (result.score >= 8) return 'very_strong';   // Quads, Straight Flush, Royal Flush
  if (result.score >= 6) return 'strong';         // Full House, Flush
  if (result.score >= 5) return 'medium_strong';  // Straight
  if (result.score >= 3) return 'medium';          // Three of a Kind, Two Pair
  if (result.score >= 2) return 'weak_medium';    // One Pair
  return 'weak';                                   // High Card
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
 * @returns {'fold' | 'check' | 'call' | 'raise'}
 */
export function getPokerAiDecision(aiHoleCards, communityCards, pot, aiToCall, aiStack) {
  const strength   = evaluateStrength(aiHoleCards, communityCards);
  const facingBet  = aiToCall > 0;

  if (!facingBet) {
    // Can check — bet/raise with strong hands, check with everything else
    if (strength === 'very_strong' || strength === 'strong' || strength === 'medium_strong') {
      return aiStack > 0 ? 'raise' : 'check';
    }
    return 'check';
  }

  // Facing a bet — use call ratio for pot-odds-style decision
  const callRatio = aiStack > 0 ? aiToCall / aiStack : Infinity;

  switch (strength) {
    case 'very_strong':
      // Always stay in; re-raise when possible
      return aiStack >= aiToCall + BIG_BLIND ? 'raise' : 'call';

    case 'strong':
      // Re-raise if affordable and not too large relative to stack; else call
      return (callRatio <= 1.0 && aiStack >= aiToCall + BIG_BLIND) ? 'raise' : 'call';

    case 'medium_strong':
      return callRatio <= 0.5 ? 'call' : 'fold';

    case 'medium':
      return callRatio <= 0.2 ? 'call' : 'fold';

    case 'weak_medium':
      return (callRatio <= 0.1 && aiToCall <= BIG_BLIND * 2) ? 'call' : 'fold';

    default: // 'weak'
      return (callRatio <= 0.05 && aiToCall <= BIG_BLIND) ? 'call' : 'fold';
  }
}
