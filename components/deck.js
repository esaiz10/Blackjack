const suits = ["H", "D", "C", "S"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function makeNewDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push(value + suit);
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function deal(deck, count) {
  const hand = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { hand, deck: remaining };
}
