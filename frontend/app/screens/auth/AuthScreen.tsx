import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton } from "../../components";
import { colors, typography } from "../../theme/tokens";

/**
 * Method picker (Part C.1 #1). "Continue with Google" routes to
 * AccountExistsScreen here — that's the only Google-specific screen in the
 * spec (#10), so this is where a click-through demo can actually reach it;
 * a real Google sign-in would only show that screen on an email collision.
 */
export function AuthScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Sign in to start chatting, online or off.</Text>
      <View style={styles.buttons}>
        <PillButton label="Continue with email" variant="filled" onPress={() => navigate("signup")} />
        <PillButton label="Continue with phone" variant="outlined" onPress={() => navigate("phoneEntry")} />
        <PillButton label="Continue with Google" variant="outlined" onPress={() => navigate("accountExists")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  buttons: {
    gap: 12,
  },
});
