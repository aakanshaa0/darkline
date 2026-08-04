import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, TextField, Checkbox } from "../../components";
import { colors, typography } from "../../theme/tokens";

/**
 * Sign up (Part C.1 #2), with terms & privacy consent (#12) merged in as a
 * checkbox rather than a separate standalone screen — the spec calls out
 * either option is fine. Collects name/username upfront since POST
 * /auth/signup requires them (ProfileSetupScreen still exists for the
 * phone-signup path, where the backend creates the account from just a
 * phone number).
 */
export function SignUpScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const signupWithEmail = useAppStore((s) => s.signupWithEmail);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const canSubmit =
    name.length > 0 && username.length > 0 && email.length > 0 && password.length > 0 && password === confirmPassword && agreed;

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("auth")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Create your account</Text>
        <View style={styles.fields}>
          <TextField placeholder="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField
            placeholder="Username"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            autoCapitalize="none"
          />
          <TextField placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextField placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <TextField
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        <Checkbox checked={agreed} onToggle={() => setAgreed((a) => !a)}>
          I agree to the Terms of Service and Privacy Policy
        </Checkbox>
        {authError && <Text style={styles.error}>{authError}</Text>}
        <PillButton
          label={authLoading ? "Creating account…" : "Create account"}
          variant="filled"
          onPress={() => canSubmit && !authLoading && signupWithEmail(name, username, email, password)}
        />
        <Pressable onPress={() => navigate("login")}>
          <Text style={styles.footerLink}>Already have an account? Log in</Text>
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
  error: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
  },
  footerLink: {
    textAlign: "center",
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});
