import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { Logo } from "../../components";
import { colors, typography } from "../../theme/tokens";

export function SplashScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <Pressable style={styles.container} onPress={() => navigate("auth")}>
      <Logo size={56} />
      <Text style={styles.wordmark}>darkline</Text>
      <Text style={styles.tagline}>always connected, online or off</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.background,
  },
  wordmark: {
    fontSize: typography.sizes.title,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
