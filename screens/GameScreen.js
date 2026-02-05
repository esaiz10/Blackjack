import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";

import { gameStyles } from "../styles/GameStyles";
import { makeNewDeck, shuffleDeck, deal } from "../components/deck";
import { cardImages } from "../components/cardImages";

import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "blackjack_stats_v1";

async function recordResult(result) {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  let stats = { wins: 0, losses: 0 };

  if (raw) {
    try {
      stats = { ...stats, ...JSON.parse(raw) };
    } catch {}
  }

  if (result === "win") stats.wins += 1;
  if (result === "loss") stats.losses += 1;

  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export default function GameScreen({ onExitToWelcome }) {
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);

  // Calculate blackjack score (A = 11 or 1)
  const getScore = (hand) => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      const value = card.slice(0, -1); // "A", "10", "K"...
      if (value === "A") {
        total += 11;
        aces += 1;
      } else if (value === "K" || value === "Q" || value === "J") {
        total += 10;
      } else {
        total += Number(value);
      }
    }

    // Convert Ace from 11 to 1 if busting
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

  const hitPlayer = async () => {
    if (gameOver) return;

    const result = deal(deck, 1);
    const nextHand = [...player, ...result.hand];

    setPlayer(nextHand);
    setDeck(result.deck);

    if (getScore(nextHand) > 21) {
      setMessage("You busted — Dealer wins.");
      setGameOver(true);
      await recordResult("loss");
    }
  };

  const stand = async () => {
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
      setGameOver(true);
      await recordResult("win");
    } else if (dealerScore > playerScore) {
      setMessage("Dealer wins.");
      setGameOver(true);
      await recordResult("loss");
    } else {
      setMessage("Push (tie).");
      setGameOver(true);
      // No win/loss recorded for ties
    }
  };

  const safeImage = (code) => cardImages[code] ?? cardImages.BACK;

  return (
    <View style={gameStyles.container}>
      <Text style={gameStyles.title}>Blackjack</Text>

      {/* Dealer */}
      <Text style={gameStyles.sectionLabel}>Dealer</Text>
      <Text style={gameStyles.scoreText}>
        Score: {dealer.length ? getScore(dealer) : "-"}
      </Text>

      <View style={gameStyles.handRow}>
        {dealer.map((c, idx) => (
          <Image
            key={`${c}-${idx}`}
            source={safeImage(c)}
            style={gameStyles.cardImage}
          />
        ))}
      </View>

      {/* Player */}
      <Text style={[gameStyles.sectionLabel, { marginTop: 16 }]}>Player</Text>
      <Text style={gameStyles.scoreText}>
        Score: {player.length ? getScore(player) : "-"}
      </Text>

      <View style={gameStyles.handRow}>
        {player.map((c, idx) => (
          <Image
            key={`${c}-${idx}`}
            source={safeImage(c)}
            style={gameStyles.cardImage}
          />
        ))}
      </View>

      {/* Message */}
      {message ? <Text style={gameStyles.message}>{message}</Text> : null}

      {/* Buttons */}
      <Pressable
        style={[gameStyles.button, gameOver && gameStyles.buttonDisabled]}
        onPress={hitPlayer}
        disabled={gameOver}
      >
        <Text style={gameStyles.buttonText}>Hit</Text>
      </Pressable>

      <Pressable
        style={[gameStyles.button, gameOver && gameStyles.buttonDisabled]}
        onPress={stand}
        disabled={gameOver}
      >
        <Text style={gameStyles.buttonText}>Stand</Text>
      </Pressable>

      <Pressable style={gameStyles.button} onPress={startGame}>
        <Text style={gameStyles.buttonText}>New Game</Text>
      </Pressable>

      {/* Back to Welcome (uses prop) */}
      <Pressable
        style={gameStyles.button}
        onPress={() => onExitToWelcome && onExitToWelcome()}
      >
        <Text style={gameStyles.buttonText}>Back to Welcome</Text>
      </Pressable>

      <Pressable style={gameStyles.button} onPress={() => signOut(auth)}>
        <Text style={gameStyles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}
