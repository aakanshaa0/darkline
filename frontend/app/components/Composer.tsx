import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";

export function Composer({ onSend }: { onSend: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.placeholder}>Message…</Text>
      </View>
      <Pressable onPress={onSend} style={styles.sendButton}>
        <Text style={styles.sendIcon}>➤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: shape.pillRadius,
    backgroundColor: colors.surfaceRaised,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  placeholder: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    fontSize: 14,
    color: colors.onAccentText,
  },
});
