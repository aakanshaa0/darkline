import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, TextField } from "../../components";
import { colors, typography } from "../../theme/tokens";

export function LoginScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const loginWithEmail = useAppStore((s) => s.loginWithEmail);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("auth")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Log in</Text>
        <View style={styles.fields}>
          <TextField placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextField placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        <Pressable onPress={() => navigate("forgotPassword")}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        {authError && <Text style={styles.error}>{authError}</Text>}
        <PillButton
          label={authLoading ? "Logging in…" : "Log in"}
          variant="filled"
          onPress={() => email && password && !authLoading && loginWithEmail(email, password)}
        />
        <Pressable onPress={() => navigate("accountLocked")}>
          <Text style={styles.trouble}>Trouble signing in?</Text>
        </Pressable>
        <Pressable onPress={() => navigate("signup")}>
          <Text style={styles.footerLink}>Don't have an account? Sign up</Text>
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
    marginBottom: 4,
  },
  fields: {
    gap: 12,
  },
  link: {
    fontSize: typography.sizes.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  error: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
  },
  trouble: {
    textAlign: "center",
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
  footerLink: {
    textAlign: "center",
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
