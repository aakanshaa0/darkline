import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/tokens";

/** Placeholder copy for a list section that has nothing in it yet. */
export function EmptyText({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
});
