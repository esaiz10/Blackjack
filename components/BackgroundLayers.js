import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../styles/theme";

export default function BackgroundLayers() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.glow, s.glowTop]} />
      <View style={[s.glow, s.glowLeft]} />
      <View style={[s.glow, s.glowRight]} />
      <View style={s.vignette} />
    </View>
  );
}

const s = StyleSheet.create({
  glow: {
    position: "absolute",
    borderRadius: 400,
    opacity: 0.5,
  },
  glowTop: {
    width: 520,
    height: 520,
    top: -260,
    left: -140,
    backgroundColor: Colors.bgGlowTop,
  },
  glowLeft: {
    width: 460,
    height: 460,
    bottom: -220,
    left: -220,
    backgroundColor: Colors.bgGlowLeft,
  },
  glowRight: {
    width: 520,
    height: 520,
    bottom: -260,
    right: -220,
    backgroundColor: Colors.bgGlowRight,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
});
