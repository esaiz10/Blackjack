// components/pokerAI.js
// AI decision making for Texas Hold'em poker

import { evaluateHand } from './pokerHandEvaluator';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Pre-flop strength estimate (0–1) ─────────────────────────────────────────

function preflopStrength(holeCards) {
  const [c1, c2] = holeCards;
  const r1 = rankValue(c1);
  const r2 = rankValue(c2);
  const suited = getSuit(c1) === getSuit(c2);
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);
  const isPair = r1 === r2;
  const gap = high - low;

  if (isPair) {
    // AA=1.0, KK≈0.96, 22≈0.58
    return 0.58 + (high - 2) * 0.015;
  }

  // Base strength from high + low cards
  let strength = ((high - 2) / 12) * 0.55 + ((low - 2) / 12) * 0.25;
  if (suited) strength += 0.07;
  if (gap === 1) strength += 0.05; // connected
  if (gap === 0) strength += 0.03; // shouldn't happen (pair handled above)

  return Math.min(strength, 0.92);
}

// ── Post-flop strength (0–1) from hand score ──────────────────────────────────

function postflopStrength(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  const result = evaluateHand(allCards);
  // score 1–9 → normalize to 0–1
  return (result.score - 1) / 8;
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
  const isPreflop = communityCards.length === 0;
  const strength = isPreflop
    ? preflopStrength(aiHoleCards)
    : postflopStrength(aiHoleCards, communityCards);

  const facingBet = aiToCall > 0;

  if (isPreflop) {
    if (strength > 0.78) return 'raise';
    if (strength > 0.48) return facingBet ? 'call' : 'check';
    return facingBet ? 'fold' : 'check';
  }

  // Post-flop thresholds
  if (strength > 0.625) return 'raise';
  if (strength > 0.25) return facingBet ? 'call' : 'check';
  return facingBet ? 'fold' : 'check';
}
