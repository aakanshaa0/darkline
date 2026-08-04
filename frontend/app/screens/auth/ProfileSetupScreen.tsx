import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { usersApi, ApiError } from "@shared/api";
import { PillButton, TextField } from "../../components";
import { colors, typography } from "../../theme/tokens";

/** Reached from the phone-signup path, where POST /auth/phone/verify-otp creates a bare account with just a phone number. */
export function ProfileSetupScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name || !username) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.updateMe({ name, username });
      navigate("biometricPrompt");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>add photo</Text>
      </View>
      <TextField placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField placeholder="Username" value={username} onChangeText={setUsername} />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.continueButton}>
        <PillButton label={loading ? "Saving…" : "Continue"} variant="filled" onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
    backgroundColor: colors.background,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  error: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
  },
  continueButton: {
    width: "100%",
    marginTop: 8,
  },
});
