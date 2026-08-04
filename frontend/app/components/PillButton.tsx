import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: "filled" | "outlined";
}

export function PillButton({ label, onPress, variant = "filled" }: PillButtonProps) {
  const filled = variant === "filled";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        filled ? styles.filled : styles.outlined,
      ]}
    >
      <Text style={[styles.label, { color: filled ? colors.onAccentText : colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: shape.controlRadius,
    alignItems: "center",
  },
  filled: {
    backgroundColor: colors.accent,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: typography.sizes.subtitle,
    fontWeight: "600",
  },
});
