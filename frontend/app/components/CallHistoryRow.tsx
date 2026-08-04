import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";
import { Avatar } from "./Avatar";
import type { CallHistoryEntry } from "@shared/store";

export function CallHistoryRow({ entry, onPress }: { entry: CallHistoryEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Avatar initials={entry.initials} size={shape.avatarMd} />
      <View style={styles.textCol}>
        <Text style={[styles.name, entry.missed && { color: colors.accent }]} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {entry.kindLabel} · {entry.modeLabel} · {entry.time}
        </Text>
      </View>
      <Text style={styles.duration}>{entry.duration}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.subtitle,
    color: colors.textPrimary,
  },
  sub: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
  duration: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});
