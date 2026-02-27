import { StyleSheet } from "react-native";
import { Colors } from "./theme";

export const gameStyles = StyleSheet.create({
  // ── Layout ───────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  scrollContent: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    width: "100%",
  },

  // ── Typography ────────────────────────────────────────────────────────────
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.gold,
    letterSpacing: 2,
    textShadowColor: "rgba(255,215,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.goldDim,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 2,
  },

  scoreText: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: 6,
  },

  message: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.gold,
    marginVertical: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardBack: {
    width: 72,
    height: 108,
    margin: 5,
    backgroundColor: "#1a3a8f",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },

  cardBackInner: {
    width: 54,
    height: 90,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "#1530a0",
  },

  cardImage: {
    width: 72,
    height: 108,
    resizeMode: "contain",
    margin: 5,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },

  handRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    minHeight: 118,
  },

  // ── Table felt divider ────────────────────────────────────────────────────
  divider: {
    width: "90%",
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
    opacity: 0.6,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  button: {
    backgroundColor: Colors.green,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },

  buttonDanger: {
    backgroundColor: Colors.red,
    borderColor: Colors.redLight,
  },

  buttonGold: {
    backgroundColor: "#7a5c00",
    borderColor: Colors.goldDim,
  },

  buttonDisabled: {
    opacity: 0.35,
  },

  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── AI toggle & hint ──────────────────────────────────────────────────────
  aiToggle: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },

  aiToggleActive: {
    backgroundColor: "#0f3d20",
    borderColor: Colors.greenLight,
  },

  aiToggleText: {
    color: Colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  hintBox: {
    backgroundColor: "rgba(46,140,83,0.15)",
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.greenLight,
  },

  hintText: {
    color: Colors.greenLight,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  phaseText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.goldDim,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  resultBadge: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
  },

});
