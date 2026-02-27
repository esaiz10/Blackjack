// components/pokerHandEvaluator.js
// Pure-function Texas Hold'em hand evaluator
// Card format: "${value}${suit}"  e.g. "AS", "10H", "KD"

// ── Rank helpers ──────────────────────────────────────────────────────────────

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

// ── Combinations ──────────────────────────────────────────────────────────────

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// ── 5-card evaluator ──────────────────────────────────────────────────────────

function evaluate5(cards) {
  const ranks = cards.map(rankValue).sort((a, b) => b - a);
  const suits = cards.map(getSuit);

  const isFlush = suits.every(s => s === suits[0]);

  const uniqueRanks = new Set(ranks);
  const isNormalStraight = ranks[0] - ranks[4] === 4 && uniqueRanks.size === 5;
  const isWheelStraight = uniqueRanks.has(14) && uniqueRanks.has(2)
    && uniqueRanks.has(3) && uniqueRanks.has(4) && uniqueRanks.has(5);
  const isStraight = isNormalStraight || isWheelStraight;
  const straightHigh = isNormalStraight ? ranks[0] : 5;

  if (isStraight && isFlush) {
    const label = ranks[0] === 14 && ranks[1] === 13 ? 'Royal Flush' : 'Straight Flush';
    return { score: 9, label, tiebreakers: [straightHigh] };
  }

  // Build frequency map
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;

  // Sort entries: primary by count desc, secondary by rank desc
  const byCount = Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]));
  const counts = byCount.map(e => e[1]);
  const tiebreakers = byCount.map(e => Number(e[0]));

  if (counts[0] === 4) return { score: 8, label: 'Four of a Kind', tiebreakers };
  if (counts[0] === 3 && counts[1] === 2) return { score: 7, label: 'Full House', tiebreakers };
  if (isFlush) return { score: 6, label: 'Flush', tiebreakers: ranks };
  if (isStraight) return { score: 5, label: 'Straight', tiebreakers: [straightHigh] };
  if (counts[0] === 3) return { score: 4, label: 'Three of a Kind', tiebreakers };
  if (counts[0] === 2 && counts[1] === 2) return { score: 3, label: 'Two Pair', tiebreakers };
  if (counts[0] === 2) return { score: 2, label: 'Pair', tiebreakers };
  return { score: 1, label: 'High Card', tiebreakers: ranks };
}

// Compare two evaluated results (returns positive if a beats b)
function compareResult(a, b) {
  if (a.score !== b.score) return a.score - b.score;
  const len = Math.min(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  }
  return 0;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluate the best 5-card hand from 5–7 cards.
 * Returns { score: 1-9, label: string, tiebreakers: number[] }
 */
export function evaluateHand(cards) {
  if (cards.length <= 5) return evaluate5(cards);
  const combos = combinations(cards, 5);
  let best = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || compareResult(result, best) > 0) best = result;
  }
  return best;
}

/**
 * Compare two complete card sets (hole + community).
 * Returns 1 if hand1Cards wins, -1 if hand2Cards wins, 0 for tie.
 */
export function compareHands(hand1Cards, hand2Cards) {
  const h1 = evaluateHand(hand1Cards);
  const h2 = evaluateHand(hand2Cards);
  const cmp = compareResult(h1, h2);
  if (cmp > 0) return 1;
  if (cmp < 0) return -1;
  return 0;
}
