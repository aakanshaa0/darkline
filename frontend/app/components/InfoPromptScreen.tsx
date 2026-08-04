import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, typography } from "../theme/tokens";
import { PillButton } from "./PillButton";

interface InfoPromptScreenProps {
  icon: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onBack?: () => void;
}

/**
 * Shared layout for the "big icon + message + button(s)" auth screens:
 * account locked, session expired, account-exists-with-different-method,
 * biometric prompt, push-permission prompt. Ported once instead of
 * duplicating the same centered layout five times.
 */
export function InfoPromptScreen({
  icon,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onBack,
}: InfoPromptScreenProps) {
  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      )}
      <View style={styles.body}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttons}>
          <PillButton label={primaryLabel} variant="filled" onPress={onPrimary} />
          {secondaryLabel && onSecondary && (
            <PillButton label={secondaryLabel} variant="outlined" onPress={onSecondary} />
          )}
        </View>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: typography.sizes.name,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  message: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
});
