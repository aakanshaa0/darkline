import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, TextField } from "../../components";
import { colors, typography } from "../../theme/tokens";

export function ForgotPasswordScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const [email, setEmail] = useState("");

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("login")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>
        <TextField placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <PillButton label="Send reset link" variant="filled" onPress={() => navigate("resetPassword")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    padding: 16,
  },
  backText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  body: {
    flex: 1,
    padding: 32,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
