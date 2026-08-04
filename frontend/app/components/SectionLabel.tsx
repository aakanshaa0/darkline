import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/tokens";

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.sectionLabel,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
});
