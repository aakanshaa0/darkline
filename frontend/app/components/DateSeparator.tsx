import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/tokens";

/**
 * Day marker between message groups. MessageBubble shows time only, so this
 * is what tells you *which* day a run of messages belongs to.
 */
export function DateSeparator({ iso }: { iso: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{formatDay(iso)}</Text>
    </View>
  );
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today" / "Yesterday" / a written date — compared by local calendar day, not elapsed hours. */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    // Only show the year when it isn't the current one.
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** True when `iso` falls on a different calendar day than `previousIso`. */
export function isNewDay(iso: string, previousIso: string | undefined): boolean {
  if (!previousIso) return true;
  const a = new Date(previousIso);
  const b = new Date(iso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return startOfDay(a) !== startOfDay(b);
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: typography.sizes.sectionLabel,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
});
