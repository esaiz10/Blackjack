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
