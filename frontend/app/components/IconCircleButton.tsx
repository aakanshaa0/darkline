import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, shape } from "../theme/tokens";

interface IconCircleButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  background?: string;
  color?: string;
  fontSize?: number;
}

/**
 * Circular icon buttons (call controls, header call/video icons). Icons are
 * emoji glyphs — matching the prototype's own fallback approach (see
 * design-handoff.md "Assets": emoji placeholders standing in for a real
 * icon set) rather than pulling in an SVG icon dependency for this pass.
 */
export function IconCircleButton({
  icon,
  onPress,
  size = shape.iconButtonSize,
  background = colors.surfaceRaised,
  color = colors.textPrimary,
  fontSize,
}: IconCircleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}
    >
      <Text style={{ fontSize: fontSize ?? size * 0.42, color }}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
