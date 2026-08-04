import React from "react";
import { Text, StyleSheet } from "react-native";
import { callBanner } from "../theme/tokens";

export function CallBanner({ mode, text }: { mode: "internet" | "local"; text: string }) {
  const palette = callBanner[mode];
  return (
    <Text style={[styles.banner, { backgroundColor: palette.bg, color: palette.text }]}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
