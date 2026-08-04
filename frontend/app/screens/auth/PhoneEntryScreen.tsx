import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { PillButton, TextField } from "../../components";
import { colors, shape, typography } from "../../theme/tokens";

export function PhoneEntryScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const sendPhoneOtp = useAppStore((s) => s.sendPhoneOtp);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [phone, setPhone] = useState("");

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigate("auth")}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title}>Enter your phone number</Text>
        <View style={styles.row}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TextField placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
        </View>
        {authError && <Text style={styles.error}>{authError}</Text>}
        <PillButton
          label={authLoading ? "Sending code…" : "Continue"}
          variant="filled"
          onPress={() => phone && !authLoading && sendPhoneOtp(phone)}
        />
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
  row: {
    flexDirection: "row",
    gap: 8,
  },
  countryCode: {
    width: 56,
    borderRadius: shape.controlRadius,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  countryCodeText: {
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  error: {
    fontSize: typography.sizes.caption,
    color: colors.destructive,
  },
});
