import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, OtpInput } from "../../components";
import { colors, typography } from "../../theme/tokens";

const RESEND_SECONDS = 30;

/** Covers both #8 (OTP verification, with resend/countdown) and #9 (error/retry state — driven by real authError now, not a simulated toggle). */
export function OTPVerifyScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const pendingPhone = useAppStore((s) => s.pendingPhone);
  const sendPhoneOtp = useAppStore((s) => s.sendPhoneOtp);
  const verifyPhoneOtpCode = useAppStore((s) => s.verifyPhoneOtpCode);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function handleResend() {
    if (!pendingPhone) return;
    setSecondsLeft(RESEND_SECONDS);
    setCode("");
    sendPhoneOtp(pendingPhone);
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("phoneEntry")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to your phone.</Text>
        <OtpInput value={code} onChange={setCode} error={!!authError} />
        {authError && <Text style={styles.errorText}>{authError}</Text>}
        <PillButton
          label={authLoading ? "Verifying…" : "Verify"}
          variant="filled"
          onPress={() => code.length === 6 && !authLoading && verifyPhoneOtpCode(code)}
        />
        <Pressable disabled={secondsLeft > 0} onPress={handleResend}>
          <Text style={[styles.resend, secondsLeft > 0 && styles.resendDisabled]}>
            {secondsLeft > 0 ? `Resend code in 0:${String(secondsLeft).padStart(2, "0")}` : "Resend code"}
          </Text>
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
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
    marginTop: -8,
  },
  resend: {
    textAlign: "center",
    fontSize: typography.sizes.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  resendDisabled: {
    color: colors.textSecondary,
  },
});
