// screens/GameSelectScreen.js
// Game selection screen — choose between Blackjack and Poker

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';

export default function GameSelectScreen({ onBlackjack, onPoker, onBack }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.suits}>♠ ♥ ♦ ♣</Text>
        <Text style={styles.title}>Choose a Game</Text>
      </View>

      <View style={styles.divider} />

      {/* Game cards */}
      <View style={styles.cardGrid}>
        <Pressable style={[styles.gameCard, styles.blackjackCard]} onPress={onBlackjack}>
          <Text style={styles.gameIcon}>♠</Text>
          <Text style={styles.gameName}>Blackjack</Text>
          <Text style={styles.gameDesc}>Beat the dealer to 21</Text>
        </Pressable>

        <Pressable style={[styles.gameCard, styles.pokerCard]} onPress={onPoker}>
          <Text style={styles.gameIcon}>♥</Text>
          <Text style={styles.gameName}>Poker</Text>
          <Text style={styles.gameDesc}>Texas Hold'em vs AI</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  suits: {
    fontSize: 24,
    color: Colors.goldDim,
    letterSpacing: 10,
    marginBottom: 8,
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.gold,
    letterSpacing: 3,
    textShadowColor: 'rgba(255,215,0,0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },

  divider: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 32,
  },

  cardGrid: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },

  gameCard: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  blackjackCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },

  pokerCard: {
    backgroundColor: '#2a0a0a',
    borderColor: '#5a1c1c',
  },

  gameIcon: {
    fontSize: 48,
    marginBottom: 10,
    color: Colors.gold,
  },

  gameName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: 6,
  },

  gameDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },

  backText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
