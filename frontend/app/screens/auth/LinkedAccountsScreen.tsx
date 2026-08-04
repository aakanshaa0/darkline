import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { colors, typography } from "../../theme/tokens";

interface LinkedAccount {
  id: string;
  label: string;
  detail: string;
  linked: boolean;
}

const INITIAL: LinkedAccount[] = [
  { id: "email", label: "Email", detail: "jordan@email.com", linked: true },
  { id: "phone", label: "Phone", detail: "Not linked", linked: false },
  { id: "google", label: "Google", detail: "Not linked", linked: false },
];

export function LinkedAccountsScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const [accounts, setAccounts] = useState(INITIAL);

  function toggle(id: string) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, linked: !a.linked, detail: !a.linked ? "Linked" : "Not linked" }
          : a,
      ),
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate("account")}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Linked accounts</Text>
      </View>
      <View style={styles.list}>
        {accounts.map((a) => (
          <View key={a.id} style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.label}>{a.label}</Text>
              <Text style={styles.detail}>{a.detail}</Text>
            </View>
            <Pressable onPress={() => toggle(a.id)}>
              <Text style={[styles.action, { color: a.linked ? colors.destructive : colors.accent }]}>
                {a.linked ? "Unlink" : "Link"}
              </Text>
            </Pressable>
          </View>
        ))}
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
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.subtitle,
    color: colors.textPrimary,
  },
  detail: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
  action: {
    fontSize: typography.sizes.caption,
    fontWeight: "600",
  },
});
