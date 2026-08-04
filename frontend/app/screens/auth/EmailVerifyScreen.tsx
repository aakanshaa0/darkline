import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, OtpInput } from "../../components";
import { colors, typography } from "../../theme/tokens";

export function EmailVerifyScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const verifyEmailCode = useAppStore((s) => s.verifyEmailCode);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [code, setCode] = useState("");

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("signup")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code we just emailed you.</Text>
        <OtpInput value={code} onChange={setCode} error={!!authError} />
        {authError && <Text style={styles.error}>{authError}</Text>}
        <PillButton
          label={authLoading ? "Verifying…" : "Verify"}
          variant="filled"
          onPress={() => code.length === 6 && !authLoading && verifyEmailCode(code)}
        />
        <Pressable>
          <Text style={styles.resend}>Resend code</Text>
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
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  error: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
  },
  resend: {
    textAlign: "center",
    fontSize: typography.sizes.caption,
    color: colors.accent,
    fontWeight: "600",
  },
});
