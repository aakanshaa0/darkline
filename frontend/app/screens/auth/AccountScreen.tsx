import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { colors, typography } from "../../theme/tokens";

/**
 * Minimal account hub — not one of the numbered C.1 screens itself, but
 * something has to be the entry point for "Linked accounts" (#15),
 * "Session expired" (#13, previewable here since there's no real token to
 * expire), and log out. A full settings screen (notifications, etc.) is
 * still a listed Known Gap, not built here.
 */
export function AccountScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const backToHome = useAppStore((s) => s.backToHome);
  const logoutUser = useAppStore((s) => s.logoutUser);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={backToHome}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Account</Text>
      </View>
      <View style={styles.list}>
        <Pressable style={styles.row} onPress={() => navigate("linkedAccounts")}>
          <Text style={styles.rowLabel}>Linked accounts</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => navigate("sessionExpired")}>
          <Text style={styles.rowLabel}>Preview: session expired</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={logoutUser}>
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.sizes.subtitle,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  list: {
    padding: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  rowLabel: {
    fontSize: typography.sizes.subtitle,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
