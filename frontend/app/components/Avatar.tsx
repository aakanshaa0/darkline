import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

export function Avatar({ initials, size = 38 }: { initials: string; size?: number }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    color: colors.textPrimary,
  },
});
