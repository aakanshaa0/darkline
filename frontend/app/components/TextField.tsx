import React from "react";
import { TextInput, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";

interface TextFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function TextField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
}: TextFieldProps) {
  return (
    <TextInput
      style={styles.field}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    padding: 12,
    borderRadius: shape.controlRadius,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
  },
});
