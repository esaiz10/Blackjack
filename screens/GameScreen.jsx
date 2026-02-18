import React, { useEffect, useState } from "react";
import { makeNewDeck, shuffleDeck, deal } from "../components/deck.js";
import { cardImages } from "../components/cardImages.js";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig.js";

export default function GameScreen() {
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const getScore = (hand) => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      const value = card.slice(0, -1);
      if (value === "A") {
        total += 11;
        aces += 1;
      } else if (value === "K" || value === "Q" || value === "J") {
        total += 10;
      } else {
        total += Number(value);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  };

  const startGame = () => {
    let d = shuffleDeck(makeNewDeck());

    const dealtPlayer = deal(d, 2);
    const playerHand = dealtPlayer.hand;
    d = dealtPlayer.deck;

    const dealtDealer = deal(d, 2);
    const dealerHand = dealtDealer.hand;
    d = dealtDealer.deck;

    setPlayer(playerHand);
    setDealer(dealerHand);
    setDeck(d);
    setMessage("");
    setGameOver(false);
  };

  useEffect(() => {
    startGame();
  }, []);

  const hitPlayer = () => {
    if (gameOver) return;

    const result = deal(deck, 1);
    const nextHand = [...player, ...result.hand];

    setPlayer(nextHand);
    setDeck(result.deck);

    if (getScore(nextHand) > 21) {
      setMessage("You busted — Dealer wins.");
      setGameOver(true);
    }
  };

  const stand = () => {
    if (gameOver) return;

    let d = deck;
    let dealerHand = [...dealer];

    while (getScore(dealerHand) < 17) {
      const draw = deal(d, 1);
      d = draw.deck;
      dealerHand = [...dealerHand, ...draw.hand];
    }

    const playerScore = getScore(player);
    const dealerScore = getScore(dealerHand);

    setDeck(d);
    setDealer(dealerHand);

    if (dealerScore > 21 || playerScore > dealerScore) {
      setMessage("You win!");
    } else if (dealerScore > playerScore) {
      setMessage("Dealer wins.");
    } else {
      setMessage("Push (tie).");
    }

    setGameOver(true);
  };

  const safeImage = (code) => cardImages[code] ?? cardImages.BACK;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Blackjack</h1>

      {/* Dealer */}
      <span style={styles.sectionLabel}>Dealer</span>
      <span style={styles.scoreText}>
        Score: {dealer.length ? getScore(dealer) : "-"}
      </span>

      <div style={styles.handRow}>
        {dealer.map((c, idx) => (
          <img
            key={`${c}-${idx}`}
            src={safeImage(c)}
            alt={c}
            style={styles.cardImage}
          />
        ))}
      </div>

      {/* Player */}
      <span style={{ ...styles.sectionLabel, marginTop: 16 }}>Player</span>
      <span style={styles.scoreText}>
        Score: {player.length ? getScore(player) : "-"}
      </span>

      <div style={styles.handRow}>
        {player.map((c, idx) => (
          <img
            key={`${c}-${idx}`}
            src={safeImage(c)}
            alt={c}
            style={styles.cardImage}
          />
        ))}
      </div>

      {/* Message */}
      {message ? <span style={styles.message}>{message}</span> : null}

      {/* Buttons */}
      <button
        style={{ ...styles.button, ...(gameOver ? styles.buttonDisabled : {}) }}
        onClick={hitPlayer}
        disabled={gameOver}
      >
        Hit
      </button>

      <button
        style={{ ...styles.button, ...(gameOver ? styles.buttonDisabled : {}) }}
        onClick={stand}
        disabled={gameOver}
      >
        Stand
      </button>

      <button style={styles.button} onClick={startGame}>
        New Game
      </button>

      <button style={styles.button} onClick={() => signOut(auth)}>
        Log Out
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#0b6623",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  sectionLabel: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scoreText: {
    color: "white",
    fontSize: 14,
    marginBottom: 8,
  },
  cardImage: {
    width: 100,
    height: 150,
    objectFit: "contain",
    margin: 6,
    backgroundColor: "white",
    borderRadius: 6,
    border: "1px solid #111",
  },
  handRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#222",
    color: "white",
    padding: "12px 24px",
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  message: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
};
