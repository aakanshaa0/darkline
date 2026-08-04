import React, { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

export function OtpInput({ value, onChange, length = 6, error = false }: OtpInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setDigit(index: number, char: string) {
    const next = digits.slice();
    next[index] = char.slice(-1);
    onChange(next.join("").slice(0, length));
    if (char && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          style={[styles.box, error && styles.boxError, styles.boxText]}
          value={d}
          onChangeText={(t) => setDigit(i, t)}
          onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  box: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    fontSize: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxError: {
    borderColor: colors.destructive,
  },
  boxText: {
    textAlign: "center",
  },
});
