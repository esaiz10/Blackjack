import { StyleSheet } from "react-native";
import { Colors } from "./theme";

export const gameStyles = StyleSheet.create({
  // ── Layout ───────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  scrollContent: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
  },

  // ── Typography ────────────────────────────────────────────────────────────
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 3,
    textShadowColor: "rgba(255,215,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 4,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.goldDim,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  scoreText: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: 0.5,
  },

  message: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.gold,
    marginVertical: 10,
    textAlign: "center",
    letterSpacing: 1,
  },

  phaseText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.goldDim,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  // ── Felt section panels ───────────────────────────────────────────────────
  feltPanel: {
    width: "100%",
    backgroundColor: Colors.felt,
    borderRadius: 14,
    padding: 14,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  feltPanelActive: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },

  feltPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardBack: {
    width: 70,
    height: 105,
    margin: 4,
    backgroundColor: Colors.cardBlue,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 10,
  },

  cardBackInner: {
    width: 54,
    height: 88,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: Colors.cardBlueIn,
  },

  cardImage: {
    width: 70,
    height: 105,
    resizeMode: "contain",
    margin: 4,
    backgroundColor: Colors.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 10,
  },

  handRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    width: "85%",
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
    opacity: 0.7,
  },

  // ── Result banner ─────────────────────────────────────────────────────────
  resultBanner: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 1.5,
  },

  resultBannerText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    width: "100%",
  },

  button: {
    flex: 1,
    backgroundColor: Colors.green,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 11,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDanger: {
    backgroundColor: Colors.red,
    borderColor: Colors.redLight,
  },

  buttonGold: {
    backgroundColor: Colors.goldDeep,
    borderColor: Colors.goldDim,
  },

  buttonDisabled: {
    opacity: 0.28,
  },

  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── Hint box ──────────────────────────────────────────────────────────────
  hintBox: {
    backgroundColor: "rgba(40,128,74,0.15)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    width: "100%",
    alignItems: "center",
  },

  hintText: {
    color: Colors.greenLight,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ── Legacy aliases ─────────────────────────────────────────────────────────
  aiToggle:       { display: "none" },
  aiToggleActive: { display: "none" },
  aiToggleText:   { display: "none" },
  resultBadge:    { display: "none" },
  scoreSoft:      { fontSize: 13, color: Colors.goldDim, fontWeight: "600" },
});
