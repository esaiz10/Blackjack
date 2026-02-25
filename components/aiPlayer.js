// AI Blackjack — basic strategy (player) + smart dealer logic

const getCardValue = (card) => {
  const rank = card.slice(0, -1); // Remove suit character
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return parseInt(rank, 10);
};

const getHandTotal = (hand) => {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += getCardValue(card);
    if (card.startsWith("A")) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
};

const isSoftHand = (hand) => {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += getCardValue(card);
    if (card.startsWith("A")) aces++;
  }
  const hardTotal = total - aces * 10; // All Aces as 1
  return getHandTotal(hand) > hardTotal;
};

/**
 * Returns AI decision based on basic strategy: 'hit' | 'stand' | 'double' | 'split'
 *
 * @param {string[]} playerHand   - e.g. ["AS", "7H"]
 * @param {string}   dealerUpCard - e.g. "KD"
 */
export const getAiDecision = (playerHand, dealerUpCard) => {
  const playerValue = getHandTotal(playerHand);
  const dealerUpValue = getCardValue(dealerUpCard);

  const soft = isSoftHand(playerHand);
  const isTwoCard = playerHand.length === 2;
  const canSplit =
    isTwoCard &&
    playerHand[0].slice(0, -1) === playerHand[1].slice(0, -1);

  let decision = "";

  // ── 1. Splitting ──────────────────────────────────────────────────────────
  if (canSplit) {
    const pairRank = playerHand[0].slice(0, -1);
    const pairValue = getCardValue(playerHand[0]);

    if (pairRank === "A") {
      decision = "split"; // Always split Aces
    } else if (pairValue === 8) {
      decision = "split"; // Always split 8s
    } else if (pairValue === 10) {
      // Never split 10s — fall through
    } else if (pairValue === 2 || pairValue === 3) {
      if (dealerUpValue >= 2 && dealerUpValue <= 7) decision = "split";
    } else if (pairValue === 7) {
      if (dealerUpValue >= 2 && dealerUpValue <= 7) decision = "split";
    } else if (pairValue === 6) {
      if (dealerUpValue >= 2 && dealerUpValue <= 6) decision = "split";
    } else if (pairValue === 9) {
      if (
        (dealerUpValue >= 2 && dealerUpValue <= 6) ||
        dealerUpValue === 8 ||
        dealerUpValue === 9
      )
        decision = "split";
    } else if (pairValue === 4) {
      if (dealerUpValue === 5 || dealerUpValue === 6) decision = "split";
    } else if (pairValue === 5) {
      // Treat 5s as hard 10 — never split
      if (dealerUpValue >= 2 && dealerUpValue <= 9) decision = "double";
    }
  }

  // ── 2. Doubling Down ──────────────────────────────────────────────────────
  if (!decision && isTwoCard) {
    if (soft) {
      if (playerValue === 13 || playerValue === 14) {
        if (dealerUpValue === 5 || dealerUpValue === 6) decision = "double";
      } else if (playerValue === 15 || playerValue === 16) {
        if ([4, 5, 6].includes(dealerUpValue)) decision = "double";
      } else if (playerValue === 17) {
        if (dealerUpValue >= 3 && dealerUpValue <= 6) decision = "double";
      } else if (playerValue === 18) {
        if (dealerUpValue >= 2 && dealerUpValue <= 6) decision = "double";
      }
    } else {
      if (playerValue === 9) {
        if (dealerUpValue >= 3 && dealerUpValue <= 6) decision = "double";
      } else if (playerValue === 10) {
        if (dealerUpValue >= 2 && dealerUpValue <= 9) decision = "double";
      } else if (playerValue === 11) {
        if (dealerUpValue >= 2 && dealerUpValue <= 10) decision = "double";
      }
    }
  }

  // ── 3. Hit / Stand ────────────────────────────────────────────────────────
  if (!decision) {
    if (soft) {
      if (playerValue >= 19) {
        decision = "stand";
      } else if (playerValue === 18) {
        if ([2, 7, 8].includes(dealerUpValue)) decision = "stand";
        else decision = "hit";
      } else {
        decision = "hit";
      }
    } else {
      if (playerValue >= 17) {
        decision = "stand";
      } else if (playerValue <= 11) {
        decision = "hit";
      } else if (playerValue === 12) {
        decision = dealerUpValue >= 4 && dealerUpValue <= 6 ? "stand" : "hit";
      } else if (playerValue === 13 || playerValue === 14) {
        decision = dealerUpValue >= 2 && dealerUpValue <= 6 ? "stand" : "hit";
      } else if (playerValue === 15 || playerValue === 16) {
        decision = dealerUpValue >= 2 && dealerUpValue <= 6 ? "stand" : "hit";
      }
    }
  }

  return decision || "hit";
};

/**
 * Smart dealer decision: 'hit' | 'stand'
 *
 * The dealer knows its own full hand and the player's full (revealed) hand.
 * Rules:
 *  - Always hit soft 17 or below (standard casino rule)
 *  - Always stand on hard 17 or above
 *  - Between 12–16: stand only if already beating the player, otherwise hit
 *
 * @param {string[]} dealerHand
 * @param {string[]} playerHand  — all player cards (player has already acted)
 */
export const getDealerDecision = (dealerHand, playerHand) => {
  const dealerTotal = getHandTotal(dealerHand);
  const playerTotal = getHandTotal(playerHand);
  const soft = isSoftHand(dealerHand);

  // Hit on soft 17 or below (Ace still counts as 11)
  if (soft && dealerTotal <= 17) return "hit";

  // Stand on hard 17 or above
  if (dealerTotal >= 17) return "stand";

  // dealerTotal is 12–16 (hard):
  // If player already busted, stand — we win regardless
  if (playerTotal > 21) return "stand";

  // If dealer is already strictly ahead, stand to avoid busting
  if (dealerTotal > playerTotal) return "stand";

  // Tied or behind — must hit to try to win or push
  return "hit";
};
