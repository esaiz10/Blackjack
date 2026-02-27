// screens/GameSelectScreen.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';

export default function GameSelectScreen({ onBlackjack, onPoker, onBack }) {
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.suitRow}>♠   ♥   ♦   ♣</Text>
        <Text style={styles.title}>Choose a Game</Text>
        <Text style={styles.subtitle}>Select your table</Text>
      </View>

      <View style={styles.rule} />

      {/* ── Game cards ── */}
      <View style={styles.cardGrid}>

        <Pressable
          style={({ pressed }) => [styles.gameCard, styles.bjCard, pressed && styles.cardPressed]}
          onPress={onBlackjack}
        >
          <Text style={styles.cardSuit}>♠</Text>
          <Text style={styles.cardName}>Blackjack</Text>
          <View style={styles.cardRule} />
          <Text style={styles.cardRule1}>Beat the dealer</Text>
          <Text style={styles.cardRule2}>Get closest to 21</Text>
          <Text style={styles.cardRule2}>Hit, Stand, Double Down</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.gameCard, styles.pkCard, pressed && styles.cardPressed]}
          onPress={onPoker}
        >
          <Text style={[styles.cardSuit, { color: '#ff7070' }]}>♥</Text>
          <Text style={styles.cardName}>Poker</Text>
          <View style={[styles.cardRule, { backgroundColor: '#5a1c1c' }]} />
          <Text style={styles.cardRule1}>Texas Hold'em</Text>
          <Text style={styles.cardRule2}>1 human vs 4 AI</Text>
          <Text style={styles.cardRule2}>Raise, Call, Fold</Text>
        </Pressable>

      </View>

      {/* ── Back ── */}
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        onPress={onBack}
      >
        <Text style={styles.backText}>← Back to Menu</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 20,
  },

  suitRow: {
    fontSize: 18,
    color: Colors.goldDim,
    letterSpacing: 10,
    marginBottom: 14,
    opacity: 0.75,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.gold,
    letterSpacing: 3,
    textShadowColor: 'rgba(255,215,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },

  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },

  rule: {
    width: 60,
    height: 1.5,
    backgroundColor: Colors.goldDeep,
    marginBottom: 28,
    borderRadius: 1,
  },

  cardGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
  },

  gameCard: {
    flex: 1,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },

  cardPressed: {
    opacity: 0.85,
  },

  bjCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },

  pkCard: {
    backgroundColor: '#1a0909',
    borderColor: '#4a1515',
  },

  cardSuit: {
    fontSize: 52,
    color: Colors.gold,
    marginBottom: 10,
    lineHeight: 58,
  },

  cardName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  cardRule: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },

  cardRule1: {
    fontSize: 13,
    color: Colors.goldDim,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  cardRule2: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 3,
    letterSpacing: 0.2,
    textAlign: 'center',
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
