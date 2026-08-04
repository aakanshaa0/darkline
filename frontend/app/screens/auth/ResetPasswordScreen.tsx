import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, TextField } from "../../components";
import { colors, typography } from "../../theme/tokens";

/** Reached after "clicking" the emailed reset link (simulated — no real email flow here). */
export function ResetPasswordScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const canSubmit = password.length > 0 && password === confirmPassword;

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Set a new password</Text>
        <View style={styles.fields}>
          <TextField placeholder="New password" value={password} onChangeText={setPassword} secureTextEntry />
          <TextField
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        <PillButton label="Reset password" variant="filled" onPress={() => canSubmit && navigate("login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  body: {
    padding: 32,
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
});
